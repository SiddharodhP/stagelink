import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { sendMail, isMailConfigured, isValidEmail } from "@/lib/mailer";
import { buildInvoiceEmail } from "@/lib/emails/invoice-email";
import { buildOverdueEmail } from "@/lib/emails/overdue-email";
import { Invoice } from "@/types/marketplace";

export const runtime = "nodejs";
// Always execute — a cached cron run would silently stop billing.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time compare so the secret can't be recovered by timing. */
function secretMatches(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Where an invoice should be emailed. Mirrors get_invoice_recipient_email:
 * the billing address snapshotted at issue time, else the account email.
 */
async function resolveRecipient(admin: Admin, invoice: Invoice) {
  if (invoice.to_email && isValidEmail(invoice.to_email)) return invoice.to_email;

  const { data: profile } = await admin
    .from("profiles")
    .select("billing_email")
    .eq("id", invoice.client_id)
    .maybeSingle();

  const billing = profile?.billing_email?.trim();
  if (billing && isValidEmail(billing)) return billing;

  const { data } = await admin.auth.admin.getUserById(invoice.client_id);
  const accountEmail = data?.user?.email?.trim();
  return accountEmail && isValidEmail(accountEmail) ? accountEmail : null;
}

async function renderPdf(invoice: Invoice) {
  const [{ renderToBuffer }, { InvoicePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/shared/invoice-pdf"),
  ]);
  return renderToBuffer(InvoicePdf({ invoice }));
}

/**
 * Nightly invoice run. Two jobs:
 *
 *   1. Issue every retainer invoice that has come due and email it.
 *   2. Chase every retainer invoice that is past its due date, once a day.
 *
 * Both are driven by the database, which owns the "is it due?" decision —
 * this route only delivers mail. Failures are collected per-invoice rather
 * than thrown, so one bad address can't stop the rest of the run.
 *
 * Reminders are only marked sent AFTER the mail is accepted, so a delivery
 * failure means the invoice is retried tomorrow instead of being silently
 * skipped forever.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>".
  const provided = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    ""
  );
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const mailReady = isMailConfigured();
  const issued: string[] = [];
  const reminded: string[] = [];
  const errors: string[] = [];

  // ---------- 0. Refresh exchange rates ----------
  // Display-only conversion on browse pages depends on these. The feed
  // updates once a day, which is why this rides the daily cron rather
  // than having a schedule of its own.
  let ratesUpdated = 0;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { "User-Agent": "Roster-Marketplace (+https://jayree.io)" },
    });
    const body = await res.json();
    if (body?.result === "success" && body?.rates) {
      const { data: n, error: rateError } = await admin.rpc(
        "upsert_exchange_rates",
        { p_rates: body.rates }
      );
      if (rateError) errors.push(`rates: ${rateError.message}`);
      else ratesUpdated = (n as number) ?? 0;
    } else {
      errors.push("rates: feed returned no rates");
    }
  } catch (err: unknown) {
    // A stale rate table degrades to showing amounts without a conversion
    // hint, so this must never stop the invoice run.
    errors.push(`rates: ${(err as Error)?.message || "fetch failed"}`);
  }

  // ---------- 1. Issue what's due ----------
  const { data: generated, error: genError } = await admin.rpc(
    "generate_due_recurring_invoices"
  );

  if (genError) {
    errors.push(`generate: ${genError.message}`);
  } else if (generated?.length) {
    const ids = generated.map((r: { invoice_id: string }) => r.invoice_id);
    const { data: invoices } = await admin
      .from("invoices")
      .select("*")
      .in("id", ids);

    for (const invoice of (invoices || []) as Invoice[]) {
      issued.push(invoice.invoice_number);
      if (!mailReady) continue;

      try {
        const to = await resolveRecipient(admin, invoice);
        if (!to) {
          errors.push(`${invoice.invoice_number}: no recipient email`);
          continue;
        }
        const { subject, html, text } = buildInvoiceEmail(invoice);
        await sendMail({
          to,
          subject,
          html,
          text,
          replyTo: invoice.from_email || undefined,
          attachments: [
            {
              filename: `${invoice.invoice_number}.pdf`,
              content: await renderPdf(invoice),
              contentType: "application/pdf",
            },
          ],
        });
      } catch (err: any) {
        errors.push(`${invoice.invoice_number}: ${err?.message || "send failed"}`);
      }
    }
  }

  // ---------- 2. Chase what's overdue ----------
  if (mailReady) {
    const { data: overdue, error: overdueError } = await admin.rpc(
      "get_overdue_invoices",
      { p_max_reminders: 30 }
    );

    if (overdueError) {
      errors.push(`overdue: ${overdueError.message}`);
    } else {
      for (const invoice of (overdue || []) as Invoice[]) {
        try {
          const to = await resolveRecipient(admin, invoice);
          if (!to) {
            errors.push(`${invoice.invoice_number}: no recipient email`);
            continue;
          }
          // No PDF here — it was attached when the invoice was issued, and
          // re-attaching it daily is what gets a sender marked as spam.
          const { subject, html, text } = buildOverdueEmail(invoice);
          await sendMail({
            to,
            subject,
            html,
            text,
            replyTo: invoice.from_email || undefined,
          });

          await admin.rpc("mark_reminder_sent", { p_invoice_id: invoice.id });
          reminded.push(invoice.invoice_number);
        } catch (err: any) {
          errors.push(
            `${invoice.invoice_number}: ${err?.message || "reminder failed"}`
          );
        }
      }
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    ranAt: new Date().toISOString(),
    mailConfigured: mailReady,
    ratesUpdated,
    issued,
    reminded,
    errors,
  });
}

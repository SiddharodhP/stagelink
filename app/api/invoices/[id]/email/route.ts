import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMail, isMailConfigured, isValidEmail } from "@/lib/mailer";
import { buildInvoiceEmail } from "@/lib/emails/invoice-email";
import { Invoice } from "@/types/marketplace";

// nodemailer and the PDF renderer both need Node APIs — not the edge runtime.
export const runtime = "nodejs";

/**
 * Emails an invoice (with the PDF attached) to a recipient.
 *
 * Authorization is done server-side against the caller's own Supabase
 * session: the invoice is read with the user's token, so RLS only returns
 * it if they're the freelancer, the client, or an admin. A crafted request
 * for someone else's invoice gets a 404 from the database itself rather
 * than relying on a check we could forget.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured on the server." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // RLS scopes this to invoices the caller is party to.
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  // Only the two parties may email it; admins can read but shouldn't send
  // on someone else's behalf.
  if (invoice.freelancer_id !== user.id && invoice.client_id !== user.id) {
    return NextResponse.json(
      { error: "You can't send this invoice." },
      { status: 403 }
    );
  }

  let body: { to?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine — we fall back to the stored address */
  }

  // Recipient, in order of authority: an explicit override, then the address
  // snapshotted onto the invoice, then the client's account email resolved by
  // the database. The last step means we can always reach the client even if
  // they never filled in a billing email.
  let to = (body.to || invoice.to_email || "").trim();
  if (!to) {
    const { data: resolved } = await supabase.rpc(
      "get_invoice_recipient_email",
      { p_invoice_id: id }
    );
    to = (resolved || "").trim();
  }
  if (!to) {
    return NextResponse.json(
      { error: "No recipient email. Add one before sending." },
      { status: 400 }
    );
  }
  if (!isValidEmail(to)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid email address." },
      { status: 400 }
    );
  }

  const note = (body.note || "").trim().slice(0, 500) || undefined;

  // Render the same PDF component used for the download, server-side.
  let pdfBuffer: Buffer;
  try {
    const [{ renderToBuffer }, { InvoicePdf }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/shared/invoice-pdf"),
    ]);
    pdfBuffer = await renderToBuffer(
      InvoicePdf({ invoice: invoice as Invoice })
    );
  } catch (err) {
    console.error("Invoice PDF render failed:", err);
    return NextResponse.json(
      { error: "Could not generate the invoice PDF." },
      { status: 500 }
    );
  }

  const { subject, html, text } = buildInvoiceEmail(invoice as Invoice, note);

  try {
    await sendMail({
      to,
      subject,
      html,
      text,
      // Replies reach the freelancer, not the platform mailbox.
      replyTo: invoice.from_email || undefined,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err: any) {
    console.error("Invoice email failed:", err);
    // Gmail's auth failures are the most common cause — surface something
    // actionable rather than a raw SMTP dump.
    const msg =
      err?.responseCode === 535
        ? "Gmail rejected the login. Check GMAIL_USER and that GMAIL_APP_PASSWORD is a valid App Password."
        : "Could not send the email. Please try again.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentTo: to });
}

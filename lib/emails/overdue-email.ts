import { Invoice } from "@/types/marketplace";
import { SITE_URL } from "@/lib/seo";

function money(amount: number, currency = "USD") {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function esc(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Whole days between the due date and today. Never negative. */
export function daysOverdue(invoice: Invoice) {
  if (!invoice.due_date) return 0;
  const due = new Date(invoice.due_date + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(
    0,
    Math.round((today.getTime() - due.getTime()) / 86_400_000)
  );
}

/**
 * Daily overdue chase for a retainer invoice.
 *
 * The tone escalates with age rather than sending an identical mail every
 * day: an unchanging reminder is trivially filtered out, and a first-day
 * nudge should not read like a final notice.
 */
export function buildOverdueEmail(invoice: Invoice) {
  const days = daysOverdue(invoice);
  const currency = invoice.currency || "USD";
  const fromName = esc(invoice.from_name || "Your freelancer");
  const toName = esc(invoice.to_name || "there");
  const url = `${SITE_URL}/invoices/${invoice.id}`;
  const dayWord = days === 1 ? "1 day" : `${days} days`;

  const tone =
    days <= 3 ? "nudge" : days <= 14 ? "firm" : "final";

  const subject =
    tone === "nudge"
      ? `Reminder: invoice ${invoice.invoice_number} is due`
      : tone === "firm"
        ? `Overdue ${dayWord}: invoice ${invoice.invoice_number} — ${money(invoice.total_amount, currency)}`
        : `Final notice: invoice ${invoice.invoice_number} is ${dayWord} overdue`;

  const lead =
    tone === "nudge"
      ? `This is a quick reminder that invoice ${invoice.invoice_number} from ${invoice.from_name || "your freelancer"} passed its due date ${dayWord} ago.`
      : tone === "firm"
        ? `Invoice ${invoice.invoice_number} from ${invoice.from_name || "your freelancer"} is now ${dayWord} overdue. Work on this retainer may be paused until it is settled.`
        : `Invoice ${invoice.invoice_number} is ${dayWord} overdue. Please settle it or raise a dispute so this can be resolved — reminders stop either way.`;

  const text = [
    `Invoice ${invoice.invoice_number} — overdue ${dayWord}`,
    ``,
    `Hi ${invoice.to_name || "there"},`,
    ``,
    lead,
    ``,
    `Amount due: ${money(invoice.total_amount, currency)}`,
    `Was due: ${formatDay(invoice.due_date)}`,
    `For: ${invoice.milestone_title}`,
    `Project: ${invoice.project_title}`,
    ``,
    `Pay it here: ${url}`,
    ``,
    `Payment is collected and passed on by Jayree — you are not sending money directly to the freelancer.`,
    ``,
    `If you believe this invoice is wrong, open it and raise a dispute instead of ignoring it.`,
  ]
    .filter(Boolean)
    .join("\n");

  const accent = tone === "final" ? "#b3200c" : "#d6440f";

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f7f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1713;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ee;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(26,23,19,0.12);border-radius:12px;overflow:hidden;">

          <tr><td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>

          <tr>
            <td style="padding:26px 32px 0 32px;">
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.3px;">jayree.io</span><span style="color:#d6440f;">&nbsp;&bull;</span>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 32px 0 32px;">
              <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${accent};font-weight:700;">
                Overdue ${esc(dayWord)}
              </p>
              <h1 style="margin:0 0 4px 0;font-size:24px;line-height:1.25;font-weight:700;">${esc(invoice.invoice_number)}</h1>
              <p style="margin:0;font-size:14px;color:#6f695e;">${esc(invoice.project_title)}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;">Hi ${toName},</p>
              <p style="margin:0;font-size:15px;line-height:1.55;">${esc(lead)}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:#9a9488;font-weight:600;">Amount due</p>
                    <p style="margin:0;font-size:26px;font-weight:700;line-height:1.2;color:${accent};">${money(invoice.total_amount, currency)}</p>
                    <p style="margin:8px 0 0 0;font-size:13px;color:#6f695e;">
                      Was due ${formatDay(invoice.due_date)} &middot; ${esc(invoice.milestone_title)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0 32px;">
              <a href="${url}"
                 style="display:inline-block;background:#171410;color:#f7f4ee;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;">
                Pay this invoice
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 30px 32px;">
              <p style="margin:0;padding-top:18px;border-top:1px solid rgba(26,23,19,0.12);font-size:13px;line-height:1.55;color:#6f695e;">
                Payment is collected and passed on by Jayree — you are not sending
                money directly to ${fromName}. If you believe this invoice is wrong,
                open it and raise a dispute rather than ignoring it; reminders stop
                either way.
              </p>
            </td>
          </tr>
        </table>

        <p style="max-width:560px;margin:16px auto 0 auto;font-size:12px;color:#9a9488;text-align:center;">
          Sent via <a href="${SITE_URL}" style="color:#9a9488;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text, days, tone };
}

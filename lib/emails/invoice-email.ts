import { Invoice } from "@/types/marketplace";
import { SITE_URL } from "@/lib/seo";

function money(amount: number, currency = "INR") {
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Escapes user-supplied text before it goes into the HTML body. */
function esc(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Invoice email body.
 *
 * Written as table-based inline-styled HTML on purpose: Gmail, Outlook and
 * most clients strip <style> blocks and ignore flexbox/grid, so the modern
 * CSS the web app uses would collapse into unstyled text.
 */
export function buildInvoiceEmail(invoice: Invoice, note?: string) {
  const isReceipt = invoice.status === "paid";
  const currency = invoice.currency || "INR";
  const fromName = esc(invoice.from_name || "Your freelancer");
  const toName = esc(invoice.to_name || "there");
  const url = `${SITE_URL}/invoices/${invoice.id}`;
  const docWord = isReceipt ? "Receipt" : "Invoice";

  const subject = isReceipt
    ? `${docWord} ${invoice.invoice_number} — ${money(invoice.total_amount, currency)} paid`
    : `${docWord} ${invoice.invoice_number} from ${invoice.from_name || "your freelancer"} — ${money(invoice.total_amount, currency)}`;

  const text = [
    `${docWord} ${invoice.invoice_number}`,
    ``,
    `Hi ${invoice.to_name || "there"},`,
    ``,
    isReceipt
      ? `Here's your receipt for "${invoice.milestone_title}" on ${invoice.project_title}. This milestone has already been paid — no action needed.`
      : `${invoice.from_name || "Your freelancer"} has issued an invoice for "${invoice.milestone_title}" on ${invoice.project_title}.`,
    ``,
    `Amount: ${money(invoice.total_amount, currency)}`,
    invoice.due_date && !isReceipt ? `Due: ${formatDay(invoice.due_date)}` : "",
    ``,
    note ? `Note from ${invoice.from_name || "the freelancer"}: ${note}` : "",
    ``,
    isReceipt
      ? `View it here: ${url}`
      : `Review and pay here: ${url}`,
    ``,
    `This milestone is funded in escrow — approving the work releases the held funds. No separate bank transfer is required.`,
    ``,
    `The PDF is attached for your records.`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f7f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1713;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ee;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(26,23,19,0.12);border-radius:12px;overflow:hidden;">

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.3px;">Roster</span><span style="color:#d6440f;">&nbsp;&bull;</span>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0 32px;">
              <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#9a9488;font-weight:600;">${docWord}</p>
              <h1 style="margin:0 0 4px 0;font-size:24px;line-height:1.25;font-weight:700;">${esc(invoice.invoice_number)}</h1>
              <p style="margin:0;font-size:14px;color:#6f695e;">${esc(invoice.project_title)}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0 32px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;">Hi ${toName},</p>
              <p style="margin:0;font-size:15px;line-height:1.55;">
                ${
                  isReceipt
                    ? `Here's your receipt for <strong>${esc(invoice.milestone_title)}</strong>. This milestone has already been paid — no action needed.`
                    : `<strong>${fromName}</strong> has issued an invoice for <strong>${esc(invoice.milestone_title)}</strong>.`
                }
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:#9a9488;font-weight:600;">
                      ${isReceipt ? "Total paid" : "Amount due"}
                    </p>
                    <p style="margin:0;font-size:26px;font-weight:700;line-height:1.2;">${money(invoice.total_amount, currency)}</p>
                    ${
                      invoice.due_date && !isReceipt
                        ? `<p style="margin:8px 0 0 0;font-size:13px;color:#6f695e;">Due ${formatDay(invoice.due_date)}</p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            note
              ? `<tr><td style="padding:18px 32px 0 32px;">
                   <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:#9a9488;font-weight:600;">Note from ${fromName}</p>
                   <p style="margin:0;font-size:14px;line-height:1.55;color:#3a352e;">${esc(note)}</p>
                 </td></tr>`
              : ""
          }

          <tr>
            <td style="padding:26px 32px 0 32px;">
              <a href="${url}"
                 style="display:inline-block;background:#171410;color:#f7f4ee;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;">
                ${isReceipt ? "View receipt" : "Review and pay"}
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 30px 32px;">
              <p style="margin:0;padding-top:18px;border-top:1px solid rgba(26,23,19,0.12);font-size:13px;line-height:1.55;color:#6f695e;">
                ${
                  isReceipt
                    ? "This milestone was funded into escrow before work began and released on approval."
                    : "This milestone is funded in escrow — approving the work releases the held funds. No separate bank transfer is required."
                }
                The PDF is attached for your records.
              </p>
            </td>
          </tr>
        </table>

        <p style="max-width:560px;margin:16px auto 0 auto;font-size:12px;color:#9a9488;text-align:center;">
          Sent via Roster &middot; <a href="${SITE_URL}" style="color:#9a9488;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

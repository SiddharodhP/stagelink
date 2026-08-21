import nodemailer from "nodemailer";

/**
 * Gmail SMTP transport.
 *
 * Requires a Google **App Password** (16 characters), not your normal
 * account password — Google blocks plain-password SMTP logins. App
 * passwords need 2-Step Verification enabled on the account.
 *
 * Limits worth knowing: Gmail caps a free account at roughly 500
 * recipients/day and will temporarily lock sending if you exceed it.
 * Mail also sends from your Gmail address, not your domain. If invoices
 * start landing in spam or you outgrow the cap, swapping this file for a
 * transactional provider is the only change needed — everything else
 * calls sendMail().
 */

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
/** Optional display name, e.g. "Roster Invoices". Falls back to the address. */
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Roster";

export function isMailConfigured() {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

function getTransport() {
  if (!isMailConfigured()) {
    throw new Error(
      "Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD."
    );
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // implicit TLS
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}) {
  const transport = getTransport();

  const info = await transport.sendMail({
    from: `"${MAIL_FROM_NAME}" <${GMAIL_USER}>`,
    to: opts.to,
    // Replies go to the freelancer who issued the invoice, not the
    // platform mailbox.
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });

  return { messageId: info.messageId };
}

/** Basic shape check so we fail before hitting SMTP with junk. */
export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

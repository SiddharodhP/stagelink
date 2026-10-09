import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Razorpay, server side only.
 *
 * The key id is public -- Checkout needs it in the browser -- but the secret
 * is what signs and verifies, so it must never be bundled. That is why the
 * public half is NEXT_PUBLIC_RAZORPAY_KEY_ID and this module, which reads the
 * secret, is imported only from route handlers.
 *
 * Razorpay deals in the smallest unit: paise, not rupees. Everything stored
 * on this platform is whole rupees, so the conversion happens here, in one
 * place, rather than at each call site where a missing x100 would undercharge
 * by a factor of a hundred.
 */

const KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export function isRazorpayConfigured() {
  return Boolean(KEY_ID && KEY_SECRET);
}

export function razorpayClient() {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

/** Whole rupees to paise, which is the only unit the API accepts. */
export function toPaise(rupees: number) {
  return Math.round(rupees * 100);
}

/** Back again, for comparing a webhook amount against a stored one. */
export function fromPaise(paise: number) {
  return Math.round(paise / 100);
}

function safeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a webhook body against the X-Razorpay-Signature header.
 *
 * Signed over the RAW body, so the caller must pass the exact bytes received
 * -- re-serialising a parsed object changes key order and whitespace and the
 * signature stops matching.
 *
 * Without this check the endpoint is an unauthenticated "mark this paid" API.
 */
export function verifyWebhook(rawBody: string, signature: string | null) {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/**
 * Verifies the handshake Checkout hands back to the browser.
 *
 * Useful for showing the client a confident "payment received" immediately,
 * but it is NOT what marks a milestone funded -- that waits for the webhook.
 * A browser can be made to send anything; only the webhook comes from
 * Razorpay.
 */
export function verifyCheckoutSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  if (!KEY_SECRET) return false;
  const expected = createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

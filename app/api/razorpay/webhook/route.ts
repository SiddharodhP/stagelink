import { NextRequest, NextResponse } from "next/server";

import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { verifyWebhook, fromPaise } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The only thing that may mark a milestone funded.
 *
 * Razorpay Checkout hands the browser a payment id on success, and it is
 * tempting to trust it. A browser can be made to send anything, so that is a
 * hint, not proof. This endpoint is the proof: the body is signed with a
 * secret only Razorpay and this server hold.
 *
 * Three properties it has to have, in order:
 *
 * 1. VERIFIED. Without the signature check this is an unauthenticated
 *    "mark this paid" API, and the signature is over the RAW body -- so the
 *    text is read before anything parses it.
 * 2. IDEMPOTENT. Razorpay retries until it gets a 2xx and will re-deliver
 *    events it has already delivered. The event id is claimed first; a
 *    duplicate does nothing.
 * 3. FORGIVING OF ITS OWN SUCCESS. A retry of something already handled
 *    answers 200, not an error -- a 4xx or 5xx makes Razorpay retry for
 *    hours over work that is already done.
 */
export async function POST(request: NextRequest) {
  // Raw text, not request.json(): re-serialising a parsed object changes key
  // order and whitespace, and the signature stops matching.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhook(raw, signature)) {
    // Deliberately terse. An attacker probing this endpoint learns nothing
    // about why their signature failed.
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    // 500 on purpose: the payment is real and unrecorded, so Razorpay should
    // retry once the deployment is configured.
    return NextResponse.json(
      { error: "Server is not configured to record payments." },
      { status: 500 }
    );
  }

  let body: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          status?: string;
        };
      };
    };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    // Signed but unparseable. Retrying will not help, so do not ask for one.
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const event = body.event ?? "unknown";
  const payment = body.payload?.payment?.entity;
  const admin = createAdminClient();

  // Razorpay does not send an event id in the body, so the payment id plus
  // the event name is the stable key for "this exact thing happened".
  const eventKey = payment?.id ? `${event}:${payment.id}` : `${event}:${raw.length}`;

  const { error: claimError } = await admin
    .from("payment_events")
    .insert({ id: eventKey, provider: "razorpay", event, payload: body });

  if (claimError) {
    // 23505 is unique_violation: seen already, nothing to do, and Razorpay
    // must be told so in a way that stops it retrying.
    if (claimError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  // Anything other than a captured payment is recorded above and otherwise
  // ignored. Subscribing to fewer events in the dashboard is the better fix,
  // but an unexpected one must not 500 and trigger retries.
  if (event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: event });
  }

  if (!payment?.order_id || !payment?.id || typeof payment.amount !== "number") {
    return NextResponse.json(
      { ok: true, ignored: "captured payment missing order, id or amount" }
    );
  }

  const { error: rpcError } = await admin.rpc("razorpay_confirm_funding", {
    p_order_id: payment.order_id,
    p_payment_id: payment.id,
    p_amount: fromPaise(payment.amount),
  });

  if (rpcError) {
    // A real failure: money has moved and the milestone is not marked.
    // 500 so Razorpay retries, and the row in payment_events is removed so
    // the retry is not dismissed as a duplicate.
    await admin.from("payment_events").delete().eq("id", eventKey);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

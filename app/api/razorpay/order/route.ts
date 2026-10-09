import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpayClient, isRazorpayConfigured, toPaise } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens a Razorpay order for one milestone.
 *
 * The amount is NOT taken from the request. A client could post any figure,
 * and a marketplace that lets the payer choose what to pay is not a
 * marketplace. It is read from the milestone row, and razorpay_begin_funding
 * re-checks on the database side that this user is the client on an active
 * contract, that the milestone is still pending, and that no earlier
 * milestone is unsettled.
 *
 * What comes back is only enough to open Checkout. Nothing here marks
 * anything funded -- see the webhook.
 */
export async function POST(request: NextRequest) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment." },
      { status: 503 }
    );
  }

  let milestoneId: string | undefined;
  try {
    const body = await request.json();
    milestoneId = typeof body?.milestoneId === "string" ? body.milestoneId : undefined;
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }
  if (!milestoneId) {
    return NextResponse.json({ error: "milestoneId is required." }, { status: 400 });
  }

  // The caller's own session, so RLS applies and they can only read a
  // milestone on a project they are party to.
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: milestone, error: readError } = await supabase
    .from("milestones")
    .select("id, title, amount, status, escrow_funded, project_id")
    .eq("id", milestoneId)
    .maybeSingle();

  if (readError || !milestone) {
    return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
  }
  if (milestone.escrow_funded) {
    return NextResponse.json({ error: "Already funded." }, { status: 409 });
  }

  const razorpay = razorpayClient();

  let order;
  try {
    order = await razorpay.orders.create({
      amount: toPaise(milestone.amount),
      currency: "INR",
      // Lets Razorpay's own dashboard be reconciled against a milestone
      // without going through this database.
      notes: {
        milestone_id: milestone.id,
        project_id: milestone.project_id,
        milestone_title: milestone.title,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Razorpay rejected the order.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Recorded through the RPC rather than a direct update, so every rule
  // about who may fund what lives in one place in the database.
  const { error: rpcError } = await supabase.rpc("razorpay_begin_funding", {
    p_milestone_id: milestone.id,
    p_order_id: order.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 403 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    milestoneTitle: milestone.title,
  });
}

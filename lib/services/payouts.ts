import { createClient as createBrowserClient } from "@/lib/supabase/client";

/**
 * Paying freelancers.
 *
 * Two things live here and they are deliberately separate:
 *
 *   PAYOUT ACCOUNT  where a freelancer wants money sent. Theirs to set, and
 *                   readable only by them and an admin -- it is a table of
 *                   its own rather than columns on profiles, because profiles
 *                   is read publicly and bank details must not be one stray
 *                   `select *` away from a response body.
 *
 *   PAYOUT          one row per approved milestone, tracking money from owed
 *                   to actually sent. Written only through RPCs; there are no
 *                   insert or update policies on the table at all.
 *
 * Nothing here knows how money moves. A payout carries a provider name and a
 * reference, so a bank transfer recorded by hand and an automated transfer
 * recorded by a webhook are the same shape, and swapping one for the other
 * changes nothing above this file.
 */

const supabase = createBrowserClient();

export type PayoutMethod = "upi" | "bank";
export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export type PayoutAccount = {
  user_id: string;
  method: PayoutMethod;
  upi_vpa: string | null;
  account_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type Payout = {
  id: string;
  milestone_id: string;
  contract_id: string;
  project_id: string;
  payee_id: string;
  amount: number;
  status: PayoutStatus;
  provider: string;
  reference: string | null;
  failure_reason: string | null;
  created_at: string;
  paid_at: string | null;
  failed_at: string | null;
};

/* ---------------- the freelancer's own view ---------------- */

export async function getMyPayoutAccount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: null };

  const { data, error } = await supabase
    .from("payout_accounts")
    .select("user_id, method, upi_vpa, account_name, account_number, ifsc, verified, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return { data: data as PayoutAccount | null, error };
}

export async function setPayoutAccount(input: {
  method: PayoutMethod;
  upi_vpa?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
}) {
  // Through the RPC rather than an upsert, so the "these fields must be
  // present for this method" rule is enforced in one place for every caller.
  const { error } = await supabase.rpc("set_payout_account", {
    p_method: input.method,
    p_upi_vpa: input.upi_vpa ?? null,
    p_account_name: input.account_name ?? null,
    p_account_number: input.account_number ?? null,
    p_ifsc: input.ifsc ?? null,
  });
  return { error };
}

export async function getMyPayouts() {
  const { data, error } = await supabase
    .from("payouts")
    .select("id, milestone_id, contract_id, project_id, payee_id, amount, status, provider, reference, failure_reason, created_at, paid_at, failed_at")
    .order("created_at", { ascending: false });

  return { data: (data ?? []) as Payout[], error };
}

/* ---------------- the platform's side ---------------- */

/**
 * The payout queue: everything owed and not yet sent.
 *
 * RLS already limits this to an admin, so there is no filter here beyond the
 * status -- a non-admin asking for it simply gets their own rows, which is
 * the correct answer to the question they are actually allowed to ask.
 */
export async function getPayoutQueue() {
  const { data, error } = await supabase
    .from("payouts")
    .select("id, milestone_id, contract_id, project_id, payee_id, amount, status, provider, reference, failure_reason, created_at, paid_at, failed_at")
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true });

  return { data: (data ?? []) as Payout[], error };
}

/**
 * The queue, with enough context to actually make a transfer: who to pay,
 * where to send it, and what the money was for.
 *
 * The select is one string literal on purpose. postgrest-js infers the row
 * type from the literal text, so building this by concatenation collapses the
 * result type to GenericStringError[] and every field below becomes an error.
 */
export async function getPayoutQueueDetailed() {
  const { data, error } = await supabase
    .from("payouts")
    .select(
      "id, milestone_id, contract_id, project_id, payee_id, amount, status, provider, reference, failure_reason, created_at, paid_at, failed_at, payee:profiles!payouts_payee_id_fkey(id, full_name, avatar_url), milestone:milestones!payouts_milestone_id_fkey(id, title), project:projects!payouts_project_id_fkey(id, title)"
    )
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { data: [] as PayoutQueueRow[], error };
  }

  // The destination comes from a second query rather than an embed: there is
  // no foreign key from payouts to payout_accounts -- the link runs through
  // the payee -- so PostgREST has no relationship to traverse. Reading it by
  // payee id is unambiguous and does not depend on guessing a constraint
  // name. Admins can read every row under payout_accounts_own_select.
  const payeeIds = [...new Set(data.map((row) => row.payee_id))];
  const { data: accounts } = await supabase
    .from("payout_accounts")
    .select("user_id, method, upi_vpa, account_name, account_number, ifsc, verified, created_at, updated_at")
    .in("user_id", payeeIds);

  const byUser = new Map<string, PayoutAccount>(
    (accounts ?? []).map((a) => [a.user_id, a as PayoutAccount])
  );

  const rows = data.map((row) => ({
    ...row,
    account: byUser.get(row.payee_id) ?? null,
  }));

  return { data: rows as unknown as PayoutQueueRow[], error: null };
}

export type PayoutQueueRow = Payout & {
  payee: { id: string; full_name: string | null; avatar_url: string | null } | null;
  milestone: { id: string; title: string } | null;
  project: { id: string; title: string } | null;
  account: PayoutAccount | null;
};

export async function markPayoutProcessing(payoutId: string) {
  const { error } = await supabase.rpc("mark_payout_processing", {
    p_payout_id: payoutId,
  });
  return { error };
}

/**
 * Records that money actually went out.
 *
 * The reference is required by the database, not just by this form: a payout
 * that cannot be traced to a bank record is the one that gets argued about
 * later.
 */
export async function recordPayoutSent(
  payoutId: string,
  reference: string,
  provider = "manual"
) {
  const { error } = await supabase.rpc("record_payout_sent", {
    p_payout_id: payoutId,
    p_reference: reference,
    p_provider: provider,
  });
  return { error };
}

export async function recordPayoutFailed(payoutId: string, reason: string) {
  const { error } = await supabase.rpc("record_payout_failed", {
    p_payout_id: payoutId,
    p_reason: reason,
  });
  return { error };
}

/* ---------------- display helpers ---------------- */

/** Never show a full account number back to anyone, including its owner. */
export function maskAccount(account: PayoutAccount | null): string {
  if (!account) return "Not set";
  if (account.method === "upi") return account.upi_vpa ?? "Not set";
  const n = account.account_number ?? "";
  return n.length > 4 ? `••••${n.slice(-4)}` : n;
}

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: "Awaiting payout",
  processing: "Sending",
  paid: "Paid",
  failed: "Failed",
};

/* ---------------- refunds: the same thing, pointing the other way ---------------- */

export type RefundStatus = PayoutStatus;

export type Refund = {
  id: string;
  milestone_id: string;
  contract_id: string;
  project_id: string;
  payee_id: string;
  amount: number;
  status: RefundStatus;
  provider: string;
  reference: string | null;
  reason: string | null;
  failure_reason: string | null;
  created_at: string;
  paid_at: string | null;
  failed_at: string | null;
};

export type RefundQueueRow = Refund & {
  payee: { id: string; full_name: string | null; avatar_url: string | null } | null;
  milestone: { id: string; title: string } | null;
  project: { id: string; title: string } | null;
};

/**
 * Money owed back to a client after a dispute went their way.
 *
 * Shaped exactly like the payout queue because it is the same job -- send
 * money, record the reference -- and a second vocabulary for it would earn
 * nothing. The destination is not shown: a refund goes back the way it came,
 * through the provider that took it, so there is no bank account to read out.
 */
export async function getRefundQueue() {
  const { data, error } = await supabase
    .from("refunds")
    .select(
      "id, milestone_id, contract_id, project_id, payee_id, amount, status, provider, reference, reason, failure_reason, created_at, paid_at, failed_at, payee:profiles!refunds_payee_id_fkey(id, full_name, avatar_url), milestone:milestones!refunds_milestone_id_fkey(id, title), project:projects!refunds_project_id_fkey(id, title)"
    )
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true });

  return { data: (data ?? []) as unknown as RefundQueueRow[], error };
}

export async function recordRefundSent(
  refundId: string,
  reference: string,
  provider = "manual"
) {
  const { error } = await supabase.rpc("record_refund_sent", {
    p_refund_id: refundId,
    p_reference: reference,
    p_provider: provider,
  });
  return { error };
}

export async function recordRefundFailed(refundId: string, reason: string) {
  const { error } = await supabase.rpc("record_refund_failed", {
    p_refund_id: refundId,
    p_reason: reason,
  });
  return { error };
}

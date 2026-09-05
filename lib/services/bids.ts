import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Bid } from "@/types/marketplace";

const supabase = createBrowserClient();

/**
 * Places a bid and publishes its public note in one operation.
 *
 * An RPC rather than a direct insert because the bid and its comment have
 * to be written together — a half-failed request would otherwise leave a
 * project showing five bids and four comments.
 */
export async function submitBid(fields: {
  project_id: string;
  amount: number;
  proposal: string;
  delivery_days: number;
  public_note: string;
}) {
  const { data, error } = await supabase.rpc("place_bid", {
    p_project_id: fields.project_id,
    p_amount: fields.amount,
    p_proposal: fields.proposal,
    p_delivery_days: fields.delivery_days,
    p_public_note: fields.public_note,
  });
  return { bidId: (data as string | null) ?? null, error };
}

/** Edits a bid and the comment it published, together. */
export async function reviseBid(
  bidId: string,
  fields: {
    amount: number;
    proposal: string;
    delivery_days: number;
    public_note: string;
  }
) {
  const { error } = await supabase.rpc("update_bid_note", {
    p_bid_id: bidId,
    p_amount: fields.amount,
    p_proposal: fields.proposal,
    p_delivery_days: fields.delivery_days,
    p_public_note: fields.public_note,
  });
  return { error };
}

/** Marks the bid withdrawn; its comment stays but is flagged. */
export async function withdrawBid(bidId: string) {
  const { error } = await supabase.rpc("withdraw_bid", { p_bid_id: bidId });
  return { error };
}

export async function updateBid(
  id: string,
  fields: Partial<Pick<Bid, "amount" | "proposal" | "delivery_days" | "status">>
) {
  const { data, error } = await supabase
    .from("bids")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Bid | null, error };
}

export async function getMyBidForProject(projectId: string, freelancerId: string) {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("project_id", projectId)
    .eq("freelancer_id", freelancerId)
    .maybeSingle();
  return { data: data as Bid | null, error };
}

export async function getMyBids(freelancerId: string) {
  const { data, error } = await supabase
    .from("bids")
    .select("*, project:project_id(id, title, status, budget_total, bids_count, published_at)")
    .eq("freelancer_id", freelancerId)
    .order("created_at", { ascending: false });
  return { data: (data || []) as Bid[], error };
}

/** All bids for a project, with freelancer reputation for comparison. */
export async function getProjectBids(projectId: string) {
  const { data, error } = await supabase
    .from("bids")
    .select(
      `*, freelancer:freelancer_id(
        id, full_name, headline, avatar_url, location, skills,
        experience_years, hourly_rate, is_verified, availability,
        avg_rating, total_reviews, total_earned
      )`
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error || !data) return { data: [] as Bid[], error };

  const bids = data.map((b: any) => ({
    ...b,
    freelancer: b.freelancer
      ? { ...b.freelancer, avg_rating: Number(b.freelancer.avg_rating) || 0 }
      : undefined,
  }));
  return { data: bids as Bid[], error: null };
}

/** Server-validated: creates the contract, rejects other bids, notifies everyone. */
export async function acceptBid(bidId: string) {
  const { data, error } = await supabase.rpc("accept_bid", { p_bid_id: bidId });
  return { contractId: data as string | null, error };
}

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Bid } from "@/types/marketplace";

const supabase = createBrowserClient();

export async function submitBid(fields: {
  project_id: string;
  freelancer_id: string;
  amount: number;
  proposal: string;
  delivery_days: number;
}) {
  const { data, error } = await supabase.from("bids").insert(fields).select().single();
  return { data: data as Bid | null, error };
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
      "*, freelancer:freelancer_id(id, full_name, headline, avatar_url, location, skills, experience_years, hourly_rate, is_verified, availability)"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error || !data) return { data: [] as Bid[], error };

  // attach ratings in one query
  const ids = [...new Set(data.map((b: any) => b.freelancer_id))];
  const { data: ratings } = await supabase
    .from("user_ratings")
    .select("*")
    .in("reviewee_id", ids);
  const map = new Map((ratings || []).map((r: any) => [r.reviewee_id, r]));
  const bids = data.map((b: any) => ({
    ...b,
    freelancer: b.freelancer
      ? {
          ...b.freelancer,
          avg_rating: map.get(b.freelancer_id)?.avg_rating
            ? Number(map.get(b.freelancer_id)!.avg_rating)
            : 0,
          total_reviews: map.get(b.freelancer_id)?.total_reviews || 0,
        }
      : undefined,
  }));
  return { data: bids as Bid[], error: null };
}

/** Server-validated: creates the contract, rejects other bids, notifies everyone. */
export async function acceptBid(bidId: string) {
  const { data, error } = await supabase.rpc("accept_bid", { p_bid_id: bidId });
  return { contractId: data as string | null, error };
}

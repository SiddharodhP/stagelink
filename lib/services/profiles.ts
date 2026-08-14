import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Profile, PortfolioItem, Review } from "@/types/marketplace";

const supabase = createBrowserClient();

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Profile | null, error };
}

/** Public profile with reputation + financial aggregates. */
export async function getPublicProfile(id: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !profile) return { data: null, error };

  const [{ data: rating }, { data: fin }] = await Promise.all([
    supabase.from("user_ratings").select("*").eq("reviewee_id", id).maybeSingle(),
    supabase.from("user_financials").select("*").eq("user_id", id).maybeSingle(),
  ]);

  const result: Profile = {
    ...profile,
    avg_rating: rating?.avg_rating ? Number(rating.avg_rating) : 0,
    total_reviews: rating?.total_reviews || 0,
    total_earned: fin?.total_earned || 0,
    total_spent: fin?.total_spent || 0,
  };
  return { data: result, error: null };
}

export async function getReviewsFor(userId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, reviewer:reviewer_id(id, full_name, avatar_url, company_name, role)")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });
  return { data: (data || []) as Review[], error };
}

/* ---------- Portfolio ---------- */

export async function getPortfolio(freelancerId: string) {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("freelancer_id", freelancerId)
    .order("created_at", { ascending: false });
  return { data: (data || []) as PortfolioItem[], error };
}

export async function addPortfolioItem(item: {
  freelancer_id: string;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  skills?: string[];
}) {
  const { data, error } = await supabase
    .from("portfolio_items")
    .insert(item)
    .select()
    .single();
  return { data: data as PortfolioItem | null, error };
}

export async function deletePortfolioItem(id: string) {
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
  return { error };
}

/* ---------- Reporting ---------- */

export async function reportUser(reporterId: string, reportedUserId: string, reason: string, details: string) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason,
    details,
  });
  return { error };
}

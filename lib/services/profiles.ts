import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  Profile,
  PortfolioItem,
  Review,
  City,
  FreelancerFilters,
} from "@/types/marketplace";

const supabase = createBrowserClient();

/**
 * Every profile column EXCEPT the billing block.
 *
 * Migration 011 revoked column-level SELECT on billing_address,
 * billing_email, phone, tax_id and tax_id_label, because profiles_read_all
 * is `using (true)` and was handing those to anonymous callers. A bare
 * `select("*")` now fails with "permission denied for column", so every
 * read has to project explicitly. Own billing details come from
 * getMyBilling() instead.
 */
export const PUBLIC_PROFILE_COLUMNS = `
  id, role, full_name, headline, bio, avatar_url, location, company_name,
  website, hourly_rate, experience_years, availability, skills,
  city, state, country, works_remotely, travel_radius_km, completeness,
  is_verified, is_suspended, created_at,
  avg_rating, total_reviews, total_earned, total_spent
`;

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(PUBLIC_PROFILE_COLUMNS)
    .single();
  return { data: data as Profile | null, error };
}

/**
 * The signed-in user's own billing block. Separate call because those
 * columns are not readable through the table any more — see
 * PUBLIC_PROFILE_COLUMNS.
 */
export async function getMyBilling() {
  const { data, error } = await supabase.rpc("get_my_billing");
  const row = Array.isArray(data) ? data[0] : data;
  return {
    data: (row || null) as Pick<
      Profile,
      "billing_address" | "billing_email" | "phone" | "tax_id" | "tax_id_label"
    > | null,
    error,
  };
}

/**
 * Typeahead over the full worldwide city list.
 *
 * getCities() below is unusable at this size — the table holds ~34,000
 * cities — so anything user-facing goes through this instead.
 */
export async function searchCities(query: string, limit = 12) {
  if (!query || query.trim().length < 2) return { data: [] as City[], error: null };
  const { data, error } = await supabase.rpc("search_cities", {
    p_query: query.trim(),
    p_limit: limit,
  });
  return { data: (data || []) as City[], error };
}

/**
 * Resolves a city, creating it if GeoNames doesn't list it — anything under
 * 15,000 people is missing from that dataset, and plenty of real work
 * happens in those places.
 */
export async function getOrCreateCity(input: {
  name: string;
  state?: string;
  country?: string;
  countryCode?: string;
}) {
  const { data, error } = await supabase.rpc("get_or_create_city", {
    p_name: input.name,
    p_state: input.state ?? null,
    p_country: input.country ?? "India",
    p_country_code: input.countryCode ?? "IN",
  });
  return { id: (data as number | null) ?? null, error };
}

/**
 * The whole table. Only safe where the list is known to be small — it is
 * NOT suitable for a dropdown now that cities are worldwide. Prefer
 * searchCities().
 */
export async function getCities() {
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .order("is_metro", { ascending: false })
    .order("name");
  return { data: (data || []) as City[], error };
}

/**
 * The directory query.
 *
 * Ranks complete profiles above empty ones by default — a photographer with
 * no avatar, bio or portfolio is not a useful search result, and surfacing
 * them makes the whole marketplace look abandoned.
 */
export async function searchFreelancers(
  filters: FreelancerFilters = {},
  limit = 48
) {
  let query = supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("role", "freelancer")
    .eq("is_suspended", false);

  if (filters.q) {
    const q = filters.q.replace(/[%,()]/g, " ").trim();
    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,headline.ilike.%${q}%,bio.ilike.%${q}%`
      );
    }
  }
  if (filters.city) {
    // Someone who works remotely should still surface for a city search.
    query = filters.remoteOnly
      ? query.eq("works_remotely", true)
      : query.or(`city.eq.${filters.city},works_remotely.eq.true`);
  } else if (filters.remoteOnly) {
    query = query.eq("works_remotely", true);
  }
  if (filters.skill) query = query.contains("skills", [filters.skill]);
  if (filters.minRating) query = query.gte("avg_rating", filters.minRating);
  if (filters.maxRate) query = query.lte("hourly_rate", filters.maxRate);
  if (filters.availability) query = query.eq("availability", filters.availability);
  if (filters.verifiedOnly) query = query.eq("is_verified", true);

  switch (filters.sort) {
    case "rating":
      query = query.order("avg_rating", { ascending: false });
      break;
    case "rate_asc":
      query = query.order("hourly_rate", { ascending: true, nullsFirst: false });
      break;
    case "rate_desc":
      query = query.order("hourly_rate", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("completeness", { ascending: false })
        .order("avg_rating", { ascending: false });
  }

  const { data, error } = await query.limit(limit);
  return {
    data: ((data || []) as unknown as Profile[]).map((p) => ({
      ...p,
      avg_rating: p.avg_rating ? Number(p.avg_rating) : 0,
    })),
    error,
  };
}

/**
 * Public profile. Reputation and financial aggregates are denormalised
 * columns maintained by DB triggers (see migration 003) — they used to come
 * from SECURITY DEFINER views that bypassed RLS.
 */
export async function getPublicProfile(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { data: null, error };

  const result: Profile = {
    ...data,
    avg_rating: data.avg_rating ? Number(data.avg_rating) : 0,
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

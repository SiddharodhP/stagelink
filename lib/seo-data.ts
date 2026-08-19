import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase reads used only for metadata and structured data.
 * Uses the anon key, so RLS applies — a draft project or private row can
 * never leak into a meta tag.
 */
function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface SeoProject {
  id: string;
  title: string;
  description: string;
  status: string;
  budget_total: number;
  skills: string[];
  location_pref: string;
  deadline: string | null;
  published_at: string | null;
  bids_count: number;
  category_name: string | null;
  client_name: string;
}

export async function getProjectForSeo(id: string): Promise<SeoProject | null> {
  const supabase = serverClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("projects")
    .select(
      `id, title, description, status, budget_total, skills, location_pref,
       deadline, published_at, bids_count,
       category:category_id(name),
       client:client_id(full_name, company_name)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const category = data.category as { name?: string } | null;
  const client = data.client as { full_name?: string; company_name?: string } | null;

  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    status: data.status,
    budget_total: data.budget_total || 0,
    skills: data.skills || [],
    location_pref: data.location_pref || "remote",
    deadline: data.deadline,
    published_at: data.published_at,
    bids_count: data.bids_count || 0,
    category_name: category?.name || null,
    client_name: client?.company_name || client?.full_name || "A client",
  };
}

export interface SeoProfile {
  id: string;
  full_name: string;
  role: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  avatar_url: string | null;
  location: string | null;
  company_name: string | null;
  avg_rating: number;
  total_reviews: number;
}

export async function getProfileForSeo(id: string): Promise<SeoProfile | null> {
  const supabase = serverClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, headline, bio, skills, avatar_url, location, company_name, avg_rating, total_reviews"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    skills: data.skills || [],
    avg_rating: Number(data.avg_rating) || 0,
    total_reviews: data.total_reviews || 0,
  } as SeoProfile;
}

export interface SeoCategory {
  id: number;
  name: string;
  slug: string;
}

export async function getCategoryBySlug(slug: string): Promise<SeoCategory | null> {
  const supabase = serverClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  return (data as SeoCategory) || null;
}

export async function getAllCategories(): Promise<SeoCategory[]> {
  const supabase = serverClient();
  if (!supabase) return [];
  const { data } = await supabase.from("categories").select("id, name, slug").order("name");
  return (data as SeoCategory[]) || [];
}

export async function getCategoryProjects(categoryId: number, limit = 20) {
  const supabase = serverClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("projects")
    .select(
      `id, title, description, budget_total, skills, bids_count, published_at,
       deadline, experience_level, location_pref,
       client:client_id(full_name, company_name, is_verified, location, avatar_url),
       category:category_id(id, name, slug)`
    )
    .eq("status", "open")
    .eq("category_id", categoryId)
    .order("published_at", { ascending: false })
    .limit(limit);
  return data || [];
}

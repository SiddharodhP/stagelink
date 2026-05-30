import { createClient as createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

export async function getReviews(musicianId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      organizer:organizer_id(organizer_name, company_name)
    `)
    .eq("musician_id", musicianId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function createReview(data: { organizer_id: string; musician_id: string; rating: number; review_text: string }) {
  const { data: response, error } = await supabase
    .from("reviews")
    .insert(data)
    .select()
    .single();

  return { data: response, error };
}

export async function getMusicianRating(musicianId: string) {
  const { data, error } = await supabase
    .from("musician_ratings")
    .select("*")
    .eq("musician_id", musicianId)
    .single();

  return { data, error };
}

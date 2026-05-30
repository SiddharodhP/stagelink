import { createClient as createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

export async function getOrganizerProfile(userId: string) {
  const { data, error } = await supabase
    .from("organizer_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return { data, error };
}

export async function createOrganizerProfile(userId: string, profileData: any) {
  const { data, error } = await supabase
    .from("organizer_profiles")
    .insert({
      user_id: userId,
      ...profileData
    })
    .select()
    .single();

  return { data, error };
}

export async function updateOrganizerProfile(id: string, profileData: any) {
  const { data, error } = await supabase
    .from("organizer_profiles")
    .update(profileData)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

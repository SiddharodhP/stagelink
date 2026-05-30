import { createClient as createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

export async function getMusicianAvailability(musicianId: string) {
  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("musician_id", musicianId);

  return { data, error };
}

export async function updateMusicianAvailability(
  musicianId: string, 
  startDate: string, 
  endDate: string, 
  blockedDates: string[]
) {
  // 1. Delete only manually-blocked entries (is_booked = false) for this musician within the date range
  // Entries with is_booked = true are from accepted inquiries and should be preserved
  const { error: deleteError } = await supabase
    .from("availability")
    .delete()
    .eq("musician_id", musicianId)
    .eq("is_booked", false)
    .gte("available_date", startDate)
    .lte("available_date", endDate);

  if (deleteError) return { error: deleteError };

  // 2. Insert the new blocked dates
  if (blockedDates.length > 0) {
    const insertData = blockedDates.map(date => ({
      musician_id: musicianId,
      available_date: date,
      is_booked: false
    }));

    const { data, error: insertError } = await supabase
      .from("availability")
      .insert(insertData)
      .select();

    return { data, error: insertError };
  }

  return { data: [], error: null };
}

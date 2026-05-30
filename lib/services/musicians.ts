import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { FilterState, MusicianProfile, MusicianCardData } from "@/types/database";

const supabase = createBrowserClient();

export async function getMusicianProfiles(filters: Partial<FilterState>) {
  let query = supabase.from("musician_profiles").select(`
    id,
    user_id,
    stage_name,
    city,
    genres,
    starting_price,
    profile_image,
    verified,
    years_experience,
    team_size,
    musician_ratings(avg_rating, total_reviews)
  `, { count: "exact" });

  if (filters.search) {
    query = query.ilike("stage_name", `%${filters.search}%`);
  }
  
  if (filters.city) {
    query = query.eq("city", filters.city);
  }

  if (filters.genres && filters.genres.length > 0) {
    query = query.contains("genres", filters.genres);
  }
  
  if (filters.languages && filters.languages.length > 0) {
    query = query.contains("languages", filters.languages);
  }

  if (filters.budgetMin !== undefined) {
    query = query.gte("starting_price", filters.budgetMin);
  }
  
  if (filters.budgetMax !== undefined && filters.budgetMax !== Infinity) {
    query = query.lte("starting_price", filters.budgetMax);
  }

  if (filters.teamSize) {
    if (filters.teamSize === "7+") {
      query = query.gte("team_size", 7);
    } else if (filters.teamSize.includes("-")) {
      const [min, max] = filters.teamSize.split("-").map(Number);
      query = query.gte("team_size", min).lte("team_size", max);
    } else {
      query = query.eq("team_size", Number(filters.teamSize));
    }
  }

  // Sorting
  if (filters.sortBy === 'price_asc') {
    query = query.order("starting_price", { ascending: true });
  } else if (filters.sortBy === 'price_desc') {
    query = query.order("starting_price", { ascending: false });
  } else if (filters.sortBy === 'experience') {
    query = query.order("years_experience", { ascending: false });
  } else if (filters.sortBy === 'newest') {
    query = query.order("created_at", { ascending: false });
  }
  // Note: For 'rating', Supabase doesn't easily sort by joined views in the JS client without an RPC, 
  // so we may need to sort in-memory for 'rating' if it was requested, or use an RPC.

  // Pagination (12 items per page)
  const page = filters.page || 1;
  const itemsPerPage = 12;
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;
  
  query = query.range(from, to);

  const { data, error, count } = await query;

  // Format data
  const formattedData: MusicianCardData[] = (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    stage_name: item.stage_name,
    city: item.city,
    genres: item.genres,
    starting_price: item.starting_price,
    profile_image: item.profile_image,
    verified: item.verified,
    years_experience: item.years_experience,
    team_size: item.team_size,
    avg_rating: item.musician_ratings?.[0]?.avg_rating || 0,
    total_reviews: item.musician_ratings?.[0]?.total_reviews || 0,
  }));

  if (filters.sortBy === 'rating') {
    formattedData.sort((a, b) => b.avg_rating - a.avg_rating);
  }

  return { data: formattedData, error, count };
}

export async function getMusicianProfilesByIds(ids: string[]) {
  if (!ids || ids.length === 0) return { data: [], error: null };

  const { data, error } = await supabase.from("musician_profiles").select(`
    id,
    user_id,
    stage_name,
    city,
    genres,
    starting_price,
    profile_image,
    verified,
    years_experience,
    team_size,
    musician_ratings(avg_rating, total_reviews)
  `).in('id', ids);

  if (error) return { data: null, error };

  const formattedData: MusicianCardData[] = (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    stage_name: item.stage_name,
    city: item.city,
    genres: item.genres,
    starting_price: item.starting_price,
    profile_image: item.profile_image,
    verified: item.verified,
    years_experience: item.years_experience,
    team_size: item.team_size,
    avg_rating: item.musician_ratings?.[0]?.avg_rating || 0,
    total_reviews: item.musician_ratings?.[0]?.total_reviews || 0,
  }));

  return { data: formattedData, error };
}

export async function getMusicianProfile(id: string) {
  const { data, error } = await supabase
    .from("musician_profiles")
    .select(`
      *,
      musician_ratings(avg_rating, total_reviews)
    `)
    .eq("id", id)
    .single();

  if (data) {
    return { 
      data: {
        ...data,
        avg_rating: data.musician_ratings?.[0]?.avg_rating || 0,
        total_reviews: data.musician_ratings?.[0]?.total_reviews || 0,
      } as MusicianProfile, 
      error 
    };
  }

  return { data: null, error };
}

export async function getMusicianProfileByUserId(userId: string) {
  const { data, error } = await supabase
    .from("musician_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return { data, error };
}

export async function createMusicianProfile(userId: string, profileData: any) {
  const { data, error } = await supabase
    .from("musician_profiles")
    .insert({
      user_id: userId,
      ...profileData
    })
    .select()
    .single();

  return { data, error };
}

export async function updateMusicianProfile(id: string, profileData: Partial<MusicianProfile>) {
  const { data, error } = await supabase
    .from("musician_profiles")
    .update(profileData)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function uploadProfileImage(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `profiles/${userId}/${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(fileName);

  return { url: publicUrl, error: null };
}

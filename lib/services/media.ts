import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { MediaType } from "@/types/database";

const supabase = createBrowserClient();

export async function uploadMedia(file: File, musicianId: string, type: MediaType, title?: string) {
  // 1. Upload file to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${musicianId}/${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, file);

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  // 3. Save to database
  const { data, error } = await supabase
    .from("musician_media")
    .insert({
      musician_id: musicianId,
      type,
      media_url: publicUrl,
      title: title || file.name
    })
    .select()
    .single();

  return { data, error };
}

export async function getMusicianMedia(musicianId: string) {
  const { data, error } = await supabase
    .from("musician_media")
    .select("*")
    .eq("musician_id", musicianId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function deleteMedia(id: string, mediaUrl: string) {
  // Extract path from public URL
  const urlObj = new URL(mediaUrl);
  const pathParts = urlObj.pathname.split('/');
  const filePath = pathParts.slice(pathParts.indexOf('media') + 1).join('/');

  // 1. Delete from storage
  const { error: storageError } = await supabase.storage
    .from('media')
    .remove([filePath]);

  if (storageError) {
    console.error("Storage deletion error:", storageError);
    // Continue anyway to try to clean up the DB
  }

  // 2. Delete from DB
  const { error } = await supabase
    .from("musician_media")
    .delete()
    .eq("id", id);

  return { error };
}

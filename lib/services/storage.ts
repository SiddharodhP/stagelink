import { createClient as createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

/**
 * Upload to the existing public 'media' bucket under a namespaced path.
 * kind: 'avatars' | 'attachments' | 'deliverables' | 'portfolio'
 */
export async function uploadFile(kind: string, ownerId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${kind}/${ownerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) return { url: null, error };

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(path);
  return { url: publicUrl, error: null };
}

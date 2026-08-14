import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { MarketplaceRole } from "@/types/marketplace";

// Use this for browser-side auth actions
const supabase = createBrowserClient();

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}

export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    window.location.href = "/";
  }
  return { error };
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

export async function getMyProfile() {
  const { user } = await getCurrentUser();
  if (!user) return { data: null, error: new Error("Not signed in") };
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { data, error };
}

/** First-time role selection ('client' | 'freelancer'); locked afterwards by a DB trigger. */
export async function setRole(role: Exclude<MarketplaceRole, "admin">) {
  const { user } = await getCurrentUser();
  if (!user) return { data: null, error: new Error("Not signed in") };
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id)
    .select()
    .single();
  return { data, error };
}

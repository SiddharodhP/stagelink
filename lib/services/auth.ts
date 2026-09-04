import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { MarketplaceRole } from "@/types/marketplace";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/services/profiles";

// Use this for browser-side auth actions
const supabase = createBrowserClient();

/**
 * Where to send someone after signing in.
 *
 * Only same-site paths are allowed. A bare `next=https://evil.example` or a
 * protocol-relative `next=//evil.example` would otherwise turn the login
 * page into an open redirect — a phishing primitive, since the link would
 * genuinely start on our domain.
 */
function safeNext(next?: string | null) {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function callbackUrl(next?: string | null) {
  const base = `${window.location.origin}/auth/callback`;
  const safe = safeNext(next);
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base;
}

export async function signInWithGoogle(next?: string | null) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(next),
    },
  });

  return { data, error };
}

export async function signInWithMagicLink(email: string, next?: string | null) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl(next),
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
  // Not select("*") — migration 011 revoked column-level SELECT on the
  // billing block. Own billing details come from getMyBilling().
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
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
    .select(PUBLIC_PROFILE_COLUMNS)
    .single();
  return { data, error };
}

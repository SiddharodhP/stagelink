import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * ONLY for platform-side work that acts for no particular user — the
 * nightly invoice cron. Never import this into anything that runs in the
 * browser, and never expose the key with a NEXT_PUBLIC_ prefix: it would
 * be bundled into client JS and hand every visitor full database access.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured — the invoice cron cannot run."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

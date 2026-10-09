import { createBrowserClient } from '@supabase/ssr';

/**
 * The Supabase client for code that runs in the browser.
 *
 * WHY THE KEY IS CHECKED AND NOT JUST USED
 *
 * Whatever is in NEXT_PUBLIC_SUPABASE_ANON_KEY is compiled into the JavaScript
 * bundle and served to everyone who loads a page. That is fine for an anon key,
 * which is public by design and is held in check by row level security.
 *
 * It is a total compromise for a service role key. That one bypasses RLS
 * entirely, so publishing it hands every visitor the ability to read every
 * user's data, write anything, and call the platform-internal functions that
 * move money -- including the one that marks a milestone paid.
 *
 * The two keys are both long opaque-looking JWTs sitting next to each other in
 * the dashboard, so pasting the wrong one is an easy mistake and a silent one.
 * The role is a readable claim in the token, so it costs nothing to check, and
 * this fails closed: a site that will not start is recoverable, a leaked
 * service role key is not.
 */

/**
 * Reads the `role` claim without verifying the signature, which is not ours to
 * verify. atob rather than Buffer: this module runs in the browser, where
 * Buffer is not polyfilled, and a ReferenceError caught below would turn the
 * check into one that always passes.
 */
function roleClaim(key: string): string | null {
  const payload = key.split('.')[1];
  if (!payload) return null; // Not a JWT -- a publishable key, which is fine.
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

function publishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
  }

  if (roleClaim(key) === 'service_role') {
    const message =
      'NEXT_PUBLIC_SUPABASE_ANON_KEY holds a service_role key. Anything with a ' +
      'NEXT_PUBLIC_ prefix is compiled into the browser bundle, and a ' +
      'service_role key bypasses row level security, so this publishes full ' +
      'read and write access to the database to every visitor. Rotate that key ' +
      'in the Supabase dashboard and put the anon / publishable key here.';

    // Refusing to serve is the right answer in production: a site that will
    // not boot is recoverable, a leaked service role key is not.
    if (process.env.NODE_ENV === 'production') throw new Error(message);

    // In development the bundle only reaches this machine, so the leak is not
    // the urgent part -- being unable to work is worse. It is still shouted
    // about, because the second problem is quieter and worse for testing: a
    // browser holding a service_role key bypasses RLS, so every policy the
    // app appears to enforce locally is not actually being exercised.
    console.error(
      [
        '',
        '*** ' + message,
        '*** Until it is fixed, nothing RLS-dependent on localhost is a real test.',
        '',
      ].join('\n')
    );
  }

  return key;
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publishableKey());
}

/**
 * client.ts — server-side Supabase client.
 *
 * Uses the service role key — NEVER exposed to the browser.
 * All DB operations go through this client on the server only.
 *
 * Lazy initialization: client is created on first use, not at module load.
 * This prevents test failures when env vars are absent (mocked in tests).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}

// Named export for backward compat — lazily delegates to getClient()
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

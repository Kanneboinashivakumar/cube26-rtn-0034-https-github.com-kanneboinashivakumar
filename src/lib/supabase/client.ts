/**
 * client.ts — server-side Supabase client.
 *
 * Uses the service role key — NEVER exposed to the browser.
 * All DB operations go through this client on the server only.
 */

import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Singleton — recreated per module load (serverless safe)
export const supabase = getSupabaseClient();

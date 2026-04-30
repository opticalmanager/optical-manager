import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase Admin client using the service role key.
 *
 * ⚠️ WARNING: This client BYPASSES Row Level Security.
 * ONLY use on the server for admin operations like:
 * - Creating shop manager accounts
 * - Running migrations
 * - Background jobs
 *
 * NEVER import this in Client Components or expose to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

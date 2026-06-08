/**
 * Supabase Admin Client
 * 
 * ⚠️ WARNING: This client uses SERVICE_ROLE_KEY and bypasses Row Level Security (RLS).
 * 
 * ONLY use this client for:
 * - Server-side cron jobs
 * - Admin operations (after verifying admin permissions)
 * - System operations that require elevated privileges
 * 
 * NEVER import this in client components or expose to the browser.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Creates a Supabase client with service role privileges.
 * This client bypasses Row Level Security and should only be used server-side.
 * 
 * @throws {Error} If required environment variables are missing
 * @returns Supabase client with admin privileges
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

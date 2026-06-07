import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./supabase/server";

/**
 * Authentication helper untuk API routes
 * Returns user if authenticated, null otherwise
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Check if user is admin
 * Returns true if user has admin privileges
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", userId)
    .single();
  
  if (!profile?.preferences) return false;
  
  const prefs = profile.preferences as Record<string, unknown>;
  return prefs.is_admin === true;
}

/**
 * Middleware: Require authentication
 * Returns 401 if not authenticated
 */
export async function requireAuth(_request?: NextRequest): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  
  return null; // No error, continue
}

/**
 * Middleware: Require admin privileges
 * Returns 401 if not authenticated, 403 if not admin
 */
export async function requireAdmin(_request?: NextRequest): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  
  const isAdmin = await isUserAdmin(user.id);
  
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin privileges required" },
      { status: 403 }
    );
  }
  
  return null; // No error, continue
}

/**
 * Middleware: Verify cron secret
 * Returns 401 if secret is missing or invalid
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // ALWAYS require secret (fail closed)
  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron jobs not configured" },
      { status: 503 }
    );
  }
  
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  return null; // No error, continue
}

/**
 * Middleware: Verify API key or bearer token
 * For external API access
 */
export function verifyApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-api-key");
  const validApiKey = process.env.EXTERNAL_API_KEY;
  
  if (!validApiKey) {
    // If no API key configured, fall back to auth check
    return null;
  }
  
  if (apiKey !== validApiKey) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }
  
  return null;
}

/**
 * Server-side guard helpers for the /admin section.
 * Used by page.tsx / layout.tsx files in the admin tree.
 */
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { isUserAdmin } from "@/lib/admin-auth";

/**
 * Run at the top of every /admin/* server component.
 * Redirects unauthenticated users to /auth/login and authenticated non-admins
 * to /dashboard?error=forbidden. Throws (via redirect) on failure, returns the
 * user id on success.
 */
export async function requireAdminForPage(): Promise<{ id: string; email: string | null }> {
  const user = await getUser();
  if (!user) {
    redirect("/auth/login?next=/admin");
  }
  const admin = await isUserAdmin(user.id);
  if (!admin) {
    redirect("/dashboard?error=forbidden");
  }
  return { id: user.id, email: user.email ?? null };
}

/**
 * Server-side guard for the entire /admin section.
 * Runs before any nested page or server component, so every admin page
 * is protected even if individual pages forget to add their own check.
 */
import { requireAdminForPage } from "./_lib/guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects guests to /auth/login and non-admins to /dashboard.
  await requireAdminForPage();
  return <>{children}</>;
}

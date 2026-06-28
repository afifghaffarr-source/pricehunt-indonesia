"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { User, LogIn, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/actions/auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />;
  }

  if (user) {
    return (
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu akun"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          // Mobile a11y (P8): explicit 40px tap target + visible focus ring.
          className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <User className="h-5 w-5" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Akun"
            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover py-1 shadow-md"
          >
            <p className="px-3 py-1.5 text-xs text-muted-foreground truncate">
              {user.email}
            </p>
            <div className="border-t" role="separator" />
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              className="flex min-h-[44px] items-center gap-2 rounded-sm px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              role="menuitem"
              className="flex min-h-[44px] items-center gap-2 rounded-sm px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Pengaturan
            </Link>
            <div className="border-t" role="separator" />
            <form action={logout}>
              <button
                type="submit"
                role="menuitem"
                className="flex min-h-[44px] w-full items-center gap-2 rounded-sm px-3 text-sm text-destructive hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Keluar
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/auth/login"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <LogIn className="mr-2 h-4 w-4" />
      Masuk
    </Link>
  );
}

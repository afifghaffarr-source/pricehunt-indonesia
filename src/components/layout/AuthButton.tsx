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
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <User className="h-4 w-4" />
          <span className="sr-only">Menu</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover py-1 shadow-md">
            <p className="px-3 py-1.5 text-xs text-muted-foreground truncate">
              {user.email}
            </p>
            <div className="border-t" />
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Pengaturan
            </Link>
            <div className="border-t" />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
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

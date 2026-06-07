"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
    );
  }

  if (user) {
    return (
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <User className="h-4 w-4" />
        <span className="sr-only">Dashboard</span>
      </Link>
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

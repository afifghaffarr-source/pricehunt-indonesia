"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Search,
  Sparkles,
  LayoutDashboard,
  Shield,
  Moon,
  Sun,
  Heart,
  User,
  Tag,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { AuthButton } from "./AuthButton";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

export function Header() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data?.user?.is_admin || false);
        }
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, []);

  const navItems: NavItem[] = [
    { href: "/search", label: "Cari Produk", icon: Search },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leaderboard", label: "Promo Pintar", icon: Sparkles },
    { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Tag className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">
            Price<span className="text-primary">Hunt</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
                            (item.href === '/dashboard' && pathname.startsWith('/dashboard'));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            onClick={toggleTheme}
            suppressHydrationWarning
          >
            {isDark ? (
              <Sun className="h-4 w-4" suppressHydrationWarning />
            ) : (
              <Moon className="h-4 w-4" suppressHydrationWarning />
            )}
            <span className="sr-only">Toggle tema</span>
          </button>
          <AuthButton />
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-background/95 px-2 py-2 shadow-lg backdrop-blur md:hidden">
        <Link
          href="/search"
          className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
            pathname === "/search" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Cari</span>
        </Link>
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
            pathname.startsWith("/dashboard") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>Wishlist</span>
        </Link>
        <Link
          href="/compare"
          className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
            pathname === "/compare" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Bandingkan</span>
        </Link>
        <Link
          href="/leaderboard"
          className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
            pathname === "/leaderboard" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Promo</span>
        </Link>
        <Link
          href="/settings"
          className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
            pathname === "/settings" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Akun</span>
        </Link>
      </nav>
    </header>
  );
}

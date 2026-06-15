"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Search,
  Sparkles,
  Shield,
  Moon,
  Sun,
  Heart,
  User,
  Tag,
  Bell,
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
    { href: "/dashboard/alerts", label: "Pantau Harga", icon: Bell },
    { href: "/deals", label: "Promo Pintar", icon: Sparkles },
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
          <span className="text-lg font-bold">
            Bijak<span className="text-primary">Beli</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Menu utama">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
                            (item.href === '/dashboard' && pathname.startsWith('/dashboard'));
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md text-sm font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
            // Mobile a11y (P8): 40px tap target (up from 32px). Not 44px
            // because the button is in a tight header bar; 40px still
            // meets Material Design and is close to Apple HIG. Uses
            // rounded-full and explicit aria-label for screen readers.
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={toggleTheme}
            aria-label={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
            suppressHydrationWarning
          >
            {isDark ? (
              <Sun className="h-5 w-5" suppressHydrationWarning />
            ) : (
              <Moon className="h-5 w-5" suppressHydrationWarning />
            )}
          </button>
          <AuthButton />
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-background/95 px-2 py-2 shadow-lg backdrop-blur md:hidden"
        aria-label="Menu mobile"
      >
        {[
          { href: "/search", label: "Cari", icon: Search, isActive: pathname === "/search" },
          { href: "/dashboard", label: "Wishlist", icon: Heart, isActive: pathname.startsWith("/dashboard") },
          { href: "/compare", label: "Bandingkan", icon: BarChart3, isActive: pathname === "/compare" },
          { href: "/deals", label: "Promo", icon: Sparkles, isActive: pathname === "/deals" },
          { href: "/settings", label: "Akun", icon: User, isActive: pathname === "/settings" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              aria-label={item.label}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                item.isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

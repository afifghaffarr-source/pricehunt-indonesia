"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Search, Sparkles, Tag, Moon, Sun } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { AuthButton } from "./AuthButton";

export function Header() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const navItems = [
    { href: "/search", label: "Cari Produk" },
    { href: "/dashboard", label: "Pantau Harga" },
    { href: "/compare", label: "Bandingkan" },
    { href: "/leaderboard", label: "Promo Pintar" },
    { href: "/dashboard", label: "Insight Saya" },
  ];

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

        <nav className="hidden items-center gap-5 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButton />
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
          <Link
            href="/search"
            className={buttonVariants({ variant: "default", size: "sm" }) + " hidden sm:flex"}
          >
            <Search className="mr-2 h-4 w-4" />
            Cari Harga
          </Link>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-background/95 px-2 py-2 shadow-lg backdrop-blur md:hidden">
        <Link href="/search" className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <Search className="h-4 w-4" />
          Cari
        </Link>
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <Bell className="h-4 w-4" />
          Pantau
        </Link>
        <Link href="/compare" className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          Bandingkan
        </Link>
        <Link href="/leaderboard" className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Promo
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
          <Tag className="h-4 w-4" />
          Akun
        </Link>
      </nav>
    </header>
  );
}

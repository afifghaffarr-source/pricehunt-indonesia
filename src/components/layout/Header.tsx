"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Tag, Moon, Sun } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { AuthButton } from "./AuthButton";

export function Header() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

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
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Beranda
          </Link>
          <Link
            href="/search"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/search" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Cari Produk
          </Link>
          <Link
            href="/leaderboard"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/leaderboard" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Leaderboard
          </Link>
          <Link
            href="/compare"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/compare" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Bandingkan
          </Link>
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
    </header>
  );
}

"use client";

/**
 * Dev-only preview toolbar for the /extension landing page:
 *  - Banner variant switcher (live / legacy / draft)
 *  - Background theme A/B (light / dark)
 *
 * The toolbar choice is persisted to a cookie via `document.cookie` AND
 * `localStorage` so it survives navigation without a full reload. The
 * server reads the cookie to decide which banner to render.
 *
 * No production usage — the import in src/app/extension/page.tsx is gated
 * by `process.env.NODE_ENV !== "production"`.
 */

import { useEffect, useState } from "react";
import { Eye, Sun, Moon } from "lucide-react";

type Mode = "live" | "legacy" | "draft";
type Theme = "light" | "dark";

const COOKIE_KEY = "bijakbeli_banner_preview";
const LS_KEY = "bijakbeli_dev_theme";
const VALID_MODES: Mode[] = ["live", "legacy", "draft"];
const VALID_THEMES: Theme[] = ["light", "dark"];

function isMode(s: string | null): s is Mode {
  return !!s && (VALID_MODES as string[]).includes(s);
}
function isTheme(s: string | null): s is Theme {
  return !!s && (VALID_THEMES as string[]).includes(s);
}

function setBannerCookie(mode: Mode) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_KEY}=${mode}; path=/; max-age=${oneYear}; SameSite=Lax`;
}

function readBannerCookie(): Mode | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((p) => p.startsWith(`${COOKIE_KEY}=`));
  if (!m) return null;
  const val = m.slice(COOKIE_KEY.length + 1);
  return isMode(val) ? val : null;
}

function readInitialBanner(): Mode {
  if (typeof window === "undefined") return "draft";
  const fromUrl = new URLSearchParams(window.location.search).get("banner");
  if (isMode(fromUrl)) return fromUrl;
  const fromCookie = readBannerCookie();
  if (fromCookie) return fromCookie;
  return "draft";
}

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const fromLs = window.localStorage.getItem(LS_KEY);
  if (isTheme(fromLs)) return fromLs;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function DevBannerToolbar() {
  const [mode, setMode] = useState<Mode>("draft");
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMode(readInitialBanner());
    setTheme(readInitialTheme());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem(LS_KEY, theme);
  }, [theme, hydrated]);

  function applyMode(next: Mode) {
    setMode(next);
    setBannerCookie(next);
    // trigger server re-render via reload — page server reads cookie
    window.location.reload();
  }

  return (
    <div
      data-testid="dev-preview-toolbar"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-100/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/30 dark:text-amber-200"
      role="region"
      aria-label="Dev preview toolbar"
    >
      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="font-medium">Preview (dev-only):</span>

      {/* Banner variant */}
      <span className="ml-2 text-amber-800 dark:text-amber-300">banner:</span>
      {VALID_MODES.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => applyMode(m)}
          aria-pressed={mode === m}
          data-active={mode === m}
          className="rounded px-2 py-0.5 transition-colors data-[active=true]:bg-amber-700 data-[active=true]:text-white hover:bg-amber-200/70 dark:hover:bg-amber-800/60 aria-pressed:bg-amber-700 aria-pressed:text-white"
        >
          {m}
        </button>
      ))}

      <span className="mx-2 h-4 w-px bg-amber-500/40" aria-hidden="true" />

      {/* Theme A/B */}
      <span className="text-amber-800 dark:text-amber-300">theme:</span>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        data-active={theme === "light"}
        className="flex items-center gap-1 rounded px-2 py-0.5 transition-colors data-[active=true]:bg-amber-700 data-[active=true]:text-white hover:bg-amber-200/70 dark:hover:bg-amber-800/60 aria-pressed:bg-amber-700 aria-pressed:text-white"
      >
        <Sun className="h-3 w-3" aria-hidden="true" />
        light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        data-active={theme === "dark"}
        className="flex items-center gap-1 rounded px-2 py-0.5 transition-colors data-[active=true]:bg-amber-700 data-[active=true]:text-white hover:bg-amber-200/70 dark:hover:bg-amber-800/60 aria-pressed:bg-amber-700 aria-pressed:text-white"
      >
        <Moon className="h-3 w-3" aria-hidden="true" />
        dark
      </button>

      <a
        href="/extension"
        className="ml-auto text-[11px] text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        onClick={(e) => {
          e.preventDefault();
          document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
          window.localStorage.removeItem(LS_KEY);
          window.location.href = "/extension";
        }}
      >
        reset all
      </a>
    </div>
  );
}

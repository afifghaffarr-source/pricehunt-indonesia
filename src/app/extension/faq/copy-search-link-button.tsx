"use client";

/**
 * CopySearchLinkButton — tiny client component that exposes the current
 * filtered FAQ URL to the clipboard. Server-component parent only renders
 * this when `searchParams.q` has narrowed the page, so the button never
 * appears on the pristine /extension/faq route.
 *
 * Why an island and not a server action?
 *   - navigator.clipboard requires the page to be hydrated (DOM ready)
 *   - the only "state" is a transient "copied" toast, which would need
 *     client interactivity anyway
 *   - UX is "click, copy, done" — no form submission, no navigation
 *
 * Why no toast library?
 *   - Adds bundle weight (~4-12 KB minified) for a 2-second "Copied!" state
 *   - The inline "✓ Tersalin" feedback is enough for an extension FAQ page
 *   - data-share-state hook gives analytics vendors a hook if they need it
 *
 * Pitfalls handled:
 *   - navigator.clipboard undefined in non-HTTPS / non-localhost contexts
 *     (falls back to a textarea+execCommand)
 *   - window.location may strip query params in some preview proxies — we
 *     always read the current href, never a stale server-injected value
 */
import { useCallback, useEffect, useState } from "react";
import { Link2 } from "lucide-react";

type CopyState = "idle" | "copied" | "failed";

export function CopySearchLinkButton() {
  const [state, setState] = useState<CopyState>("idle");
  const [href, setHref] = useState<string>("");

  // Read href from window once mounted — server can't know the full URL
  // (proxy strips origin in dev, may not match production canonical).
  useEffect(() => {
    setHref(window.location.href);
  }, []);

  const handleCopy = useCallback(async () => {
    const target = href || (typeof window !== "undefined" ? window.location.href : "");
    if (!target) {
      setState("failed");
      return;
    }

    // Modern path — secure context only.
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(target);
        setState("copied");
        return;
      } catch {
        // Fall through to execCommand path on permission denial.
      }
    }

    // Legacy fallback for non-HTTPS preview deployments (rarely needed
    // in production, but useful for Vercel preview URLs).
    try {
      const ta = document.createElement("textarea");
      ta.value = target;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setState(ok ? "copied" : "failed");
    } catch {
      setState("failed");
    }
  }, [href]);

  // Auto-revert the success/failure chip after ~1.6s so it reads as a
  // transient acknowledgment, not a stuck button label.
  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 1600);
    return () => window.clearTimeout(t);
  }, [state]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid="faq-copy-permalink"
      data-share-state={state}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-label="Salin URL pencarian saat ini ke papan klip"
    >
      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        {state === "copied"
          ? "✓ Tersalin"
          : state === "failed"
            ? "Gagal menyalin"
            : "Salin tautan pencarian"}
      </span>
    </button>
  );
}

export default CopySearchLinkButton;

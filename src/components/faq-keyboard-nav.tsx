"use client";

/**
 * FAQ page keyboard navigation:
 *   /        → focus the search input (works from anywhere on the page)
 *   ↑ / k    → focus previous summary in region (or next group up)
 *   ↓ / j    → focus next summary in region (or next group down)
 *   Esc      → blur the search input (and clear value if non-empty)
 *   Space    → native <details> open/close (no JS needed)
 *   Enter    → native <form> submit (search)
 *
 * The page itself is server-rendered; this client component only adds
 * keyboard handlers. Native semantic elements do the rest.
 */

import { useEffect } from "react";

/** Browsable summary elements — wraps every <details> question. */
function getSummaries(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("details > summary"),
  );
}

/** Move focus to a neighbouring summary, wrapping within the page. */
function moveBy(delta: 1 | -1) {
  const summaries = getSummaries();
  if (summaries.length === 0) return;
  const active = document.activeElement as HTMLElement | null;
  const idx = active ? summaries.indexOf(active) : -1;
  const next =
    idx < 0
      ? delta === 1
        ? 0
        : summaries.length - 1
      : (idx + delta + summaries.length) % summaries.length;
  const target = summaries[next];
  target?.focus();
  target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export function FaqKeyboardNav() {
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const target = ev.target as HTMLElement | null;
      const inSearch =
        target?.getAttribute("data-faq-search-input") === "1" ||
        (target instanceof HTMLInputElement &&
          target.getAttribute("id") === "faq-search");

      // Skip when the user is typing in any input/textarea that isn't ours
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        if (!inSearch) return;
      }

      // "/" always focuses the search input — but only when no input is focused
      if (ev.key === "/" && !inSearch) {
        ev.preventDefault();
        const search = document.getElementById("faq-search") as HTMLInputElement | null;
        if (search) {
          search.focus();
          search.select?.();
        }
        return;
      }

      // Esc clears the search field if it has content; otherwise falls through
      // to the native blur behaviour.
      if (ev.key === "Escape") {
        if (inSearch) {
          const search = target as HTMLInputElement;
          if (search.value) {
            search.value = "";
            // Submit the form so the URL updates (?q= removed) without reload.
            search.form?.requestSubmit?.();
          }
          search.blur();
        }
        return;
      }

      // ↑ / ↓ / k / j — only active when a summary is already focused, or
      // when not in a text input. We allow them from the search input too:
      // if the user wants to use ↑↓ to navigate while typing, they get it.
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Allow ↑↓ from search field — common GH-style pattern
        if (!inSearch) return;
      }
      if (ev.key === "ArrowDown" || ev.key === "j") {
        ev.preventDefault();
        moveBy(1);
      } else if (ev.key === "ArrowUp" || ev.key === "k") {
        ev.preventDefault();
        moveBy(-1);
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return null;
}

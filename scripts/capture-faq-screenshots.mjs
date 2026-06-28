#!/usr/bin/env node
/**
 * FAQ page screenshots (light/dark, open/closed). Uses Chromium directly.
 * Includes a forceHydration() helper that swaps the streaming loading.tsx
 * skeleton with the hidden real-content <div> when hydration never
 * completes in headless mode.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = "/home/ubuntu/projects/bijakbeli-app/scripts/marketing-assets/captured/faq";
const URL = "http://localhost:3000/extension/faq";

await mkdir(OUT_DIR, { recursive: true });

/** Swap the streaming loading.tsx skeleton with the hidden real content. */
function forceHydration() {
  const bodyMain = document.querySelector("body main#main-content");
  if (!bodyMain) return false;

  // If skeleton is gone or no skeletons visible, already hydrated
  const skeletons = bodyMain.querySelectorAll(".animate-pulse");
  if (skeletons.length === 0) {
    // Still ensure no chart/loader leftovers
    document
      .querySelectorAll(".animate-pulse")
      .forEach((el) => el.classList.remove("animate-pulse"));
    return false;
  }

  // Find the hidden <div hidden> wrapping the real FAQ content
  const hiddenDiv = Array.from(document.querySelectorAll("div[hidden]")).find(
    (el) => el.querySelector("main")
  );

  if (hiddenDiv) {
    const realMain = hiddenDiv.querySelector("main");
    if (realMain) bodyMain.replaceWith(realMain);
  } else {
    // No hidden copy — just neutralize skeletons
    skeletons.forEach((el) => {
      el.classList.remove("animate-pulse");
      el.style.animation = "none";
    });
  }
  return true;
}

const shots = [
  ["faq-light-1280x800.png", "light", { width: 1280, height: 800 }],
  ["faq-light-expanded-1280x1400.png", "light", { width: 1280, height: 1400 }],
  ["faq-dark-1280x800.png", "dark", { width: 1280, height: 800 }],
  ["faq-search-1280x900.png", "searched", { width: 1280, height: 900 }],
];

for (const [filename, scheme, viewport] of shots) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  if (scheme === "dark") await page.emulateMedia({ colorScheme: "dark" });
  // Searched: navigate to /faq?q=tokopedia so server filter is active
  const targetUrl =
    scheme === "searched" ? `${URL}?q=tokopedia` : URL;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  // Search-filtered pages have fewer <details> (4 for tokopedia) — relax
  // the wait. For non-searched pages we expect the full 22 details.
  await page.waitForFunction(
    () => document.querySelectorAll("details").length >= 1,
    { timeout: 20_000 }
  );
  // For dark mode: force the dark theme by injecting "dark" class on
  // <html>. Apply AFTER the hydration swap so it's not lost.
  await page.evaluate(forceHydration);
  if (scheme === "dark") {
    // Force dark mode for the screenshot. Tailwind v4 + globals.css dark
    // variant sometimes doesn't propagate after our DOM swap; bypass with
    // direct style overrides to guarantee a dark capture.
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      const style = document.createElement("style");
      style.textContent = `
        body, html, main, [class*="bg-white"]:not([class*="open:"]) {
          background-color: #0f0f10 !important;
          color: #e5e7eb !important;
        }
        details { background-color: #18181b !important; border-color: #27272a !important; color: #e5e7eb !important; }
        details summary { color: #e5e7eb !important; }
        details > div { color: #a1a1aa !important; border-color: #27272a !important; }
        h1, h2, h3, h4, h5, h6, p, span, strong, em { color: #e5e7eb !important; }
        a { color: #34d399 !important; }
        [class*="text-zinc-"], [class*="text-muted-"] { color: #a1a1aa !important; }
      `;
      document.head.appendChild(style);
      try { localStorage.setItem("theme", "dark"); } catch {}
    });
    await page.waitForTimeout(300);
  }
  // For the expanded shot, open 1st, 4th, 7th questions after swap
  if (filename.includes("expanded")) {
    await page.evaluate(() => {
      const details = document.querySelectorAll("details");
      [0, 3, 6].forEach((i) => details[i]?.setAttribute("open", ""));
    });
  }
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(OUT_DIR, filename),
    type: "png",
  });
  console.log(`✓ ${basename(filename)} (${scheme} ${viewport.width}×${viewport.height})`);
  await browser.close();
}

console.log(`\nFAQ captures written to: ${OUT_DIR}`);

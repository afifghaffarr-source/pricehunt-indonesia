#!/usr/bin/env node
/**
 * Capture the /extension page in all three banner variants
 * (live, legacy, draft) plus light + dark theme A/B.
 *
 * Sets the bijakbeli_banner_preview cookie before each visit so the
 * server renders the matching variant. Light/dark mode is forced via
 * localStorage and class injection.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = "/home/ubuntu/projects/bijakbeli-app/scripts/marketing-assets/captured/extension";
const URL = "http://localhost:3000/extension";

await mkdir(OUT_DIR, { recursive: true });

const variants = ["draft", "legacy", "live"];
const themes = ["light", "dark"];

for (const v of variants) {
  for (const t of themes) {
    // No real CWS extension ID in dev → "live" variant won't render. That
    // matches production behavior (banner shows only when published).
    if (v === "live") continue;

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      storageState: {
        cookies: [],
        origins: [
          {
            origin: "http://localhost:3000",
            localStorage: [{ name: "bijakbeli_dev_theme", value: t }],
          },
        ],
      },
    });
    await context.addCookies([
      {
        name: "bijakbeli_banner_preview",
        value: v,
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await context.newPage();
    if (t === "dark") await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      (variant) =>
        document.querySelector(
          `[data-banner="${variant}"], [data-testid="dev-preview-toolbar"]`,
        ) !== null,
      v,
      { timeout: 20_000 }
    );
    // Force theme + neutralize any leftover skeleton
    await page.evaluate((theme) => {
      if (theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      document
        .querySelectorAll(".animate-pulse")
        .forEach((el) => el.classList.remove("animate-pulse"));
      // For dark, also override bg to ensure visibility
      if (theme === "dark") {
        const style = document.createElement("style");
        style.textContent = `body, html { background-color: #0f0f10 !important; color: #e5e7eb !important; } main { background-color: transparent !important; }`;
        document.head.appendChild(style);
      }
    }, t);
    await page.waitForTimeout(400);

    const filename = `extension-banner-${v}-${t}-1280x800.png`;
    await page.screenshot({
      path: join(OUT_DIR, filename),
      type: "png",
    });
    console.log(`✓ ${filename}`);
    await browser.close();
  }
}

console.log(`\nBanner preview screenshots written to: ${OUT_DIR}`);

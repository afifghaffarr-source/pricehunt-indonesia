#!/usr/bin/env node
/**
 * Capture FAQ page in keyboard-navigation state: focus the first summary
 * via simulated ArrowDown after typing in search. Renders a golden focus
 * ring around the active summary so the screenshot documents the feature
 * for visual regression checks.
 *
 * Output: scripts/marketing-assets/captured/faq/faq-keyboard-focused-1280x800.png
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const URL = "http://localhost:3000/extension/faq";
const OUT = "/home/ubuntu/projects/bijakbeli-app/scripts/marketing-assets/captured/faq";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForFunction(
  () => document.querySelectorAll("details").length >= 11,
  { timeout: 20_000 }
);
await page.waitForTimeout(1500);

// Force hydration swap if needed (same pattern as capture-faq-screenshots.mjs)
await page.evaluate(() => {
  const main = document.querySelector("body main#main-content");
  if (!main) return;
  if (main.querySelectorAll(".animate-pulse").length === 0) return;
  const hidden = Array.from(document.querySelectorAll("div[hidden]")).find((el) =>
    el.querySelector("main")
  );
  const real = hidden?.querySelector("main");
  if (real) main.replaceWith(real);
});

// Press "/" to focus the search field first (mirrors user behavior)
await page.keyboard.press("/");
await page.waitForTimeout(200);
// Now press ArrowDown to focus the first summary
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(300);
// Open the focused summary so the answer is also visible
await page.keyboard.press("Enter");
await page.waitForTimeout(400);

await page.screenshot({
  path: join(OUT, "faq-keyboard-focused-1280x800.png"),
  type: "png",
});
console.log("✓ faq-keyboard-focused-1280x800.png (focused summary + opened)");
await browser.close();

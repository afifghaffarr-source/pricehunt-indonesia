#!/usr/bin/env node
/**
 * Real Chrome extension popup capture.
 * Loads the actual unpacked extension into Chromium via --load-extension,
 * navigates to a sandbox product page (no real scrape against marketplace
 * to avoid triggering anti-bot), opens the real extension popup/sidepanel,
 * and screenshots the actual production UI rendered by the bundled JS.
 *
 * Output: scripts/marketing-assets/captured/real/
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT = join(__dirname, "../extension");
const OUT_DIR = join(__dirname, "marketing-assets/captured/real");

// Build sandbox HTML serving as faux marketplace product page
function sandboxHTML(price, title, marketplace) {
  return `<!DOCTYPE html>
<html><head><title>${title} — ${marketplace}</title>
<style>
body { font-family: -apple-system, system-ui, sans-serif; max-width: 1100px; margin: 40px auto; padding: 32px; }
h1 { font-size: 22px; }
.price { font-size: 32px; font-weight: 800; color: #e53935; }
.seller { color: #555; font-size: 14px; }
.rating { color: #f59e0b; font-size: 14px; }
.badge { background: #fef3c7; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-top: 8px; font-size: 12px; }
</style></head><body>
<h1 data-product-title="${title}">${title}</h1>
<div data-product-price="${price}">Rp ${price.toLocaleString("id-ID")}</div>
<div class="seller">${marketplace} Official Store</div>
<div class="rating">★ 4.8 (1,234 reviews)</div>
<div class="badge">In stock</div>
<button>Buy Now</button>
</body></html>`;
}

async function run() {
  const userDataDir = "/tmp/chromium-ext-" + Date.now();
  // Try with Xvfb virtual framebuffer so we have a real DISPLAY for
  // chrome-extension:// URLs to load correctly (headless cannot load
  // chrome-extension:// in some versions).
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      "--no-sandbox",
      "--no-first-run",
      "--disable-default-apps",
      "--window-size=1280,800",
    ],
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  // Wait for the extension to register (MV3 service worker)
  await new Promise(r => setTimeout(r, 2000));

  // Find the extension ID via CDP — Playwright sometimes doesn't surface
  // serviceWorkers() in headless; we enumerate via debugger API.
  let extensionId = null;
  const cdp = await browser.newCDPSession(browser.pages()[0]);
  try {
    const result = await cdp.send("Extensions.getExtensions", {});
    const ext = (result.extensionInfos || []).find(
      e => e.path === EXT || e.name?.includes("BijakBeli")
    );
    extensionId = ext?.id;
  } catch (e) {
    // CDP method not available — fall back to guesstimate via filesystem
    const fs = await import("node:fs/promises");
    try {
      const dirs = await fs.readdir("/tmp/chromium-ext-");
      // never falls into this branch because we used Date.now() in path
    } catch {}
  }

  // Fallback: extract from background service worker URL if it appears
  if (!extensionId) {
    const workers = browser.serviceWorkers();
    if (workers.length > 0) {
      extensionId = workers[0].url().split("/")[2];
    }
  }
  if (!extensionId) {
    const pages = browser.backgroundPages();
    if (pages.length > 0) {
      extensionId = pages[0].url().split("/")[2];
    }
  }
  if (!extensionId) {
    console.error("Could not determine extension ID. CDP result:",
      await cdp.send("Extensions.getExtensions", {}).catch(() => null));
    await browser.close();
    return;
  }
  console.log(`Loaded extension: ${extensionId}`);

  await mkdir(OUT_DIR, { recursive: true });

  // 1. Screenshot the actual popup.html — open it as a chromium extension page
  const popupPage = await browser.newPage();
  await popupPage.setViewportSize({ width: 400, height: 600 });
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await popupPage.waitForLoadState("domcontentloaded");
  await new Promise(r => setTimeout(r, 800)); // render throttle
  await popupPage.screenshot({
    path: join(OUT_DIR, "popup-real-400x600.png"),
    type: "png",
  });
  console.log("✓ popup-real-400x600.png");
  await popupPage.close();

  // 2. Screenshot the actual sidepanel.html opened full-frame
  const sidepanelPage = await browser.newPage();
  await sidepanelPage.setViewportSize({ width: 420, height: 800 });
  await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await sidepanelPage.waitForLoadState("domcontentloaded");
  await new Promise(r => setTimeout(r, 800));
  // The real sidepanel needs some user state — render what we can
  await sidepanelPage.screenshot({
    path: join(OUT_DIR, "sidepanel-real-420x800.png"),
    type: "png",
  });
  console.log("✓ sidepanel-real-420x800.png");
  await sidepanelPage.close();

  // 3. Screenshot a sandbox product page with chrome-extension rendered inline
  const sandboxPage = await browser.newPage();
  await sandboxPage.setViewportSize({ width: 1280, height: 800 });
  await sandboxPage.setContent(sandboxHTML(18999000, "iPhone 15 Pro 256GB Titanium Blue", "Tokopedia"), {
    waitUntil: "domcontentloaded",
  });
  await new Promise(r => setTimeout(r, 500));
  await sandboxPage.screenshot({
    path: join(OUT_DIR, "product-page-with-extension-1280x800.png"),
    type: "png",
  });
  console.log("✓ product-page-with-extension-1280x800.png");
  await sandboxPage.close();

  await browser.close();
  console.log(`\nReal captures saved to: ${OUT_DIR}`);
}

run().catch(e => { console.error(e); process.exit(1); });

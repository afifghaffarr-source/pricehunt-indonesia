// Capture CWS submission assets from local /extension/* routes.
// Outputs PNGs in scripts/marketing-assets/captured/ at CWS-required
// exact dimensions. Tile graphics are rendered inline via setContent()
// to avoid src/app pollution — produced purely as marketing assets.
//
// Usage: BASE=http://localhost:3000 node scripts/capture-extension-screenshots.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = new URL("./marketing-assets/captured/", import.meta.url).pathname;

const TILE_SMALL = `
<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
<div style="width:440px;height:280px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);
display:flex;flex-direction:column;justify-content:center;align-items:center;
color:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Plus Jakarta Sans',sans-serif;
padding:32px;box-sizing:border-box;position:relative;overflow:hidden;">
<div style="position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
<div style="font-size:56px;font-weight:700;letter-spacing:-1.5px;margin-bottom:8px;">🛒 BijakBeli</div>
<div style="font-size:18px;font-weight:500;opacity:0.95;text-align:center;max-width:320px;line-height:1.4;">
Auto-scrape harga marketplace Indonesia
</div>
<div style="font-size:13px;opacity:0.8;margin-top:14px;letter-spacing:0.5px;">
Shopee · Tokopedia · Lazada · Blibli · Bukalapak
</div>
<div style="position:absolute;bottom:16px;right:20px;font-size:11px;opacity:0.7;font-weight:600;">
v3.0.1 — Gratis
</div>
</div>
</body></html>`;

const TILE_MARQUEE = `
<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
<div style="width:1280px;height:800px;background:linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#1d4ed8 100%);
display:flex;flex-direction:column;justify-content:center;align-items:flex-start;
color:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Plus Jakarta Sans',sans-serif;
padding:80px 100px;box-sizing:border-box;position:relative;overflow:hidden;">
<div style="position:absolute;top:-100px;right:-200px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.03) 70%);"></div>
<div style="position:absolute;bottom:-150px;left:-100px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 70%);"></div>
<div style="font-size:32px;opacity:0.95;font-weight:500;margin-bottom:24px;letter-spacing:1px;">
🛒 BIJAKBELI EXTENSION
</div>
<div style="font-size:96px;font-weight:800;letter-spacing:-3px;line-height:1.05;margin-bottom:32px;max-width:900px;">
Browsing =<br>Bantu Komunitas.
</div>
<div style="font-size:26px;opacity:0.92;max-width:720px;line-height:1.4;margin-bottom:48px;">
Auto-scrape harga dari Shopee, Tokopedia, Lazada, Blibli, Bukalapak, dan TikTok Shop —
bantu ribuan pembeli Indonesia membuat keputusan lebih baik.
</div>
<div style="display:flex;gap:24px;font-size:18px;opacity:0.85;">
<span>✓ Gratis untuk semua</span>
<span>✓ Manifest V3</span>
<span>✓ Source terbuka</span>
</div>
<div style="position:absolute;bottom:32px;right:60px;font-size:14px;opacity:0.6;font-weight:500;">
v3.0.1 · bijakbeli.web.id/extension
</div>
</div>
</body></html>`;

await mkdir(OUT, { recursive: true });
await mkdir(join(OUT, "screenshots"), { recursive: true });
await mkdir(join(OUT, "tiles"), { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shootLive(url, outName, viewport, opts = {}) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1, // CWS requires exact pixel dimensions
    bypassCSP: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "load" });

  // Two-step hydration check:
  //   1) Wait for visible h1 (real DOM, not inside [hidden])
  //   2) Fallback: manually unhide hidden RSC payload + drop skeletons
  //      if hydration stalled. Static prerender sleeps in <div hidden>
  //      until React re-hydrates away from the Suspense fallback.
  let hydrated = false;
  try {
    await page.waitForFunction(
      (h1Regex) => {
        const h1s = Array.from(document.querySelectorAll("h1"));
        return h1s.some(
          (h) => !h.closest("[hidden]") && new RegExp(h1Regex).test(h.textContent ?? "")
        );
      },
      opts.h1Regex ?? ".",
      { timeout: 10_000 }
    );
    hydrated = true;
  } catch {
    // Fallback: manually reveal hidden RSC main payload
    await page.evaluate(() => {
      // Remove skeleton placeholders
      document
        .querySelectorAll(".animate-pulse, .skeleton, [aria-busy='true']")
        .forEach((n) => {
          let cur = n;
          while (cur && cur.tagName !== "MAIN" && cur.tagName !== "BODY") {
            if (cur.tagName === "MAIN" || cur.tagName === "BODY") break;
            cur = cur.parentElement;
          }
          n.remove();
        });
      // Reveal hidden stream payload divs in main
      document.querySelectorAll("main [hidden], main [id^='S:']").forEach((n) => {
        n.removeAttribute("hidden");
        n.style.display = "";
      });
    });
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);
  if (opts.hideHeaderFooter) {
    await page.evaluate(() => {
      document.querySelectorAll("header, footer, nav").forEach((n) => {
        n.style.display = "none";
      });
    });
    await page.waitForTimeout(300);
  }
  const subdir = opts.subdir ?? "screenshots";
  const path = join(OUT, subdir, outName);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${path}  ${hydrated ? "(hydrated)" : "(forced reveal)"}`);
  await ctx.close();
}

async function shootHtml(html, outName, viewport) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const path = join(OUT, "tiles", outName);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${path}`);
  await ctx.close();
}

try {
  console.log("\n• Product screenshots (1280×800, header/footer hidden):");
  await shootLive("/extension", "01-landing.png", { width: 1280, height: 800 }, {
    hideHeaderFooter: true,
    h1Regex: "BijakBeli Chrome Extension",
  });
  await shootLive("/extension/installed", "02-installed.png", { width: 1280, height: 800 }, {
    hideHeaderFooter: true,
    h1Regex: "Extension.*(?:Berhasil|Terpasang|Installed)",
  });
  await shootLive("/extension/setup", "03-setup.png", { width: 1280, height: 800 }, {
    hideHeaderFooter: true,
    h1Regex: "Setup Ingestion Key",
  });
  await shootLive("/extension/privacy-policy", "04-privacy-policy.png", { width: 1280, height: 800 }, {
    hideHeaderFooter: true,
    h1Regex: "Privacy|Kebijakan Privasi",
  });
  await shootLive("/extension/compare", "05-compare.png", { width: 1280, height: 800 }, {
    hideHeaderFooter: true,
    h1Regex: ".",
  });

  console.log("\n• Promo tiles (rendered inline, exact CWS dimensions):");
  await shootHtml(TILE_SMALL, "promo-small-440x280.png", { width: 440, height: 280 });
  await shootHtml(TILE_MARQUEE, "promo-marquee-1280x800.png", { width: 1280, height: 800 });

  console.log(`\n✓ All assets written to ${OUT}`);
} finally {
  await browser.close();
}

#!/usr/bin/env node
/**
 * Polished marketing asset capture.
 * - Better promo tile (440×280): brand-forward with tagline
 * - Sidepanel mockup (640×800): realistic watchlist/price drop UI
 * - Hero promo (1280×800): rich visual replacement for the text tile
 *
 * Generates from inline HTML in chromium with a clean white background
 * so the screenshots pass CWS aesthetic standards.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "marketing-assets/captured/polished");

const ROBOTO = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
`;

// ─── HTML generators ──────────────────────────────────────────────

function promoSmall() {
  return `<!DOCTYPE html>
<html><head><style>
${ROBOTO}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 440px; height: 280px;
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  font-family: 'Inter', system-ui, sans-serif;
  display: flex; align-items: center; padding: 32px 28px;
  position: relative;
}
.icon-stack {
  width: 96px; height: 96px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 48px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  margin-right: 24px;
  flex-shrink: 0;
}
.icon-stack::after {
  content: "🛒";
}
.text-block { flex: 1; min-width: 0; }
.brand {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.tagline {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #10b981;
  line-height: 1.3;
}
.sub {
  margin-top: 8px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}
.badge {
  position: absolute;
  top: 16px; right: 16px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #10b981;
  background: #ecfdf5;
  padding: 4px 8px;
  border-radius: 4px;
}
</style></head><body>
  <div class="badge">v3.0.1</div>
  <div class="icon-stack"></div>
  <div class="text-block">
    <div class="brand">BijakBeli</div>
    <div class="tagline">Bandingkan harga<br/>dalam 1 klik</div>
    <div class="sub">Shopee • Tokopedia<br/>Bukalapak • Lazada<br/>Blibli • TikTok</div>
  </div>
</body></html>`;
}

function promoMarquee() {
  return `<!DOCTYPE html>
<html><head><style>
${ROBOTO}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1280px; height: 800px;
  background:
    radial-gradient(ellipse at top left, #ecfdf5 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, #dbeafe 0%, transparent 50%),
    #ffffff;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  position: relative;
  padding: 80px;
}
.content { flex: 1; z-index: 2; }
.brand-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.logo {
  width: 72px; height: 72px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}
.logo::after { content: "🛒"; }
.brand-name {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.brand-version {
  font-size: 14px;
  font-weight: 700;
  color: #10b981;
  background: #ecfdf5;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.04em;
}
.headline {
  font-size: 80px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 28px;
  max-width: 720px;
}
.headline em {
  font-style: normal;
  color: #10b981;
}
.lede {
  font-size: 22px;
  color: #475569;
  line-height: 1.5;
  max-width: 640px;
  margin-bottom: 48px;
}
.stat-row {
  display: flex;
  gap: 56px;
  margin-top: 32px;
}
.stat-num {
  font-size: 44px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}
.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 6px;
}
.marketplace-strip {
  display: flex;
  gap: 24px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-top: 28px;
}
.mp-pill {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.decor-circle {
  position: absolute;
  width: 360px; height: 360px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.08);
  top: 60px; right: -120px;
}
.decor-circle-2 {
  position: absolute;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.06);
  bottom: -80px; right: 280px;
}
</style></head><body>
  <div class="decor-circle"></div>
  <div class="decor-circle-2"></div>
  <div class="content">
    <div class="brand-row">
      <div class="logo"></div>
      <div class="brand-name">BijakBeli</div>
      <div class="brand-version">v3.0.1</div>
    </div>
    <div class="headline">Bandingkan harga<br/>marketplace<br/><em>tanpa ribet.</em></div>
    <div class="lede">Sidepanel otomatis membaca harga di halaman produk Indonesia.
    Tambahkan ke watchlist — dapat notifikasi saat harga turun.</div>
    <div class="stat-row">
      <div>
        <div class="stat-num">6</div>
        <div class="stat-label">Marketplace</div>
      </div>
      <div>
        <div class="stat-num">100%</div>
        <div class="stat-label">Gratis, Terbuka</div>
      </div>
      <div>
        <div class="stat-num">0</div>
        <div class="stat-label">Iklan, Telemetri</div>
      </div>
    </div>
  </div>
  <div class="marketplace-strip">
    <div class="mp-pill">Shopee</div>
    <div class="mp-pill">Tokopedia</div>
    <div class="mp-pill">Bukalapak</div>
    <div class="mp-pill">Lazada</div>
    <div class="mp-pill">Blibli</div>
    <div class="mp-pill">TikTok Shop</div>
  </div>
</body></html>`;
}

function sidepanelMockup() {
  return `<!DOCTYPE html>
<html><head><style>
${ROBOTO}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1280px; height: 800px;
  background: #f1f5f9;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  padding: 60px;
  gap: 60px;
}
.window {
  width: 380px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  flex-shrink: 0;
}
.window-header {
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.window-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.window-icon {
  width: 28px; height: 28px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}
.window-icon::after { content: "🛒"; }
.window-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.window-status {
  font-size: 11px;
  font-weight: 600;
  color: #10b981;
  background: #ecfdf5;
  padding: 3px 8px;
  border-radius: 4px;
}
.window-body {
  padding: 16px 18px;
}
.section-title {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}
.stat-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
}
.stat-card-num {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}
.stat-card-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  font-weight: 500;
}
.watch-card {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.watch-info {
  flex: 1;
  min-width: 0;
}
.watch-name {
  font-size: 12px;
  font-weight: 600;
  color: #451a03;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.watch-meta {
  font-size: 10px;
  color: #92400e;
  margin-top: 2px;
}
.watch-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
}
.watch-price {
  font-size: 13px;
  font-weight: 700;
  color: #b45309;
}
.watch-price-old {
  font-size: 10px;
  color: #a16207;
  text-decoration: line-through;
}
.watch-drop {
  font-size: 9px;
  font-weight: 800;
  color: #ffffff;
  background: #16a34a;
  padding: 3px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.mp-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 11px;
  margin-bottom: 4px;
}
.mp-name {
  font-weight: 600;
  color: #0f172a;
}
.mp-count {
  color: #64748b;
}

.context {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.context-eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #10b981;
  margin-bottom: 14px;
}
.context-h1 {
  font-size: 56px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin-bottom: 24px;
}
.context-h1 em {
  font-style: normal;
  color: #10b981;
}
.context-p {
  font-size: 18px;
  color: #475569;
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 540px;
}
.feature-bullets {
  list-style: none;
}
.feature-bullets li {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 15px;
  color: #334155;
  font-weight: 500;
}
.feature-bullets li::before {
  content: "✓";
  width: 26px; height: 26px;
  background: #ecfdf5;
  border-radius: 50%;
  color: #10b981;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
</style></head><body>
  <div class="window">
    <div class="window-header">
      <div class="window-header-left">
        <div class="window-icon"></div>
        <div class="window-title">BijakBeli</div>
      </div>
      <div class="window-status">● Online</div>
    </div>
    <div class="window-body">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card-num">127</div>
          <div class="stat-card-label">Produk di-scrape</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-num">98%</div>
          <div class="stat-card-label">Success rate</div>
        </div>
      </div>

      <div class="section-title">🎯 Pantau Harga · 2 notifikasi</div>

      <div class="watch-card">
        <div class="watch-info">
          <div class="watch-name">iPhone 15 Pro 256GB — Titanium</div>
          <div class="watch-meta">Tokopedia · Toko iBox</div>
          <div class="watch-price-row">
            <div class="watch-price">Rp 18.499.000</div>
            <div class="watch-price-old">Rp 19.999.000</div>
          </div>
        </div>
        <div class="watch-drop">-7%</div>
      </div>

      <div class="watch-card">
        <div class="watch-info">
          <div class="watch-name">Sony WH-1000XM5 Wireless Headphone</div>
          <div class="watch-meta">Shopee · Sony Official</div>
          <div class="watch-price-row">
            <div class="watch-price">Rp 4.290.000</div>
            <div class="watch-price-old">Rp 4.690.000</div>
          </div>
        </div>
        <div class="watch-drop">-8%</div>
      </div>

      <div class="section-title" style="margin-top: 20px;">📊 Marketplace</div>
      <div class="mp-row">
        <span class="mp-name">Shopee</span>
        <span class="mp-count">52 produk</span>
      </div>
      <div class="mp-row">
        <span class="mp-name">Tokopedia</span>
        <span class="mp-count">41 produk</span>
      </div>
      <div class="mp-row">
        <span class="mp-name">Bukalapak</span>
        <span class="mp-count">18 produk</span>
      </div>
      <div class="mp-row">
        <span class="mp-name">Lazada</span>
        <span class="mp-count">16 produk</span>
      </div>
    </div>
  </div>
  <div class="context">
    <div class="context-eyebrow">Sidebar otomatis</div>
    <div class="context-h1">Lihat harga di<br/>watchlist,<br/><em>sekali klik.</em></div>
    <div class="context-p">Saat kamu buka halaman produk dari marketplace Indonesia,
    BijakBeli langsung mencatat harganya. Tambahkan ke watchlist — dapatkan
    notifikasi saat harga turun.</div>
    <ul class="feature-bullets">
      <li>Auto-track 6 marketplace Indonesia</li>
      <li>Watchlist dengan target harga sendiri</li>
      <li>Notifikasi real-time saat ada diskon</li>
      <li>100% lokal, tanpa server-side tracking</li>
    </ul>
  </div>
</body></html>`;
}

// ─── Main ─────────────────────────────────────────────────────────

async function capture(name, html, w, h) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  // wait for fonts
  await page.evaluate(() => document.fonts.ready);
  const out = join(OUT_DIR, name);
  await mkdir(dirname(out), { recursive: true });
  await page.screenshot({ path: out, type: "png", omitBackground: false });
  await browser.close();
  return out;
}

const targets = [
  ["promo-small-440x280.png", promoSmall(), 440, 280],
  ["promo-marquee-1280x800.png", promoMarquee(), 1280, 800],
  ["sidepanel-mockup-1280x800.png", sidepanelMockup(), 1280, 800],
];

for (const [name, html, w, h] of targets) {
  const out = await capture(name, html, w, h);
  console.log(`✓ ${name} (${w}×${h}) → ${out}`);
}

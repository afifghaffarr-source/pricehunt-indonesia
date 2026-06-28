// Direct chromium E2E for /extension/* — bypasses playwright test runner
// (which hangs in this env). Polls DOM directly because Vercel analytics
// keeps `networkidle` pending indefinitely.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
let exitCode = 0;
let currentName = "";

async function pollText(page, regex, { timeout = 30_000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const text = (await page.locator("body").textContent().catch(() => "")) ?? "";
    if (regex.test(text)) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function pollCount(page, locator, min = 1, { timeout = 30_000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const c = await locator.count().catch(() => 0);
    if (c >= min) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function test(name, fn) {
  currentName = name;
  const ctx = {};
  ctx.assert = (cond, msg) => {
    if (!cond) {
      results.push({ name, ok: false, err: msg });
      console.log(`  ✗ ${msg}`);
      exitCode = 1;
    } else {
      results.push({ name, ok: true });
      console.log(`  ✓`);
    }
  };
  console.log(`\n• ${name}`);
  try {
    await fn(ctx);
  } catch (e) {
    ctx.assert(false, `threw: ${e.message}`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await test("landing renders with download CTA + version badge", async ({ assert }) => {
    const page = await browser.newPage();
    const resp = await page.goto(`${BASE}/extension`, { waitUntil: "domcontentloaded" });
    assert(resp?.status() === 200, `200 OK (got ${resp?.status()})`);
    assert(
      await pollText(page, /BijakBeli Chrome Extension/i),
      "main heading visible"
    );
    assert(await pollText(page, /v3\.0\.1/), "version badge visible");
    assert(
      await pollText(page, /Download Extension/i) &&
        (await page
          .getByRole("link", { name: /Download Extension/i })
          .first()
          .getAttribute("href"))?.endsWith(".tar.gz"),
      "download CTA → .tar.gz"
    );
    await page.close();
  });

  await test("landing links to /extension/privacy-policy (P1 URL flip)", async ({
    assert,
  }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/extension`, { waitUntil: "domcontentloaded" });
    const inBody = await pollText(page, /Kebijakan Privasi|Privacy Policy/i);
    assert(inBody, "privacy policy text present");
    const count = await page
      .locator('a[href="/extension/privacy-policy"]')
      .count();
    assert(count >= 1, `≥1 privacy-policy link (got ${count})`);
    const footerCount = await page
      .locator("footer a[href='/extension/privacy-policy']")
      .count();
    assert(footerCount >= 1, `≥1 canonical link in footer (got ${footerCount})`);
    await page.close();
  });

  await test("setup page describes ingestion key flow", async ({ assert }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/extension/setup`, { waitUntil: "domcontentloaded" });
    assert(
      await pollText(page, /Setup Ingestion Key/i, { timeout: 30_000 }),
      "setup heading visible"
    );
    assert(
      await pollText(page, /Beta Testing/i, { timeout: 30_000 }),
      "Beta Testing banner visible"
    );
    await page.close();
  });

  await test("installed page shows success state", async ({ assert }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/extension/installed`, { waitUntil: "domcontentloaded" });
    assert(
      await pollText(page, /Extension (Berhasil|Terpasang|Installed|berhasil)/i, {
        timeout: 30_000,
      }),
      "success heading visible"
    );
    await page.close();
  });

  await test("compare page renders without throwing", async ({ assert }) => {
    const page = await browser.newPage();
    const resp = await page.goto(`${BASE}/extension/compare`, { waitUntil: "domcontentloaded" });
    assert(resp?.status() === 200, `200 OK (got ${resp?.status()})`);
    const bodyText = (await page.locator("body").textContent()) ?? "";
    assert(bodyText.replace(/\s/g, "").length > 0, "body rendered");
    await page.close();
  });

  await test("privacy policy page has substantial real content (P1)", async ({
    assert,
  }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/extension/privacy-policy`, { waitUntil: "domcontentloaded" });
    assert(
      await pollText(page, /Privacy Policy|Kebijakan Privasi/i, { timeout: 30_000 }),
      "privacy heading visible"
    );
    assert(
      await pollText(page, /Informasi yang Kami Kumpulkan/i, { timeout: 30_000 }),
      "data-collected section present"
    );
    assert(
      await pollText(page, /Informasi yang TIDAK Kami Kumpulkan/i, { timeout: 30_000 }),
      "data-NOT-collected section present"
    );
    const bodyText = (await page.locator("body").textContent()) ?? "";
    assert(
      bodyText.length > 5000,
      `real policy content > 5KB (got ${bodyText.length} chars)`
    );
    await page.close();
  });

  await test("FAQ page covers 4 user-facing topics (post-launch)", async ({ assert }) => {
    const page = await browser.newPage();
    const resp = await page.goto(`${BASE}/extension/faq`, { waitUntil: "domcontentloaded" });
    assert(resp?.status() === 200, `200 OK (got ${resp?.status()})`);
    assert(
      await pollText(page, /Pertanyaan yang Sering Ditanyakan/i, { timeout: 30_000 }),
      "FAQ heading visible"
    );
    // Each category must render
    for (const topic of [
      /Setup & Installation/i,
      /Privacy & Keamanan/i,
      /Marketplace Support/i,
      /Notifikasi & Watchlist/i,
    ]) {
      assert(
        await pollText(page, topic, { timeout: 30_000 }),
        `FAQ has section "${topic}"`
      );
    }
    // Cross-link to privacy
    const privLinkCount = await page
      .locator('a[href="/extension/privacy-policy"]')
      .count();
    assert(privLinkCount >= 1, `FAQ links to privacy policy (got ${privLinkCount})`);
    await page.close();
  });
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
const failedNames = [...new Set(results.filter((r) => !r.ok).map((r) => r.name))];
console.log(`\n=== ${passed} passed · ${failed} failed`);
if (failedNames.length) console.log(`Tests with failures:\n  - ${failedNames.join("\n  - ")}`);
process.exit(exitCode);

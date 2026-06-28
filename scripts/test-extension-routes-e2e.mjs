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

  await test("FAQ search input filters by keyword (server-side ?q=)", async ({ assert }) => {
    const page = await browser.newPage();
    // Empty: search form + match counter present
    const resp = await page.goto(`${BASE}/extension/faq`, { waitUntil: "domcontentloaded" });
    assert(resp?.status() === 200, `200 OK (got ${resp?.status()})`);
    assert(
      await pollCount(page, page.locator('[data-testid="faq-search"]')),
      "search input rendered"
    );
    assert(
      await pollCount(page, page.locator('[data-testid="faq-match-count"]')),
      "match counter rendered"
    );

    // Filter via ?q=tokopedia: Tokopedia is mentioned in marketplace-support
    // and EN QA. Should narrow to those sections only.
    const filterResp = await page.goto(`${BASE}/extension/faq?q=tokopedia`, {
      waitUntil: "domcontentloaded",
    });
    assert(filterResp?.status() === 200, `filtered 200 OK (got ${filterResp?.status()})`);
    assert(
      await pollText(page, /Tidak ada pertanyaan cocok|\d+ dari \d+\s*pertanyaan cocok/i, {
        timeout: 30_000,
      }),
      "match counter updates with filter text"
    );
    // With ?q=tokopedia rendered: Setup & Installation (no Tokopedia mention)
    // may be empty. The page should still render Privacy/Marketplace/EN sections
    // that matched.
    assert(
      await pollText(page, /Marketplace Support/i, { timeout: 30_000 }),
      "Marketplace Support still visible when filtering by 'tokopedia'"
    );

    // Filter with no match: ?q=xyzpdqlapnull
    const noMatch = await page.goto(`${BASE}/extension/faq?q=xyzpdqlapnull`, {
      waitUntil: "domcontentloaded",
    });
    assert(noMatch?.status() === 200, `no-match 200 OK (got ${noMatch?.status()})`);
    assert(
      await pollText(page, /Tidak ada pertanyaan cocok|"No English matches"/i, {
        timeout: 30_000,
      }),
      "page shows 'no matches' empty state for unrelated query"
    );

    await page.close();
  });

  await test("FAQ search resets when ?q= is empty / removed", async ({ assert }) => {
    const page = await browser.newPage();
    // First filtered, then unfiltered (?q=)
    await page.goto(`${BASE}/extension/faq?q=privacy`, {
      waitUntil: "domcontentloaded",
    });
    assert(await pollText(page, /\d+ dari \d+\s*pertanyaan cocok/i, { timeout: 30_000 }), "filtered counter visible");
    await page.goto(`${BASE}/extension/faq?q=`, { waitUntil: "domcontentloaded" });
    assert(
      await pollText(page, /\d+ pertanyaan · tekan/i, { timeout: 30_000 }),
      "default counter (11 pertanyaan · tekan) restored when q is empty"
    );
    await page.close();
  });

  await test("dev preview toolbar can switch banner variant via cookie (dev only)", async ({
    assert,
  }) => {
    const page = await browser.newPage();
    // Default (no cookie, no env) → "draft" banner
    await page.goto(`${BASE}/extension`, { waitUntil: "domcontentloaded" });
    const draft = await page
      .locator('[data-banner="draft"]')
      .count();
    assert(draft >= 1, `default banner is 'draft' (got ${draft} elements)`);
    const toolbar = await page
      .locator('[data-testid="dev-preview-toolbar"]')
      .count();
    assert(toolbar >= 1, `dev toolbar visible in dev mode (got ${toolbar})`);
    await page.close();

    // Cookie "legacy" → "legacy" banner variant
    const page2 = await browser.newPage();
    await page2.context().addCookies([
      {
        name: "bijakbeli_banner_preview",
        value: "legacy",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page2.goto(`${BASE}/extension`, { waitUntil: "domcontentloaded" });
    const legacy = await page2
      .locator('[data-banner="legacy"]')
      .count();
    assert(legacy >= 1, `cookie 'legacy' → legacy banner (got ${legacy})`);
    const legacyText = await pollText(page2, /Masih versi beta/i, {
      timeout: 30_000,
    });
    assert(legacyText, "legacy banner copy 'Masih versi beta' visible");
    await page2.close();
  });

  await test("FAQ page has FAQPage JSON-LD schema in <head>", async ({ assert }) => {
    const page = await browser.newPage();
    const resp = await page.goto(`${BASE}/extension/faq`, {
      waitUntil: "domcontentloaded",
    });
    assert(resp?.status() === 200, `200 OK (got ${resp?.status()})`);
    // Wait for streaming to settle
    await page.waitForTimeout(2000);
    const ldScripts = await page
      .locator('script[type="application/ld+json"]')
      .count();
    assert(ldScripts >= 1, `≥1 ld+json script in document (got ${ldScripts})`);
    const ldText = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    assert(
      ldText && /"@type":\s*"FAQPage"/.test(ldText),
      "JSON-LD contains @type: FAQPage"
    );
    assert(
      ldText && /"inLanguage":\s*"id"/.test(ldText),
      "JSON-LD declares inLanguage: id"
    );
    assert(
      ldText && /"mainEntity"/.test(ldText),
      "JSON-LD contains mainEntity array"
    );
    await page.close();
  });

  await test("/extension/faq.json returns FAQ index with 22 questions", async ({
    assert,
  }) => {
    const page = await browser.newPage();
    const resp = await page.goto(`${BASE}/extension/faq.json`, {
      waitUntil: "domcontentloaded",
    });
    assert(resp?.status() === 200, `200 OK (got ${resp?.status()})`);
    assert(
      resp?.headers()["content-type"]?.startsWith("application/json"),
      `content-type is application/json (got ${resp?.headers()["content-type"]})`
    );
    const body = (await page.locator("body").textContent()) ?? "";
    const parsed = JSON.parse(body);
    assert(parsed["@context"] === "https://schema.org", "@context is schema.org");
    assert(parsed.total_questions === 22, `total_questions=22 (got ${parsed.total_questions})`);
    const idCount = parsed.locales.id.questions.length;
    const enCount = parsed.locales.en.questions.length;
    assert(idCount === 11, `11 Bahasa questions (got ${idCount})`);
    assert(enCount === 11, `11 English questions (got ${enCount})`);
    assert(
      parsed.locales.id.questions[0].question === "Apa itu INGESTION_SECRET dan bagaimana cara mendapatkannya?",
      "first Bahasa question is INGESTION_SECRET one"
    );
    await page.close();
  });

  await test("FAQ search bar exposes data-* hooks for analytics", async ({ assert }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/extension/faq?q=tokopedia`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
    const input = page.locator('[data-testid="faq-search"]');
    const queryAttr = await input.getAttribute("data-faq-query").catch(() => null);
    assert(queryAttr === "tokopedia", `search input exposes data-faq-query="tokopedia" (got ${queryAttr ?? "null"})`);
    const count = await page
      .locator('[data-testid="faq-match-count"]')
      .getAttribute("data-faq-count");
    assert(count === "4", `counter exposes data-faq-count="4" (got ${count})`);
    const sectionCount = await page
      .locator("[data-faq-section]")
      .count();
    assert(sectionCount >= 1, `≥1 rendered section with data-faq-section (got ${sectionCount})`);
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

// Axe-core WCAG 2.1 Level AA audit for /extension/* routes.
//
// Why axe and not pa11y: axe is what Lighthouse uses, what Chrome DevTools
// uses, and what most React testing-library wrappers emit. Single source
// of truth for WCAG rules.
//
// Usage:
//   node scripts/axe-a11y-faq.mjs                  # audit /extension + /faq
//   node scripts/axe-a11y-faq.mjs --strict         # fail on non-wcag21a issues too
//   node scripts/axe-a11y-faq.mjs --url <u>        # audit a custom URL
//
// Writes JSON to ./a11y-reports/axe-faq.json and a Markdown summary.

import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPORT_DIR = join(ROOT, "a11y-reports");
const BASE = process.env.BASE ?? "http://localhost:3000";

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const URL_FLAG = args.indexOf("--url");
const OVERRIDE_URL = URL_FLAG >= 0 ? args[URL_FLAG + 1] : null;

const URLS = OVERRIDE_URL
  ? [OVERRIDE_URL]
  : [
      `${BASE}/extension`,
      `${BASE}/extension/faq`,
      `${BASE}/extension/faq?q=tokopedia`,
      `${BASE}/extension/setup`,
      `${BASE}/extension/privacy-policy`,
    ];

if (!existsSync(REPORT_DIR)) await mkdir(REPORT_DIR, { recursive: true });

const SEVERITY_RANK = { minor: 1, moderate: 2, serious: 3, critical: 4 };

// We focus on WCAG 2.1 Level AA — that's Chrome Web Store's actual standard.
const TAGS = STRICT
  ? ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]
  : ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

let totalFailures = 0;
const allResults = [];

for (const url of URLS) {
  console.log(`\n=== Auditing ${url} ===`);
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      // Disable reduced-motion so motion-related best-practice noise doesn't
      // cause false positives for our launch config (we respect the user
      // preference; the rule only fires when reduced-motion is requested).
      reducedMotion: "no-preference",
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(800);

    const results = await new AxeBuilder({ page })
      .withTags(TAGS)
      .analyze();

    const violated = results.violations
      .filter((v) => v.nodes?.length > 0)
      .sort(
        (a, b) =>
          (SEVERITY_RANK[b.impact] ?? 0) - (SEVERITY_RANK[a.impact] ?? 0)
      );

    if (violated.length === 0) {
      console.log(`  ✅ 0 WCAG violations on ${url}`);
    } else {
      console.log(`  ⚠ ${violated.length} WCAG violation(s):`);
      for (const v of violated) {
        const impact = (v.impact ?? "minor").toUpperCase();
        console.log(
          `    [${impact}] ${v.id} — ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`
        );
        for (const n of v.nodes.slice(0, 3)) {
          const sample = n.target?.join(" > ") ?? n.target;
          console.log(`      → ${sample}`);
          if (n.failureSummary) {
            const one = n.failureSummary.split("\n")[0];
            console.log(`        ${one}`);
          }
        }
        if (v.nodes.length > 3) {
          console.log(`      …and ${v.nodes.length - 3} more`);
        }
      }
    }

    allResults.push({ url, violations: violated, passes: results.passes.length });
    // Fail if any critical/serious violation
    const blocking = violated.filter((v) =>
      ["serious", "critical"].includes(v.impact)
    );
    if (blocking.length > 0) totalFailures += blocking.length;
  } finally {
    await browser.close();
  }
}

// Write JSON + Markdown
const jsonPath = join(REPORT_DIR, "axe-faq.json");
await writeFile(jsonPath, JSON.stringify(allResults, null, 2), "utf8");
console.log(`\n📝 JSON report: ${jsonPath}`);

const md = [
  "# Axe-core WCAG 2.1 AA — BijakBeli /extension/*",
  "",
  `Generated ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  ...allResults.map(
    (r) =>
      `- **${r.url}** — ${r.violations.length} violation(s), ${r.passes} pass(es)`
  ),
  "",
  "## Blocking violations (serious/critical)",
  "",
  ...allResults.flatMap((r) =>
    r.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) =>
        [
          `### ${r.url} — [${(v.impact ?? "minor").toUpperCase()}] ${v.id}`,
          "",
          `**Rule:** ${v.help}`,
          "",
          `**Why:** ${v.description}`,
          "",
          `**Affected nodes (${v.nodes.length}):**`,
          "",
          ...v.nodes.map(
            (n) =>
              `- \`${n.target?.join(" > ") ?? "?"}\` — ${n.failureSummary?.split("\n")[0] ?? n.failureSummary ?? "no summary"}`
          ),
          "",
        ].join("\n")
      )
  ),
  "",
].join("\n");
const mdPath = join(REPORT_DIR, "axe-faq.md");
await writeFile(mdPath, md, "utf8");
console.log(`📝 Markdown report: ${mdPath}`);

console.log(
  `\n=== ${totalFailures === 0 ? "✅" : "❌"} ${totalFailures} blocking violation(s) across ${allResults.length} URL(s)`
);
process.exit(totalFailures === 0 ? 0 : 1);

// Lighthouse CI runner — mobile audit against local `next start` server
// Uses `lighthouse` + `chrome-launcher` (already in devDeps; no @lhci/cli needed).
//
// Usage:
//   node scripts/lighthouse-ci.mjs                 # audit all URLs from lighthouserc.json
//   node scripts/lighthouse-ci.mjs --url URL,...   # override URLs
//   node scripts/lighthouse-ci.mjs --json          # also write per-URL JSON reports
//   node scripts/lighthouse-ci.mjs --no-fail       # never exit non-zero (advisory mode)
//
// Exits 0 if all categories pass, 1 otherwise. Writes a summary table to stdout
// and a JSON+HTML report to ./lighthouse-reports/.

import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPORT_DIR = join(ROOT, "lighthouse-reports");

// --- config -----------------------------------------------------------------

const DEFAULT_URLS = [
  "http://localhost:3000/",
  "http://localhost:3000/deals",
  "http://localhost:3000/search",
  "http://localhost:3000/leaderboard",
  "http://localhost:3000/legal/privacy",
];

// Thresholds — single source of truth is lighthouserc.json. If the file exists
// and has an `assert.assertions` block, we use those. Otherwise we fall back
// to the in-code defaults below. Tuned for LOCAL `next start` — production
// scores run 10-20 points higher due to Vercel CDN + brotli + image opt.
const FALLBACK_THRESHOLDS = {
  performance: 0.5,
  accessibility: 0.9,
  "best-practices": 0.9,
  seo: 0.9,
};

const CORE_WEB_VITALS = {
  "first-contentful-paint": { warn: 1800, max: 2500 },
  "largest-contentful-paint": { warn: 4000, max: 6000 },
  "total-blocking-time": { warn: 600, max: 1500 },
  "cumulative-layout-shift": { warn: 0.1, max: 0.25 },
  "speed-index": { warn: 3000, max: 5000 },
};

// --- args -------------------------------------------------------------------

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return fallback;
}
const hasFlag = (name) => args.includes(name);

const urls = (() => {
  const u = getArg("--url");
  if (u) return u.split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_URLS;
})();
const writeJson = hasFlag("--json");
const noFail = hasFlag("--no-fail");

// --- helpers ----------------------------------------------------------------

function color(s, code) {
  return process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;
}
const RED = (s) => color(s, 31);
const GREEN = (s) => color(s, 32);
const YELLOW = (s) => color(s, 33);
const GRAY = (s) => color(s, 90);
const BOLD = (s) => color(s, 1);

function fmtScore(s) {
  if (s === null || s === undefined || s === 1) return s === 1 ? GREEN("1.00") : GRAY("n/a");
  return s >= 0.9 ? GREEN(s.toFixed(2)) : s >= 0.5 ? YELLOW(s.toFixed(2)) : RED(s.toFixed(2));
}

function fmtMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function loadThresholds() {
  const cfgPath = join(ROOT, "lighthouserc.json");
  if (!existsSync(cfgPath)) return FALLBACK_THRESHOLDS;
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    const a = cfg?.ci?.assert?.assertions;
    if (!a) return FALLBACK_THRESHOLDS;
    const t = {};
    for (const k of Object.keys(FALLBACK_THRESHOLDS)) {
      const rule = a[`categories:${k}`];
      if (Array.isArray(rule) && rule[1]?.minScore !== undefined) t[k] = rule[1].minScore;
    }
    return Object.keys(t).length === 4 ? t : FALLBACK_THRESHOLDS;
  } catch {
    return FALLBACK_THRESHOLDS;
  }
}

// --- main -------------------------------------------------------------------

const thresholds = loadThresholds();

console.log(BOLD("\n🔦 Lighthouse CI") + GRAY(` (mobile preset, ${urls.length} URLs)`));
console.log(GRAY(`   Thresholds — perf:${thresholds.performance}  a11y:${thresholds.accessibility}  bp:${thresholds["best-practices"]}  seo:${thresholds.seo}\n`));

await mkdir(REPORT_DIR, { recursive: true });

const chrome = await launch({
  chromeFlags: [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-background-networking",
    "--mute-audio",
    "--no-first-run",
  ],
});

const results = [];
let exitCode = 0;

try {
  // Pre-warm: navigate to a blank page once to avoid first-paint spikes
  await lighthouse("about:blank", {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance"],
  }).then((r) => r?.lhr && null).catch(() => null);

  for (const url of urls) {
    const path = new URL(url).pathname || "/";
    const slug = path.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "home";
    process.stdout.write(`  ${GRAY("→")} ${BOLD(path.padEnd(28))} `);

    let runner;
    try {
      runner = await lighthouse(url, {
        port: chrome.port,
        output: writeJson ? "json" : "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        settings: {
          formFactor: "mobile",
          screenEmulation: {
            mobile: true,
            width: 412,
            height: 823,
            deviceScaleFactor: 1.75,
            disabled: false,
          },
          throttling: {
            rttMs: 150,
            throughputKbps: 1638.4,
            cpuSlowdownMultiplier: 4,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0,
          },
          throttlingMethod: "simulate",
        },
      });
    } catch (e) {
      console.log(RED("FAILED ") + GRAY(e.message));
      results.push({ url, error: e.message, scores: {}, vitals: {} });
      exitCode = 1;
      continue;
    }

    const lhr = runner.lhr;
    const cats = lhr.categories;
    const audits = lhr.audits;

    const scores = {
      performance: cats.performance?.score ?? null,
      accessibility: cats.accessibility?.score ?? null,
      "best-practices": cats["best-practices"]?.score ?? null,
      seo: cats.seo?.score ?? null,
    };

    const vitals = {
      fcp: audits["first-contentful-paint"]?.numericValue,
      lcp: audits["largest-contentful-paint"]?.numericValue,
      tbt: audits["total-blocking-time"]?.numericValue,
      cls: audits["cumulative-layout-shift"]?.numericValue,
      si: audits["speed-index"]?.numericValue,
    };

    // Check failures
    const failedCats = Object.entries(scores).filter(([k, v]) => v !== null && v < thresholds[k]);
    const failedVitals = Object.entries(vitals).filter(([k, v]) => {
      if (v === undefined) return false;
      const limit = CORE_WEB_VITALS[k];
      return limit && v > limit.max;
    });

    const failed = failedCats.length + failedVitals.length;
    if (failed > 0) {
      exitCode = noFail ? 0 : 1;
      console.log(RED("FAIL"));
      for (const [k, v] of failedCats) {
        console.log(`       ${RED("✗")} ${k}: ${fmtScore(v)} < ${thresholds[k]}`);
      }
      for (const [k, v] of failedVitals) {
        const limit = CORE_WEB_VITALS[k];
        console.log(`       ${RED("✗")} ${k}: ${fmtMs(v)} > ${fmtMs(limit.max)}`);
      }
    } else {
      console.log(GREEN("OK"));
    }

    // Vitals line
    const v = vitals;
    console.log(
      `       ${GRAY("FCP")} ${fmtMs(v.fcp || 0)}  ` +
      `${GRAY("LCP")} ${fmtMs(v.lcp || 0)}  ` +
      `${GRAY("TBT")} ${fmtMs(v.tbt || 0)}  ` +
      `${GRAY("CLS")} ${v.cls?.toFixed(3) || "n/a"}  ` +
      `${GRAY("SI")} ${fmtMs(v.si || 0)}`,
    );

    // Scores line
    console.log(
      `       ${GRAY("perf")} ${fmtScore(scores.performance)}  ` +
      `${GRAY("a11y")} ${fmtScore(scores.accessibility)}  ` +
      `${GRAY("bp")} ${fmtScore(scores["best-practices"])}  ` +
      `${GRAY("seo")} ${fmtScore(scores.seo)}`,
    );

    // Write per-URL report
    if (writeJson) {
      await writeFile(join(REPORT_DIR, `${slug}.json`), JSON.stringify(lhr, null, 2));
    }
    // Always write HTML — small, useful for debugging
    if (runner.report) {
      await writeFile(join(REPORT_DIR, `${slug}.html`), runner.report);
    }

    results.push({ url, scores, vitals, failed: failedCats.length + failedVitals.length });
  }
} finally {
  await chrome.kill();
}

// --- summary table ----------------------------------------------------------

console.log(GRAY("\n  " + "─".repeat(86)));
console.log(BOLD("  Summary\n"));

const header = ["URL", "perf", "a11y", "bp", "seo", "FCP", "LCP", "TBT", "CLS"];
const widths = [32, 6, 6, 6, 6, 8, 8, 8, 8];
const fmtRow = (cells) =>
  "  " + cells.map((c, i) => String(c).padEnd(widths[i])).join(" ");
const sep = "  " + widths.map((w) => "─".repeat(w)).join(" ");

console.log(fmtRow(header));
console.log(sep);

for (const r of results) {
  if (r.error) {
    console.log(`  ${r.url.slice(0, 32).padEnd(32)} ${RED("error: " + r.error.slice(0, 60))}`);
    continue;
  }
  const path = new URL(r.url).pathname || "/";
  console.log(
    fmtRow([
      path.length > 32 ? path.slice(0, 29) + "..." : path,
      fmtScore(r.scores.performance),
      fmtScore(r.scores.accessibility),
      fmtScore(r.scores["best-practices"]),
      fmtScore(r.scores.seo),
      fmtMs(r.vitals.fcp || 0),
      fmtMs(r.vitals.lcp || 0),
      fmtMs(r.vitals.tbt || 0),
      r.vitals.cls?.toFixed(3) || "n/a",
    ]),
  );
}
console.log();

// --- final summary json (machine-readable) ----------------------------------

await writeFile(
  join(REPORT_DIR, "summary.json"),
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      thresholds,
      urls,
      results,
      pass: exitCode === 0,
    },
    null,
    2,
  ),
);

console.log(GRAY(`  Reports: ${REPORT_DIR}/`));
console.log(GRAY(`  Summary: ${REPORT_DIR}/summary.json`));

if (exitCode === 0) {
  console.log(GREEN("\n  ✓ All URLs pass Lighthouse thresholds\n"));
} else if (noFail) {
  console.log(YELLOW("\n  ! Some URLs below threshold (advisory mode)\n"));
} else {
  console.log(RED("\n  ✗ Some URLs below threshold — build will fail\n"));
}

process.exit(exitCode);

#!/usr/bin/env node
/**
 * Lighthouse performance audit for the 3 BijakBeli CWS launch routes.
 *
 * Runs Lighthouse headlessly against http://localhost:3000 routes,
 * extracts Core Web Vitals, writes JSON + Markdown summary.
 *
 * Usage:
 *   node scripts/perf-audit-lighthouse.mjs
 *
 * Output:
 *   perf-reports/lighthouse.{json,md}
 */

import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const ROUTES = [
  { path: "/extension", name: "landing" },
  { path: "/extension/faq", name: "faq-default" },
  { path: "/extension/faq?q=tokopedia", name: "faq-filtered" },
  { path: "/extension/setup", name: "setup" },
];

const PORT = Number(process.env.PORT ?? 3000);
const ORIGIN = `http://localhost:${PORT}`;

// Core Web Vitals thresholds (WCAG-adjacent, not WCAG — Google 2024 scoring)
const THRESHOLDS = {
  "first-contentful-paint": { good: 1800, poor: 3000 }, // ms
  "largest-contentful-paint": { good: 2500, poor: 4000 },
  "cumulative-layout-shift": { good: 0.1, poor: 0.25 },
  "total-blocking-time": { good: 200, poor: 600 }, // ms
  "speed-index": { good: 3400, poor: 5800 },
};

function score(value, threshold) {
  if (value <= threshold.good) return "✓ good";
  if (value <= threshold.poor) return "~ moderate";
  return "✗ poor";
}

function fmt(value, unit = "ms") {
  if (unit === "ms") return `${Math.round(value)} ${unit}`;
  return value.toFixed(3);
}

async function auditOne(chrome, route) {
  const url = `${ORIGIN}${route.path}`;
  console.log(`[perf] Auditing ${url} ...`);

  const runner = await lighthouse(
    url,
    {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance"],
      formFactor: "mobile",
      throttling: {
        // Simulated slow 4G — conservative defaults
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      },
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
      },
    },
  );
  const lhr = runner.lhr;
  const audits = lhr.audits;

  const metrics = {};
  for (const [key, t] of Object.entries(THRESHOLDS)) {
    const a = audits[key];
    if (!a) continue;
    metrics[key] = {
      value: a.numericValue,
      display: a.displayValue,
      score: score(a.numericValue, t),
    };
  }

  const perfScore = Math.round(lhr.categories.performance.score * 100);

  return {
    routeName: route.name,
    path: route.path,
    score: perfScore,
    metrics,
    warnings: lhr.runWarnings || [],
    errorCount: Object.values(lhr.categories.performance.auditRefs).filter(
      (ref) => {
        const a = audits[ref.id];
        return a && a.score !== null && a.score < 0.5 && ref.group === "diagnostics";
      },
    ).length,
  };
}

async function main() {
  const outDir = "perf-reports";
  mkdirSync(outDir, { recursive: true });

  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const waited = await waitForServer();
    if (!waited) {
      console.error(`[perf] Dev server at ${ORIGIN} did not become reachable in time`);
      process.exit(1);
    }

    const results = [];
    for (const route of ROUTES) {
      try {
        const r = await auditOne(chrome, route);
        results.push(r);
        console.log(`[perf]   ${route.name.padEnd(15)} score=${r.score}  ${Object.values(r.metrics).map(m => m.display).join("  ")} | map: ${r.errorCount} diagnostics`);
      } catch (err) {
        console.error(`[perf] ${route.name} failed:`, err.message);
        results.push({
          route: route.name,
          path: route.path,
          error: err.message,
        });
      }
    }

    writeFileSync(`${outDir}/lighthouse.json`, JSON.stringify(results, null, 2));

    // Markdown summary
    const md = buildMarkdown(results);
    writeFileSync(`${outDir}/lighthouse.md`, md);
    console.log(`[perf] Reports written to ${outDir}/`);
  } finally {
    await chrome.kill();
  }
}

async function waitForServer(maxMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(ORIGIN, { method: "GET" });
      if (r.ok) return true;
    } catch {}
    await new Promise((res) => setTimeout(res, 500));
  }
  return false;
}

function buildMarkdown(results) {
  const lines = ["# Lighthouse Performance Audit", "", `> Generated ${new Date().toISOString()}`, ""];
  lines.push("Throttling: mobile, slow 4G (RTT 150ms, 1.6 Mbps), 4× CPU slowdown");
  lines.push("");
  lines.push("| Route | Perf Score | FCP | LCP | CLS | TBT | Speed Idx | Warnings |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    if (r.error) {
      lines.push(`| ${r.routeName} (${r.path}) | ERROR | – | – | – | – | – | ${r.error} |`);
      continue;
    }
    const m = r.metrics;
    lines.push(
      `| ${r.routeName} (${r.path}) | **${r.score}** | ${m["first-contentful-paint"]?.display || "–"} (${m["first-contentful-paint"]?.score || "–"}) | ${m["largest-contentful-paint"]?.display || "–"} (${m["largest-contentful-paint"]?.score || "–"}) | ${m["cumulative-layout-shift"]?.display || "–"} (${m["cumulative-layout-shift"]?.score || "–"}) | ${m["total-blocking-time"]?.display || "–"} (${m["total-blocking-time"]?.score || "–"}) | ${m["speed-index"]?.display || "–"} (${m["speed-index"]?.score || "–"}) | ${r.warnings.length} |`,
    );
  }
  lines.push("");
  lines.push("**Score legend:** ✓ good (~green thresholds)  ~ moderate  ✗ poor");
  lines.push("");
  lines.push("**Google CWV 2024 thresholds:**");
  lines.push("- FCP: ≤1.8s good, ≤3.0s moderate, >3.0s poor");
  lines.push("- LCP: ≤2.5s good, ≤4.0s moderate, >4.0s poor");
  lines.push("- CLS: ≤0.1 good, ≤0.25 moderate, >0.25 poor");
  lines.push("- TBT: ≤200ms good, ≤600ms moderate, >600ms poor");
  lines.push("");
  return lines.join("\n");
}

main().catch((err) => {
  console.error("[perf] Fatal:", err);
  process.exit(1);
});

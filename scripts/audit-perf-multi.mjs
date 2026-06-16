// Run audit multiple times, clear cache between runs
import { execSync } from "node:child_process";

const path = process.argv[2];
const runs = parseInt(process.argv[3] || "3");

const results = [];
for (let i = 0; i < runs; i++) {
  const out = execSync(`node scripts/audit-perf.mjs "https://www.bijakbeli.web.id${path}"`, { encoding: "utf8" });
  const r = JSON.parse(out);
  results.push(r.metrics);
  // Force wait between runs so cache varies
  await new Promise((r) => setTimeout(r, 1500));
}

const avg = (k) => Math.round(results.reduce((a, r) => a + r[k], 0) / results.length);
const max = (k) => Math.round(Math.max(...results.map((r) => r[k])));
const min = (k) => Math.round(Math.min(...results.map((r) => r[k])));

console.log(`=== ${path} (n=${runs}) ===`);
for (const k of ["ttfb_ms", "fcp_ms", "lcp_ms", "tbt_ms", "load_ms", "cls"]) {
  console.log(`  ${k.padEnd(8)} min=${min(k).toString().padStart(5)} avg=${avg(k).toString().padStart(5)} max=${max(k).toString().padStart(5)}`);
}
console.log("\nRaw:", JSON.stringify(results, null, 2));

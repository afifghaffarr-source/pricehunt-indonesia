#!/usr/bin/env node
/**
 * Check for duplicate version numbers in supabase/migrations/.
 *
 * Per audit plan B2.1, the v1.5.10 migration audit intentionally
 * re-applied several missing tables, leaving some version numbers
 * with multiple files. EXPECTED_COUNTS below captures the legitimate
 * post-audit state.
 *
 * Rules enforced:
 *   1. Any version not in EXPECTED_COUNTS must have exactly 1 file.
 *   2. Any version in EXPECTED_COUNTS must have at most the expected
 *      number of files (no growth beyond what's allowed).
 *   3. Letter-prefix files (A-*, P*, etc.) are exempt — they use a
 *      different naming convention and may coexist freely.
 *
 * Usage:
 *   node scripts/check-migration-versions.mjs
 *
 * Exit codes:
 *   0 — all version counts match expectations
 *   1 — unexpected new duplicate, or known duplicate has grown
 *
 * Wired into CI (.github/workflows/ci.yml) as a pre-build step.
 */

import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

// Maximum allowed file count per numeric version. Versions not listed
// here must have exactly 1 file. Versions listed here may have up to
// the specified count (no more, no less).
//
// Historical context: the v1.5.10 migration audit re-applied 9 missing
// tables whose migrations had been orphaned by duplicate version
// numbers in earlier sequences. See CHANGELOG v1.5.10 for full audit
// trail.
//
// If you need to add a new duplicate (e.g., to re-apply another
// orphaned table), add the version here AND update the audit doc.
const EXPECTED_COUNTS = {
  "002": 2, // api_registry + performance_indexes
  "003": 2, // product_reviews + reviews_system
  "111": 3, // 3 seed files (data_complete, products, products_fixed)
  "112": 2, // 112_*
  "114": 2, // 114_*
  "116": 2, // 116_*
  "120": 2, // 120_*
  "125": 2, // 125_*
};

function extractVersion(filename) {
  const m = filename.match(/^(\d+)_/);
  return m ? m[1] : null;
}

function main() {
  let files;
  try {
    files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  } catch (err) {
    console.error(`✗ Could not read ${MIGRATIONS_DIR}: ${err.message}`);
    process.exit(1);
  }

  const byVersion = new Map();
  for (const f of files) {
    const v = extractVersion(f);
    if (!v) continue;
    if (!byVersion.has(v)) byVersion.set(v, []);
    byVersion.get(v).push(f);
  }

  const errors = [];

  for (const [version, fileList] of byVersion) {
    const expected = EXPECTED_COUNTS[version] ?? 1;
    if (fileList.length !== expected) {
      if (!(version in EXPECTED_COUNTS)) {
        errors.push(
          `✗ Version ${version} has ${fileList.length} files but is NOT in EXPECTED_COUNTS (must be 1):\n` +
            fileList.map((f) => `    - ${f}`).join("\n") +
            `\n    If this is intentional, add "${version}: ${fileList.length}" to EXPECTED_COUNTS.`
        );
      } else {
        errors.push(
          `✗ Version ${version} has ${fileList.length} files but EXPECTED_COUNTS allows ${expected}:\n` +
            fileList.map((f) => `    - ${f}`).join("\n") +
            `\n    If you intentionally grew the count, update EXPECTED_COUNTS.`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error("Migration version check FAILED:\n");
    for (const e of errors) console.error(e + "\n");
    console.error(
      `See scripts/check-migration-versions.mjs for the EXPECTED_COUNTS allowlist.`
    );
    process.exit(1);
  }

  // Success — print summary
  const dupes = [...byVersion.entries()].filter(([, f]) => f.length > 1);
  console.log(
    `✓ Migration version check passed. ${files.length} files, ${byVersion.size} unique versions, ${dupes.length} known duplicates.`
  );
  for (const [v, f] of dupes.sort()) {
    console.log(`    ${v}: ${f.length} files`);
  }
}

main();

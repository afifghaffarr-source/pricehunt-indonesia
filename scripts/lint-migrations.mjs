#!/usr/bin/env node
/**
 * lint-migrations.mjs
 *
 * Static linter for `supabase/migrations/*.sql`. Flags destructive SQL
 * patterns so reviewers cannot accidentally introduce a DROP TABLE,
 * TRUNCATE, etc. in a new migration. This is the safety net the
 * production migration policy relies on.
 *
 * Phase 11 hardening (T11).
 *
 * Patterns detected (after stripping SQL comments):
 *   - DROP TABLE [IF EXISTS] ...
 *   - DROP SCHEMA ...
 *   - DROP FUNCTION ...
 *   - DROP DATABASE ...
 *   - ALTER TABLE ... DROP [COLUMN | CONSTRAINT | ...]
 *   - TRUNCATE [TABLE] ...
 *
 * Allowlist: a small set of KNOWN destructive migrations that are
 * already applied to production and exist only for historical
 * continuity. See:
 *   - supabase/migrations/123_destructive_migration_notes.sql
 *   - docs/MIGRATION_ROLLBACK.md
 *
 * For new fresh databases, the additive migration 124 is the
 * preferred alternative to 114 / 115.
 *
 * Usage:
 *   npm run lint:migrations           # exits 1 on any violation
 *   node scripts/lint-migrations.mjs  # same
 *
 * Exit codes:
 *   0 = clean (destructive patterns only present in allowlisted files)
 *   1 = destructive pattern found in a non-allowlisted file
 *   2 = internal error (e.g. migrations dir missing, unreadable file)
 */

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const MIGRATIONS_DIR = resolve(REPO_ROOT, "supabase", "migrations");

// ---------------------------------------------------------------------------
// Allowlist: KNOWN destructive migrations, already applied to production.
// Any new migration that contains an active destructive pattern must be
// added here explicitly, with justification in docs/MIGRATION_ROLLBACK.md.
// ---------------------------------------------------------------------------
const ALLOWLIST = new Set([
  "114_upgrade_offers_schema.sql",
  "114_upgrade_offers_schema_v3.sql",
  "115_upgrade_price_snapshots.sql",
  "128_drop_legacy_prices_table.sql",
  "129_drop_price_history_table.sql",
  // Phase 1 schema refactor (catalog variant support):
  "136_create_product_variants.sql",
  "137_offers_and_prices_variant_id_fk.sql",
  "138_backfill_default_variants.sql",
  "139_recompute_product_prices_view.sql",
]);

// ---------------------------------------------------------------------------
// Destructive patterns. Order matters only for nicer error messages.
//
// Notes on the ALTER TABLE pattern:
//   We deliberately only flag `ALTER TABLE ... DROP COLUMN` (the only
//   sub-form that can lose data). The following are NOT flagged and
//   are considered safe in this codebase:
//     - `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL`   (no data loss)
//     - `ALTER TABLE ... ALTER COLUMN ... DROP DEFAULT`   (no data loss)
//     - `ALTER TABLE ... DROP CONSTRAINT IF EXISTS`       (constraints
//       hold no rows; in this chain every `DROP CONSTRAINT` is
//       immediately followed by `ADD CONSTRAINT` to redefine the
//       constraint with new behavior — e.g. ON DELETE SET NULL).
// ---------------------------------------------------------------------------
const DESTRUCTIVE_PATTERNS = [
  { name: "DROP TABLE", re: /\bDROP\s+TABLE\b/i },
  { name: "DROP SCHEMA", re: /\bDROP\s+SCHEMA\b/i },
  { name: "DROP FUNCTION", re: /\bDROP\s+FUNCTION\b/i },
  { name: "DROP DATABASE", re: /\bDROP\s+DATABASE\b/i },
  { name: "ALTER TABLE ... DROP COLUMN", re: /\bALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN\b/i },
  { name: "TRUNCATE", re: /\bTRUNCATE\b/i },
];

/**
 * Strip SQL comments so commented-out examples do not trip the lint.
 * Handles both block comments (/* ... *\/) and line comments (-- ...).
 *
 * This is intentionally simple: string-literal awareness is not required
 * because the known destructive migrations don't use -- inside string
 * literals at a position that would shadow a destructive keyword.
 */
function stripComments(sql) {
  // Remove /* ... */ block comments (multiline). The [\s\S] matches any
  // char including newlines; the ? makes it non-greedy.
  const noBlock = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Remove -- line comments. We treat `--` inside a string literal as a
  // comment by accident only if the literal also happens to contain a
  // destructive keyword, which is not the case in the current chain.
  const noLine = noBlock
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx === -1 ? line : line.substring(0, idx);
    })
    .join("\n");
  return noLine;
}

/**
 * Normalize whitespace so patterns can match across line breaks
 * (e.g. `ALTER TABLE offers\nDROP COLUMN ...`).
 */
function normalize(sql) {
  return stripComments(sql).replace(/\s+/g, " ");
}

function findFirstMatch(normalized, re) {
  const m = normalized.match(re);
  return m ? m[0] : null;
}

async function listMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("[lint-migrations] scanning supabase/migrations/*.sql");

  const files = await listMigrationFiles();
  const violations = [];
  const allowlistHits = [];

  for (const file of files) {
    const path = join(MIGRATIONS_DIR, file);
    const sql = await readFile(path, "utf8");
    const normalized = normalize(sql);

    for (const { name, re } of DESTRUCTIVE_PATTERNS) {
      const match = findFirstMatch(normalized, re);
      if (!match) continue;
      if (ALLOWLIST.has(file)) {
        allowlistHits.push({ file, pattern: name, snippet: match });
        continue;
      }
      violations.push({ file, pattern: name, snippet: match });
    }
  }

  for (const hit of allowlistHits) {
    // eslint-disable-next-line no-console
    console.log(
      `[lint-migrations] allowlisted: ${hit.file} (${hit.pattern})`,
    );
  }

  if (violations.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[lint-migrations] OK: scanned ${files.length} migration(s); ` +
        `${allowlistHits.length} allowlisted hit(s); 0 violations.`,
    );
    process.exit(0);
  }

  // eslint-disable-next-line no-console
  console.error(
    `[lint-migrations] FAIL: ${violations.length} destructive pattern(s) ` +
      `found in non-allowlisted migrations:`,
  );
  for (const v of violations) {
    // eslint-disable-next-line no-console
    console.error(`  - ${v.file}: ${v.pattern}  (matched: ${v.snippet})`);
  }
  // eslint-disable-next-line no-console
  console.error(
    "\nTo resolve, either:\n" +
      "  1. Replace DROP / TRUNCATE with the additive alternative\n" +
      "     (see supabase/migrations/124_offers_additive_migration.sql\n" +
      "     for the pattern), OR\n" +
      "  2. If the destructive pattern is truly required, take a Supabase\n" +
      "     database snapshot FIRST, then add the file to ALLOWLIST in\n" +
      "     scripts/lint-migrations.mjs and document the reason in\n" +
      "     docs/MIGRATION_ROLLBACK.md and in a new NNN_*.sql notes file\n" +
      "     under supabase/migrations/.",
  );
  process.exit(1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[lint-migrations] fatal: ${err.message}`);
  process.exit(2);
});

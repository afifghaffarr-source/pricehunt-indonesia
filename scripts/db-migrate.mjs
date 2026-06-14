#!/usr/bin/env node
/**
 * db-migrate.mjs
 *
 * Applies SQL migrations from `supabase/migrations/` to a target database.
 * Tracks applied migrations in a `_migrations` table so re-runs are
 * idempotent.
 *
 * Phase 9 hardening (T9).
 *
 * Usage:
 *   npm run db:migrate                # apply all pending migrations
 *   npm run db:migrate -- --dry-run   # list migrations that would run
 *   npm run db:migrate -- --status    # show applied / pending summary
 *
 * Required env (any one of):
 *   DATABASE_URL          - postgres:// connection string
 *   SUPABASE_DB_URL       - alias used by some Supabase setups
 *
 * Notes:
 *   - Connects directly with `pg`. Requires the DB to be reachable.
 *   - Each migration runs in its own transaction.
 *   - Pure additive. Does NOT auto-run destructive files. Operators
 *     should review `123_destructive_migration_notes.sql` and
 *     `docs/MIGRATION_ROLLBACK.md` before touching them.
 *   - Intentionally conservative: never drops tables, never modifies
 *     RLS in destructive ways.
 */

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const MIGRATIONS_DIR = resolve(REPO_ROOT, "supabase", "migrations");

// Load .env.local first (developer convenience), then .env
loadEnv({ path: resolve(REPO_ROOT, ".env.local") });
loadEnv({ path: resolve(REPO_ROOT, ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const STATUS_ONLY = process.argv.includes("--status");

function log(level, event, fields = {}) {
  // Single-line JSON so log aggregators (Vercel/Datadog) can parse.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      script: "db-migrate",
      ...fields,
    }),
  );
}

function pickConnectionString() {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;
  if (!url) {
    log("error", "missing_connection_string", {
      hint: "Set DATABASE_URL (or SUPABASE_DB_URL / POSTGRES_URL) before running.",
    });
    process.exit(2);
  }
  return url;
}

async function ensureTrackingTable(client) {
  await client.query(`
    create table if not exists public._migrations (
      id          text primary key,
      applied_at  timestamptz not null default now(),
      sha256      text not null,
      bytes       integer not null
    );
  `);
}

async function listMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

async function sha256(text) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}

async function readApplied(client) {
  const { rows } = await client.query(
    "select id, applied_at, sha256 from public._migrations order by id asc",
  );
  return new Map(rows.map((r) => [r.id, r]));
}

async function main() {
  const connectionString = pickConnectionString();
  log("info", "start", { dryRun: DRY_RUN, statusOnly: STATUS_ONLY });

  const files = await listMigrationFiles();
  log("info", "discovered_migrations", { count: files.length });

  const client = new pg.Client({ connectionString, ssl: detectSsl() });
  await client.connect();
  try {
    await ensureTrackingTable(client);
    const applied = await readApplied(client);

    if (STATUS_ONLY) {
      const summary = files.map((f) => ({
        id: f,
        applied: applied.has(f),
        applied_at: applied.get(f)?.applied_at ?? null,
      }));
      log("info", "status", { entries: summary });
      return;
    }

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      log("info", "noop", { message: "No pending migrations." });
      return;
    }

    if (DRY_RUN) {
      log("info", "dry_run_pending", { pending });
      return;
    }

    let appliedCount = 0;
    for (const file of pending) {
      const path = join(MIGRATIONS_DIR, file);
      const sql = await readFile(path, "utf8");
      const hash = await sha256(sql);
      const bytes = Buffer.byteLength(sql, "utf8");
      log("info", "applying", { id: file, bytes });
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          "insert into public._migrations (id, sha256, bytes) values ($1, $2, $3)",
          [file, hash, bytes],
        );
        await client.query("commit");
        appliedCount += 1;
        log("info", "applied", { id: file });
      } catch (err) {
        await client.query("rollback").catch(() => {});
        log("error", "migration_failed", { id: file, error: err.message });
        throw err;
      }
    }

    log("info", "complete", { appliedCount, remaining: files.length - applied.size - appliedCount });
  } finally {
    await client.end();
  }
}

function detectSsl() {
  // Supabase-hosted Postgres requires SSL. Local dev usually does not.
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "";
  if (url.includes("supabase.co") || url.includes("supabase.com")) {
    return { rejectUnauthorized: false };
  }
  return false;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ level: "fatal", event: "exit", error: err.message }));
  process.exit(1);
});

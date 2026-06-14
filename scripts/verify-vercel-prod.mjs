#!/usr/bin/env node
/**
 * verify-vercel-prod.mjs
 *
 * Verifies that the current Vercel production deployment for this
 * project is built from the same git commit as the current HEAD.
 *
 * This is the safety net that catches "we merged to main but forgot
 * to promote the preview deployment to production" - the exact gap
 * that occurred on 2026-06-14: cfefb8d was deployed as a preview
 * only for several hours, while the production alias kept serving
 * the prior commit. Manually running `vercel promote` fixed it;
 * this script exists to make that class of bug impossible to
 * repeat silently.
 *
 * Phase 12 hardening (T12).
 *
 * Required environment variables:
 *   VERCEL_TOKEN       - Vercel personal access token (Bearer auth)
 *   VERCEL_PROJECT_ID  - The Vercel project ID (e.g. prj_xxx)
 *   VERCEL_TEAM_ID     - The Vercel team ID (e.g. team_xxx)
 *
 * Optional:
 *   VERCEL_API_BASE             - Override API base
 *                                 (default: https://api.vercel.com)
 *   EXPECTED_SHA                - Override HEAD check
 *                                 (default: git rev-parse HEAD)
 *   GITHUB_SHA                  - Used as a fallback for EXPECTED_SHA
 *   VERCEL_PROD_REQUIRE_MATCH   - "1" to exit non-zero on mismatch
 *                                 (default: warn-only, exit 0)
 *
 * Usage:
 *   npm run verify:vercel-prod
 *   VERCEL_PROD_REQUIRE_MATCH=1 npm run verify:vercel-prod
 *
 * Exit codes:
 *   0 = match, OR warn-only mismatch, OR check skipped (no token)
 *   1 = mismatch in strict mode (VERCEL_PROD_REQUIRE_MATCH=1)
 *   2 = internal error (network failure, git failure, parse error)
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------
function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[verify-vercel-prod] ${msg}`);
}
function warn(msg) {
  // eslint-disable-next-line no-console
  console.warn(`[verify-vercel-prod] WARN: ${msg}`);
}
function err(msg) {
  // eslint-disable-next-line no-console
  console.error(`[verify-vercel-prod] ERROR: ${msg}`);
}

function getEnv(name) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

function readProjectJson() {
  const p = resolve(REPO_ROOT, ".vercel", "project.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function getExpectedSha() {
  // 1. Explicit override (CI sets this via env).
  const env = getEnv("EXPECTED_SHA") || getEnv("GITHUB_SHA");
  if (env) return env;
  // 2. `git rev-parse HEAD` (works in local dev).
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch (e) {
    throw new Error(`failed to read HEAD via git: ${e.message}`);
  }
}

/**
 * Parse `https://github.com/owner/repo.git` or `git@github.com:owner/repo.git`
 * into { owner, repo }. Returns null if remote isn't GitHub.
 */
function getGithubRepo() {
  try {
    const url = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    const m = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (m) return { owner: m[1], repo: m[2] };
  } catch {
    // ignore - remote might not be configured in some CI runners
  }
  return null;
}

function commitUrl(repo, sha) {
  if (!repo || !sha) return sha || "<unknown-sha>";
  return `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}`;
}

function shorten(sha) {
  return sha ? sha.slice(0, 7) : sha;
}

async function fetchProdDeployment({ token, projectId, teamId, apiBase }) {
  const url = new URL(`${apiBase}/v6/deployments`);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("target", "production");
  url.searchParams.set("limit", "1");
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Vercel API ${res.status} ${res.statusText}: ${text}`);
  }
  const body = await res.json();
  const list = body && Array.isArray(body.deployments) ? body.deployments : [];
  return list[0] || null;
}

function extractSha(deployment) {
  if (!deployment) return null;
  // Vercel returns the commit SHA in `meta.githubCommitSha` (camelCase).
  // Older responses used `meta.githubCommit`. Be defensive.
  const meta = deployment.meta || {};
  return meta.githubCommitSha || meta.githubCommit || null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log("verifying Vercel production deployment matches HEAD");

  const projectJson = readProjectJson();
  const token = getEnv("VERCEL_TOKEN");
  const projectId =
    getEnv("VERCEL_PROJECT_ID") || (projectJson && projectJson.projectId);
  const teamId =
    getEnv("VERCEL_TEAM_ID") || (projectJson && projectJson.orgId);
  const apiBase = getEnv("VERCEL_API_BASE") || "https://api.vercel.com";
  const strict = getEnv("VERCEL_PROD_REQUIRE_MATCH") === "1";

  if (!token) {
    warn(
      "VERCEL_TOKEN is not set; skipping verification. " +
        "To enable this check, set VERCEL_TOKEN, VERCEL_PROJECT_ID, " +
        "and VERCEL_TEAM_ID in your environment or GitHub Actions " +
        "secrets. See docs/DEPLOY_VERIFY.md.",
    );
    process.exit(0);
  }
  if (!projectId) {
    warn(
      "VERCEL_PROJECT_ID is not set and .vercel/project.json is missing; " +
        "skipping verification.",
    );
    process.exit(0);
  }
  if (!teamId) {
    warn(
      "VERCEL_TEAM_ID is not set; the Vercel API will fall back to the " +
        "token's default team. Set VERCEL_TEAM_ID to be explicit.",
    );
  }

  let expected;
  try {
    expected = getExpectedSha();
  } catch (e) {
    err(`failed to determine expected SHA: ${e.message}`);
    process.exit(2);
  }
  const repo = getGithubRepo();
  log(
    `expected HEAD: ${shorten(expected)}  (${commitUrl(repo, expected)})`,
  );

  let prod;
  try {
    prod = await fetchProdDeployment({ token, projectId, teamId, apiBase });
  } catch (e) {
    err(`failed to query Vercel API: ${e.message}`);
    process.exit(2);
  }
  if (!prod) {
    warn("no production deployment found via Vercel API; skipping.");
    process.exit(0);
  }
  const prodSha = extractSha(prod);
  const prodState = prod.state || prod.readyState || "?";
  const prodUrl = prod.url || prod.alias?.[0] || prod.id;
  log(
    `production deployment: ${prodUrl}  (id=${prod.id}, state=${prodState})`,
  );
  log(
    `production SHA:       ${shorten(prodSha)}  (${commitUrl(repo, prodSha)})`,
  );

  if (!prodSha) {
    warn(
      "production deployment has no githubCommitSha in meta; " +
        "this usually means it was created via 'vercel promote' of a " +
        "deployment built before SHA metadata was attached, or via " +
        "the Vercel Dashboard. The check cannot confirm match.",
    );
    process.exit(0);
  }

  if (prodSha === expected) {
    log(`OK: production matches HEAD (${shorten(expected)}).`);
    process.exit(0);
  }

  warn(
    `MISMATCH: HEAD is ${shorten(expected)} but production serves ${shorten(prodSha)}.\n` +
      `  HEAD  (${shorten(expected)}): ${commitUrl(repo, expected)}\n` +
      `  PROD  (${shorten(prodSha)}): ${commitUrl(repo, prodSha)}\n` +
      `If you just merged to main, Vercel built a preview deployment but did\n` +
      `not promote it to production. Run:\n` +
      `  vercel promote <preview-deployment-id> --scope <team-slug>`,
  );

  if (strict) {
    err("VERCEL_PROD_REQUIRE_MATCH=1, treating mismatch as failure.");
    process.exit(1);
  }
  warn("warn-only mode (set VERCEL_PROD_REQUIRE_MATCH=1 to fail CI on mismatch).");
  process.exit(0);
}

main().catch((e) => {
  err(`fatal: ${e.message}`);
  process.exit(2);
});

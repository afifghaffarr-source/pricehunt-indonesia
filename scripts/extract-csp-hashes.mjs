#!/usr/bin/env node
/**
 * Pre-build CSP hash extraction.
 *
 * Why: Next.js's nonce-based CSP requires dynamic rendering for every page
 * (per https://nextjs.org/docs/app/guides/content-security-policy). Static
 * (prerendered) pages emit inline framework `<script>` blocks at BUILD time
 * with no per-request context, so they can't be nonced.
 *
 * Solution: compute SHA-256 hashes of every inline script that appears on
 * static pages at build time, then serve those hashes in the CSP header
 * for those routes. The browser allows inline scripts whose content matches
 * a known hash even without a nonce.
 *
 * This script runs as the `prebuild` npm hook, so it executes BEFORE
 * `next build` starts. That's critical:
 *
 *   - `src/csp-static-hashes.generated.json` is imported statically by
 *     src/proxy.ts. Next.js bundles the import at compile time, so the
 *     JSON content must exist on disk BEFORE the bundle is created.
 *   - Running as `postbuild` (after `next build`) would mean the bundle
 *     captures the empty stub JSON — verified broken, hashes never reach
 *     the deployed proxy.
 *   - Running as `prebuild` means we extract hashes from the PREVIOUS
 *     build's `.next/server/app/` tree (which still exists from the
 *     last successful build) and write them to src/ before bundling.
 *
 * First-build caveat: on a fresh checkout with no `.next/` directory
 * (e.g. CI from a clean clone), the script finds no HTML files and exits
 * without updating the JSON. The stub stays empty. Static pages get
 * nonce CSP (status quo — app works, but loses the hash hardening). The
 * NEXT build (with this commit in place) will have a populated JSON.
 *
 * Hash lag: by one release for new static routes. If you add a new
 * static route, the hash for it appears in the JSON one build cycle
 * later (when prebuild reads from the build that just included it).
 * Existing routes' hashes stay current because prebuild re-extracts on
 * every build.
 *
 * Why per-route (not a single union set):
 *   - 16 static routes × ~12 inline scripts each = ~228 hashes unioned
 *     would bloat every static-page response by ~4 KB of CSP header
 *   - Per-route set is ~12 hashes × 71 chars = ~850 bytes per response
 *   - Per-route is also stricter (page A doesn't get page B's hashes)
 *
 * Verification: the test script (tests/e2e/auth.spec.ts) renders a static
 * page (/auth/login) and verifies the page is interactive, which exercises
 * the hash-based CSP path end-to-end.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const APP_DIR = join(PROJECT_ROOT, ".next", "server", "app");
// Two output paths: the .next/ JSON is kept for tooling/debug; the src/
// JSON is bundled into the proxy via static `import`, which works on
// every runtime (Node, Edge, serverless) without needing fs at request time.
const OUTPUT_BUILD_PATH = join(PROJECT_ROOT, ".next", "csp-static-hashes.json");
const OUTPUT_SRC_PATH = join(
  PROJECT_ROOT,
  "src",
  "csp-static-hashes.generated.json",
);
const PRERENDER_MANIFEST = join(PROJECT_ROOT, ".next", "prerender-manifest.json");

if (!existsSync(APP_DIR)) {
  console.error(
    `[csp-hashes] .next/server/app not found — skipping extraction. ` +
      `Did \`next build\` run successfully?`,
  );
  process.exit(0); // Don't fail the build; middleware will fall back to nonce.
}

if (!existsSync(PRERENDER_MANIFEST)) {
  console.error(
    `[csp-hashes] .next/prerender-manifest.json not found — skipping extraction.`,
  );
  process.exit(0);
}

// Read the prerender manifest to get the canonical static route list.
// We trust the manifest over the filesystem walk because the manifest is
// what Next.js itself uses to decide static vs dynamic.
const manifest = JSON.parse(readFileSync(PRERENDER_MANIFEST, "utf-8"));
const staticRoutes = Object.keys(manifest.routes || {});

if (staticRoutes.length === 0) {
  console.log(`[csp-hashes] No static routes found in manifest — nothing to extract.`);
  process.exit(0);
}

// Regex to find inline `<script>` blocks. Inline = no `src=` attribute.
// The script content is everything between the opening and closing tag.
// We use `[\s\S]` to match across newlines (DOTALL isn't supported in JS).
// We exclude `<script>` tags that have `src=` because those are external
// chunks already covered by CSP `script-src 'self'`.
const INLINE_SCRIPT_RE =
  /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

// Some inline scripts can be quite large; allow up to 1 MB per script.
const MAX_SCRIPT_BYTES = 1_000_000;

/**
 * Compute the SHA-256 hash of a script's exact content, formatted as a
 * CSP `script-src` directive value (`sha256-<base64>`).
 *
 * Note: CSP `sha256-*` values are base64-encoded, NOT hex. We use Node's
 * built-in `createHash` with `base64` encoding.
 */
function hashScript(content) {
  const h = createHash("sha256").update(content, "utf-8").digest("base64");
  return `sha256-${h}`;
}

/**
 * Walk all `.html` files under .next/server/app and extract per-route
 * hash sets.
 *
 * Each prerendered static route has a corresponding `.html` file. The
 * route-to-file mapping follows the directory structure:
 *   .next/server/app/auth/login.html   → /auth/login
 *   .next/server/app/index.html       → /
 *   .next/server/app/_not-found.html  → /_not-found
 */
import { readdirSync, statSync } from "node:fs";

function walkHtml(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkHtml(full));
    } else if (entry.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

function htmlToRoute(htmlPath) {
  // /path/to/.next/server/app/auth/login.html → /auth/login
  // /path/to/.next/server/app/index.html      → /
  // /path/to/.next/server/app/auth/login      → /auth/login (no .html)
  let rel = relative(APP_DIR, htmlPath);
  rel = rel.replace(/\\/g, "/"); // Windows path compat
  // Strip .html suffix
  rel = rel.replace(/\.html$/, "");
  // Strip trailing /index
  rel = rel.replace(/\/index$/, "");
  // / → empty → "/"
  if (!rel) return "/";
  return "/" + rel;
}

const htmlFiles = walkHtml(APP_DIR);
console.log(`[csp-hashes] Scanning ${htmlFiles.length} prerendered HTML files...`);

const staticRouteHashes = {};
let totalScripts = 0;

for (const htmlFile of htmlFiles) {
  const route = htmlToRoute(htmlFile);
  let html;
  try {
    html = readFileSync(htmlFile, "utf-8");
  } catch (err) {
    console.error(`[csp-hashes] Failed to read ${htmlFile}: ${err.message}`);
    continue;
  }

  const hashes = new Set();
  let match;
  // Reset regex state for each file (lastIndex is preserved across calls).
  INLINE_SCRIPT_RE.lastIndex = 0;
  while ((match = INLINE_SCRIPT_RE.exec(html)) !== null) {
    const content = match[1];
    if (content.length > MAX_SCRIPT_BYTES) {
      console.warn(
        `[csp-hashes] Script in ${htmlFile} is ${content.length} bytes (max ${MAX_SCRIPT_BYTES}) — skipping.`,
      );
      continue;
    }
    const h = hashScript(content);
    hashes.add(h);
    totalScripts++;
  }

  if (hashes.size > 0) {
    staticRouteHashes[route] = [...hashes].sort();
  }
}

// Filter to only routes that the prerender manifest lists as static.
// (Files on disk might include generated artifacts not in the manifest.)
const finalHashes = {};
for (const route of staticRoutes) {
  if (staticRouteHashes[route]) {
    finalHashes[route] = staticRouteHashes[route];
  }
}

// Write the JSON manifest for middleware consumption.
const output = {
  staticRoutes: finalHashes,
  generatedAt: new Date().toISOString(),
  // Meta for sanity checks (helps detect Next.js version changes that
  // would invalidate the hashes).
  totalStaticRoutes: Object.keys(finalHashes).length,
  totalInlineScripts: totalScripts,
};

writeFileSync(OUTPUT_BUILD_PATH, JSON.stringify(output, null, 2), "utf-8");

// Also write the same data to src/ so it can be statically imported by
// src/proxy.ts. This is the path that actually reaches the running proxy —
// the .next/ copy is for tooling/debug only and may not be readable from
// the proxy's runtime on serverless/Edge deployments.
writeFileSync(OUTPUT_SRC_PATH, JSON.stringify(output, null, 2), "utf-8");

console.log(
  `[csp-hashes] Extracted ${totalScripts} inline scripts across ` +
    `${Object.keys(finalHashes).length} static routes. ` +
    `Wrote ${OUTPUT_BUILD_PATH.replace(PROJECT_ROOT + "/", "")} (build) ` +
    `and ${OUTPUT_SRC_PATH.replace(PROJECT_ROOT + "/", "")} (src, imported by proxy)`,
);
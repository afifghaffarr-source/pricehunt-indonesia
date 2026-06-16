/**
 * v1.5.3 — Phase 8 collector upsert + DB unique constraint verification.
 *
 * Two test groups:
 *   1. upsert_offer (Python) — runs the function via subprocess, asserts on
 *      the (success, status, body) tuple. Mocks the live ingestion endpoint
 *      by pointing BIJAKBELI_API at a netcat-style stub; the simpler approach
 *      is to test the "skipped (no_price)" branch which is a pure function
 *      and the "exception" branch which exercises the try/except path.
 *
 *   2. Migration 130 applied — queries pg_constraint to confirm
 *      `offers_product_marketplace_unique` exists with the expected def.
 *      This is an integration test that requires the linked Supabase project.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = join(__dirname, "..", "..");
const COLLECTOR = join(PROJECT_ROOT, "collectors", "phase8_vexo_collector.py");

describe("phase8_vexo_collector — upsert_offer (Python)", () => {
  it("file exists and parses", () => {
    expect(existsSync(COLLECTOR)).toBe(true);
    // Parse via python -c — fails if file has a syntax error
    const r = spawnSync("python3", ["-c", `import ast; ast.parse(open(${JSON.stringify(COLLECTOR)}).read())`], {
      encoding: "utf-8",
    });
    expect(r.status).toBe(0);
  });

  it("imports upsert_offer as a callable", () => {
    const r = spawnSync(
      "python3",
      ["-c", `import sys; sys.path.insert(0, 'collectors'); from phase8_vexo_collector import upsert_offer; print('ok'); print(callable(upsert_offer))`],
      { cwd: PROJECT_ROOT, encoding: "utf-8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("ok");
    expect(r.stdout).toContain("True");
  });

  it("skips upsert when price is None (pure-function branch)", () => {
    const script = `
import sys
sys.path.insert(0, 'collectors')
from phase8_vexo_collector import upsert_offer
ok, status, body = upsert_offer(secret="x", product_slug="apple-iphone-15-pro-max", marketplace="tokopedia", url="https://tokopedia.com/search?q=iphone", price=None)
print(f"{ok}|{status}|{body['reason']}")
`;
    const r = spawnSync("python3", ["-c", script], {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
    });
    expect(r.status).toBe(0);
    const [ok, status, reason] = r.stdout.trim().split("|");
    expect(ok).toBe("False");
    expect(status).toBe("skipped");
    expect(reason).toBe("no_price");
  });

  it("returns (False, 'exception', {...}) when API is unreachable", () => {
    const script = `
import sys
sys.path.insert(0, 'collectors')
import phase8_vexo_collector as m
m.API_BASE = "http://127.0.0.1:1"  # closed port
ok, status, body = m.upsert_offer(secret="x", product_slug="apple-iphone-15-pro-max", marketplace="tokopedia", url="https://tokopedia.com/search?q=iphone", price=18500000, timeout=2)
print(f"{ok}|{status}|{type(body.get('error','')).__name__}")
`;
    const r = spawnSync("python3", ["-c", script], {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
    });
    expect(r.status).toBe(0);
    const [ok, status, errorType] = r.stdout.trim().split("|");
    expect(ok).toBe("False");
    expect(status).toBe("exception");
    expect(errorType.length).toBeGreaterThan(0);
  });
});

describe("phase8_vexo_collector — URL filter helpers", () => {
  it("is_mock_url detects /product/<slug>", () => {
    const r = spawnSync(
      "python3",
      ["-c", `import sys; sys.path.insert(0, 'collectors'); from phase8_vexo_collector import is_mock_url; print(is_mock_url('/product/apple-iphone-15-pro-max')); print(is_mock_url('https://tokopedia.com/product/x'))`],
      { cwd: PROJECT_ROOT, encoding: "utf-8" },
    );
    expect(r.status).toBe(0);
    const lines = r.stdout.trim().split("\n");
    expect(lines[0]).toBe("True");
    expect(lines[1]).toBe("True");
  });

  it("is_marketplace_match validates domain", () => {
    const r = spawnSync(
      "python3",
      ["-c", `import sys; sys.path.insert(0, 'collectors'); from phase8_vexo_collector import is_marketplace_match; print(is_marketplace_match('https://www.tokopedia.com/x', 'tokopedia')); print(is_marketplace_match('https://shopee.co.id/y', 'shopee')); print(is_marketplace_match('https://wrong.com/z', 'tokopedia'))`],
      { cwd: PROJECT_ROOT, encoding: "utf-8" },
    );
    expect(r.status).toBe(0);
    const lines = r.stdout.trim().split("\n");
    expect(lines[0]).toBe("True");
    expect(lines[1]).toBe("True");
    expect(lines[2]).toBe("False");
  });

  it("is_skip_url filters ad redirects", () => {
    const r = spawnSync(
      "python3",
      ["-c", `import sys; sys.path.insert(0, 'collectors'); from phase8_vexo_collector import is_skip_url; print(is_skip_url('https://duckduckgo.com/y.js?foo')); print(is_skip_url('https://www.bing.com/aclick?bar')); print(is_skip_url('https://www.tokopedia.com/real-product'))`],
      { cwd: PROJECT_ROOT, encoding: "utf-8" },
    );
    expect(r.status).toBe(0);
    const lines = r.stdout.trim().split("\n");
    expect(lines[0]).toBe("True");
    expect(lines[1]).toBe("True");
    expect(lines[2]).toBe("False");
  });
});

describe("Migration 130 — DB unique constraint applied", () => {
  // Reads SUPABASE_ACCESS_TOKEN from env (set by with-token.sh in CI)
  // and queries the linked project's pg_constraint.
  const token = process.env.SUPABASE_ACCESS_TOKEN;

  it.skipIf(!token)("offers_product_marketplace_unique exists in live DB", () => {
    const r = spawnSync(
      "npx",
      [
        "supabase",
        "db",
        "query",
        "--linked",
        "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.offers'::regclass AND contype = 'u' ORDER BY conname;",
      ],
      { cwd: PROJECT_ROOT, encoding: "utf-8", env: { ...process.env, SUPABASE_ACCESS_TOKEN: token } },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("offers_product_marketplace_unique");
    expect(r.stdout).toContain("UNIQUE (product_id, marketplace_id)");
    expect(r.stdout).toContain("offers_url_key"); // existing constraint preserved
  });

  it.skipIf(!token)("offers count is 173 (208 - 35 dedup, +9 orphans kept)", () => {
    const r = spawnSync(
      "npx",
      ["supabase", "db", "query", "--linked", "SELECT COUNT(*) AS offers_count FROM public.offers;"],
      { cwd: PROJECT_ROOT, encoding: "utf-8", env: { ...process.env, SUPABASE_ACCESS_TOKEN: token } },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/offers_count[\s\S]*?173/);
  });

  it.skipIf(!token)("no duplicate (product_id, marketplace_id) pairs remain", () => {
    const r = spawnSync(
      "npx",
      [
        "supabase",
        "db",
        "query",
        "--linked",
        "SELECT COUNT(*) AS dup_count FROM (SELECT product_id, marketplace_id FROM public.offers WHERE product_id IS NOT NULL GROUP BY 1,2 HAVING COUNT(*) > 1) sub;",
      ],
      { cwd: PROJECT_ROOT, encoding: "utf-8", env: { ...process.env, SUPABASE_ACCESS_TOKEN: token } },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/dup_count[\s\S]*?0\s*│/);
  });
});

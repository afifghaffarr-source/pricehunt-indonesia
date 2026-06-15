import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WCAG 2.1 AA accessibility audit — Phase 4D
 *
 * Scans the 4 most critical user-facing pages with axe-core and fails on
 * any **critical** or **serious** violations (the levels that block real
 * users). Moderate/minor violations are logged for follow-up but don't
 * fail the build — they're tracked in docs/WCAG_AUDIT_*.md instead.
 *
 * Why this matters: Indonesian e-commerce is heavily used on mobile by
 * users with assistive tech (screen readers, keyboard-only nav, low vision).
 * A critical violation = someone literally cannot use the app.
 *
 * Pages audited:
 *   1. Home (/)            — landing + trending products
 *   2. Search (/search)    — primary product discovery
 *   3. Product detail      — purchase decision page
 *   4. Login (/auth/login) — auth gate
 */

type Severity = "critical" | "serious" | "moderate" | "minor";

interface AxeViolation {
  id: string;
  impact: Severity | null;
  description: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
  }>;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

function formatViolation(v: AxeViolation): string {
  const nodes = v.nodes
    .slice(0, 3) // cap at 3 nodes per rule
    .map(
      (n) =>
        `      target: ${n.target.join(" ")}\n` +
        `      html: ${n.html.slice(0, 150)}\n` +
        `      fix: ${n.failureSummary.split("\n").join(" | ").slice(0, 200)}`
    )
    .join("\n");
  const more =
    v.nodes.length > 3 ? `\n      ...and ${v.nodes.length - 3} more nodes` : "";
  return `[${v.impact?.toUpperCase() ?? "?"}] ${v.id}: ${v.description}\n` +
    `      help: ${v.helpUrl}\n` +
    `      ${v.nodes.length} node(s) affected${nodes ? ":\n" + nodes + more : ""}`;
}

async function scanPage(
  page: Page,
  url: string
): Promise<AxeViolation[]> {
  // Use `domcontentloaded` not `networkidle` — Next.js 16 streams RSC + the
  // home page does background polling / prefetch, so network never goes idle.
  // The waitForLoadState("load") below waits for images/CSS, and the 1.5s
  // settle window gives axe a stable DOM to scan (client components need to
  // hydrate so server-only text mismatches don't pollute the report).
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {
    // Some pages never fire "load" (lazy images, deferred scripts). Move on.
  });
  await page.waitForTimeout(1500);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact as Severity | null,
    description: v.description,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      target: n.target as string[],
      html: n.html,
      failureSummary: n.failureSummary ?? "",
    })),
  }));
}

function groupBySeverity(violations: AxeViolation[]): Record<Severity, AxeViolation[]> {
  const groups: Record<Severity, AxeViolation[]> = {
    critical: [],
    serious: [],
    moderate: [],
    minor: [],
  };
  for (const v of violations) {
    const impact = v.impact ?? "minor";
    groups[impact].push(v);
  }
  return groups;
}

test.describe("WCAG 2.1 AA — critical pages", () => {
  test("home page (/): no critical/serious violations", async ({ page }) => {
    const violations = await scanPage(page, "/");
    const grouped = groupBySeverity(violations);
    if (violations.length > 0) {
      console.log(
        `\n[home] axe found ${violations.length} violation(s):\n` +
          violations.map(formatViolation).join("\n\n")
      );
    }
    expect(
      grouped.critical.length,
      `critical: ${grouped.critical.length}, serious: ${grouped.serious.length}`
    ).toBe(0);
    expect(grouped.serious).toHaveLength(0);
  });

  test("search page (/search): no critical/serious violations", async ({
    page,
  }) => {
    const violations = await scanPage(page, "/search?q=laptop");
    const grouped = groupBySeverity(violations);
    if (violations.length > 0) {
      console.log(
        `\n[search] axe found ${violations.length} violation(s):\n` +
          violations.map(formatViolation).join("\n\n")
      );
    }
    expect(
      grouped.critical.length,
      `critical: ${grouped.critical.length}, serious: ${grouped.serious.length}`
    ).toBe(0);
    expect(grouped.serious).toHaveLength(0);
  });

  test("product detail (/product/[slug]): no critical/serious violations", async ({
    page,
  }) => {
    // Use a real product slug from the DB — guarantees the page is renderable
    // (not just a 404 with a clean empty state).
    const slug = "anti-gores-nintendo-switch";
    const violations = await scanPage(page, `/product/${slug}`);
    const grouped = groupBySeverity(violations);
    if (violations.length > 0) {
      console.log(
        `\n[product] axe found ${violations.length} violation(s):\n` +
          violations.map(formatViolation).join("\n\n")
      );
    }
    expect(
      grouped.critical.length,
      `critical: ${grouped.critical.length}, serious: ${grouped.serious.length}`
    ).toBe(0);
    expect(grouped.serious).toHaveLength(0);
  });

  test("login (/auth/login): no critical/serious violations", async ({
    page,
  }) => {
    const violations = await scanPage(page, "/auth/login");
    const grouped = groupBySeverity(violations);
    if (violations.length > 0) {
      console.log(
        `\n[login] axe found ${violations.length} violation(s):\n` +
          violations.map(formatViolation).join("\n\n")
      );
    }
    expect(
      grouped.critical.length,
      `critical: ${grouped.critical.length}, serious: ${grouped.serious.length}`
    ).toBe(0);
    expect(grouped.serious).toHaveLength(0);
  });

  // Summary test — runs ALL pages and produces a report. Tagged so it can be
  // run independently with: npx playwright test --grep "@summary"
  test("summary report: all critical/serious violations across pages", async ({
    page,
  }) => {
    test.setTimeout(180_000); // 4 pages × ~30s each
    const pages = [
      { name: "home", url: "/" },
      { name: "search", url: "/search?q=laptop" },
      { name: "product", url: "/product/anti-gores-nintendo-switch" },
      { name: "login", url: "/auth/login" },
    ];

    const allViolations: Array<{ page: string; violation: AxeViolation }> = [];
    for (const p of pages) {
      const violations = await scanPage(page, p.url);
      for (const v of violations) {
        allViolations.push({ page: p.name, violation: v });
      }
    }

    // Print full report
    console.log(
      `\n\n========== WCAG 2.1 AA AUDIT REPORT ==========\n` +
        `Pages scanned: ${pages.length}\n` +
        `Total violations: ${allViolations.length}\n\n`
    );
    const bySeverity = groupBySeverity(
      allViolations.map((x) => x.violation)
    );
    console.log(
      `By severity: critical=${bySeverity.critical.length}, ` +
        `serious=${bySeverity.serious.length}, ` +
        `moderate=${bySeverity.moderate.length}, ` +
        `minor=${bySeverity.minor.length}\n`
    );

    // Group by rule for triage
    const byRule = new Map<string, { count: number; pages: Set<string>; example: AxeViolation }>();
    for (const { page: pageName, violation } of allViolations) {
      const existing = byRule.get(violation.id);
      if (existing) {
        existing.count++;
        existing.pages.add(pageName);
      } else {
        byRule.set(violation.id, {
          count: 1,
          pages: new Set([pageName]),
          example: violation,
        });
      }
    }

    const sorted = Array.from(byRule.entries()).sort(
      (a, b) => SEVERITY_RANK[a[1].example.impact ?? "minor"] - SEVERITY_RANK[b[1].example.impact ?? "minor"]
    );

    console.log(`\n--- By rule (sorted by severity) ---\n`);
    for (const [id, info] of sorted) {
      console.log(
        `[${info.example.impact?.toUpperCase()}] ${id} — ${info.count}× across ${Array.from(info.pages).join(", ")}\n` +
          `    ${info.example.description}\n` +
          `    ${info.example.helpUrl}\n`
      );
    }
    console.log(`\n===========================================\n`);

    // Don't fail summary — it's a report. The per-page tests above enforce the gate.
  });
});

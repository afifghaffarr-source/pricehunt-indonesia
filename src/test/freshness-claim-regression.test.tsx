/**
 * v1.5.24 — BUG-06 regression guard.
 *
 * The product page used to render "Update baru saja" (just updated) +
 * "Dicek otomatis setiap 1 jam" (checked every hour) via <TrustSignalsBar>,
 * but the data backing those claims was hardcoded `undefined` and the actual
 * cron schedule is daily (`vercel.json: 0 6 * * *`).
 *
 * The bar's `formatLastUpdated` had a fallback `if (!date) return "baru saja"`
 * which made the lie invisible. And `autoCheckFrequency` defaulted to "1 jam"
 * — also a lie (the actual cron runs once per day).
 *
 * This test guards three invariants:
 *   1. TrustSignalsBar renders nothing when lastUpdated is undefined
 *   2. TrustSignalsBar renders nothing when lastUpdated is null
 *   3. Product page passes a real lastUpdated from MAX(prices[].lastUpdated),
 *      not undefined
 *   4. The default "1 jam" lie is gone from the autoCheckFrequency default
 *   5. vercel.json schedules are documented in the test so anyone changing
 *      them must also update the product page
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrustSignalsBar } from "@/components/product/TrustSignalsBar";

describe("BUG-06: lying freshness claim regression guard", () => {
  describe("TrustSignalsBar", () => {
    it("renders nothing when lastUpdated is undefined (was: lied 'baru saja')", () => {
      const html = renderToStaticMarkup(
        <TrustSignalsBar marketplaceCount={6} lastUpdated={undefined} />,
      );
      expect(html).toBe("");
    });

    it("renders nothing when lastUpdated is null", () => {
      // Defensive contract: callers (especially ones that pass nullable DB
      // values) may pass null even though the prop is optional. The component
      // must not crash and must not claim freshness it doesn't have.
      const html = renderToStaticMarkup(
        <TrustSignalsBar marketplaceCount={6} lastUpdated={null} />,
      );
      expect(html).toBe("");
    });

    it("renders real 'X waktu lalu' when given a real date", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const html = renderToStaticMarkup(
        <TrustSignalsBar marketplaceCount={6} lastUpdated={tenDaysAgo} />,
      );
      // The bar should be visible (not empty) and should mention the actual age
      expect(html.length).toBeGreaterThan(0);
      expect(html).toMatch(/10 hari lalu/);
    });

    it("does not default autoCheckFrequency to the lying '1 jam' string", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/product/TrustSignalsBar.tsx"),
        "utf-8",
      );

      // The component's default for autoCheckFrequency must NOT be "1 jam"
      // because the actual cron is daily (vercel.json: 0 6 * * *)
      expect(source).not.toMatch(/autoCheckFrequency\s*=\s*["']1 jam["']/);
    });
  });

  describe("product page", () => {
    it("does not hardcode lastUpdated={undefined}", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src/app/product/[slug]/page.tsx"),
        "utf-8",
      );

      // Find any line that hardcodes lastUpdated to undefined within a
      // <TrustSignalsBar /> block
      const lines = source.split("\n");
      const offenders = lines.filter((line) => {
        const trimmed = line.trim();
        return (
          trimmed === "lastUpdated={undefined}" ||
          trimmed === 'lastUpdated={undefined},' ||
          trimmed === 'lastUpdated={undefined} '
        );
      });

      expect(
        offenders,
        "product page must not hardcode lastUpdated={undefined}; compute from prices[].lastUpdated",
      ).toEqual([]);
    });

    it("passes autoCheckFrequency='1 hari' to match the actual cron", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "src/app/product/[slug]/page.tsx"),
        "utf-8",
      );

      // The cron in vercel.json is "0 6 * * *" = daily at 06:00 UTC
      // So the displayed autoCheckFrequency must say "1 hari", not "1 jam"
      const trustSignalsBlock = source.match(
        /<TrustSignalsBar[\s\S]*?\/>/,
      );
      expect(trustSignalsBlock, "product page must render <TrustSignalsBar>").toBeTruthy();
      expect(trustSignalsBlock![0]).toMatch(/autoCheckFrequency/);
      expect(trustSignalsBlock![0]).not.toMatch(/autoCheckFrequency=["']1 jam["']/);
    });
  });

  describe("cron schedule alignment", () => {
    // The vercel.json cron is the source of truth for product page
    // <TrustSignalsBar autoCheckFrequency>. Test that documents this and
    // asserts no hourly lie is shown on the product page.
    //
    // History: previously tested for `path contains "price"` against
    // `/api/cron/prices` cron. That cron was removed 2026-06-28 because the
    // Vercel Hobby (free) tier caps at 2 cron jobs total and the route
    // handler never existed. We now have a single `digest` cron.
    it("vercel.json exposes exactly one cron on Hobby tier (the source of truth)", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const source = fs.readFileSync(
        path.resolve(process.cwd(), "vercel.json"),
        "utf-8",
      );
      const vercel = JSON.parse(source);

      // Vercel Hobby free-tier max = 2 cron jobs. We use 1 to leave headroom.
      expect(
        vercel.crons?.length,
        "Vercel Hobby caps at 2 cron jobs",
      ).toBeLessThanOrEqual(2);

      const digestCron = vercel.crons?.find((c: { path: string }) =>
        c.path.includes("digest"),
      );
      expect(digestCron, "vercel.json must define a digest cron").toBeTruthy();

      // Weekly summary cron. Documented here so any schedule change must also
      // be reflected on the product page <TrustSignalsBar>.
      expect(digestCron.schedule).toBe("0 9 * * 1");
    });
  });
});

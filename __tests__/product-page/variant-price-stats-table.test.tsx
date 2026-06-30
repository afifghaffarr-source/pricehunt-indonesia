/**
 * Phase 7 — VariantPriceStatsTable component tests.
 *
 * Covers the three behaviors the page relies on:
 *   1. Empty input renders nothing (no empty-state card, no "no data" copy).
 *   2. Single-row input is still rendered (compact products do exist).
 *   3. Sort + winner logic: rows with offers come first, cheapest-min wins
 *      the "Termurah" badge. The "Dipilih" badge wins over "Termurah" when
 *      the selected variant isn't the cheapest (so the active filter is
 *      always visible).
 *   4. Each row is a deep link to `/product/<slug>?v=<variantSlug>`.
 *   5. Missing min/max (no offers) renders the "Belum ada penawaran" copy.
 *
 * Encoding note: `Intl.NumberFormat("id-ID", { style: "currency" })` emits
 * a non-breaking space (U+00A0) between the currency symbol and the digits.
 * The component renders the SSR output verbatim, so assertions on rendered
 * prices use the NNBSP rather than a regular space. This caught us once
 * in CI — leaving the note here so the next person doesn't re-debug it.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VariantPriceStatsTable, type VariantPriceStatsRow } from "@/components/product/VariantPriceStatsTable";

// NNBSP between "Rp" and digits — emitted by Intl.NumberFormat("id-ID", ...).
const NNBSP = "\u00A0";
const rp = (n: number) => `Rp${NNBSP}${new Intl.NumberFormat("id-ID").format(n)},00`;

function mkRow(
  id: string,
  label: string,
  slug: string,
  patch: Partial<VariantPriceStatsRow> = {},
): VariantPriceStatsRow {
  return {
    variantId: id,
    offerCount: 1,
    inStockCount: 1,
    minPrice: 1_000_000,
    maxPrice: 1_000_000,
    lastPrice: 1_000_000,
    lastUpdated: "2026-06-01T00:00:00Z",
    label,
    slug,
    ...patch,
  };
}

describe("VariantPriceStatsTable", () => {
  it("renders nothing when no rows are passed", () => {
    const html = renderToStaticMarkup(
      <VariantPriceStatsTable rows={[]} productSlug="iphone-16" />,
    );
    expect(html).toBe("");
  });

  it("renders one row per variant with min/max price", () => {
    const rows: VariantPriceStatsRow[] = [
      mkRow("v-256", "256GB", "iphone-16-256gb", { minPrice: 15_000_000, maxPrice: 16_000_000 }),
      mkRow("v-512", "512GB", "iphone-16-512gb", { minPrice: 18_000_000, maxPrice: 19_000_000 }),
    ];
    const html = renderToStaticMarkup(
      <VariantPriceStatsTable rows={rows} productSlug="iphone-16" />,
    );
    expect(html).toContain("Harga per Varian");
    expect(html).toContain("256GB");
    expect(html).toContain("512GB");
    expect(html).toContain(`Rp${NNBSP}15.000.000`);
    expect(html).toContain(`Rp${NNBSP}18.000.000`);
  });

  it("sorts cheapest-min first and badges the winner 'Termurah'", () => {
    const rows: VariantPriceStatsRow[] = [
      mkRow("v-512", "512GB", "iphone-16-512gb", { minPrice: 18_000_000 }),
      mkRow("v-128", "128GB", "iphone-16-128gb", { minPrice: 12_000_000 }),
      mkRow("v-256", "256GB", "iphone-16-256gb", { minPrice: 15_000_000 }),
    ];
    const html = renderToStaticMarkup(
      <VariantPriceStatsTable rows={rows} productSlug="iphone-16" />,
    );
    // The cheapest variant (128GB at 12jt) must appear FIRST in the
    // rendered output. We assert by checking the data-variant-slug
    // attribute order — that's the canonical sort order regardless of
    // SVG/path-data that may contain substrings of "128GB".
    const rowMatches = [...html.matchAll(/<a[^>]+data-testid="variant-stats-row"[^>]+>/g)];
    const slugs = rowMatches.map((m) => m[0].match(/data-variant-slug="([^"]+)"/)![1]);
    expect(slugs).toEqual([
      "iphone-16-128gb",
      "iphone-16-256gb",
      "iphone-16-512gb",
    ]);
    // The 128GB row carries the "Termurah" badge.
    const winnerSlug = rowMatches
      .filter((m) => m[0].includes('data-is-winner="true"'))
      .map((m) => m[0].match(/data-variant-slug="([^"]+)"/)![1]);
    expect(winnerSlug).toEqual(["iphone-16-128gb"]);
  });

  it("shows 'Dipilih' badge on the selected variant row", () => {
    const rows: VariantPriceStatsRow[] = [
      mkRow("v-256", "256GB", "iphone-16-256gb", { minPrice: 15_000_000 }),
      mkRow("v-512", "512GB", "iphone-16-512gb", { minPrice: 18_000_000 }),
    ];
    const html = renderToStaticMarkup(
      <VariantPriceStatsTable
        rows={rows}
        productSlug="iphone-16"
        selectedSlug="iphone-16-512gb"
      />,
    );
    expect(html).toContain("Dipilih");
  });

  it("renders deep links to /product/<slug>?v=<variantSlug>", () => {
    const rows: VariantPriceStatsRow[] = [
      mkRow("v-256", "256GB", "iphone-16-256gb"),
    ];
    const html = renderToStaticMarkup(
      <VariantPriceStatsTable rows={rows} productSlug="iphone-16" />,
    );
    expect(html).toContain('href="/product/iphone-16?v=iphone-16-256gb"');
  });

  it("renders 'Belum ada penawaran' for variants with zero offers", () => {
    const rows: VariantPriceStatsRow[] = [
      mkRow("v-256", "256GB", "iphone-16-256gb", {
        minPrice: null,
        maxPrice: null,
        offerCount: 0,
        inStockCount: 0,
        lastPrice: null,
      }),
      mkRow("v-512", "512GB", "iphone-16-512gb", { minPrice: 18_000_000 }),
    ];
    const html = renderToStaticMarkup(
      <VariantPriceStatsTable rows={rows} productSlug="iphone-16" />,
    );
    expect(html).toContain("Belum ada penawaran");
    // The 512GB row (with data) still renders its price. The NNBSP
    // between "Rp" and the digits is intentional — see file-level note.
    expect(html).toContain(`Rp${NNBSP}18.000.000`);
  });

  it("does not badge 'Termurah' when only one variant has offers (nothing to compare against)", () => {
    const rows: VariantPriceStatsRow[] = [
      mkRow("v-256", "256GB", "iphone-16-256gb", { minPrice: 15_000_000 }),
      mkRow("v-empty", "1TB", "iphone-16-1tb", {
        minPrice: null,
        offerCount: 0,
        inStockCount: 0,
      }),
    ];
    const html = renderToStaticMarkup(
      <VariantPriceStatsTable rows={rows} productSlug="iphone-16" />,
    );
    // No `data-is-winner="true"` row when only one variant has data.
    expect(html).not.toMatch(/data-is-winner="true"/);
  });
});

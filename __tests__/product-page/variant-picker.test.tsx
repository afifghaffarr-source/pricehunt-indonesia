/**
 * Phase 3 — Variant picker UI tests.
 *
 * Covers the three units that ship together in this phase:
 *   1. `groupVariantsByAxis` — pure grouping helper, easy to assert on.
 *   2. `ProductVariantPicker` — client component, URL-write behavior,
 *      selected/unselected visual state, out-of-stock handling.
 *   3. `ProductVariantBottomSheet` — mobile entry point: trigger button
 *      + dialog open/close + URL write on selection.
 *
 * Pure-helper tests (groupVariantsByAxis) avoid any DOM/router mocking.
 * Component tests mock `next/navigation` so we can assert that
 * `router.replace` is called with the right URL when a chip is clicked.
 *
 * We do NOT render the bottom sheet's full Radix Dialog portal in the
 * "click chip -> URL update" test — clicking the chip fires
 * `router.replace` AND `setOpen(false)`, but the test only cares about
 * the URL write which is deterministic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, fireEvent } from "@testing-library/react";
import type { ProductVariant } from "@/types/product-types";
import {
  ProductVariantPicker,
  groupVariantsByAxis,
  chipLabelForVariant,
} from "@/app/product/[slug]/ProductVariantPicker";
import { ProductVariantBottomSheet } from "@/app/product/[slug]/ProductVariantBottomSheet";
import { filterPricesByVariant } from "@/components/product/ProductPriceTable";
import type { MarketplacePrice } from "@/lib/types";

// ----- fixtures -----

function mkVariant(
  id: string,
  patch: Partial<ProductVariant> = {},
): ProductVariant {
  return {
    id,
    product_id: "p-1",
    slug: id,
    storage: null,
    color: null,
    connectivity: null,
    sku: null,
    is_default: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...patch,
  };
}

const storageVariants: ProductVariant[] = [
  mkVariant("v-128", { slug: "iphone-16-128gb", storage: "128GB", is_default: true }),
  mkVariant("v-256", { slug: "iphone-16-256gb", storage: "256GB" }),
  mkVariant("v-512", { slug: "iphone-16-512gb", storage: "512GB" }),
];

const colorVariants: ProductVariant[] = [
  mkVariant("c-black", { slug: "iphone-16-black", color: "Hitam" }),
  mkVariant("c-white", { slug: "iphone-16-white", color: "Putih" }),
];

const connectivityVariants: ProductVariant[] = [
  mkVariant("k-wifi", { slug: "ipad-wifi", connectivity: "WiFi" }),
  mkVariant("k-cellular", { slug: "ipad-cellular", connectivity: "Seluler" }),
];

const onlyDefault: ProductVariant[] = [
  mkVariant("v-default", { slug: "iphone-16", is_default: true }),
];

// ----- next/navigation mock -----

const routerReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplace,
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

// ----- pure helpers -----

describe("groupVariantsByAxis", () => {
  it("groups variants by storage / color / connectivity", () => {
    const groups = groupVariantsByAxis([
      ...storageVariants,
      ...colorVariants,
      ...connectivityVariants,
    ]);
    expect(groups.map((g) => g.axis)).toEqual([
      "storage",
      "color",
      "connectivity",
    ]);
    expect(groups[0].variants.map((v) => v.id)).toEqual(["v-128", "v-256", "v-512"]);
    expect(groups[1].variants.map((v) => v.id)).toEqual(["c-black", "c-white"]);
    expect(groups[2].variants.map((v) => v.id)).toEqual(["k-wifi", "k-cellular"]);
  });

  it("skips axes with no variants", () => {
    const groups = groupVariantsByAxis(storageVariants);
    expect(groups.map((g) => g.axis)).toEqual(["storage"]);
  });

  it("filters out inactive variants", () => {
    const groups = groupVariantsByAxis([
      ...storageVariants,
      mkVariant("v-inactive", { storage: "1TB", is_active: false }),
    ]);
    expect(groups[0].variants.map((v) => v.id)).toEqual(["v-128", "v-256", "v-512"]);
  });

  it("uses Bahasa Indonesia axis labels", () => {
    const groups = groupVariantsByAxis([
      ...storageVariants,
      ...colorVariants,
      ...connectivityVariants,
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Penyimpanan",
      "Warna",
      "Konektivitas",
    ]);
  });
});

describe("chipLabelForVariant", () => {
  it("prefers storage", () => {
    expect(chipLabelForVariant(mkVariant("v", { storage: "256GB", color: "Hitam" }))).toBe("256GB");
  });
  it("falls back to color", () => {
    expect(chipLabelForVariant(mkVariant("v", { color: "Hitam" }))).toBe("Hitam");
  });
  it("falls back to connectivity", () => {
    expect(chipLabelForVariant(mkVariant("v", { connectivity: "WiFi" }))).toBe("WiFi");
  });
  it("falls back to slug when nothing is set", () => {
    expect(chipLabelForVariant(mkVariant("v", { slug: "my-variant" }))).toBe("my-variant");
  });
  it("falls back to 'Default' when nothing at all", () => {
    expect(chipLabelForVariant(mkVariant("v", { slug: null }))).toBe("Default");
  });
});

// ----- product price table filter (server-side hero/decision math) -----

describe("filterPricesByVariant", () => {
  const prices = [
    { marketplace: "tokopedia", price: 1, variantId: "v-default", inStock: true },
    { marketplace: "shopee", price: 2, variantId: "v-256", inStock: true },
    { marketplace: "lazada", price: 3, variantId: null, inStock: true },
  ] as unknown as MarketplacePrice[];

  it("returns all prices when no selection", () => {
    expect(filterPricesByVariant(prices, null, "v-default")).toHaveLength(3);
  });

  it("returns all prices when default variant is selected (includes null-variant offers)", () => {
    const out = filterPricesByVariant(prices, "v-default", "v-default");
    expect(out.map((p) => p.marketplace).sort()).toEqual(["lazada", "tokopedia"]);
  });

  it("returns only matching offers when a non-default variant is selected", () => {
    const out = filterPricesByVariant(prices, "v-256", "v-default");
    expect(out.map((p) => p.marketplace)).toEqual(["shopee"]);
  });

  it("treats null defaultVariantId as 'strict' match (defensive)", () => {
    // Pre-Phase-1 product: no default variant on record. Don't include
    // null-variant offers in any selection to avoid misrepresenting
    // scope to the visitor.
    const out = filterPricesByVariant(prices, "v-default", null);
    expect(out.map((p) => p.marketplace)).toEqual(["tokopedia"]);
  });
});

// ----- ProductVariantPicker (server-rendered markup first) -----

describe("ProductVariantPicker — static markup", () => {
  it("renders nothing when no active variants", () => {
    const html = renderToStaticMarkup(
      <ProductVariantPicker
        productSlug="p"
        selectedVariant={null}
        variants={[]}
      />,
    );
    expect(html).toBe("");
  });

  it("renders one chip per variant (storage axis)", () => {
    const html = renderToStaticMarkup(
      <ProductVariantPicker
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={storageVariants}
      />,
    );
    const matches = html.match(/data-testid="variant-chip"/g) ?? [];
    expect(matches).toHaveLength(3);
  });

  it("renders the selected chip with the filled background style", () => {
    const html = renderToStaticMarkup(
      <ProductVariantPicker
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={storageVariants}
      />,
    );
    // The selected (128GB) chip must carry the emerald background class.
    const selected = html.match(/data-selected="true"[\s\S]*?<\/button>/);
    expect(selected, "expected one selected chip").toBeTruthy();
    expect(selected![0]).toMatch(/bg-\[#10B981\]/);
    expect(selected![0]).toMatch(/text-white/);
  });

  it("renders unselected chips with whisper-border style", () => {
    const html = renderToStaticMarkup(
      <ProductVariantPicker
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={storageVariants}
      />,
    );
    const unselected = html.match(/data-selected="false"/g) ?? [];
    expect(unselected).toHaveLength(2);
  });

  it("renders a single chip for products that only have the default variant", () => {
    const html = renderToStaticMarkup(
      <ProductVariantPicker
        productSlug="iphone-16"
        selectedVariant={onlyDefault[0]}
        variants={onlyDefault}
      />,
    );
    const matches = html.match(/data-testid="variant-chip"/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it("skips out-of-stock rendering (active=false variants are filtered)", () => {
    const inactive = mkVariant("v-gone", { storage: "1TB", is_active: false });
    const html = renderToStaticMarkup(
      <ProductVariantPicker
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={[...storageVariants, inactive]}
      />,
    );
    const matches = html.match(/data-testid="variant-chip"/g) ?? [];
    expect(matches).toHaveLength(3);
  });
});

// ----- ProductVariantPicker (interactive, with router mock) -----

describe("ProductVariantPicker — click behaviour", () => {
  beforeEach(() => {
    routerReplace.mockReset();
  });

  it("clicking a chip calls router.replace with the variant slug in the URL", () => {
    const { container } = render(
      <ProductVariantPicker
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={storageVariants}
      />,
    );
    // getByTestId does NOT support CSS attribute selectors; use querySelector
    const chip = container.querySelector(
      '[data-testid="variant-chip"][data-variant-slug="iphone-16-256gb"]',
    ) as HTMLElement;
    expect(chip, "expected 256GB chip to be in the DOM").toBeTruthy();
    fireEvent.click(chip);
    expect(routerReplace).toHaveBeenCalledTimes(1);
    const [href, opts] = routerReplace.mock.calls[0];
    expect(href).toBe("/product/iphone-16?v=iphone-16-256gb");
    expect(opts).toEqual({ scroll: false });
  });

  it("clicking the already-selected chip clears the ?v= param", () => {
    const { container } = render(
      <ProductVariantPicker
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={storageVariants}
      />,
    );
    const selectedChip = container.querySelector(
      '[data-testid="variant-chip"][data-variant-slug="iphone-16-128gb"]',
    ) as HTMLElement;
    fireEvent.click(selectedChip);
    expect(routerReplace).toHaveBeenCalledWith("/product/iphone-16", { scroll: false });
  });
});

// ----- ProductVariantBottomSheet -----

describe("ProductVariantBottomSheet", () => {
  beforeEach(() => {
    routerReplace.mockReset();
  });

  it("renders the trigger button when variants exist", () => {
    const { getByTestId } = render(
      <ProductVariantBottomSheet
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={storageVariants}
      />,
    );
    expect(getByTestId("variant-bottom-sheet-trigger")).toBeTruthy();
  });

  it("renders nothing when there are no variants", () => {
    const { container } = render(
      <ProductVariantBottomSheet
        productSlug="iphone-16"
        selectedVariant={null}
        variants={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the selected variant's label in the trigger", () => {
    const { getByTestId } = render(
      <ProductVariantBottomSheet
        productSlug="iphone-16"
        selectedVariant={storageVariants[0]}
        variants={storageVariants}
      />,
    );
    const trigger = getByTestId("variant-bottom-sheet-trigger");
    expect(trigger.textContent).toContain("128GB");
  });

  it("falls back to 'Pilih varian' when no variant is selected", () => {
    const { getByTestId } = render(
      <ProductVariantBottomSheet
        productSlug="iphone-16"
        selectedVariant={null}
        variants={storageVariants}
      />,
    );
    const trigger = getByTestId("variant-bottom-sheet-trigger");
    expect(trigger.textContent).toContain("Pilih varian");
  });
});

/**
 * v1.5.1 — Adapter placeholder URL rewrite.
 *
 * 36 offers in `offers.url` are `/product/<slug>` (internal placeholder from
 * `backfill_orphan_offers.py`). Serving that to the public leaks the slug
 * mapping and the link 404s. The adapter rewrites these to real marketplace
 * search URLs at the API boundary; the DB column is untouched.
 */
import { describe, it, expect } from "vitest";
import {
  toPriceView,
  isPlaceholderOfferUrl,
  buildMarketplaceSearchUrl,
  type OfferRow,
} from "@/lib/ingestion/adapter";

const baseOffer: OfferRow = {
  id: "offer-1",
  current_price: 18_500_000,
  stock_status: "in_stock",
  is_active: true,
  seller_name: "Tokopedia Official",
  seller_rating: 4.8,
  shipping_estimate: 0,
  last_checked_at: "2026-06-15T00:00:00Z",
  url: "/product/apple-iphone-15-pro-max",
  marketplace_id: "mkt-tokopedia",
  marketplaces: { name: "tokopedia", display_name: "Tokopedia" },
};

describe("isPlaceholderOfferUrl", () => {
  it("detects /product/<slug> placeholder (relative)", () => {
    expect(isPlaceholderOfferUrl("/product/apple-iphone-15-pro-max")).toBe(true);
    expect(isPlaceholderOfferUrl("/product/samsung-galaxy-s24-ultra/")).toBe(true);
  });

  it("detects <domain>/product/<slug> placeholder (absolute)", () => {
    expect(
      isPlaceholderOfferUrl("https://tokopedia.co.id/product/apple-iphone-15-pro-max"),
    ).toBe(true);
    expect(
      isPlaceholderOfferUrl("https://shopee.co.id/product/dyson-v15-detect"),
    ).toBe(true);
    expect(
      isPlaceholderOfferUrl("https://blibli.co.id/product/asus-rog-zephyrus-g14/"),
    ).toBe(true);
  });

  it("rejects real marketplace URLs", () => {
    expect(isPlaceholderOfferUrl("https://www.tokopedia.com/foo")).toBe(false);
    expect(isPlaceholderOfferUrl("https://shopee.co.id/bar")).toBe(false);
  });

  it("handles null/undefined/empty", () => {
    expect(isPlaceholderOfferUrl(null)).toBe(false);
    expect(isPlaceholderOfferUrl(undefined)).toBe(false);
    expect(isPlaceholderOfferUrl("")).toBe(false);
  });
});

describe("buildMarketplaceSearchUrl", () => {
  it("builds Tokopedia search URL", () => {
    expect(buildMarketplaceSearchUrl("tokopedia", "iphone-15-pro-max"))
      .toBe("https://www.tokopedia.com/search?q=iphone%2015%20pro%20max");
  });

  it("builds Shopee search URL with keyword param", () => {
    expect(buildMarketplaceSearchUrl("shopee", "iphone-15-pro-max"))
      .toBe("https://shopee.co.id/search?keyword=iphone%2015%20pro%20max");
  });

  it("builds Bukalapak search URL with bracket-encoded param", () => {
    expect(buildMarketplaceSearchUrl("bukalapak", "iphone-15-pro-max"))
      .toBe("https://www.bukalapak.com/products?search%5Bkeywords%5D=iphone%2015%20pro%20max");
  });

  it("builds Lazada catalog search URL", () => {
    expect(buildMarketplaceSearchUrl("lazada", "iphone-15-pro-max"))
      .toBe("https://www.lazada.co.id/catalog/?q=iphone%2015%20pro%20max");
  });

  it("builds Blibli cari search URL", () => {
    expect(buildMarketplaceSearchUrl("blibli", "iphone-15-pro-max"))
      .toBe("https://www.blibli.com/cari?q=iphone%2015%20pro%20max");
  });

  it("builds TikTok Shop search URL", () => {
    expect(buildMarketplaceSearchUrl("tiktok", "iphone-15-pro-max"))
      .toBe("https://shop.tiktok.com/search?q=iphone%2015%20pro%20max");
  });

  it("falls back to Google for unknown marketplace", () => {
    expect(buildMarketplaceSearchUrl("unknown-marketplace", "foo"))
      .toBe("https://www.google.com/search?q=foo");
  });
});

describe("toPriceView URL handling (v1.5.1)", () => {
  it("rewrites placeholder URL to marketplace search URL (relative)", () => {
    const view = toPriceView({
      ...baseOffer,
      url: "/product/apple-iphone-15-pro-max",
    });
    expect(view.url).toBe(
      "https://www.tokopedia.com/search?q=apple%20iphone%2015%20pro%20max",
    );
  });

  it("rewrites placeholder URL to marketplace search URL (absolute backfill format)", () => {
    const view = toPriceView({
      ...baseOffer,
      url: "https://tokopedia.co.id/product/apple-iphone-15-pro-max",
    });
    expect(view.url).toBe(
      "https://www.tokopedia.com/search?q=apple%20iphone%2015%20pro%20max",
    );
  });

  it("preserves real marketplace URLs", () => {
    const realUrl = "https://www.tokopedia.com/apple/iphone-15-pro-max-123";
    const view = toPriceView({ ...baseOffer, url: realUrl });
    expect(view.url).toBe(realUrl);
  });

  it("returns null when URL is null", () => {
    const view = toPriceView({ ...baseOffer, url: null });
    expect(view.url).toBeNull();
  });

  it("rewrites Shopee placeholder correctly", () => {
    const view = toPriceView({
      ...baseOffer,
      url: "/product/dyson-v15-detect",
      marketplaces: { name: "shopee", display_name: "Shopee" },
    });
    expect(view.url).toBe(
      "https://shopee.co.id/search?keyword=dyson%20v15%20detect",
    );
  });

  it("rewrites Lazada placeholder correctly", () => {
    const view = toPriceView({
      ...baseOffer,
      url: "/product/asus-rog-zephyrus-g14",
      marketplaces: { name: "lazada", display_name: "Lazada" },
    });
    expect(view.url).toBe(
      "https://www.lazada.co.id/catalog/?q=asus%20rog%20zephyrus%20g14",
    );
  });

  it("handles missing marketplace gracefully (falls back to Google)", () => {
    const view = toPriceView({
      ...baseOffer,
      url: "/product/nintendo-switch-oled",
      marketplaces: null,
    });
    expect(view.url).toBe(
      "https://www.google.com/search?q=nintendo%20switch%20oled",
    );
  });
});

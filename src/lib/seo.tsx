/**
 * SEO helper utilities — JSON-LD schema.org markup.
 *
 * Render returned elements anywhere in a page; the script tags will land
 * in the document body. The `application/ld+json` type tells crawlers
 * (Google, Bing, etc.) to parse the JSON as structured data.
 *
 * Why server-rendered JSON-LD instead of next-seo or react-schemaorg:
 *   - zero runtime cost (no client hydration of SEO markup)
 *   - works on pages that are otherwise fully static
 *   - avoids 3rd-party deps that go out of date vs. Google's current
 *     rich-results spec
 */
import type { Product as DomainProduct, MarketplacePrice } from "./types";

const SITE_URL = "https://www.bijakbeli.web.id";
const SITE_NAME = "BijakBeli";
const SITE_ALT_NAME = "BijakBeli.app";
const LOGO_URL = `${SITE_URL}/icons/icon-512.svg`;
const OG_LOCALE = "id_ID";

/**
 * Maps internal marketplace slugs to their schema.org `OfferSeller` name
 * and the URL pattern used for the `url` field. When the product's offer
 * URL is the placeholder `/product/{slug}` (legacy rows before v1.5.1),
 * we substitute the canonical search URL instead.
 */
function marketplaceUrl(marketplace: string, slug: string, offerUrl?: string): string {
  // If the offer URL is already a real marketplace URL, use it.
  if (offerUrl && /^https?:\/\//.test(offerUrl) && !offerUrl.includes("/product/")) {
    return offerUrl;
  }
  // Fallback: link to the search page filtered by marketplace.
  return `${SITE_URL}/search?q=${encodeURIComponent(slug)}&marketplace=${marketplace}`;
}

function inStockToSchema(value: boolean): string {
  return value
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

/**
 * Organization schema — applied to the homepage. Establishes the brand
 * entity for Google's knowledge panel and ties together the sameAs links
 * (social profiles — empty for now, fill in when accounts exist).
 */
export function organizationJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    alternateName: SITE_ALT_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      "Bandingkan harga dari 6 marketplace Indonesia (Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok Shop). Deteksi diskon palsu dan rekomendasi kapan beli.",
    foundingDate: "2026",
    areaServed: {
      "@type": "Country",
      name: "Indonesia",
    },
    knowsAbout: [
      "Price comparison",
      "Indonesia e-commerce",
      "Tokopedia",
      "Shopee",
      "Bukalapak",
      "Lazada",
      "Blibli",
      "TikTok Shop",
    ],
  });
}

/**
 * WebSite schema with SearchAction — applied to the homepage. Enables
 * Google's sitelinks searchbox so users can search BijakBeli directly
 * from the SERP. The `target.urlTemplate` must match the actual search
 * page query param (`?q=…`).
 */
export function websiteJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: SITE_ALT_NAME,
    inLanguage: "id-ID",
    publisher: { "@id": `${SITE_URL}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      // `required name=…` means the search box is mandatory.
      "query-input": "required name=search_term_string",
    },
  });
}

/**
 * Product + Offer schema — applied to product detail pages. Multiple
 * Offer entries (one per marketplace) are emitted so each price point
 * shows up in the rich result. `AggregateOffer` would lose the
 * per-marketplace detail so we use the array form.
 */
export function productJsonLd(
  product: DomainProduct,
  offers: MarketplacePrice[]
): string {
  // Build one Offer per marketplace, sorted cheapest first.
  const sorted = [...offers]
    .filter((o) => o.price > 0)
    .sort((a, b) => a.price - b.price);

  const offerList = sorted.map((o) => ({
    "@type": "Offer",
    name: `${o.marketplace} — ${product.name}`,
    price: o.price,
    priceCurrency: "IDR",
    availability: inStockToSchema(o.inStock),
    url: marketplaceUrl(o.marketplace, product.slug, o.url),
    seller: {
      "@type": "Organization",
      name: o.seller || o.marketplace,
    },
    priceValidUntil: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString().slice(0, 10),
    shippingDetails: o.shippingCost > 0
      ? {
          "@type": "OfferShippingDetails",
          shippingRate: {
            "@type": "MonetaryAmount",
            value: o.shippingCost,
            currency: "IDR",
          },
        }
      : undefined,
  }));

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/product/${product.slug}#product`,
    name: product.name,
    description: product.description?.slice(0, 5000) || product.name,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.category,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IDR",
      lowPrice: product.lowestPrice,
      highPrice: product.highestPrice,
      offerCount: offerList.length,
      offers: offerList,
    },
  });
}

/**
 * BreadcrumbList — applied to product pages. Helps SERPs show a
 * breadcrumb trail (Home > Category > Product).
 */
export function breadcrumbJsonLd(
  product: Pick<DomainProduct, "name" | "slug" | "category">
): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category,
        item: `${SITE_URL}/search?category=${encodeURIComponent(product.category)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${SITE_URL}/product/${product.slug}`,
      },
    ],
  });
}

/**
 * Convenience: wraps a JSON string in a `<script type="application/ld+json">`
 * element ready to drop into a React tree. Use the key to disambiguate
 * multiple schemas on the same page.
 */
export function JsonLd({
  data,
  key,
}: {
  data: string | Record<string, unknown> | Record<string, unknown>[];
  key: string;
}) {
  const json = typeof data === "string" ? data : JSON.stringify(data);
  return (
    <script
      key={key}
      type="application/ld+json"
      // The JSON is generated server-side from our own data, never from
      // user input, so this is safe.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export const SEO = {
  SITE_URL,
  SITE_NAME,
  SITE_ALT_NAME,
  LOGO_URL,
  OG_LOCALE,
} as const;

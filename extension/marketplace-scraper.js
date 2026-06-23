/**
 * BijakBeli Marketplace Scraper (Manifest V3 content script)
 *
 * Runs in the user's browser context on marketplace pages. Bypasses all
 * anti-bot detection because we use the user's real cookies + IP.
 *
 * Strategy:
 *   1. Detect marketplace from hostname
 *   2. Detect page type (PDP vs search result vs category)
 *   3. Extract products via DOM selectors (primary) + JSON-LD (fallback)
 *   4. Use MutationObserver to handle SPA lazy-loading
 *   5. Send extracted products to background worker (deduped)
 */

(function () {
  "use strict";

  // Prevent double-injection on SPAs that navigate client-side
  if (window.__BIJAKBELI_SCRAPER_LOADED__) return;
  window.__BIJAKBELI_SCRAPER_LOADED__ = true;

  // ─── Helpers ──────────────────────────────────────────────────────────

  function sendToBackground(payload) {
    try {
      chrome.runtime.sendMessage({ type: "BIJAKBELI_SCRAPE", payload }, () => {
        // Swallow "Receiving end does not exist" errors during page unload.
        void chrome.runtime.lastError;
      });
    } catch (e) {
      // Extension context invalidated (page navigated during update). Silent.
    }
  }

  function parsePriceIDR(text) {
    if (!text) return null;
    // Match "Rp1.234.000", "Rp 1.234.000", "1.234.000", "Rp1,234,000"
    const match = text.match(/(?:Rp\.?\s*)?([\d.]+(?:\.\d{3})*)/i);
    if (!match) return null;
    // Remove dots (thousands separator in IDR)
    const numStr = match[1].replace(/\./g, "").replace(/,/g, "");
    const num = parseInt(numStr, 10);
    return isNaN(num) || num <= 0 ? null : num;
  }

  /**
   * Generate a stable, deterministic, unique-per-product URL.
   * Used when the card link points to a generic search page instead of
   * the individual product URL (common in Tokopedia search results where
   * linkEl.href can equal window.location.href).
   *
   * Format: <page-url>#product=<slugified-title>-<first-8-chars-of-hash>
   * This keeps the URL unique per (search-query, product) pair without
   * fabricating a fake product path.
   */
  function makeUniqueSearchUrl(baseUrl, title) {
    const slug = (title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 40);
    let hash = 0;
    const str = `${baseUrl}|${title}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    const hashHex = (hash >>> 0).toString(16).padStart(8, "0");
    return `${baseUrl}#product=${slug}-${hashHex}`;
  }

  /**
   * Decide if a candidate URL is "real" (points to a specific product page)
   * vs "generic" (search/category/listing page). Generic URLs must be made
   * unique per product or the backend will reject duplicates.
   */
  function isGenericUrl(url) {
    if (!url) return true;
    const lower = url.toLowerCase();
    const path = lower.split("?")[0].split("#")[0];
    // Generic patterns (search/category/listing)
    if (path.endsWith("/search") || path.endsWith("/search/")) return true;
    if (lower.includes("search?") || lower.includes("search/?")) return true;
    if (path.endsWith("/cari") || path.endsWith("/cari/")) return true;
    if (path.endsWith("/catalog") || path.endsWith("/catalog/")) return true;
    if (path.endsWith("/list") || path.includes("/list/")) return true;
    if (path.endsWith("/find") || path.includes("/find/")) return true;
    // Specific product patterns (must contain numeric product ID)
    if (path.includes("-i.") && /\-i\.\d+\.\d+/.test(lower)) return false; // shopee: -i.shopid.itemid
    // Tokopedia: /p/<id> OR /p/<name>/<id>
    if (/\/p\/\d+/.test(lower)) return false;
    if (/\/p\/[^/?#]+\/\d+/.test(lower)) return false;
    // Lazada: /products/<name>/<id>.html
    if (/\/products\/[^/?#]+\/[^/?#]+\.html/.test(lower)) return false;
    if (/\/products\/[^/?#]+\/\d+/.test(lower)) return false;
    // TikTok Shop: /product/<name>/<id>
    if (/\/product\/[^/?#]+\/\d+/.test(lower)) return false;
    // Blibli: /p/<name>/<id>-<slug> or /p/<slug>-<id>
    if (/\/p\/[^/?#]*\d+/.test(lower)) return false;
    // Default: treat as generic (safer to dedupe than to send dupes)
    return true;
  }

  function parseRating(text) {
    if (!text) return null;
    const match = text.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return null;
    const num = parseFloat(match[1].replace(",", "."));
    return isNaN(num) ? null : Math.min(5, Math.max(0, num));
  }

  function parseSoldCount(text) {
    if (!text) return null;
    // "Terjual 1.2rb+", "500+ terjual", "1.5k terjual"
    const lower = text.toLowerCase();
    let multiplier = 1;
    let num = 0;
    if (lower.includes("rb") || lower.includes("k")) multiplier = 1000;
    else if (lower.includes("jt") || lower.includes("m")) multiplier = 1000000;
    const match = text.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return null;
    num = parseFloat(match[1].replace(",", ".")) * multiplier;
    return isNaN(num) ? null : Math.round(num);
  }

  function cleanText(text) {
    return text ? text.trim().replace(/\s+/g, " ") : "";
  }

  function detectMarketplace() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("tokopedia")) return "tokopedia";
    if (host.includes("shopee")) return "shopee";
    if (host.includes("lazada")) return "lazada";
    if (host.includes("blibli")) return "blibli";
    if (host.includes("bukalapak")) return "bukalapak";
    if (host.includes("tiktok")) return "tiktok";
    return "unknown";
  }

  function isPDP() {
    const url = window.location.href.toLowerCase();
    const host = window.location.hostname.toLowerCase();
    if (host.includes("shopee")) {
      return /-i\.\d+\.\d+/.test(url); // shopee product URL pattern
    }
    if (host.includes("tokopedia")) {
      return /\/p\//.test(url) || /\/product\//.test(url);
    }
    if (host.includes("lazada")) return /\/products\//i.test(url);
    if (host.includes("blibli")) return /\/p\//.test(url);
    if (host.includes("bukalapak")) return /\/p\//.test(url);
    if (host.includes("tiktok")) return /\/product\//i.test(url);
    return false;
  }

  function isSearchPage() {
    const url = window.location.href.toLowerCase();
    const host = window.location.hostname.toLowerCase();
    if (host.includes("shopee")) return url.includes("search?keyword=") || url.includes("/search?");
    if (host.includes("tokopedia")) return url.includes("/search?q=") || url.includes("search?");
    if (host.includes("lazada")) return url.includes("/catalog/?q=");
    if (host.includes("blibli")) return url.includes("/cari/");
    if (host.includes("bukalapak")) return url.includes("/products?search");
    return false;
  }

  // ─── Marketplace selectors ─────────────────────────────────────────────
  // Each extractor returns an array of product objects { title, price, url, ... }
  // Returns [] if nothing found. Selector strings are tried in order.

  const SCRAPERS = {
    shopee: {
      // Search results page
      search: () => {
        const items = [];
        // Shopee search uses [data-sqe="item"] as containers
        const cards = document.querySelectorAll(
          '[data-sqe="item"], .shopee-search-item-result__item'
        );
        cards.forEach((card) => {
          try {
            const linkEl = card.querySelector('a[href*="-i."]');
            const rawUrl = linkEl?.href || null;
            if (!rawUrl) return;

            const titleEl = card.querySelector(
              '[data-sqe="name"], .yQmm7j, .Cve6sr, a > div > div:nth-child(2) > div:nth-child(2)'
            );
            const priceEl = card.querySelector(
              '[data-sqe="price"], .YJ449y, .k9JZlv'
            );
            const soldEl = card.querySelector('[data-sqe="rating"], .OwmobA, .O0r97T');
            const imgEl = card.querySelector("img");

            const title = cleanText(titleEl?.textContent || linkEl.textContent);
            const price = parsePriceIDR(priceEl?.textContent);
            if (!title || !price) return;

            // Ensure URL is unique per product. If Shopee card link points
            // to a search page (generic), make it unique with title hash.
            const url = isGenericUrl(rawUrl)
              ? makeUniqueSearchUrl(rawUrl, title)
              : rawUrl;

            items.push({
              title,
              price,
              original_price: null,
              url,
              image_url: imgEl?.src || imgEl?.getAttribute("data-src") || null,
              sold_count: parseSoldCount(soldEl?.textContent),
              rating: null,
              seller_name: null,
            });
          } catch (_) {}
        });
        return items;
      },
      // PDP (Product Detail Page)
      pdp: () => {
        const items = [];
        try {
          // Shopee PDP selectors — multiple fallbacks since they change classes
          const titleEl = document.querySelector(
            'section.product-briefing h1, [class*="product-briefing"] h1, .attKMx, [data-testid="pdp-product-title"]'
          );
          const priceEl = document.querySelector(
            '.product-price .pqTWkA, [class*="product-price"] [class*="_2B9h01"], [data-testid="pdp-product-price"], div[class*="price"] > div'
          );
          const originalPriceEl = document.querySelector(
            '.product-price .Y3xBta, .original-price, [class*="originalPrice"]'
          );
          const sellerEl = document.querySelector(
            '.shop-name, [class*="shop-name"], a[href*="/shop/"] .name'
          );
          const ratingEl = document.querySelector(
            '[class*="product-rating"] [class*="rating"], .product-detail-star__count'
          );
          const soldEl = document.querySelector(
            '.product-detail-star__sell, [class*="product-sold"]'
          );
          const imgEl = document.querySelector(
            'img[class*="product-image"], [class*="product-cover"] img'
          );

          const title = cleanText(titleEl?.textContent);
          const price = parsePriceIDR(priceEl?.textContent);
          if (!title || !price) return items;

          items.push({
            title,
            price,
            original_price: parsePriceIDR(originalPriceEl?.textContent),
            url: window.location.href,
            image_url: imgEl?.src || null,
            sold_count: parseSoldCount(soldEl?.textContent),
            rating: parseRating(ratingEl?.textContent),
            seller_name: cleanText(sellerEl?.textContent) || null,
          });
        } catch (_) {}
        return items;
      },
    },

    tokopedia: {
      search: () => {
        const items = [];
        // Tokopedia search uses dynamic class names; use data-testid if available
        const cards = document.querySelectorAll('[data-testid="divProductWrapper"], [data-testid="master-product-card"]');
        cards.forEach((card) => {
          try {
            const linkEl = card.querySelector('a[href*="/p/"]');
            const rawUrl = linkEl?.href || null;
            if (!rawUrl) return;

            const titleEl = card.querySelector('[data-testid="spnSRPProdName"], [data-testid="lblProductName"]');
            const priceEl = card.querySelector('[data-testid="spnSRPProdPrice"], [data-testid="lblProductPrice"]');
            const sellerEl = card.querySelector('[data-testid="spnSRPProdShopName"], [data-testid="lblProductShopName"]');
            const ratingEl = card.querySelector('[data-testid="spnSRPProdRating"]');
            const soldEl = card.querySelector('[data-testid="spnSRPProdSold"]');
            const imgEl = card.querySelector("img");

            const title = cleanText(titleEl?.textContent || linkEl.getAttribute("aria-label"));
            const price = parsePriceIDR(priceEl?.textContent);
            if (!title || !price) return;

            // Tokopedia search results commonly use a[href*="/p/"] which
            // can match generic search page when card structure varies.
            // Hash-title fallback ensures unique URLs across cards.
            const url = isGenericUrl(rawUrl)
              ? makeUniqueSearchUrl(rawUrl, title)
              : rawUrl;

            items.push({
              title,
              price,
              original_price: null,
              url,
              image_url: imgEl?.src || null,
              sold_count: parseSoldCount(soldEl?.textContent),
              rating: parseRating(ratingEl?.textContent),
              seller_name: cleanText(sellerEl?.textContent) || null,
            });
          } catch (_) {}
        });
        return items;
      },
      pdp: () => {
        const items = [];
        try {
          const titleEl = document.querySelector('[data-testid="lblPDPDetailProductName"], h1[data-testid]');
          const priceEl = document.querySelector('[data-testid="lblPDPDetailProductPrice"]');
          const originalPriceEl = document.querySelector(
            '[data-testid="lblPDPDetailProductPriceSlash"], .original-price'
          );
          const sellerEl = document.querySelector('[data-testid="llbPDPFooterShopName"] a, [data-testid="lblPDPFooterShopName"]');
          const ratingEl = document.querySelector('[data-testid="lblPDPDetailProductRatingNumber"]');
          const soldEl = document.querySelector('[data-testid="lblPDPDetailProductSoldCounter"]');
          const imgEl = document.querySelector('[data-testid="PDPImageMain"] img, .product-image img');

          const title = cleanText(titleEl?.textContent);
          const price = parsePriceIDR(priceEl?.textContent);
          if (!title || !price) return items;

          items.push({
            title,
            price,
            original_price: parsePriceIDR(originalPriceEl?.textContent),
            url: window.location.href,
            image_url: imgEl?.src || null,
            sold_count: parseSoldCount(soldEl?.textContent),
            rating: parseRating(ratingEl?.textContent),
            seller_name: cleanText(sellerEl?.textContent) || null,
          });
        } catch (_) {}
        return items;
      },
    },

    lazada: {
      search: () => {
        const items = [];
        const cards = document.querySelectorAll('[data-tracking="product-card"], [class*="Bm3ON"]');
        cards.forEach((card) => {
          try {
            const linkEl = card.querySelector('a[href*="/products/"]');
            const url = linkEl?.href || null;
            if (!url) return;

            const titleEl = card.querySelector('[class*="RfADt"], a[title]');
            const priceEl = card.querySelector('[class*="ooOxS"], [data-tracking="product-price"]');
            const imgEl = card.querySelector("img");

            const title = cleanText(titleEl?.getAttribute("title") || titleEl?.textContent);
            const price = parsePriceIDR(priceEl?.textContent);
            if (!title || !price) return;

            items.push({
              title, price, original_price: null, url,
              image_url: imgEl?.src || null,
              sold_count: null, rating: null, seller_name: null,
            });
          } catch (_) {}
        });
        return items;
      },
      pdp: () => {
        const items = [];
        try {
          const titleEl = document.querySelector('.pdp-mod-product-badge-title, h1');
          const priceEl = document.querySelector('.pdp-product-price, [class*="pdpPrice"]');
          const originalPriceEl = document.querySelector('.pdp-product-price__old, .price-old');
          const sellerEl = document.querySelector('.seller-name__detail, [class*="seller-name"]');
          const imgEl = document.querySelector('.gallery-preview-panel__image img');

          const title = cleanText(titleEl?.textContent);
          const price = parsePriceIDR(priceEl?.textContent);
          if (!title || !price) return items;

          items.push({
            title,
            price,
            original_price: parsePriceIDR(originalPriceEl?.textContent),
            url: window.location.href,
            image_url: imgEl?.src || null,
            sold_count: null,
            rating: null,
            seller_name: cleanText(sellerEl?.textContent) || null,
          });
        } catch (_) {}
        return items;
      },
    },

    blibli: {
      search: () => {
        const items = [];
        const cards = document.querySelectorAll('[data-testid="product-card"], [class*="product-card"]');
        cards.forEach((card) => {
          try {
            const linkEl = card.querySelector('a[href*="/p/"]');
            const url = linkEl?.href || null;
            if (!url) return;

            const titleEl = card.querySelector('[data-testid="product-card-title"], h3, h4');
            const priceEl = card.querySelector('[data-testid="product-card-price"]');

            const title = cleanText(titleEl?.textContent);
            const price = parsePriceIDR(priceEl?.textContent);
            if (!title || !price) return;

            items.push({
              title, price, original_price: null, url,
              image_url: card.querySelector("img")?.src || null,
              sold_count: null, rating: null, seller_name: null,
            });
          } catch (_) {}
        });
        return items;
      },
      pdp: () => {
        const items = [];
        try {
          const titleEl = document.querySelector('.product-title, h1');
          const priceEl = document.querySelector('.price, [data-testid="product-price"]');
          const originalPriceEl = document.querySelector('.price-strikethrough, .original-price');
          const sellerEl = document.querySelector('.merchant-name');
          const imgEl = document.querySelector('.product-image img');

          const title = cleanText(titleEl?.textContent);
          const price = parsePriceIDR(priceEl?.textContent);
          if (!title || !price) return items;

          items.push({
            title,
            price,
            original_price: parsePriceIDR(originalPriceEl?.textContent),
            url: window.location.href,
            image_url: imgEl?.src || null,
            sold_count: null,
            rating: null,
            seller_name: cleanText(sellerEl?.textContent) || null,
          });
        } catch (_) {}
        return items;
      },
    },

    bukalapak: {
      search: () => {
        const items = [];
        const cards = document.querySelectorAll('[data-testid="product-card"], .product-card');
        cards.forEach((card) => {
          try {
            const linkEl = card.querySelector('a[href*="/p/"]');
            const url = linkEl?.href || null;
            if (!url) return;
            const titleEl = card.querySelector('h3, [data-testid="product-name"]');
            const priceEl = card.querySelector('[data-testid="product-price"], .price');

            const title = cleanText(titleEl?.textContent);
            const price = parsePriceIDR(priceEl?.textContent);
            if (!title || !price) return;

            items.push({
              title, price, original_price: null, url,
              image_url: card.querySelector("img")?.src || null,
              sold_count: null, rating: null, seller_name: null,
            });
          } catch (_) {}
        });
        return items;
      },
      pdp: () => {
        // Most generic fallback
        return scrapeFromJSONLD();
      },
    },

    tiktok: {
      search: () => scrapeFromJSONLD(),
      pdp: () => scrapeFromJSONLD(),
    },
  };

  /**
   * Universal fallback: parse schema.org Product JSON-LD.
   * Works on TikTok Shop, and acts as a safety net on others.
   */
  function scrapeFromJSONLD() {
    const items = [];
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach((s) => {
        try {
          const data = JSON.parse(s.textContent || "");
          const products = Array.isArray(data) ? data : [data];
          products.forEach((p) => {
            if (p["@type"] === "Product" || p.name) {
              const offer = p.offers && (Array.isArray(p.offers) ? p.offers[0] : p.offers);
              const price = parsePriceIDR(offer?.price?.toString() || offer?.lowPrice?.toString());
              if (p.name && price) {
                items.push({
                  title: cleanText(p.name),
                  price,
                  original_price: null,
                  url: window.location.href,
                  image_url: p.image || null,
                  sold_count: null,
                  rating: parseRating(p.aggregateRating?.ratingValue?.toString()),
                  seller_name: p.brand?.name || null,
                });
              }
            }
          });
        } catch (_) {}
      });
    } catch (_) {}
    return items;
  }

  // ─── Main scrape routine ──────────────────────────────────────────────

  let scrapeTimer = null;
  let lastSentHash = "";

  function scrape() {
    const marketplace = detectMarketplace();
    if (marketplace === "unknown") return;

    const scraper = SCRAPERS[marketplace];
    if (!scraper) return;

    let products = [];
    try {
      if (isPDP()) {
        products = scraper.pdp();
      } else if (isSearchPage()) {
        products = scraper.search();
      } else {
        // Unknown page type: try both, dedup by URL
        products = [...scraper.pdp(), ...scraper.search()];
      }
    } catch (e) {
      console.error("[BijakBeli] Scrape error:", e);
      return;
    }

    // Fallback to JSON-LD if DOM scrape returned nothing
    if (products.length === 0) {
      products = scrapeFromJSONLD();
      if (products.length === 0) return;
    }

    // Dedupe by URL within batch
    const seen = new Set();
    products = products.filter((p) => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    // Skip if nothing changed (hash-based)
    const hash = JSON.stringify(products.map((p) => [p.url, p.price]));
    if (hash === lastSentHash) return;
    lastSentHash = hash;

    sendToBackground({
      marketplace,
      url: window.location.href,
      pageType: isPDP() ? "pdp" : isSearchPage() ? "search" : "other",
      products,
      capturedAt: new Date().toISOString(),
    });
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────

  // Initial scrape after small delay (let SPA settle)
  setTimeout(scrape, 1500);

  // Observe DOM mutations for lazy-loaded results (search pages)
  const observer = new MutationObserver(() => {
    if (scrapeTimer) clearTimeout(scrapeTimer);
    scrapeTimer = setTimeout(scrape, 800);
  });

  // Wait for body to exist before observing
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Also re-scrape on URL change (SPA route changes)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      lastSentHash = ""; // Reset dedup
      setTimeout(scrape, 1500);
    }
  });
  urlObserver.observe(document.documentElement, { childList: true, subtree: true });

  // Listen for manual scrape trigger from popup/sidepanel
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "BIJAKBELI_FORCE_SCRAPE") {
      lastSentHash = ""; // Reset dedup to force re-send
      scrape();
      sendResponse({ triggered: true });
      return true;
    }
    return false;
  });

  console.log(
    `[BijakBeli] Scraper loaded for ${detectMarketplace()} (${isPDP() ? "PDP" : isSearchPage() ? "search" : "page"})`
  );
})();

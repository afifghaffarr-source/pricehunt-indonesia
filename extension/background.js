/**
 * BijakBeli Extension — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 *   1. Receive scraped products from content scripts
 *   2. Dedupe against recent submissions (same URL within 1 hour)
 *   3. POST to /api/ingestion/offer-snapshot with INGESTION_SECRET
 *   4. Track submission history in chrome.storage.local
 *   5. Periodically flush pending submissions (in case of network drops)
 */

// INGESTION_SECRET is bundled at build time. In dev, we read from
// chrome.storage.local where popup.js stores it after user setup.
// For MVP, we use a public ingestion key (rate-limited per IP).

const BIJAKBELI_API = "https://www.bijakbeli.web.id";
const SUBMIT_ENDPOINT = `${BIJAKBELI_API}/api/ingestion/offer-snapshot`;
const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_HISTORY = 200;
const FLUSH_ALARM = "bijakbeli-flush";

// In-memory pending queue (lost on service worker idle — that's OK, we flush via storage)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept for future enhancement (queue persistence)
const pendingQueue = new Map(); // url → product payload

// ─── Helpers ─────────────────────────────────────────────────────────────

async function getIngestionSecret() {
  const { ingestionSecret } = await chrome.storage.local.get("ingestionSecret");
  return ingestionSecret || null;
}

async function setIngestionSecret(secret) {
  await chrome.storage.local.set({ ingestionSecret: secret });
}

async function getHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  return history;
}

async function appendHistory(entry) {
  const history = await getHistory();
  history.unshift(entry);
  // Trim to MAX_HISTORY
  while (history.length > MAX_HISTORY) history.pop();
  await chrome.storage.local.set({ history });
}

async function getStats() {
  const { stats = { totalSubmitted: 0, lastSubmissionAt: null, byMarketplace: {} } } =
    await chrome.storage.local.get("stats");
  return stats;
}

async function bumpStats(marketplace, success) {
  const stats = await getStats();
  if (success) {
    stats.totalSubmitted += 1;
    stats.lastSubmissionAt = new Date().toISOString();
    stats.byMarketplace[marketplace] = (stats.byMarketplace[marketplace] || 0) + 1;
    await chrome.storage.local.set({ stats });
  }
}

// ─── Submission ──────────────────────────────────────────────────────────

/**
 * POST a single product to the offer-snapshot endpoint.
 */
async function submitProduct(payload) {
  const secret = await getIngestionSecret();
  if (!secret) {
    return { ok: false, error: "INGESTION_SECRET belum dikonfigurasi" };
  }

  try {
    const res = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      offerId: data.offer_id,
      confidence: data.confidence_score,
      message: data.message,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Submit a batch with throttling (max 5 concurrent, 200ms between batches).
 */
async function submitBatch(products, marketplace) {
  const results = [];
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 200;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (product) => {
        const payload = {
          marketplace: product.marketplace || marketplace,
          product_url: product.url,
          title: product.title,
          price: product.price,
          original_price: product.original_price || undefined,
          seller_name: product.seller_name || undefined,
          seller_rating: product.seller_rating || undefined,
          rating: product.rating || undefined,
          sold_count: product.sold_count || undefined,
          stock_status: "available",
          image_url: product.image_url || undefined,
          source: "browser_extension_v3",
          captured_at: product.capturedAt || new Date().toISOString(),
          parser_version: "3.0.1",
        };

        const result = await submitProduct(payload);
        await bumpStats(product.marketplace || marketplace, result.ok);

        return {
          url: product.url,
          title: product.title,
          price: product.price,
          ...result,
          submittedAt: new Date().toISOString(),
        };
      })
    );
    results.push(...batchResults);

    // Log to history (cap at MAX_HISTORY)
    for (const r of batchResults) {
      await appendHistory({
        marketplace,
        title: r.title,
        price: r.price,
        url: r.url,
        success: r.ok,
        confidence: r.confidence,
        message: r.message,
        submittedAt: r.submittedAt,
      });
    }

    if (i + BATCH_SIZE < products.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}

// ─── Dedupe ──────────────────────────────────────────────────────────────

async function recentlySubmitted(url) {
  const history = await getHistory();
  const cutoff = Date.now() - DEDUPE_WINDOW_MS;
  return history.some(
    (h) => h.url === url && new Date(h.submittedAt).getTime() > cutoff
  );
}

// ─── Message handlers ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  (async () => {
    try {
      switch (message.type) {
        case "BIJAKBELI_SCRAPE": {
          const { marketplace, products } = message.payload;
          const deduped = [];
          for (const p of products) {
            if (!(await recentlySubmitted(p.url))) deduped.push(p);
          }
          if (deduped.length === 0) {
            sendResponse({ accepted: 0, deduplicated: products.length });
            return;
          }
          const results = await submitBatch(deduped, marketplace);
          sendResponse({
            accepted: results.filter((r) => r.ok).length,
            failed: results.filter((r) => !r.ok).length,
            deduplicated: products.length - deduped.length,
          });
          break;
        }

        case "BIJAKBELI_MANUAL_SCRAPE": {
          // Triggered from popup: scrape current tab immediately
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) {
            sendResponse({ error: "Tidak ada tab aktif" });
            return;
          }
          try {
            const result = await chrome.tabs.sendMessage(tab.id, { type: "BIJAKBELI_FORCE_SCRAPE" });
            sendResponse({ ok: true, ...result });
          } catch (e) {
            sendResponse({ error: "Halaman ini belum punya content script", message: e.message });
          }
          break;
        }

        case "BIJAKBELI_GET_STATS": {
          const stats = await getStats();
          const history = await getHistory();
          sendResponse({ stats, recentHistory: history.slice(0, 10) });
          break;
        }

        case "BIJAKBELI_SET_SECRET": {
          await setIngestionSecret(message.secret);
          sendResponse({ ok: true });
          break;
        }

        case "BIJAKBELI_CLEAR_HISTORY": {
          await chrome.storage.local.remove(["history", "stats"]);
          sendResponse({ ok: true });
          break;
        }

        default:
          sendResponse({ error: "Unknown message type" });
      }
    } catch (e) {
      console.error("[BijakBeli background]", e);
      sendResponse({ error: e instanceof Error ? e.message : String(e) });
    }
  })();

  // Return true to keep the channel open for async sendResponse.
  return true;
});

// ─── Flush on alarm (periodically retry failed) ──────────────────────────

chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== FLUSH_ALARM) return;

  // Nothing to flush currently — pendingQueue is in-memory only.
  // Kept for future enhancement (queue persistence).
});

// ─── Lifecycle ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Open welcome page on first install
    chrome.tabs.create({
      url: `${BIJAKBELI_API}/extension/installed`,
    });
  }
});

// Allow side panel to open via action click
chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false });

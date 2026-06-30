/**
 * BijakBeli Extension — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 *   1. Receive scraped products from content scripts
 *   2. Dedupe against recent submissions (same URL within 1 hour)
 *   3. POST to /api/ingestion/offer-snapshot with INGESTION_SECRET
 *   4. Track submission history in chrome.storage.local
 *   5. Periodically flush pending submissions (in case of network drops)
 *   6. Watchlist: poll current prices every 30 min, notify on drops (P5)
 */

// ES module imports — manifest declares background as { type: "module" }
import {
  getWatchlist as wlGetWatchlist,
  addToWatchlist as wlAddToWatchlist,
  removeFromWatchlist as wlRemoveFromWatchlist,
  recordPriceCheck as wlRecordPriceCheck,
  recordNotification as wlRecordNotification,
  itemsToNotify as wlItemsToNotify,
} from "./lib/watchlist.js";

// Forward notifications to the product URL when clicked.
const notificationUrlMap = {};
chrome.notifications.onClicked.addListener((notificationId) => {
  const url = notificationUrlMap[notificationId];
  if (url) chrome.tabs.create({ url });
  chrome.notifications.clear(notificationId);
  delete notificationUrlMap[notificationId];
});

// Storage adapter expected by the watchlist module.
const storageAdapter = {
  get: (k) => chrome.storage.local.get(k),
  set: (o) => chrome.storage.local.set(o),
};

// INGESTION_SECRET is bundled at build time. In dev, we read from
// chrome.storage.local where popup.js stores it after user setup.
// For MVP, we use a public ingestion key (rate-limited per IP).

const BIJAKBELI_API = "https://www.bijakbeli.web.id";
const SUBMIT_ENDPOINT = `${BIJAKBELI_API}/api/ingestion/offer-snapshot`;
const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_HISTORY = 200;
const FLUSH_ALARM = "bijakbeli-flush";
const WATCH_CHECK_ALARM = "bijakbeli-watch-check";
const MAX_CONCURRENT_SUBMISSIONS = 10; // Global limit across all tabs

// In-memory pending queue (lost on service worker idle — that's OK, we flush via storage)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept for future enhancement (queue persistence)
const pendingQueue = new Map(); // url → product payload

// Global semaphore for rate limiting
let activeSubmissions = 0;
const submissionQueue = [];

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

async function getPendingQueue() {
  const { pendingQueue = [] } = await chrome.storage.local.get("pendingQueue");
  return pendingQueue;
}
// Contract: this must mirror extension/lib/queue.js getPendingQueue
// (storage adapter = chrome.storage.local). Tests live in
// src/test/extension-retry-queue.test.ts. To use the extracted module,
// wire background.js via importScripts('lib/queue.js').

async function addToPendingQueue(payload, marketplace) {
  const queue = await getPendingQueue();
  // Dedupe: don't add if already in queue
  if (queue.some((item) => item.payload.product_url === payload.product_url)) {
    return;
  }
  queue.push({
    payload,
    marketplace,
    addedAt: new Date().toISOString(),
    retryCount: 0,
  });
  await chrome.storage.local.set({ pendingQueue: queue });
  await updateBadge();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept for future enhancement
async function removeFromPendingQueue(urls) {
  const queue = await getPendingQueue();
  const filtered = queue.filter((item) => !urls.includes(item.payload.product_url));
  await chrome.storage.local.set({ pendingQueue: filtered });
}

async function getPendingCount() {
  const queue = await getPendingQueue();
  return queue.length;
}

async function updateBadge() {
  const count = await getPendingCount();
  if (count > 0) {
    await chrome.action.setBadgeText({ text: String(count) });
    await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }); // amber-500
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

// ─── Submission ──────────────────────────────────────────────────────────

/**
 * Rate-limited wrapper: ensures at most MAX_CONCURRENT_SUBMISSIONS active.
 * Queues excess submissions and processes them sequentially.
 */
async function withRateLimit(fn) {
  // Wait for slot to open
  while (activeSubmissions >= MAX_CONCURRENT_SUBMISSIONS) {
    await new Promise((resolve) => {
      submissionQueue.push(resolve);
    });
  }

  activeSubmissions++;
  try {
    return await fn();
  } finally {
    activeSubmissions--;
    // Release next waiting submission
    if (submissionQueue.length > 0) {
      const next = submissionQueue.shift();
      next();
    }
  }
}

/**
 * POST a single product to the offer-snapshot endpoint.
 */
async function submitProduct(payload) {
  return withRateLimit(async () => {
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
  });
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
          parser_version: "3.1.0",
          variant: product.variant || undefined,
        };

        const result = await submitProduct(payload);
        await bumpStats(product.marketplace || marketplace, result.ok);

        // Add to retry queue if failed (network error, 500, 503, etc)
        if (!result.ok && result.status !== 400 && result.status !== 401) {
          await addToPendingQueue(payload, product.marketplace || marketplace);
        }

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
          const pendingQueue = await getPendingQueue();
          sendResponse({ 
            stats, 
            recentHistory: history.slice(0, 10),
            pendingCount: pendingQueue.length,
            pendingQueue: pendingQueue.slice(0, 5) // Show first 5 pending items
          });
          break;
        }

        case "BIJAKBELI_FLUSH_NOW": {
          const result = await flushPendingQueue();
          sendResponse({ ok: true, ...result });
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

        case "BIJAKBELI_GET_WATCHLIST": {
          const list = await watchStorageGet();
          sendResponse({ list });
          break;
        }

        case "BIJAKBELI_ADD_WATCH": {
          try {
            const item = await wlAddToWatchlist(storageAdapter, message.payload);
            await updateBadge();
            sendResponse({ ok: true, item });
          } catch (e) {
            sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          break;
        }

        case "BIJAKBELI_REMOVE_WATCH": {
          const removed = await wlRemoveFromWatchlist(storageAdapter, message.url);
          await updateBadge();
          sendResponse({ ok: removed });
          break;
        }

        case "BIJAKBELI_CHECK_WATCHES_NOW": {
          // Manual trigger from popup / sidepanel when user wants an instant poll
          const result = await checkWatchlistPrices();
          sendResponse({ ok: true, ...result });
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

/**
 * Reusable flush logic: processes pending queue and retries failed submissions.
 * Called by alarm listener (every 5 min) and manual trigger (FLUSH_NOW).
 */
async function flushPendingQueue() {
  const queue = await getPendingQueue();
  if (queue.length === 0) return { attempted: 0, succeeded: 0, remaining: 0 };

  console.log(`[BijakBeli] Flushing ${queue.length} pending submissions...`);

  const MAX_RETRIES = 3;
  const successfulUrls = [];
  const updatedQueue = [];

  for (const item of queue) {
    // Skip if exceeded max retries
    if (item.retryCount >= MAX_RETRIES) {
      console.log(`[BijakBeli] Dropping ${item.payload.product_url} after ${MAX_RETRIES} retries`);
      continue;
    }

    const result = await submitProduct(item.payload);
    
    if (result.ok) {
      // Success! Remove from queue
      successfulUrls.push(item.payload.product_url);
      await bumpStats(item.marketplace, true);
      await appendHistory({
        marketplace: item.marketplace,
        title: item.payload.title,
        price: item.payload.price,
        url: item.payload.product_url,
        success: true,
        confidence: result.confidence,
        message: result.message,
        submittedAt: new Date().toISOString(),
      });
    } else if (result.status !== 400 && result.status !== 401) {
      // Transient error (500, 503, network) — keep in queue
      updatedQueue.push({
        ...item,
        retryCount: item.retryCount + 1,
      });
    }
    // else: permanent error (400, 401) — drop silently

    // Throttle to avoid overwhelming API
    await new Promise((r) => setTimeout(r, 300));
  }

  // Update queue (remove successful + increment retry count)
  await chrome.storage.local.set({ pendingQueue: updatedQueue });

  console.log(`[BijakBeli] Flush complete: ${successfulUrls.length} succeeded, ${updatedQueue.length} still pending`);
  
  // Update badge to reflect new queue size
  await updateBadge();

  return {
    attempted: queue.length,
    succeeded: successfulUrls.length,
    remaining: updatedQueue.length,
  };
}

/**
 * Watchlist polling: for each watched URL, fetch current price from public
 * API endpoint. Items where price ≤ target (and not recently notified) get
 * a native browser notification. Caller: chrome.alarms listener (30 min).
 *
 * Returns count summary for logging / sidepanel display.
 */
async function checkWatchlistPrices() {
  const items = await wlGetWatchlist(storageAdapter);
  if (!items || items.length === 0) return { checked: 0, notified: 0 };

  const secret = await getIngestionSecret();
  if (!secret) {
    console.warn("[BijakBeli watchlist] INGESTION_SECRET not set — skipping poll");
    return { checked: 0, notified: 0 };
  }

  const currentPrices = {};
  for (const item of items) {
    try {
      const res = await fetch(
        `${BIJAKBELI_API}/api/extension/current-price?url=${encodeURIComponent(item.url)}`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (typeof data?.price === "number") {
        currentPrices[item.url] = data.price;
        await wlRecordPriceCheck(storageAdapter, item.url, data.price);
      }
    } catch (e) {
      console.warn(`[BijakBeli watchlist] price check failed for ${item.url}`, e);
    }
  }

  const toNotify = wlItemsToNotify(items, currentPrices);
  for (const item of toNotify) {
    const nid = `bijakbeli-drop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    notificationUrlMap[nid] = item.url;
    try {
      await chrome.notifications.create(nid, {
        type: "basic",
        iconUrl: "icon128.png",
        title: "Harga turun! 🎯",
        message: `${(item.title || "Produk").slice(0, 80)} sekarang Rp ${item.lastSeenPrice?.toLocaleString("id-ID") || currentPrices[item.url]?.toLocaleString("id-ID")}`,
        contextMessage: `Target: Rp ${item.targetPrice.toLocaleString("id-ID")} • ${item.marketplace || ""}`,
        priority: 1,
      });
      await wlRecordNotification(storageAdapter, item.url);
    } catch (e) {
      console.warn("[BijakBeli watchlist] notification failed", e);
      delete notificationUrlMap[nid];
    }
  }

  return { checked: items.length, notified: toNotify.length };
}

chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 5 });
chrome.alarms.create(WATCH_CHECK_ALARM, { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    await flushPendingQueue();
  } else if (alarm.name === WATCH_CHECK_ALARM) {
    await checkWatchlistPrices();
  }
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

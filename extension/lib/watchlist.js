/**
 * BijakBeli Extension — Price Watchlist Logic
 *
 * Pure async functions for managing the user's watch list of products
 * with target prices. When current price drops to ≤ target, an alert fires.
 *
 * Storage adapter is injected so the same code works:
 * - In the extension: chrome.storage.local
 * - In Vitest: an in-memory fake
 */

const STORAGE_KEY = "priceWatchlist";
const MAX_ITEMS = 50;

/**
 * Read the watchlist. Returns [] if storage is empty or value is malformed.
 * @param {{get: Function, set: Function}} storage
 */
export async function getWatchlist(storage) {
  const result = await storage.get(STORAGE_KEY);
  const list = result?.[STORAGE_KEY];
  return Array.isArray(list) ? list : [];
}

/**
 * Add a product URL with a target price. Dedupe by URL.
 * Returns the new/updated item, or null if duplicate with identical target.
 * @param {Function} storage
 * @param {{url: string, title?: string, marketplace?: string, targetPrice: number}} item
 * @returns {Promise<object>} the watch item now in the list
 */
export async function addToWatchlist(storage, item) {
  if (!item?.url || typeof item.targetPrice !== "number" || item.targetPrice <= 0) {
    throw new Error("addToWatchlist: requires url and positive targetPrice");
  }
  const list = await getWatchlist(storage);
  const existingIdx = list.findIndex((w) => w.url === item.url);
  if (existingIdx >= 0) {
    // Update target price in place
    list[existingIdx] = {
      ...list[existingIdx],
      targetPrice: item.targetPrice,
      title: item.title ?? list[existingIdx].title,
      marketplace: item.marketplace ?? list[existingIdx].marketplace,
    };
    await storage.set({ [STORAGE_KEY]: list });
    return list[existingIdx];
  }
  if (list.length >= MAX_ITEMS) {
    throw new Error(`Watchlist limit reached (${MAX_ITEMS}). Remove an item first.`);
  }
  const newItem = {
    url: item.url,
    title: item.title ?? "",
    marketplace: item.marketplace ?? "",
    targetPrice: item.targetPrice,
    addedAt: new Date().toISOString(),
    lastSeenPrice: null,
    lastCheckedAt: null,
    lastNotifiedAt: null,
  };
  list.push(newItem);
  await storage.set({ [STORAGE_KEY]: list });
  return newItem;
}

/**
 * Remove a watch item by URL. Returns true if an item was removed.
 */
export async function removeFromWatchlist(storage, url) {
  const list = await getWatchlist(storage);
  const filtered = list.filter((w) => w.url !== url);
  if (filtered.length === list.length) return false;
  await storage.set({ [STORAGE_KEY]: filtered });
  return true;
}

/**
 * Update the last-seen price + timestamp for a URL after a poll.
 */
export async function recordPriceCheck(storage, url, price) {
  const list = await getWatchlist(storage);
  const idx = list.findIndex((w) => w.url === url);
  if (idx < 0) return false;
  list[idx] = {
    ...list[idx],
    lastSeenPrice: price,
    lastCheckedAt: new Date().toISOString(),
  };
  await storage.set({ [STORAGE_KEY]: list });
  return true;
}

/**
 * Mark that we just sent a notification for this URL so we don't spam on
 * every poll. Notifications re-arm if the target is raised above current
 * price and dropped again.
 */
export async function recordNotification(storage, url) {
  const list = await getWatchlist(storage);
  const idx = list.findIndex((w) => w.url === url);
  if (idx < 0) return false;
  list[idx] = {
    ...list[idx],
    lastNotifiedAt: new Date().toISOString(),
  };
  await storage.set({ [STORAGE_KEY]: list });
  return true;
}

/**
 * Given the latest-polled price for each watched item, return the items that
 * should fire a notification (current <= target, not recently notified).
 *
 * Pure function — does not touch storage. Caller persists via
 * recordNotification() afterwards.
 *
 * @param {Array} watchlist
 * @param {Record<string, number>} currentPricesByUrl — map of url → price
 * @returns {Array<object>} items to notify
 */
export function itemsToNotify(watchlist, currentPricesByUrl) {
  const now = Date.now();
  // Re-arm window: after notification, don't re-trigger within 24h unless
  // target was raised above current price (then we re-arm immediately).
  const REARM_WINDOW_MS = 24 * 60 * 60 * 1000;

  return watchlist.filter((item) => {
    const price = currentPricesByUrl[item.url];
    if (typeof price !== "number") return false;
    if (price > item.targetPrice) return false;

    const lastNotified = item.lastNotifiedAt ? new Date(item.lastNotifiedAt).getTime() : 0;
    if (lastNotified && now - lastNotified < REARM_WINDOW_MS) return false;

    return true;
  });
}

/**
 * Plain-JS dual export: bind to window so popup/sidepanel can use helpers
 * without an ES module roundtrip in Manifest V3 service workers.
 */
const _globalThis = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
if (_globalThis) {
  _globalThis.BijakBeliWatchlist = {
    STORAGE_KEY,
    MAX_ITEMS,
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    recordPriceCheck,
    recordNotification,
    itemsToNotify,
  };
}

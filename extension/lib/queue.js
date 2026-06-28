/**
 * BijakBeli Extension — Retry Queue Logic
 *
 * Pure async functions for managing the pending submission queue.
 * Storage adapter is injected so callers can use chrome.storage.local
 * (extension) or fake storage (Vitest tests).
 */

const STORAGE_KEY = "pendingQueue";
const MAX_RETRIES = 3;

/**
 * Storage adapter shape (chrome.storage.local in production, in-memory fake in tests).
 * @typedef {{ get: (key: string) => Promise<Record<string, unknown>>, set: (obj: Record<string, unknown>) => Promise<void> }} StorageAdapter
 */

/**
 * Read queue from storage. Returns [] if empty/undefined.
 * @param {StorageAdapter} storage
 */
export async function getPendingQueue(storage) {
  const result = await storage.get(STORAGE_KEY);
  const queue = result?.[STORAGE_KEY];
  return Array.isArray(queue) ? queue : [];
}

/**
 * Append a payload to the queue. Skips duplicates (same product_url).
 * @param {{get: Function, set: Function}} storage
 * @param {object} payload - submission payload
 * @param {string} marketplace
 * @returns {boolean} true if added, false if duplicate
 */
export async function addToPendingQueue(storage, payload, marketplace) {
  const queue = await getPendingQueue(storage);
  if (queue.some((item) => item.payload?.product_url === payload?.product_url)) {
    return false; // duplicate, skip
  }
  queue.push({
    payload,
    marketplace,
    addedAt: new Date().toISOString(),
    retryCount: 0,
  });
  await storage.set({ [STORAGE_KEY]: queue });
  return true;
}

/**
 * Remove queue items by product_url.
 * @returns {Promise<number>} count of items removed
 */
export async function removeFromPendingQueue(storage, urls) {
  const queue = await getPendingQueue(storage);
  const urlSet = new Set(urls);
  const filtered = queue.filter((item) => !urlSet.has(item.payload?.product_url));
  if (filtered.length === queue.length) return 0; // nothing removed
  await storage.set({ [STORAGE_KEY]: filtered });
  return queue.length - filtered.length;
}

/**
 * Increment retry count for a specific URL without removing it.
 * Used during flush when submission returns transient error.
 */
export async function incrementRetry(storage, productUrl) {
  const queue = await getPendingQueue(storage);
  const updated = queue.map((item) => {
    if (item.payload?.product_url === productUrl) {
      return { ...item, retryCount: item.retryCount + 1 };
    }
    return item;
  });
  await storage.set({ [STORAGE_KEY]: updated });
}

/**
 * Process queue: call submitProduct for each item, partition into
 * successful (removed), retryable (count++), and dropped (count ≥ MAX_RETRIES).
 *
 * @param storage - chrome.storage.local compatible
 * @param submitFn - async (payload) => { ok: boolean, status?: number, message?: string }
 * @returns {{attempted: number, succeeded: number, remaining: number, dropped: number}}
 */
export async function flushPendingQueue(storage, submitFn, opts = {}) {
  const maxRetries = opts.maxRetries ?? MAX_RETRIES;
  const throttleMs = opts.throttleMs ?? 0;

  const queue = await getPendingQueue(storage);
  if (queue.length === 0) {
    return { attempted: 0, succeeded: 0, remaining: 0, dropped: 0 };
  }

  const successfulUrls = [];
  const remainingItems = [];
  let dropped = 0;

  for (const item of queue) {
    // Permanent failures: drop silently (caller should never retry these)
    if (item.retryCount >= maxRetries) {
      dropped++;
      continue;
    }

    let result;
    try {
      result = await submitFn(item.payload);
    } catch (e) {
      result = { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
    }

    if (result.ok) {
      successfulUrls.push(item.payload.product_url);
    } else if (result.status === 400 || result.status === 401) {
      // Permanent client errors — drop
      dropped++;
    } else {
      // Transient error — keep with incremented count
      remainingItems.push({
        ...item,
        retryCount: item.retryCount + 1,
      });
    }

    if (throttleMs > 0) {
      await new Promise((r) => setTimeout(r, throttleMs));
    }
  }

  await storage.set({ [STORAGE_KEY]: remainingItems });

  return {
    attempted: queue.length,
    succeeded: successfulUrls.length,
    remaining: remainingItems.length,
    dropped,
  };
}

/**
 * Plain-JS dual export: bind to global for non-module Chrome extension usage.
 */
const _globalThis = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
if (_globalThis) {
  _globalThis.BijakBeliQueue = {
    STORAGE_KEY,
    MAX_RETRIES,
    getPendingQueue,
    addToPendingQueue,
    removeFromPendingQueue,
    incrementRetry,
    flushPendingQueue,
  };
}

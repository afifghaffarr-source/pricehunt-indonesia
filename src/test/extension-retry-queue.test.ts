import { describe, it, expect, beforeEach } from "vitest";
import {
  getPendingQueue,
  addToPendingQueue,
  removeFromPendingQueue,
  incrementRetry,
  flushPendingQueue,
} from "../../extension/lib/queue.js";

/**
 * Fake chrome.storage.local adapter — in-memory key/value store.
 * Compatible with the expected `.get(key) → Promise<obj>` and
 * `.set(obj) → Promise<void>` interface.
 */
function createFakeStorage(initial: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = { ...initial };
  return {
    get: async (key: string): Promise<Record<string, unknown>> => ({ [key]: state[key] }),
    set: async (obj: Record<string, unknown>): Promise<void> => {
      Object.assign(state, obj);
    },
    _state: state, // exposed for inspection
  };
}

const samplePayload = {
  product_url: "https://shopee.co.id/product/123",
  title: "iPhone 15 Pro",
  price: 15000000,
  marketplace: "shopee",
  source: "browser_extension_v3",
  parser_version: "3.0.1",
};

describe("extension/queue.js — retry queue", () => {
  let storage: ReturnType<typeof createFakeStorage>;

  beforeEach(() => {
    storage = createFakeStorage();
  });

  describe("getPendingQueue", () => {
    it("returns empty array when storage is empty", async () => {
      const queue = await getPendingQueue(storage);
      expect(queue).toEqual([]);
    });

    it("returns current queue contents", async () => {
      storage = createFakeStorage({
        pendingQueue: [
          { payload: samplePayload, marketplace: "shopee", retryCount: 1 },
        ],
      });
      const queue = await getPendingQueue(storage);
      expect(queue).toHaveLength(1);
      expect(queue[0].payload.product_url).toBe(samplePayload.product_url);
    });

    it("returns [] if stored value is not an array (corrupted storage)", async () => {
      storage = createFakeStorage({ pendingQueue: "corrupted" });
      const queue = await getPendingQueue(storage);
      expect(queue).toEqual([]);
    });
  });

  describe("addToPendingQueue", () => {
    it("appends item with metadata", async () => {
      const ok = await addToPendingQueue(storage, samplePayload, "shopee");
      expect(ok).toBe(true);

      const queue = await getPendingQueue(storage);
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        payload: samplePayload,
        marketplace: "shopee",
        retryCount: 0,
      });
      expect(queue[0].addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
    });

    it("deduplicates by product_url (returns false on duplicate)", async () => {
      await addToPendingQueue(storage, samplePayload, "shopee");
      const ok = await addToPendingQueue(storage, samplePayload, "shopee");
      expect(ok).toBe(false);

      const queue = await getPendingQueue(storage);
      expect(queue).toHaveLength(1);
    });

    it("treats different URLs as separate items", async () => {
      await addToPendingQueue(storage, samplePayload, "shopee");
      await addToPendingQueue(
        storage,
        { ...samplePayload, product_url: "https://tokopedia.com/item/456" },
        "tokopedia"
      );
      const queue = await getPendingQueue(storage);
      expect(queue).toHaveLength(2);
    });

    it("preserves FIFO order", async () => {
      const url1 = "https://shopee.co.id/a";
      const url2 = "https://shopee.co.id/b";
      await addToPendingQueue(storage, { ...samplePayload, product_url: url1 }, "shopee");
      await addToPendingQueue(storage, { ...samplePayload, product_url: url2 }, "shopee");
      const queue = await getPendingQueue(storage);
      expect(queue[0].payload.product_url).toBe(url1);
      expect(queue[1].payload.product_url).toBe(url2);
    });
  });

  describe("removeFromPendingQueue", () => {
    it("removes specified URLs", async () => {
      await addToPendingQueue(storage, { ...samplePayload, product_url: "https://a.test" }, "shopee");
      await addToPendingQueue(storage, { ...samplePayload, product_url: "https://b.test" }, "shopee");
      await addToPendingQueue(storage, { ...samplePayload, product_url: "https://c.test" }, "shopee");

      const removed = await removeFromPendingQueue(storage, ["https://a.test", "https://c.test"]);
      expect(removed).toBe(2);

      const queue = await getPendingQueue(storage);
      expect(queue.map((i) => i.payload.product_url)).toEqual(["https://b.test"]);
    });

    it("returns 0 when nothing removed", async () => {
      await addToPendingQueue(storage, samplePayload, "shopee");
      const removed = await removeFromPendingQueue(storage, ["https://nonexistent.test"]);
      expect(removed).toBe(0);
      expect(await getPendingQueue(storage)).toHaveLength(1);
    });

    it("handles empty URL list gracefully", async () => {
      await addToPendingQueue(storage, samplePayload, "shopee");
      const removed = await removeFromPendingQueue(storage, []);
      expect(removed).toBe(0);
      expect(await getPendingQueue(storage)).toHaveLength(1);
    });
  });

  describe("incrementRetry", () => {
    it("increments retryCount for matching URL", async () => {
      await addToPendingQueue(storage, samplePayload, "shopee");
      await incrementRetry(storage, samplePayload.product_url);
      await incrementRetry(storage, samplePayload.product_url);

      const queue = await getPendingQueue(storage);
      expect(queue[0].retryCount).toBe(2);
    });

    it("only affects matching URL (no broadcast)", async () => {
      const url1 = "https://shopee.co.id/a";
      const url2 = "https://shopee.co.id/b";
      await addToPendingQueue(storage, { ...samplePayload, product_url: url1 }, "shopee");
      await addToPendingQueue(storage, { ...samplePayload, product_url: url2 }, "shopee");

      await incrementRetry(storage, url1);

      const queue = await getPendingQueue(storage);
      const url1Item = queue.find((i) => i.payload.product_url === url1);
      const url2Item = queue.find((i) => i.payload.product_url === url2);
      expect(url1Item?.retryCount).toBe(1);
      expect(url2Item?.retryCount).toBe(0);
    });

    it("no-op for non-existent URL", async () => {
      await addToPendingQueue(storage, samplePayload, "shopee");
      await incrementRetry(storage, "https://nonexistent.test");
      const queue = await getPendingQueue(storage);
      expect(queue[0].retryCount).toBe(0);
    });
  });

  describe("flushPendingQueue", () => {
    beforeEach(async () => {
      await addToPendingQueue(storage, samplePayload, "shopee");
      await addToPendingQueue(
        storage,
        { ...samplePayload, product_url: "https://lazy.test" },
        "tokopedia"
      );
    });

    it("returns zeroes on empty queue", async () => {
      storage = createFakeStorage();
      const result = await flushPendingQueue(storage, async () => ({ ok: true }));
      expect(result).toEqual({ attempted: 0, succeeded: 0, remaining: 0, dropped: 0 });
    });

    it("removes successful items", async () => {
      const submitFn = async (payload: { product_url: string }) => {
        if (payload.product_url === samplePayload.product_url) return { ok: true };
        return { ok: false, status: 500 };
      };
      const result = await flushPendingQueue(storage, submitFn);

      expect(result.succeeded).toBe(1);
      expect(result.remaining).toBe(1); // second item still pending
      const queue = await getPendingQueue(storage);
      expect(queue.map((i) => i.payload.product_url)).toEqual(["https://lazy.test"]);
    });

    it("keeps transient failures (status >= 500) and increments retry count", async () => {
      const submitFn = async () => ({ ok: false, status: 503 });
      const result = await flushPendingQueue(storage, submitFn);

      expect(result.attempted).toBe(2);
      expect(result.succeeded).toBe(0);
      expect(result.remaining).toBe(2);
      expect(result.dropped).toBe(0);

      const queue = await getPendingQueue(storage);
      expect(queue.every((i) => i.retryCount === 1)).toBe(true);
    });

    it("treats 400 (bad request) as permanent — drops immediately", async () => {
      const submitFn = async () => ({ ok: false, status: 400 });
      const result = await flushPendingQueue(storage, submitFn);

      expect(result.remaining).toBe(0);
      expect(result.dropped).toBe(2);
      expect(await getPendingQueue(storage)).toHaveLength(0);
    });

    it("treats 401 (unauthorized) as permanent — drops immediately", async () => {
      const submitFn = async () => ({ ok: false, status: 401 });
      const result = await flushPendingQueue(storage, submitFn);

      expect(result.remaining).toBe(0);
      expect(result.dropped).toBe(2);
    });

    it("treats network errors (no status) as transient", async () => {
      const submitFn = async () => ({ ok: false, error: "NetworkError: fetch failed" });
      const result = await flushPendingQueue(storage, submitFn);

      expect(result.remaining).toBe(2);
      expect(result.dropped).toBe(0);
    });

    it("treats thrown exceptions as transient errors", async () => {
      const submitFn = async () => {
        throw new Error("fetch failed");
      };
      const result = await flushPendingQueue(storage, submitFn);

      expect(result.remaining).toBe(2);
      expect(result.dropped).toBe(0);
    });

    it("drops items after MAX_RETRIES (default 3)", async () => {
      // Pre-set retryCount = 3 for sample payload
      storage = createFakeStorage();
      await addToPendingQueue(storage, samplePayload, "shopee");
      await incrementRetry(storage, samplePayload.product_url);
      await incrementRetry(storage, samplePayload.product_url);
      await incrementRetry(storage, samplePayload.product_url);
      // Now retryCount = 3

      const submitFn = async () => ({ ok: true });
      const result = await flushPendingQueue(storage, submitFn);

      expect(result.dropped).toBe(1);
      expect(result.succeeded).toBe(0); // dropped before submission
      expect(await getPendingQueue(storage)).toHaveLength(0);
    });

    it("respects custom maxRetries option", async () => {
      storage = createFakeStorage();
      await addToPendingQueue(storage, samplePayload, "shopee");
      await incrementRetry(storage, samplePayload.product_url);
      // retryCount = 1, with maxRetries=1, should drop

      const submitFn = async () => ({ ok: true });
      const result = await flushPendingQueue(storage, submitFn, { maxRetries: 1 });

      expect(result.dropped).toBe(1);
      expect(result.succeeded).toBe(0);
    });

    it("processes mixed outcomes correctly", async () => {
      storage = createFakeStorage();
      // Three items with different expected outcomes
      await addToPendingQueue(storage, { ...samplePayload, product_url: "https://ok.test" }, "shopee");
      await addToPendingQueue(storage, { ...samplePayload, product_url: "https://transient.test" }, "tokopedia");
      await addToPendingQueue(storage, { ...samplePayload, product_url: "https://bad.test" }, "lazada");

      const submitFn = async (payload: { product_url: string }) => {
        if (payload.product_url === "https://ok.test") return { ok: true };
        if (payload.product_url === "https://transient.test") return { ok: false, status: 500 };
        return { ok: false, status: 400 }; // permanent
      };

      const result = await flushPendingQueue(storage, submitFn);
      expect(result.attempted).toBe(3);
      expect(result.succeeded).toBe(1);
      expect(result.remaining).toBe(1); // transient stays with retry+1
      expect(result.dropped).toBe(1); // permanent 400

      const queue = await getPendingQueue(storage);
      const urls = queue.map((i) => i.payload.product_url);
      expect(urls).toEqual(["https://transient.test"]);
      expect(queue[0].retryCount).toBe(1);
    });

    it("throttles submissions when throttleMs is configured", async () => {
      storage = createFakeStorage();
      await addToPendingQueue(storage, samplePayload, "shopee");
      await addToPendingQueue(
        storage,
        { ...samplePayload, product_url: "https://x.test" },
        "tokopedia"
      );

      const submittedAt: number[] = [];
      const submitFn = async () => {
        submittedAt.push(Date.now());
        return { ok: true };
      };

      await flushPendingQueue(storage, submitFn, { throttleMs: 50 });

      expect(submittedAt).toHaveLength(2);
      // Second submission should be ~50ms after first
      const delay = submittedAt[1] - submittedAt[0];
      expect(delay).toBeGreaterThanOrEqual(45); // small slop
    });
  });
});

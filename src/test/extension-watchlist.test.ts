import { describe, it, expect, beforeEach } from "vitest";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  recordPriceCheck,
  recordNotification,
  itemsToNotify,
} from "../../extension/lib/watchlist.js";

function createFakeStorage(initial = {}) {
  const state = { ...initial };
  return {
    get: async (key) => ({ [key]: state[key] }),
    set: async (obj) => {
      Object.assign(state, obj);
    },
    _state: state,
  };
}

const baseItem = {
  url: "https://shopee.co.id/product/iPhone-15-Pro",
  title: "iPhone 15 Pro",
  marketplace: "shopee",
  targetPrice: 15000000,
};

describe("extension/watchlist.js — price alerts", () => {
  let storage: ReturnType<typeof createFakeStorage>;

  beforeEach(() => {
    storage = createFakeStorage();
  });

  describe("getWatchlist", () => {
    it("returns empty array when storage is empty", async () => {
      expect(await getWatchlist(storage)).toEqual([]);
    });

    it("returns current watchlist contents", async () => {
      storage = createFakeStorage({
        priceWatchlist: [{ ...baseItem, addedAt: "2026-06-28" }],
      });
      const list = await getWatchlist(storage);
      expect(list).toHaveLength(1);
      expect(list[0].url).toBe(baseItem.url);
    });

    it("returns [] if stored value is malformed (corrupted storage)", async () => {
      storage = createFakeStorage({ priceWatchlist: "corrupted" });
      expect(await getWatchlist(storage)).toEqual([]);
    });
  });

  describe("addToWatchlist", () => {
    it("appends a new item with metadata", async () => {
      const item = await addToWatchlist(storage, baseItem);
      expect(item.url).toBe(baseItem.url);
      expect(item.targetPrice).toBe(15000000);
      expect(item.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("rejects missing url", async () => {
      await expect(addToWatchlist(storage, { ...baseItem, url: "" })).rejects.toThrow();
    });

    it("rejects non-positive targetPrice", async () => {
      await expect(addToWatchlist(storage, { ...baseItem, targetPrice: 0 })).rejects.toThrow();
      await expect(addToWatchlist(storage, { ...baseItem, targetPrice: -1000 })).rejects.toThrow();
    });

    it("deduplicates by URL — updates target price in place", async () => {
      await addToWatchlist(storage, { ...baseItem, targetPrice: 15000000 });
      const updated = await addToWatchlist(storage, { ...baseItem, targetPrice: 14000000 });
      expect(updated.targetPrice).toBe(14000000);

      const list = await getWatchlist(storage);
      expect(list).toHaveLength(1); // still single item, not duplicate
    });

    it("enforces MAX_ITEMS limit (50)", async () => {
      // Pre-fill with 50 distinct URLs
      const filled = [];
      for (let i = 0; i < 50; i++) {
        filled.push({ ...baseItem, url: `https://shopee.co.id/product/item-${i}` });
      }
      await storage.set({ priceWatchlist: filled.map((f) => ({ ...f, addedAt: "2026-06-28" })) });

      // 51st should fail
      await expect(
        addToWatchlist(storage, { ...baseItem, url: "https://shopee.co.id/product/extra" })
      ).rejects.toThrow(/limit/i);
    });
  });

  describe("removeFromWatchlist", () => {
    it("removes an existing URL", async () => {
      await addToWatchlist(storage, baseItem);
      const removed = await removeFromWatchlist(storage, baseItem.url);
      expect(removed).toBe(true);
      expect(await getWatchlist(storage)).toHaveLength(0);
    });

    it("returns false for non-existent URL", async () => {
      await addToWatchlist(storage, baseItem);
      const removed = await removeFromWatchlist(storage, "https://nope.test");
      expect(removed).toBe(false);
    });
  });

  describe("recordPriceCheck", () => {
    it("updates lastSeenPrice + lastCheckedAt", async () => {
      await addToWatchlist(storage, baseItem);
      const ok = await recordPriceCheck(storage, baseItem.url, 14500000);
      expect(ok).toBe(true);

      const list = await getWatchlist(storage);
      expect(list[0].lastSeenPrice).toBe(14500000);
      expect(list[0].lastCheckedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("returns false for non-existent URL", async () => {
      const ok = await recordPriceCheck(storage, "https://nope.test", 1000);
      expect(ok).toBe(false);
    });
  });

  describe("recordNotification", () => {
    it("stamps lastNotifiedAt to suppress repeats within 24h", async () => {
      await addToWatchlist(storage, baseItem);
      await recordNotification(storage, baseItem.url);
      const list = await getWatchlist(storage);
      expect(list[0].lastNotifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("itemsToNotify (notification trigger logic)", () => {
    it("returns items where current price <= target (re-arm case)", () => {
      const list = [
        { ...baseItem, targetPrice: 15000000, lastNotifiedAt: null },
      ];
      const prices = { [baseItem.url]: 14000000 };
      const result = itemsToNotify(list, prices);
      expect(result).toHaveLength(1);
    });

    it("does NOT notify when current price > target", () => {
      const list = [{ ...baseItem, targetPrice: 15000000 }];
      const prices = { [baseItem.url]: 16000000 };
      expect(itemsToNotify(list, prices)).toHaveLength(0);
    });

    it("does NOT notify when current price equals target (==)", () => {
      // Inclusive: price === target should fire
      const list = [{ ...baseItem, targetPrice: 15000000, lastNotifiedAt: null }];
      const prices = { [baseItem.url]: 15000000 };
      expect(itemsToNotify(list, prices)).toHaveLength(1);
    });

    it("does NOT notify when price missing from current prices map", () => {
      const list = [{ ...baseItem, targetPrice: 15000000 }];
      expect(itemsToNotify(list, {})).toHaveLength(0);
    });

    it("suppresses re-trigger if recently notified (< 24h)", () => {
      const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1h ago
      const list = [
        { ...baseItem, targetPrice: 15000000, lastNotifiedAt: recent },
      ];
      const prices = { [baseItem.url]: 14000000 };
      expect(itemsToNotify(list, prices)).toHaveLength(0);
    });

    it("re-arms after 24h", () => {
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
      const list = [
        { ...baseItem, targetPrice: 15000000, lastNotifiedAt: old },
      ];
      const prices = { [baseItem.url]: 14000000 };
      expect(itemsToNotify(list, prices)).toHaveLength(1);
    });

    it("returns multiple items in single pass", () => {
      const list = [
        { ...baseItem, url: "u1", targetPrice: 100, lastNotifiedAt: null },
        { ...baseItem, url: "u2", targetPrice: 200, lastNotifiedAt: null },
        { ...baseItem, url: "u3", targetPrice: 50, lastNotifiedAt: null },
      ];
      const prices = { u1: 80, u2: 250, u3: 40 }; // u1 yes, u2 no (above), u3 yes
      const result = itemsToNotify(list, prices);
      expect(result.map((r) => r.url)).toEqual(["u1", "u3"]);
    });

    it("treats lastNotifiedAt null/undefined as never notified", () => {
      const list = [
        { ...baseItem, targetPrice: 15000000, lastNotifiedAt: undefined },
      ];
      const prices = { [baseItem.url]: 12000000 };
      expect(itemsToNotify(list, prices)).toHaveLength(1);
    });
  });
});

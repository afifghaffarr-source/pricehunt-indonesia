import { describe, it, expect, beforeEach, vi } from "vitest";
import { escapeCsv, historyToCsv, downloadCsv } from "../../extension/lib/shared.js";

describe("extension/shared.js — CSV export", () => {
  describe("escapeCsv", () => {
    it("returns empty string for null/undefined", () => {
      expect(escapeCsv(null)).toBe("");
      expect(escapeCsv(undefined)).toBe("");
    });

    it("returns plain string unchanged", () => {
      expect(escapeCsv("hello")).toBe("hello");
      expect(escapeCsv(123)).toBe("123");
      expect(escapeCsv(0)).toBe("0");
    });

    it("quotes strings with commas", () => {
      expect(escapeCsv("a,b,c")).toBe('"a,b,c"');
    });

    it("quotes strings with double quotes and escapes them", () => {
      // RFC 4180: inner quotes are doubled
      expect(escapeCsv('he said "hi"')).toBe('"he said ""hi"""');
    });

    it("quotes strings with newlines", () => {
      expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
    });

    it("handles price numbers correctly", () => {
      expect(escapeCsv(1500000)).toBe("1500000");
      expect(escapeCsv(0)).toBe("0");
    });

    it("preserves zero values", () => {
      // Critical: API treats 0 as missing for some fields
      expect(escapeCsv(0)).toBe("0");
      expect(escapeCsv(false)).toBe("false");
    });
  });

  describe("historyToCsv", () => {
    it("generates header row", () => {
      const csv = historyToCsv([]);
      expect(csv).toBe(
        "Timestamp,Marketplace,Title,Price (IDR),URL,Status,Confidence,Message"
      );
    });

    it("serializes successful submission row", () => {
      const csv = historyToCsv([
        {
          submittedAt: "2026-06-28T10:00:00Z",
          marketplace: "shopee",
          title: "iPhone 15 Pro",
          price: 15000000,
          url: "https://shopee.co.id/product/123",
          success: true,
          confidence: 95,
          message: "ok",
        },
      ]);
      const lines = csv.split("\n");
      expect(lines).toHaveLength(2);
      expect(lines[1]).toBe(
        '2026-06-28T10:00:00Z,shopee,iPhone 15 Pro,15000000,https://shopee.co.id/product/123,Success,95,ok'
      );
    });

    it("marks failed submission as Failed", () => {
      const csv = historyToCsv([
        {
          submittedAt: "2026-06-28T10:00:00Z",
          marketplace: "tokopedia",
          title: "Item",
          price: 0,
          url: "https://tokopedia.com/item",
          success: false,
          confidence: 0,
          message: "duplicate",
        },
      ]);
      expect(csv).toContain(",Failed,");
      expect(csv).toContain(",duplicate");
    });

    it("escapes commas in titles correctly", () => {
      const csv = historyToCsv([
        {
          submittedAt: "2026-06-28",
          marketplace: "lazada",
          title: "Apple, iPhone 15",
          price: 15000000,
          url: "https://test",
          success: true,
          confidence: 80,
          message: "",
        },
      ]);
      expect(csv).toContain('"Apple, iPhone 15"');
      // Make sure no trailing partial quote
      expect(csv.split('"').length).toBeGreaterThan(2);
    });

    it("escapes quotes in messages", () => {
      const csv = historyToCsv([
        {
          submittedAt: "2026-06-28",
          marketplace: "shopee",
          title: "x",
          price: 1000,
          url: "y",
          success: false,
          message: 'error: "bad request"',
        },
      ]);
      // Should produce: ...,"error: ""bad request"""
      expect(csv).toContain('"error: ""bad request"""');
    });

    it("rounds confidence score", () => {
      const csv = historyToCsv([
        {
          submittedAt: "2026-06-28",
          marketplace: "shopee",
          title: "x",
          price: 1000,
          url: "y",
          success: true,
          confidence: 94.7,
        },
      ]);
      // 94.7 rounds to 95
      expect(csv).toContain(",95,");
    });

    it("handles missing confidence gracefully", () => {
      const csv = historyToCsv([
        {
          submittedAt: "2026-06-28",
          marketplace: "shopee",
          title: "x",
          price: 1000,
          url: "y",
          success: false,
        },
      ]);
      // Confidence column should be empty
      expect(csv).toMatch(/,Failed,,/);
    });

    it("handles empty history", () => {
      expect(historyToCsv([])).toBe(
        "Timestamp,Marketplace,Title,Price (IDR),URL,Status,Confidence,Message"
      );
    });

    it("uses newline as row separator (RFC 4180)", () => {
      const csv = historyToCsv([
        {
          submittedAt: "t1",
          marketplace: "m1",
          title: "title1",
          price: 100,
          url: "u1",
          success: true,
          confidence: 80,
        },
        {
          submittedAt: "t2",
          marketplace: "m2",
          title: "title2",
          price: 200,
          url: "u2",
          success: false,
          message: "err",
        },
      ]);
      expect(csv.split("\n")).toHaveLength(3);
    });
  });

  describe("downloadCsv", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
      URL.createObjectURL = vi.fn(() => "blob:mock-url");
      URL.revokeObjectURL = vi.fn();
    });

    it("writes blob with UTF-8 BOM for Excel compatibility", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blobInstances: any[] = [];
      const RealBlob = global.Blob;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Blob = function (parts: BlobPart[], options: BlobPropertyBag) {
        blobInstances.push({ parts, options });
      };
      downloadCsv([
        { submittedAt: "2026-06-28", marketplace: "shopee", title: "Item", price: 100, url: "u", success: true },
      ]);

      expect(blobInstances).toHaveLength(1);
      expect(blobInstances[0].options.type).toBe("text/csv;charset=utf-8;");
      // BOM character is \ufeff
      expect(String(blobInstances[0].parts[0]).startsWith("\ufeff")).toBe(true);
      // CSV content follows BOM
      expect(String(blobInstances[0].parts[0])).toContain("Timestamp,Marketplace,Title");

      global.Blob = RealBlob;
    });

    it("uses date in default filename", () => {
      const today = new Date().toISOString().slice(0, 10);
      const filename = downloadCsv([]);
      expect(filename).toBe(`bijakbeli-history-${today}.csv`);
    });

    it("respects custom filename prefix", () => {
      const today = new Date().toISOString().slice(0, 10);
      const filename = downloadCsv([], "custom-prefix");
      expect(filename).toBe(`custom-prefix-${today}.csv`);
    });

    it("creates anchor element with download attribute and clicks it", () => {
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") {
          el.click = clickSpy;
        }
        return el;
      }) as typeof document.createElement);

      const filename = downloadCsv([]);
      expect(filename).toMatch(/^bijakbeli-history-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(filename.endsWith(".csv")).toBe(true);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it("revokes object URL after 1 second", () => {
      vi.useFakeTimers();
      downloadCsv([]);
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});

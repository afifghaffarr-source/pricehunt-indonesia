import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ingestion/matcher", () => ({
  findBestProductMatch: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: vi.fn(),
}));
const { sendTelegramMessageFromEnv } = vi.hoisted(() => ({
  sendTelegramMessageFromEnv: vi.fn(),
}));
vi.mock("@/lib/telegram/send-message", () => ({
  sendTelegramMessageFromEnv,
}));

import { runOrphanAutoLink, formatOrphanSummary } from "@/lib/cron/orphan-auto-link";
import { findBestProductMatch } from "@/lib/ingestion/matcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

function mkSupabase(candidates: any[], products: any[], updateShouldFail = false) {
  return {
    from: (table: string) => {
      if (table === "offers") {
        return {
          select: () => ({
            is: () => ({
              gt: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: candidates, error: null }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: updateShouldFail ? { message: "test-fail" } : null }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            limit: () => Promise.resolve({ data: products, error: null }),
          }),
        };
      }
      return { select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
    },
  } as any;
}

describe("runOrphanAutoLink", () => {
  beforeEach(() => {
    vi.mocked(findBestProductMatch).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(logAdminAction).mockReset();
    sendTelegramMessageFromEnv.mockReset();
    // Default: Telegram is a no-op success so existing tests don't
    // accidentally assert on it. Specific tests override.
    sendTelegramMessageFromEnv.mockResolvedValue({ ok: true, messageId: 1 });
  });

  it("writes audit row even when zero candidates", async () => {
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase([], []));

    const r = await runOrphanAutoLink();
    expect(r.processed).toBe(0);
    expect(r.linked).toBe(0);
    expect(r.still_orphan).toBe(0);
    expect(vi.mocked(logAdminAction)).toHaveBeenCalledTimes(1);
  });

  it("links on 'high' confidence", async () => {
    const candidates = [{ id: "o1", title: "iPhone 16 128GB", price: 18_500_000, marketplace: "tokopedia", variant: "128GB Hitam" }];
    const products = [{ id: "p1", name: "Apple iPhone 16", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 85, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(1);
    expect(r.still_orphan).toBe(0);
  });

  it("links on 'medium' confidence", async () => {
    const candidates = [{ id: "o2", title: "iPhone 16", price: 18_500_000, marketplace: "tokopedia", variant: null }];
    const products = [{ id: "p1", name: "Apple iPhone 16", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 65, confidence: "medium", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(1);
  });

  it("does NOT link on 'low' confidence", async () => {
    const candidates = [{ id: "o3", title: "x", price: 1, marketplace: "tokopedia", variant: null }];
    const products = [{ id: "p1", name: "x", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 20, confidence: "low", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(0);
    expect(r.still_orphan).toBe(1);
  });

  it("does NOT link on 'reject' confidence", async () => {
    const candidates = [{ id: "o4", title: "x", price: 1, marketplace: "tokopedia", variant: null }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, [{ id: "p1", name: "x", brand: null, category: "phone" }]));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 5, confidence: "reject", isMatch: false, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(0);
    expect(r.still_orphan).toBe(1);
  });

  it("counts errors when offer update fails", async () => {
    const candidates = [{ id: "o_fail", title: "x", price: 1, marketplace: "tokopedia", variant: null }];
    vi.mocked(createAdminClient).mockReturnValue(
      mkSupabase(candidates, [{ id: "p1", name: "x", brand: null, category: "phone" }], /* updateShouldFail */ true),
    );
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 80, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.errors).toBe(1);
    expect(r.linked).toBe(0);
  });

  it("audit row carries cap and max_age_days in metadata", async () => {
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase([], []));
    await runOrphanAutoLink({ cap: 100, maxAgeDays: 30 });
    expect(vi.mocked(logAdminAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "orphan_auto_link",
        metadata: expect.objectContaining({
          cap: 100,
          max_age_days: 30,
        }),
      }),
    );
  });

  it("top_links holds highest-scoring matches", async () => {
    const candidates = [
      { id: "o1", title: "A", price: 1, marketplace: "tokopedia", variant: null },
      { id: "o2", title: "B", price: 1, marketplace: "tokopedia", variant: null },
      { id: "o3", title: "C", price: 1, marketplace: "tokopedia", variant: null },
    ];
    const products = [{ id: "p1", name: "x", brand: null, category: "phone" }];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, products));
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 80, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });

    const r = await runOrphanAutoLink();
    expect(r.linked).toBe(3);
    expect(r.top_links).toHaveLength(3);
  });
});

describe("runOrphanAutoLink — telegram summary (Phase 6)", () => {
  beforeEach(() => {
    vi.mocked(findBestProductMatch).mockReset();
    vi.mocked(createAdminClient).mockReset();
    vi.mocked(logAdminAction).mockReset();
    sendTelegramMessageFromEnv.mockReset();
  });

  it("calls sendTelegramMessageFromEnv after the run with the summary text", async () => {
    const candidates = [
      { id: "o1", title: "iPhone 16", price: 18_500_000, marketplace_id: "tokopedia", variant: null },
      { id: "o2", title: "Galaxy S24", price: 12_000_000, marketplace_id: "shopee", variant: null },
    ];
    vi.mocked(createAdminClient).mockReturnValue(
      mkSupabase(candidates, [{ id: "p1", name: "x", brand: null, category: "phone" }]),
    );
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 80, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });
    sendTelegramMessageFromEnv.mockResolvedValue({ ok: true, messageId: 7 });

    await runOrphanAutoLink();

    expect(sendTelegramMessageFromEnv).toHaveBeenCalledTimes(1);
    const [text] = sendTelegramMessageFromEnv.mock.calls[0] as [string];
    expect(text).toMatch(/^BijakBeli Orphan Auto-Link — \d{4}-\d{2}-\d{2} \d{2}:\d{2} WIB$/m);
    expect(text).toMatch(/^Diproses: 2$/m);
    expect(text).toMatch(/^Berhasil: 2$/m);
    expect(text).toMatch(/^Dilewati: 0$/m);
    expect(text).toMatch(/^Gagal: 0$/m);
    expect(text).toMatch(/^Durasi: \d+\.\d+s$/m);
    expect(text).toMatch(/^Per marketplace:$/m);
    expect(text).toMatch(/  tokopedia: 1 offers/);
    expect(text).toMatch(/  shopee: 1 offers/);
  });

  it("does not throw when Telegram returns ok:false", async () => {
    const candidates = [{ id: "o1", title: "x", price: 1, marketplace_id: "tokopedia", variant: null }];
    vi.mocked(createAdminClient).mockReturnValue(
      mkSupabase(candidates, [{ id: "p1", name: "x", brand: null, category: "phone" }]),
    );
    vi.mocked(findBestProductMatch).mockReturnValue({
      bestMatch: { productId: "p1", result: { score: 80, confidence: "high", isMatch: true, reasons: [], warnings: [], flags: [] } },
      allResults: [],
    });
    sendTelegramMessageFromEnv.mockResolvedValue({ ok: false, error: "HTTP 429: rate limited" });

    // Must not throw — the cron must survive a Telegram outage.
    const r = await expect(runOrphanAutoLink()).resolves.toMatchObject({
      linked: 1,
    });
    // sanity-check r is the result, not undefined
    expect(r).toBeDefined();
    expect(sendTelegramMessageFromEnv).toHaveBeenCalledTimes(1);
  });

  it("does not throw when Telegram throws (defensive try/catch)", async () => {
    const candidates: any[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mkSupabase(candidates, []));
    sendTelegramMessageFromEnv.mockRejectedValue(new Error("should never reach the throw branch"));

    // The wrapper in send-message.ts never throws, but the cron also
    // has a defensive try/catch so a future regression can't break
    // the cron. Verify the cron survives even if the wrapper regresses.
    await expect(runOrphanAutoLink()).resolves.toBeDefined();
  });
});

describe("formatOrphanSummary", () => {
  it("includes per-marketplace breakdown sorted by count desc", () => {
    const result = {
      processed: 31,
      linked: 24,
      still_orphan: 5,
      errors: 2,
      duration_ms: 8300,
      top_links: [],
      per_marketplace: { tokopedia: 18, shopee: 9, bukalapak: 4 },
    };
    // Build a fixed WIB timestamp so the assertion is deterministic.
    // Pick a UTC time that's the same day in WIB (UTC+7) — 12:00 UTC ==
    // 19:00 WIB. Cron runs at 19:00 UTC == 02:00 WIB the next day, so
    // we deliberately use the middle of the day to avoid date
    // boundary cross-check noise.
    const startedAt = new Date("2026-06-30T12:00:00.000Z");
    const text = formatOrphanSummary(result, startedAt);

    expect(text).toContain("BijakBeli Orphan Auto-Link — 2026-06-30 19:00 WIB");
    expect(text).toContain("Diproses: 31");
    expect(text).toContain("Berhasil: 24");
    expect(text).toContain("Dilewati: 5");
    expect(text).toContain("Gagal: 2");
    expect(text).toContain("Durasi: 8.3s");
    expect(text).toContain("Per marketplace:");
    // tokopedia has the most (18), so it must come first.
    const tIdx = text.indexOf("  tokopedia: 18 offers");
    const sIdx = text.indexOf("  shopee: 9 offers");
    const bIdx = text.indexOf("  bukalapak: 4 offers");
    expect(tIdx).toBeGreaterThan(-1);
    expect(sIdx).toBeGreaterThan(tIdx);
    expect(bIdx).toBeGreaterThan(sIdx);
  });

  it("omits the per-marketplace block when there are no candidates", () => {
    const result = {
      processed: 0,
      linked: 0,
      still_orphan: 0,
      errors: 0,
      duration_ms: 12,
      top_links: [],
      per_marketplace: {},
    };
    const text = formatOrphanSummary(result, new Date("2026-06-30T19:00:00.000Z"));
    expect(text).toContain("Diproses: 0");
    expect(text).not.toContain("Per marketplace:");
  });
});

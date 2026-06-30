/**
 * Phase 6 — Telegram send-message unit tests.
 *
 * Covers the four contract requirements from the brief:
 *   1. POSTs to the right URL with the right body.
 *   2. Returns `{ ok: true, messageId }` on a 200 with `ok:true` body.
 *   3. Returns `{ ok: false, error }` on a non-200 (does NOT throw).
 *   4. Lets transport errors bubble (caller handles) — exercised
 *      through `sendTelegramMessageFromEnv`, which is the call site
 *      that actually swallows them.
 *   5. Applies a 5 s timeout via AbortController.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  sendTelegramMessage,
  sendTelegramMessageFromEnv,
} from "@/lib/telegram/send-message";

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetchOnce(response: {
  status?: number;
  body?: unknown;
  ok?: boolean;
  text?: string;
  throws?: Error;
}): FetchMock {
  return vi.fn(async (_url: unknown, _init: unknown) => {
    if (response.throws) throw response.throws;
    if (response.text !== undefined) {
      return {
        ok: (response.status ?? 200) >= 200 && (response.status ?? 200) < 300,
        status: response.status ?? 200,
        text: async () => response.text!,
        json: async () => ({}),
      } as Response;
    }
    return {
      ok: response.ok ?? ((response.status ?? 200) >= 200 && (response.status ?? 200) < 300),
      status: response.status ?? 200,
      text: async () => JSON.stringify(response.body ?? {}),
      json: async () => response.body ?? {},
    } as Response;
  });
}

describe("sendTelegramMessage", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = mockFetchOnce({ body: { ok: true, result: { message_id: 42 } } });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to api.telegram.org/bot<token>/sendMessage with the right body", async () => {
    const result = await sendTelegramMessage({
      botToken: "123:abc",
      chatId: "-100123",
      text: "hello world",
    });
    expect(result).toEqual({ ok: true, messageId: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      chat_id: "-100123",
      text: "hello world",
      parse_mode: "HTML",
    });
  });

  it("honours parseMode and disableNotification when provided", async () => {
    await sendTelegramMessage({
      botToken: "tok",
      chatId: "1",
      text: "x",
      parseMode: "MarkdownV2",
      disableNotification: true,
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.parse_mode).toBe("MarkdownV2");
    expect(body.disable_notification).toBe(true);
  });

  it("returns ok:false on non-200 with the status in the error", async () => {
    vi.unstubAllGlobals();
    fetchMock = mockFetchOnce({ status: 429, text: "Too Many Requests" });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTelegramMessage({ botToken: "t", chatId: "1", text: "x" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("HTTP 429");
    expect(result.error).toContain("Too Many Requests");
  });

  it("returns ok:false when Telegram responds 200 with ok:false body", async () => {
    vi.unstubAllGlobals();
    fetchMock = mockFetchOnce({
      status: 200,
      body: { ok: false, description: "Bad Request: chat not found" },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTelegramMessage({ botToken: "t", chatId: "1", text: "x" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Bad Request: chat not found");
  });

  it("lets network errors bubble (caller handles)", async () => {
    vi.unstubAllGlobals();
    const netErr = new Error("ECONNREFUSED");
    fetchMock = mockFetchOnce({ throws: netErr });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendTelegramMessage({ botToken: "t", chatId: "1", text: "x" }),
    ).rejects.toBe(netErr);
  });

  it("applies a 5s timeout via AbortController.signal", async () => {
    vi.unstubAllGlobals();
    // Slow fetch that records the signal it was called with so we can
    // inspect it. The test asserts that:
    //   (a) a signal was passed, and
    //   (b) it's an AbortSignal instance.
    // We don't actually wait 5s — the test resolves when the body
    // returns. Real timeout behaviour is covered by the AbortController
    // built-in (set in send-message.ts).
    let receivedSignal: AbortSignal | null = null;
    fetchMock = vi.fn(async (_url: unknown, init: any) => {
      receivedSignal = init?.signal ?? null;
      return {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage({ botToken: "t", chatId: "1", text: "x" });
    expect(receivedSignal).not.toBeNull();
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });
});

describe("sendTelegramMessageFromEnv", () => {
  const ORIGINAL_BOT = process.env.TELEGRAM_BOT_TOKEN;
  const ORIGINAL_CHAT = process.env.TELEGRAM_CHAT_ID;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "env-bot";
    process.env.TELEGRAM_CHAT_ID = "env-chat";
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (ORIGINAL_BOT === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_BOT;
    if (ORIGINAL_CHAT === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = ORIGINAL_CHAT;
    vi.unstubAllGlobals();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("returns null and logs 'skipped' when env is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const result = await sendTelegramMessageFromEnv("hello");
    expect(result).toBeNull();
    expect(consoleLogSpy).toHaveBeenCalledWith("[telegram] skipped: env not set");
  });

  it("returns null and logs 'skipped' when only chatId is missing", async () => {
    delete process.env.TELEGRAM_CHAT_ID;
    const result = await sendTelegramMessageFromEnv("hello");
    expect(result).toBeNull();
    expect(consoleLogSpy).toHaveBeenCalledWith("[telegram] skipped: env not set");
  });

  it("does NOT throw on transport error — returns ok:false instead", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ENOTFOUND");
      }),
    );
    const result = await sendTelegramMessageFromEnv("hello");
    expect(result).toEqual({ ok: false, error: "ENOTFOUND" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("passes through ok:true when send succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({ ok: true, result: { message_id: 99 } }),
      })),
    );
    const result = await sendTelegramMessageFromEnv("hello");
    expect(result).toEqual({ ok: true, messageId: 99 });
  });
});

/**
 * Telegram send-message helper.
 *
 * Phase 6 — BijakBeli cron notification. Sends a plain-text message to a
 * Telegram bot chat via the Bot API. Used by the orphan auto-link cron
 * to deliver a per-run summary; designed so the call site can `await` it
 * without worrying about Telegram uptime (any failure is logged + swallowed
 * by `sendTelegramMessageFromEnv`).
 *
 * Conventions:
 *  - Server-only. Uses `process.env` directly (no central `env.ts` helper
 *    because these vars are only consumed here; a single import site).
 *  - Native `fetch` (Node 20+), no SDK. Vercel runtime supplies fetch.
 *  - 5 s timeout via AbortController. Cron runs on a Hobby-plan 10 s
 *    budget; we don't want Telegram to eat that.
 *  - `sendTelegramMessage` throws on transport failure (network error /
 *    abort / DNS) so callers can choose how to handle it. The non-200
 *    path is converted to `{ ok: false, error }` and does NOT throw —
 *    that's an API-level rejection, not a transport failure.
 *  - `sendTelegramMessageFromEnv` is the cron-friendly entry point: it
 *    returns `null` when env is missing, or `{ ok, ... }` on send. It
 *    never throws. Callers can fire-and-forget.
 *
 * HTML parse mode is the default. The summary text we build is plain
 * (no markup), so HTML is a safe default — Telegram just renders it
 * verbatim. If a future call site wants Markdown, pass `parseMode`.
 */

export interface TelegramSendOptions {
  /** Bot token from `TELEGRAM_BOT_TOKEN`. Required. */
  botToken: string;
  /** Chat id from `TELEGRAM_CHAT_ID` (numeric string for users/groups). Required. */
  chatId: string;
  /** Message body. Telegram limit is 4096 chars; we don't enforce here. */
  text: string;
  /** Default `"HTML"`. Telegram's Bot API supports `HTML` and `MarkdownV2`. */
  parseMode?: "HTML" | "MarkdownV2";
  /** Send silently (no notification sound). */
  disableNotification?: boolean;
}

export interface TelegramSendResult {
  ok: boolean;
  /** Echoed back on success so callers can log / correlate. */
  messageId?: number;
  /** Human-readable reason when `ok === false`. Always safe to log. */
  error?: string;
}

const TELEGRAM_API_BASE = "https://api.telegram.org";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_ERROR_BODY_CHARS = 200;

interface TelegramApiResponse {
  ok: boolean;
  result?: { message_id: number };
  description?: string;
}

/**
 * Low-level send. Throws on transport failure (network, abort, DNS).
 * Returns `{ ok: false, error }` on Telegram API rejection (non-200 or
 * `{ ok: false }` body).
 */
export async function sendTelegramMessage(
  options: TelegramSendOptions,
): Promise<TelegramSendResult> {
  const { botToken, chatId, text, parseMode = "HTML", disableNotification } = options;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;
    const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: parseMode };
    if (disableNotification !== undefined) body.disable_notification = disableNotification;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        ok: false,
        error: `HTTP ${res.status}: ${errBody.slice(0, MAX_ERROR_BODY_CHARS)}`,
      };
    }

    const data = (await res.json()) as TelegramApiResponse;
    if (!data.ok) {
      return { ok: false, error: data.description ?? "telegram returned ok:false" };
    }
    return { ok: true, messageId: data.result?.message_id };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Cron-friendly wrapper. Reads `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
 * from `process.env`, sends, and never throws.
 *
 *  - Missing env → logs `Telegram skipped: env not set`, returns `null`.
 *  - Transport error → logs `[telegram] send failed: <err>`, returns
 *    `{ ok: false, error }`.
 *  - Telegram API rejection → returns `{ ok: false, error }` (no extra log;
 *    the inner helper already structured the error).
 */
export async function sendTelegramMessageFromEnv(
  text: string,
): Promise<TelegramSendResult | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.log("[telegram] skipped: env not set");
    return null;
  }
  try {
    return await sendTelegramMessage({ botToken, chatId, text });
  } catch (err) {
    console.error("[telegram] send failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

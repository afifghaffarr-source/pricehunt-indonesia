/**
 * Client-side CSRF helper for admin /api/admin/* calls.
 *
 * The proxy at src/proxy.ts requires mutating requests to /api/admin to send
 * `x-csrf-token` equal to a valid authenticated session token. This helper
 * fetches the token once from /api/auth/csrf and caches it for the lifetime
 * of the page (module-level cache). On a 401/CSRF mismatch the cache is
 * cleared so the next call refreshes the token.
 *
 * Usage:
 *   const res = await csrfFetch("/api/admin/data-collection/conflicts", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 */
"use client";

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

async function loadToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/csrf", { method: "GET", credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as { csrf_token?: string; csrfToken?: string; token?: string };
    // Server returns { csrf_token }, but accept common alternates in case
    // any other CSRF issuer uses a different shape.
    return data?.csrf_token ?? data?.csrfToken ?? data?.token ?? null;
  } catch {
    return null;
  }
}

async function getCsrfToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (!inflight) {
    inflight = loadToken().then((t) => {
      cachedToken = t;
      inflight = null;
      return t;
    });
  }
  return inflight;
}

/** Clear the cached token (e.g. after a 401/403). */
export function clearCsrfToken(): void {
  cachedToken = null;
  inflight = null;
}

type CsrfFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

/**
 * fetch() wrapper that automatically attaches `x-csrf-token` for mutating
 * admin calls. If the token endpoint is unreachable, the request is sent
 * without the header (so we don't break non-admin routes).
 */
export async function csrfFetch(
  input: string,
  init: CsrfFetchOptions = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const needsCsrf =
    input.startsWith("/api/admin/") && method !== "GET" && method !== "HEAD";

  const headers: Record<string, string> = { ...(init.headers ?? {}) };

  if (needsCsrf) {
    const token = await getCsrfToken();
    if (token) headers["x-csrf-token"] = token;
  }

  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

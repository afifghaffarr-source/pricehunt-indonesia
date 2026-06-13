/**
 * GET /api/auth/csrf
 *
 * Issues a CSRF token to the caller and sets it as a cookie.
 *
 * - Cookie: `csrf-token` (HttpOnly=false so client JS can read it back
 *   and put it in the `x-csrf-token` header — the standard double-submit
 *   cookie pattern).
 * - In production, we ALSO set `__Host-csrf` if the request is over HTTPS
 *   and has a non-localhost host, providing defense-in-depth.
 *
 * The token is opaque and 256 bits. We do NOT persist it server-side:
 * matching is done double-submit (header === cookie), and the token is
 * long enough to be unguessable.
 */
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "csrf-token";
const COOKIE_NAME_HOST = "__Host-csrf";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: NextRequest) {
  const token = generateToken();
  const host = request.headers.get("host") ?? "";
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");

  const res = NextResponse.json({ csrf_token: token });
  // Non-HttpOnly so client JS can echo it in the x-csrf-token header.
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: false,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  if (!isLocal) {
    res.cookies.set({
      name: COOKIE_NAME_HOST,
      value: token,
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }
  return res;
}

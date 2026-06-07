import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const rateLimit = new Map<string, { count: number; resetAt: number }>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/ai-advisor": { max: 10, windowMs: 60_000 },
  "/api/search": { max: 60, windowMs: 60_000 },
  "/api/products": { max: 100, windowMs: 60_000 },
};

function checkRateLimit(path: string, ip: string): boolean {
  const limit = LIMITS[path];
  if (!limit) return true;

  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = rateLimit.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }

  if (entry.count >= limit.max) return false;
  entry.count++;
  return true;
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      get(name: string) {
        return request.cookies.get(name);
      },
      set(name: string, value: string, options?) {
        response.cookies.set({ name, value, ...options });
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";
    if (!checkRateLimit(path, ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak request. Coba lagi nanti." },
        { status: 429 }
      );
    }
    return response;
  }

  const protectedRoutes = ["/dashboard", "/admin", "/settings"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && path.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

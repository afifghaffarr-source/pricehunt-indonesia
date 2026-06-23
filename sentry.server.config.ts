import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Node.js server-side initialization (API routes, Server Components).
 *
 * `SENTRY_DSN` is server-only — never expose to the client bundle.
 * When empty, Sentry is a no-op.
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

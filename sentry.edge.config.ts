import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Edge runtime initialization (middleware / proxy.ts).
 *
 * Edge runtime has its own bundle, so config is duplicated from
 * sentry.server.config.ts intentionally — Sentry Next.js requires
 * one config per runtime.
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

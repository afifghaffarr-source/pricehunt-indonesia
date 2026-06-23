import * as Sentry from "@sentry/nextjs";

/**
 * Sentry browser-side initialization.
 *
 * The DSN is intentionally read from a `NEXT_PUBLIC_*` variable so the
 * client bundle can access it. Public-only data leaves the browser when
 * Sentry is configured — never put server-only secrets here.
 *
 * When `NEXT_PUBLIC_SENTRY_DSN` is empty (default in local dev), Sentry
 * is a no-op so dev sessions stay quiet.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

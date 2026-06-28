# vercel.json — BijakBeli deploy config

Vercel Hobby (free) tier caps at **2 cron jobs total**. Only add an entry below
when `src/app/api/cron/<name>/route.ts` EXISTS as a real route handler.

Historical entries `/api/cron/alerts` and `/api/cron/prices` were removed
2026-06-28 because their route handlers were deleted (returned stale 'last run'
warnings via the BijakBeli Cron Watchdog).

We currently use 1 of 2 free cron slots: `/api/cron/digest` (weekly Monday
09:00 UTC, sends the weekly price digest to subscribed users).

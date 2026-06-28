# Cron Audit (2026-06-28)

> Audit + cleanup of cron jobs related to BijakBeli project on this VPS.
> Goal: keep only jobs that deliver real value, document decisions for future operators.

## Final state (4 jobs)

| ID | Name | Schedule | Mode | Last status | Verdict |
|---|---|---|---|---|---|
| `bad6b6ca10c1` | Morning VPS Status & Coding Reminder | daily 08:00 | agent + skills | 🔴 error (3+ days) | ⚠️ KEEP — see below |
| `cae83346645d` | Weekly VPS Maintenance | weekly Sun 09:00 | agent | 🟢 ok | ✅ KEEP |
| `e8256a06e2dd` | BijakBeli Cron Watchdog | daily 07:00 | python script | 🔴 error (signal) | ✅ KEEP |
| `7fee88a03a81` | bijakbeli-daily-health | daily 06:00 | bash script (no_agent) | 🟡 running | ✅ KEEP (NEW today) |

## Removed (3 jobs)

| ID | Name | Reason for removal |
|---|---|---|
| `6b660c36b356` | ~~BijakBeli Security Auditor~~ | Wrong scope: VPS security audit; BijakBeli runs on Vercel, not VPS. |
| `65ecd1619fca` | ~~Product Suggester Agent~~ | No consumer: agent-suggested products neither feed into user UI nor DB. |
| `c40907878ab6` | ~~bijakbeli-price-scraper~~ | Deprecated: browser extension v3.0.0+ replaced Python scrape path. |

All 3 had `last_status: error` for weeks. Removing eliminates 1 weekly and 1 daily unknown-failure noise.

## Why the failing one stays (`bad6b6ca10c1`)

Diagnosis path: pulled the last 3 sessions behind the failing cron — all 3 hit the **same** upstream error:

```json
{"type": "APIConnectionError", "message": "Connection error."}
"max_retries_exhausted"
```

Cause is **upstream LLM provider unreachability**, not VPS or cron logic. When provider recovers, cron will work again. Also: not strictly BijakBeli-specific but provides:
- Daily VPS load / disk / service status recap
- "Coding reminder" — daily nudge to AGR when VPS is reachable in morning

Recommendation: **KEEP unless** AGR adds daily VPS report to their own personal workflow, in which case `bijakbeli-daily-health` already covers infrastructure health at 06:00.

## Why the BijakBeli Cron Watchdog stays `error` daily

This is **intended behavior**, not a bug. The watchdog queries Supabase `ingestion_logs` for 3 expected prod-side Vercel crons:

- `cron_alerts` (daily 00:00 UTC) — last seen 2026-06-24
- `cron_prices` (daily 06:00 UTC) — last seen 2026-06-24
- `cron_digest` (weekly Mon 09:00 UTC) — last seen 2026-06-22

The Vercel Hobby tier caps at 2 cron slots; only `/api/cron/digest` was implemented in source. Both other paths returned auth-error 401. Today's `vercel.json` cleanup (commit `8f1aeea`) removed the 2 dead entries. After Vercel redeploys with the new `vercel.json`, only `cron_digest` should be observable, and digest's last-seen will refresh on next Monday 09:00 UTC (June 29).

Until then: expect Watchdog daily to show 2-3 STALE entries as expected maintenance signal, not failure.

## New cron: `bijakbeli-daily-health` (today)

Single bundled diagnostic that:
- Hits 5 launch routes via curl (smoke test)
- Runs axe-core WCAG 2.1 AA regression (against localhost)
- Compares build-zip mtime vs latest commit (drift detector)
- Calls cron_watchdog.py (Supabase last-seen query)

External cost/day: **5 Vercel GETs + 1 Supabase read + 0 Vercel Function invocations**. Both well within their respective free tier quotas (100K Vercel invocations/month, 500K Supabase reads/month, ~0.02% of either).

## Recommendations for future

1. **Audit cron list monthly** — anything failing >7 days should be reviewed for removal. Pausing is staging-only state, not terminal.
2. **Use Hermes side for monitoring, Vercel side for app-only** — keeps free-tier quotas clean and avoids double-paying.
3. **Tag cron jobs with `workdir`** — when a script references a project repo, lock the workdir so path-relative commands don't break.
4. **After CRON_SECRET changes on Vercel**, redeploy immediately. Stale authenticated routes silently 503 in dev but report as "ok" in watchdog if Supabase insert succeeds with old secret.
5. **Don't add a cron that queries same Supabase table >1×/day unless needed** — daily is the sweet spot for free tier (500K/month ÷ 30 = 16K/day allowance).

## Suggestions AGR may want next (not implemented)

| Cron | Schedule | Why useful | Cost |
|---|---|---|---|
| Weekly PriceHunt/SahamRadar sanity check | weekly Mon 10:00 | Cross-project health unify | 5 Vercel GETs + 0 Supabase |
| CWS dashboard scrape (post-submission) | daily 11:00 | Surface reviewer comments | 5 browser_vision calls (LLM-cost) |
| Hourly post-CWS pulse | hourly 8am-6pm | Faster feedback once live | Capped at 10/day to respect LLM budget |

These are not currently active; suggested as Ada-pasang-sesuai-kebutuhan (when relevant).

## Stability invariant

4 jobs total. Each fails-closed by design:
- If bash script errors → empty stdout delivered (Telegram see "status error" but content still gets through)
- If Python watchdog exits 1 → exits with the report (delivered as status=error but text delivered)
- If LLM job fails (APIConnectionError) → no message delivered; called out as failing daily

All future cron additions must:
- Document external cost (Vercel hits, Supabase queries)
- Specify free vs Pro tier compatibility
- Have a clearly defined `last_status` semantic (error != silently broken)

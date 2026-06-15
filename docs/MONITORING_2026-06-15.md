# P6: Production Monitoring (2026-06-15)

BijakBeli.app production health monitoring. Designed to be **lean**: event-driven, alert-on-failure, no continuous noise.

## What this delivers

| Component | Purpose | Trigger | Cost |
|---|---|---|---|
| GitHub Action monitor | E2E + URL health check | Daily 09:00 UTC + manual | ~$0.05/month |
| Ad-hoc health script | Local DB + scraper health check | Manual | Free |
| Issue alerts | Owner gets notified on failure | On check failure | Free |

**Total ongoing cost: ~$0.05/month** (one workflow run per day, ~30s compute).

## Why not a VPS cron?

The user explicitly removed 18/23 cron jobs to save tokens. GitHub Actions cron is:
- Free for public repos, cheap for private
- No continuous daemon (no token cost when idle)
- Native GitHub integration (Issues, audit log)
- Triggers on user activity too (manual `workflow_dispatch`)

## What gets monitored

### 1. E2E Workflow Status (GitHub Action)
- Queries GitHub API for last N (default 5) `e2e.yml` workflow runs
- If any have `conclusion` other than `success` or `skipped` → alert
- Configurable lookback via `workflow_dispatch` input

### 2. Production URL Health (GitHub Action)
- Curls `$PRODUCTION_URL` (existing GitHub secret)
- Checks HTTP 200
- Searches response body for error markers: "terjadi kesalahan", "something went wrong", "application error"
- Measures latency (warns if > 10s, does not fail)
- 30s timeout (handles Vercel/Supabase cold starts)

### 3. Database Health (Ad-hoc script only)
- `offers` count via PostgREST `Prefer: count=exact`
- Failed ingestion jobs in last 24h (from `ingestion_logs.log_status != 'success'`)
- Stale crawl targets (not crawled in last 7 days, threshold 50 for warning)
- Camofox server running (local check, optional)

## What does NOT get monitored

- **VPS-level alerts** (CPU/memory/disk) — user moved to 4GB VPS, false alarm risk
- **Ingestion pipeline throughput** — too noisy for daily check
- **Database size** — would need direct psql, deferred
- **Per-marketplace scraper success rates** — too granular for top-level monitor
- **Real user experience** (RUM, page load times) — would need a different tool

These can be added later if needed; the current scope is "alert when something is broken."

## Files added

| File | Purpose |
|---|---|
| `.github/workflows/monitor.yml` | Daily + manual production health check |
| `scripts/health_check.py` | Ad-hoc local health check (Supabase + Camofox) |
| `docs/MONITORING_2026-06-15.md` | This file |

## Files modified

None — pure additive change.

## Setup

### GitHub Action
- **No new secrets needed.** Uses existing `secrets.GITHUB_TOKEN` and `secrets.PRODUCTION_URL`.
- The workflow file is `.github/workflows/monitor.yml` — it's active as soon as it's pushed to master.
- Label `monitoring-alert` is auto-created by GitHub on first use. To customize:
  1. Go to https://github.com/afifghaffarr-source/pricehunt-indonesia/labels
  2. Edit `monitoring-alert` color/description

### Manual trigger
1. Go to https://github.com/afifghaffarr-source/pricehunt-indonesia/actions/workflows/monitor.yml
2. Click "Run workflow"
3. Optional: change "lookback" input (default 5)
4. Click "Run workflow" button

### Ad-hoc health check
```bash
cd /home/ubuntu/projects/bijakbeli-app
python3 scripts/health_check.py            # human-readable
python3 scripts/health_check.py --json     # JSON for piping
python3 scripts/health_check.py --fail-on-warning  # exit 2 on warnings
```

Exits:
- `0` = healthy
- `1` = failure
- `2` = warning (only with `--fail-on-warning`)

## Alert flow

```
[09:00 UTC] GitHub Action runs
     │
     ├── check-e2e: query GitHub API for last 5 E2E runs
     ├── check-url: curl production URL
     │
     ▼
  Both pass → silent (no output to user)
  Either fails ▼
     │
     └── alert job: create/update GitHub Issue
         - Title: 🔴 Production health alert - YYYY-MM-DD
         - Labels: monitoring-alert
         - Body: status of each check, action items, link to logs
         - De-duped: if issue is open, just adds a comment
```

The repo owner (you) gets an email from GitHub about new issues. That's the "alert" — no Telegram bot needed.

## Testing

### Trigger the monitor manually
1. Go to Actions → Production Monitor → Run workflow
2. Verify the run completes in ~30s
3. Check that the run summary shows:
   - `check-e2e` step: "All last 5 E2E runs successful"
   - `check-url` step: "Production URL is healthy"
4. No issue should be created (since everything is healthy)

### Force a failure
1. Temporarily edit `check-url` step to curl a non-existent URL
2. Push
3. Manual trigger
4. Verify the issue is created with label `monitoring-alert`
5. Revert the change

### Test ad-hoc script
```bash
python3 scripts/health_check.py
# Should print: "HEALTHY" with offers_count: 165
```

## How to silence an alert

If an alert fires and the issue is something you're already working on:
1. Add a comment on the GitHub Issue: "Investigating — see PR #XXX"
2. Don't close the issue yet — the next monitor run will add another comment
3. When the issue is resolved, close the GitHub Issue

The monitor does NOT auto-recover; it just keeps adding comments to the open issue until you close it.

## Future enhancements (deferred)

- **Telegram alerts**: add `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` secrets, post a `curl` to Telegram API in the alert job
- **Database size monitoring**: add a `pg_database_size` RPC, warn if > 80% of Supabase free tier (500MB)
- **Ingestion job error rate**: track 7-day rolling average, alert if > 10%
- **Crawl target health**: alert if `crawl_targets.error_count > 3` for any target
- **Per-marketplace price sanity**: alert if average offer price changes > 20% day-over-day
- **SSL cert expiry**: external tool (e.g., https://www.ssllabs.com/) — not worth a workflow

## Related docs

- [CHANGELOG.md](../CHANGELOG.md) — P6 entry under "Unreleased"
- [CAMOFOX_INTEGRATION_2026-06-15.md](./CAMOFOX_INTEGRATION_2026-06-15.md) — Camofox scraper that health_check.py validates
- [MULTI_MARKETPLACE_VALIDATION_2026-06-15.md](./MULTI_MARKETPLACE_VALIDATION_2026-06-15.md) — Blibli parser that E2E tests cover

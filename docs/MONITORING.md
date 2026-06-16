# Monitoring Guide

## Current Stack (as of v1.5.13)

| Tool | Purpose | Cost |
|---|---|---|
| **Vercel Analytics** | Page views, custom events | Free tier (2.5K events/mo) |
| **Vercel Speed Insights** | Real user Core Web Vitals (LCP, INP, CLS) | Free tier |
| **Supabase Dashboard** | DB queries, row counts, logs | Free tier (500MB, 50K MAU) |
| **GitHub Actions** | CI: lint, test, build, e2e, LHCI | Free tier (2K min/mo) |
| **Hermes Cron** | Scheduled job reports → Telegram | VPS cost only |
| **Sentry** (v1.5.13) | Error tracking, stack traces, performance | Free tier (5K errors/mo) |

## What's NOT Monitored (Known Gaps)

- **No uptime monitoring** untuk cron jobs (alert jika > 24 jam no output)
- **No SLO/SLA dashboard** (e.g., "99.9% uptime target")
- **No log aggregation** (Vercel logs are per-deployment, no central)
- **No real-time alerting** (only scheduled reports)

## Sentry Setup (v1.5.13)

Sentry scaffolding sudah ditambahkan di v1.5.13. Untuk aktivasi:

1. **Buat project** di https://sentry.io (sign up free, buat Next.js project)
2. **Copy DSN** dari Project Settings → Client Keys (DSN)
3. **Tambah ke Vercel env**:
   - Variable: `NEXT_PUBLIC_SENTRY_DSN`
   - Value: `<your-dsn>`
   - Environment: Production, Preview, Development
4. **Optional: source maps upload**:
   - Variable: `SENTRY_AUTH_TOKEN`
   - Generate dari Sentry → Settings → Auth Tokens
5. **Tambah ke .env.local** untuk local dev testing:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=<your-dsn>
   ```
6. **Redeploy** (next.config.ts Sentry wrapper aktif only when DSN present)
7. **Verify**: trigger error di production, cek di Sentry dashboard muncul dalam 30 detik

## Vercel Analytics Events

Track custom events di client components:
```typescript
import { track } from '@vercel/analytics';

track('product_viewed', { productId, slug, category });
```

Real user metrics:
- LCP (target < 2.5s)
- INP (target < 200ms)
- CLS (target < 0.1)
- TTFB, FCP (informational)

## Vercel Speed Insights

Auto-installed via `@vercel/speed-insights`. View in:
- Vercel Dashboard → Project → Speed Insights
- Atau: `vercel.speedinsights.vercel.com`

## Supabase Monitoring

Key metrics to check weekly:
- **Database size**: should stay < 80% of plan
- **API requests**: spike = potential attack
- **Active connections**: > 80% = scale up
- **Bandwidth out**: large spike = check for runaway query

Alerts setup di: Supabase → Settings → Integrations (Slack, Discord, email)

## Cron Job Monitoring

5 active cron jobs (post v1.5.13 reduction):
- `pricehunt-cron` (every 30m) — crawl queue
- `ingestion-monitor` (every 1h) — ingestion health
- `refresh-priorities` (every 6h) — Phase 5 (when activated)
- `price-alerts-check` (every 4h) — user price alerts
- `daily-digest` (daily 9am) — summary report

All output ke Telegram via Hermes. **Silent failure = no alert.** Set up Sentry untuk catch.

## Alert Thresholds (Recommended)

| Metric | Warning | Critical |
|---|---|---|
| LCP p75 | > 3s | > 5s |
| INP p75 | > 300ms | > 500ms |
| CLS p75 | > 0.15 | > 0.25 |
| API error rate | > 1% | > 5% |
| DB query p95 | > 500ms | > 2s |
| Cron job no-output | > 24h | > 48h |
| Storage > 80% plan | warning | critical |
| Monthly API cost | > budget x1.2 | > budget x2 |

## Audit Trail

Monitoring setup audited 2026-06-17. See `~/.hermes/plans/bijakbeli-audit-2026-06-17.md` for full plan.

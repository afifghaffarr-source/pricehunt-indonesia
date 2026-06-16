# Operations Runbook

Panduan operasional untuk maintain BijakBeli.app di production.

## Quick Links

- **Production**: https://www.bijakbeli.web.id
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Actions**: https://github.com/afifghaffarr-source/pricehunt-indonesia/actions
- **Lighthouse CI reports**: per-PR comment di GitHub

## Daily Checks (5 menit)

```bash
# 1. Cek cron job health (cron sudah push notif ke Telegram kalau ada issue)
# 2. Cek Supabase usage: dashboard → Settings → Usage
# 3. Cek Vercel: Dashboard → Project → Deployments (semua READY?)
# 4. Cek GitHub Actions: tidak ada yang failed > 1 hari
```

## Incident Response

### Production Down (Site 500)
1. Cek Vercel status: https://www.vercel-status.com
2. Cek recent deploys: revert ke last green jika baru deploy
3. Cek Supabase: project masih aktif, tidak paused
4. Cek env vars: tidak ada yang ke-clear
5. Rollback via Vercel: `vercel rollback` atau dashboard → Deployments → Promote previous

### Database Migration Failed
1. Cek migration di Supabase SQL Editor: query `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5`
2. Apply manual fix via SQL Editor (paste dari `supabase/migrations/`)
3. For data migrations: backup dulu, apply, verify
4. Update `docs/MIGRATION_*_GUIDE.md` dengan incident notes

### Cron Job Stuck/Failing
1. Cek `~/.hermes/cron/output/` untuk log terbaru
2. Manual run: trigger dari Hermes chat
3. Common issues:
   - Xvfb not running (`Xvfb :99 -screen 0 1920x1080x24 -ac &`)
   - VexoAPI rate limited (backoff + retry)
   - Marketplace anti-bot block (use manual mode)
4. Lihat `docs/SCRAPER_OPERATIONS.md` untuk detail

### Security Incident (suspected breach)
1. Rotate IMMEDIATELY:
   - `SUPABASE_SERVICE_ROLE_KEY` (Vercel + .env.local)
   - `INGESTION_SECRET` (Vercel + collectors/.env)
   - `VEXO_API_KEY` (Vercel)
2. Cek Supabase logs: dashboard → Logs → API
3. Cek recent deploys untuk unauthorized changes
4. Review RLS policies: `SELECT * FROM pg_policies WHERE schemaname='public';`
5. Email: security@bijakbeli.web.id

## Deploy Process

### Standard (auto)
Push ke `master` → Vercel auto-deploy → CI parallel (lint, test, build, e2e, LHCI) → READY atau ROLLBACK

**IMPORTANT**: CI failure TIDAK block Vercel deploy. Selalu cek GitHub Actions setelah push.

### Manual Rollback
```bash
# Via CLI
vercel rollback

# Via dashboard
# Deployments → click previous green → "Promote to Production"
```

### Hotfix
1. Branch: `git checkout -b hotfix/short-desc`
2. Fix + test locally
3. Commit + push
4. PR → merge ke master → auto-deploy
5. Verify production: `curl -sI https://www.bijakbeli.web.id | head -5`

## Database Maintenance

### Backups
- **Supabase auto-backup**: daily, retained 7 days (Pro plan)
- **Manual backup**: `pg_dump` via Supabase SQL Editor → `EXPORT DATA`
- **Critical tables**: products, offers, price_snapshots, reviews, crawl_targets, ingestion_logs

### Indexes
- 5 deferred indexes di `A-005_FUTURE_PERFORMANCE_INDEXES.sql`
- Apply when: products > 10K, offers > 100K, price_snapshots > 1M, crawl_targets > 5K
- Use `CONCURRENTLY` di psql CLI, remove keyword di SQL Editor

### Performance Monitoring
- Lighthouse CI: per-PR via GitHub Actions
- Vercel Analytics: real user metrics
- Vercel Speed Insights: Core Web Vitals from production

## Cost Management (Per User Requirement)

- **AI tokens**: monitor via VexoAPI + OpenAI dashboards
- **Cron jobs**: 5 active (down from 23). Review setiap bulan
- **Vercel**: Pro plan, monitor function execution time
- **Supabase**: monitor row counts + bandwidth

## On-Call (Single Maintainer Mode)

- Telegram alerts via cron → `price-alert-report.js` + Hermes
- Personal phone notifications for critical failures
- Weekly review: Saturday morning, 30 menit

## Disaster Recovery

### Worst Case: Total Loss
1. Restore code: `git clone https://github.com/afifghaffarr-source/pricehunt-indonesia`
2. Restore database: Supabase point-in-time recovery (Pro plan) atau fresh + import from `pg_dump`
3. Restore env vars: dokumentasi di `.env.local.example` (no real secrets committed)
4. Re-deploy: `vercel --prod`
5. Re-add cron jobs: `cronjob` tool di Hermes
6. Verify: smoke test semua major routes

### Worst Case: Single Region Out
- Vercel multi-region: automatic
- Supabase: regional, manual failover via support ticket

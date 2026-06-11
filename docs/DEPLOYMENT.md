# BijakBeli.app - Deployment Guide

Complete guide untuk deploy BijakBeli.app ke production.

---

## 📋 Prerequisites

### Required Services
- **Supabase** (Database + Auth) - [supabase.com](https://supabase.com)
- **Vercel** (Hosting) - [vercel.com](https://vercel.com)

### Optional Services
- **OpenAI** - AI Advisor feature
- **Resend** - Email notifications
- **VexoAPI** - Product discovery

---

## 🗄️ Database Setup

### 1. Create Supabase Project

1. Login ke [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create New Project
3. Note down:
   - Project URL: `https://xxx.supabase.co`
   - Anon key (public)
   - Service role key (secret)

### 2. Run Migrations

**Via Dashboard (Recommended):**

1. Go to: SQL Editor
2. Run migrations in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_performance_indexes.sql
   supabase/migrations/003_reviews_system.sql
   ...
   supabase/migrations/110_enhanced_data_collection.sql
   ```
3. Run seed data:
   ```
   supabase/seed.sql
   ```

**Via CLI:**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Push all migrations
npx supabase db push

# Apply seed data
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/seed.sql
```

### 3. Configure Auth

**Email Authentication:**
1. Authentication → Providers → Email
2. Enable email provider
3. **Production:** Enable "Confirm email"
4. **Development:** Disable "Confirm email" for easier testing

**Set Admin User:**
```sql
-- Replace with your user ID (from auth.users table)
UPDATE user_profiles 
SET preferences = '{"is_admin": true}'::jsonb 
WHERE id = 'YOUR_USER_UUID';
```

### 4. Enable Row Level Security (RLS)

All tables sudah memiliki RLS policies di migrations. Verify:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Semua harus `rowsecurity = true`.

---

## 🚀 Vercel Deployment

### 1. Connect Repository

1. Login ke [vercel.com](https://vercel.com)
2. Import Git Repository
3. Select: `afifghaffarr-source/bijakbeli-app`

### 2. Configure Build Settings

**Framework Preset:** Next.js  
**Build Command:** `bun run build` atau `npm run build`  
**Output Directory:** (leave as default)  
**Install Command:** `bun install` atau `npm install`

### 3. Environment Variables

Add these in Vercel dashboard → Settings → Environment Variables:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# App URL (Required)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Cron & Security (Required)
CRON_SECRET=generate-random-64-char-string
INGESTION_SECRET=generate-random-64-char-string

# OpenAI (Optional)
OPENAI_API_KEY=sk-xxx

# Resend (Optional - untuk email alerts)
RESEND_API_KEY=re_xxx

# VexoAPI (Optional - product discovery)
VEXO_API_BASE_URL=https://vexoapi.azzamcodex.site
VEXO_API_KEY=your_vip_key
VEXO_API_TIMEOUT_MS=10000
VEXO_CACHE_TTL_SECONDS=3600

# Price Simulation (Production = false)
ENABLE_PRICE_SIMULATION=false
```

**Generate Random Secrets:**
```bash
# Generate CRON_SECRET
openssl rand -hex 32

# Generate INGESTION_SECRET
openssl rand -hex 32
```

### 4. Deploy

Click **Deploy** button. Vercel akan:
- Install dependencies
- Run build
- Deploy to production

**Domain:** `https://your-project.vercel.app`

### 5. Configure Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `bijakbeli.id`)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable

---

## ⚙️ Cron Jobs Setup

BijakBeli memiliki 2 cron jobs yang perlu di-setup di Vercel.

**vercel.json** sudah configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "0 */12 * * *"
    },
    {
      "path": "/api/cron/digest",
      "schedule": "0 8 * * 0"
    }
  ]
}
```

**Manual Trigger (Testing):**
```bash
curl https://your-domain.vercel.app/api/cron/prices?secret=YOUR_CRON_SECRET
curl https://your-domain.vercel.app/api/cron/digest?secret=YOUR_CRON_SECRET
```

---

## 🤖 Python Browser Collector Setup

Untuk collect data manual via browser collector:

### 1. Setup on VPS/Local

```bash
cd tools/price-collector

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Configure
cp .env.example .env
```

### 2. Configure .env

```bash
PRICEHUNT_API_URL=https://your-domain.vercel.app
INGESTION_SECRET=same-as-vercel-env-var
DEFAULT_MARKETPLACE=tokopedia
COLLECTOR_HEADLESS=false
DEBUG=false
```

### 3. Test Connection

```bash
python collector.py test
# Should output: ✅ API is reachable!
```

### 4. Collect Data

**Manual Mode:**
```bash
python collector.py manual
```

**URL Mode:**
```bash
python collector.py url "https://tokopedia.com/product-url"
```

**Keyword Mode:**
```bash
python collector.py keyword "samsung galaxy s24" --limit 5
```

---

## 📊 Monitoring & Maintenance

### Health Check

```bash
curl https://your-domain.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-11T10:00:00.000Z",
  "database": "connected",
  "uptime": 123456
}
```

### Database Backup

**Automatic (via Supabase):**
- Supabase provides automatic daily backups
- Go to: Database → Backups

**Manual Backup (via API):**
```bash
curl -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://your-domain.vercel.app/api/backup \
  -o backup-$(date +%Y%m%d).sql
```

### Monitor Cron Jobs

**Vercel Dashboard:**
1. Deployments → Functions
2. Check logs untuk `/api/cron/prices` dan `/api/cron/digest`

**Check Last Run:**
```sql
SELECT * FROM job_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Price Data Staleness

Check stale offers (not updated > 24 hours):

```sql
SELECT 
  o.id,
  o.title,
  m.name as marketplace,
  o.last_checked_at,
  NOW() - o.last_checked_at as stale_duration
FROM offers o
JOIN marketplaces m ON o.marketplace_id = m.id
WHERE o.last_checked_at < NOW() - INTERVAL '24 hours'
  AND o.is_available = true
ORDER BY o.last_checked_at ASC
LIMIT 20;
```

---

## 🔒 Security Checklist

### Production Security

- [ ] `CRON_SECRET` adalah random 64-char string
- [ ] `INGESTION_SECRET` adalah random 64-char string
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tidak exposed di client
- [ ] Email confirmation enabled di Supabase Auth
- [ ] RLS policies aktif untuk semua tables
- [ ] CORS configured dengan domain whitelist
- [ ] Rate limiting enabled untuk public endpoints
- [ ] `ENABLE_PRICE_SIMULATION=false` di production

### Environment Variables

**NEVER commit to Git:**
- `.env.local`
- `.env.production.local`
- `tools/price-collector/.env`

**Use Vercel secrets for:**
- Database credentials
- API keys
- Service role keys
- Cron secrets

---

## 🚨 Troubleshooting

### Build Fails

**Error:** `Type error: ...`
```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id YOUR_ID > src/types/supabase.ts
git add src/types/supabase.ts
git commit -m "chore: regenerate Supabase types"
git push
```

### Database Connection Error

**Error:** `Could not connect to database`

1. Check Supabase project status (dashboard)
2. Verify environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Test connection:
   ```bash
   curl https://YOUR_PROJECT.supabase.co/rest/v1/
   ```

### Cron Not Running

1. Check `vercel.json` is committed
2. Verify cron path matches API route
3. Test manual trigger:
   ```bash
   curl "https://your-domain.vercel.app/api/cron/prices?secret=YOUR_SECRET"
   ```
4. Check Vercel logs (Deployments → Functions)

### Collector Connection Fails

**Error:** `❌ Cannot connect to API`

1. Verify Next.js app is running
2. Check `tools/price-collector/.env`:
   - `PRICEHUNT_API_URL` correct?
   - `INGESTION_SECRET` matches Vercel env var?
3. Test endpoint:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/ingestion/offer-snapshot \
     -H "Authorization: Bearer YOUR_INGESTION_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

---

## 📈 Performance Optimization

### Database Indexes

All critical indexes already created in migrations:
- `products(name)`
- `products(category)`
- `offers(product_id, marketplace_id)`
- `price_snapshots(offer_id, captured_at)`
- `crawl_targets(next_crawl_at, priority_score)`

### Caching Strategy

**API Routes:**
- `/api/products` - Cache 5 minutes
- `/api/search` - Cache 10 minutes
- `/api/vexo/*` - Cache 1 hour

**Static Pages:**
- Homepage - ISR 60 seconds
- Product pages - ISR 300 seconds

### Image Optimization

**Next.js Image Component:**
- Automatic WebP conversion
- Lazy loading
- Responsive sizes
- CDN caching via Vercel

---

## 📞 Support & Resources

**Documentation:**
- Main README: `/README.md`
- Phase 1 Complete: `/docs/PHASE_1_COMPLETE.md`
- Phase 2 Complete: `/docs/PHASE_2_COMPLETE.md`
- Progress Tracker: `/docs/PROGRESS.md`
- Collector Guide: `/tools/price-collector/README.md`

**External Resources:**
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Playwright: https://playwright.dev/python/

**Repository:**
- GitHub: https://github.com/afifghaffarr-source/bijakbeli-app

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] App accessible at production URL
- [ ] Health check returns `"status": "ok"`
- [ ] Login/register works
- [ ] Product search works
- [ ] Price history chart displays
- [ ] Admin dashboard accessible (untuk admin users)
- [ ] Cron jobs running (check logs after scheduled time)
- [ ] Browser collector can connect and send data
- [ ] Email alerts work (jika Resend configured)
- [ ] Push notifications work (jika enabled)
- [ ] Database backup dapat di-download
- [ ] All environment variables correct

---

**Last Updated:** 2026-06-11  
**Version:** 1.2.0  
**Status:** Production-Ready MVP

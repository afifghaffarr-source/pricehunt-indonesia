# 🚀 Deployment Guide - PriceHunt Indonesia

**Last Updated**: 2026-06-10  
**Target**: Production Deployment ke Vercel

---

## ⚠️ Prerequisites

Before starting, ensure you have:
- [x] Code pushed to GitHub
- [ ] Supabase account (supabase.com)
- [ ] Vercel account (vercel.com)
- [ ] Supabase CLI installed
- [ ] Vercel CLI installed (optional)

---

## 📋 Deployment Checklist

### Phase 1: Setup Production Supabase Project

#### Step 1.1: Create New Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `pricehunt-indonesia-prod`
   - **Database Password**: Generate strong password (SAVE THIS!)
   - **Region**: Singapore (closest to Indonesia)
   - **Plan**: Free tier OK untuk start, upgrade nanti jika perlu
4. Wait ~2 minutes untuk project provisioning
5. **IMPORTANT**: Save these credentials securely:
   - Project URL
   - Project API keys (anon key & service_role key)
   - Database password

#### Step 1.2: Get Production Credentials
Once project ready, go to **Project Settings > API**:

```bash
# You'll need these values:
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Service role key (KEEP SECRET!)
```

---

### Phase 2: Run Database Migrations

#### Step 2.1: Link CLI to Production Project
```bash
# Link Supabase CLI to production project
supabase link --project-ref [your-project-id]

# Enter database password when prompted
```

#### Step 2.2: Push All Migrations
```bash
# Push all migrations to production database
supabase db push

# This will run migrations 001-108 including:
# - Core schema (products, prices, users, etc.)
# - RLS policies
# - Rate limiting (106)
# - Offers & price snapshots (107)
# - Data ingestion system (108)
```

#### Step 2.3: Verify Migrations
```bash
# Check migration status
supabase migration list

# All migrations should show as "Applied"
```

#### Step 2.4: Run Seed Data (Optional)
```bash
# If you want to seed initial data:
psql [your-database-url] < supabase/seed.sql

# Or run individual seeds:
psql [your-database-url] < supabase/seed_api_registry.sql
```

**Database URL format:**
```
postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

---

### Phase 3: Regenerate Supabase Types

#### Step 3.1: Generate Production Types
```bash
# Generate TypeScript types from production schema
supabase gen types typescript --linked > src/lib/supabase/types.ts

# This updates types based on your actual production schema
```

#### Step 3.2: Verify Types
```bash
# Run TypeScript check
npm run type-check

# Or build to verify
npm run build
```

---

### Phase 4: Setup Environment Variables

#### Step 4.1: Prepare Production Env File

Copy `.env.production.local.example` to `.env.production.local`:
```bash
cp .env.production.local.example .env.production.local
```

#### Step 4.2: Fill in ALL Required Variables

Edit `.env.production.local`:

```bash
# === SUPABASE (From Step 1.2) ===
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # NEVER commit this!

# === APP CONFIG ===
NEXT_PUBLIC_APP_URL=https://pricehunt-indonesia.vercel.app
NODE_ENV=production

# === OPENAI (untuk AI Advisor) ===
OPENAI_API_KEY=sk-...

# === VEXO (untuk scraping) ===
VEXO_API_KEY=vexo_...

# === EMAIL (Resend) ===
RESEND_API_KEY=re_...

# === CRON SECRET (Generate random string) ===
CRON_SECRET=your-secure-random-string-here

# === WEB PUSH (VAPID keys) ===
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BM...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
```

#### Step 4.3: Generate Secure Secrets

For `CRON_SECRET`, generate random string:
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

For VAPID keys (if not generated yet):
```bash
# Install web-push if needed
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Save the output to your env file
```

---

### Phase 5: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended for First Deploy)

1. Go to [https://vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository: `afifghaffarr-source/pricehunt-indonesia`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
5. **Environment Variables** - Add ALL from Step 4.2:
   - Click "Environment Variables"
   - Add each variable one by one
   - **IMPORTANT**: Mark sensitive keys (SERVICE_ROLE_KEY, API keys) as "Sensitive"
6. Click "Deploy"
7. Wait 2-5 minutes
8. Get your production URL: `https://pricehunt-indonesia.vercel.app`

#### Option B: Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Follow prompts to set environment variables
```

---

### Phase 6: Post-Deploy Verification

#### Step 6.1: Test Health Endpoints
```bash
# Test app health
curl https://pricehunt-indonesia.vercel.app/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","environment":"production"}

# Test database health
curl https://pricehunt-indonesia.vercel.app/api/health/db

# Expected response:
# {"status":"healthy","database":"connected","responseTime":45,"timestamp":"..."}
```

#### Step 6.2: Test Core Pages
Visit these URLs manually:
- [ ] Homepage: https://pricehunt-indonesia.vercel.app
- [ ] Search: https://pricehunt-indonesia.vercel.app/search
- [ ] Deals: https://pricehunt-indonesia.vercel.app/deals
- [ ] Sitemap: https://pricehunt-indonesia.vercel.app/sitemap.xml
- [ ] Robots: https://pricehunt-indonesia.vercel.app/robots.txt

#### Step 6.3: Test Authentication
- [ ] Register new user
- [ ] Login
- [ ] Verify email (check Supabase email settings)

#### Step 6.4: Test Database Operations
- [ ] Create wishlist item
- [ ] Create price alert
- [ ] Add product review
- [ ] Export user data

---

### Phase 7: Setup Vercel Cron Jobs

#### Step 7.1: Configure vercel.json Cron
Your `vercel.json` already has cron configured:
```json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/alerts",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/digest",
      "schedule": "0 8 * * *"
    }
  ]
}
```

#### Step 7.2: Set CRON_SECRET in Vercel
1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add `CRON_SECRET` dengan value yang sama dengan local
3. Redeploy untuk apply changes

#### Step 7.3: Verify Cron Jobs
After deploy, Vercel will automatically run crons. Check logs:
1. Vercel Dashboard > Your Project > Logs
2. Filter by `/api/cron/`
3. Verify cron jobs running successfully

---

### Phase 8: Setup External Services

#### Step 8.1: Google Search Console
1. Go to [https://search.google.com/search-console](https://search.google.com/search-console)
2. Add property: `https://pricehunt-indonesia.vercel.app`
3. Verify ownership (Vercel DNS method recommended)
4. Submit sitemap: `https://pricehunt-indonesia.vercel.app/sitemap.xml`

#### Step 8.2: Supabase Auth Email Templates (Optional)
1. Supabase Dashboard > Authentication > Email Templates
2. Customize:
   - Confirm signup
   - Magic Link
   - Password reset
   - Email change
3. Update branding dan copy untuk Indonesia

#### Step 8.3: Supabase RLS Verification
1. Supabase Dashboard > Database > Policies
2. Verify all RLS policies active:
   - products (SELECT public)
   - wishlists (SELECT/INSERT/UPDATE/DELETE for owner)
   - price_alerts (SELECT/INSERT/UPDATE/DELETE for owner)
   - reviews (SELECT public, write for owner)
   - preferences (SELECT/UPDATE for owner)

---

### Phase 9: Monitoring Setup

#### Step 9.1: Vercel Analytics (Already Integrated)
1. Vercel Dashboard > Your Project > Analytics
2. Enable Analytics (free tier available)
3. View real-time traffic data

#### Step 9.2: Vercel Speed Insights (Already Integrated)
1. Vercel Dashboard > Your Project > Speed Insights
2. Enable Speed Insights
3. Monitor Web Vitals

#### Step 9.3: Setup Alerts (Optional)
1. Vercel Dashboard > Your Project > Settings > Notifications
2. Configure alerts for:
   - Build failures
   - High error rates
   - Performance degradation

#### Step 9.4: Error Tracking - Sentry (Optional)
If you want advanced error tracking:
```bash
npm install @sentry/nextjs

# Follow Sentry setup wizard
npx @sentry/wizard -i nextjs
```

---

## 🔒 Security Checklist

Before going live, verify:

- [ ] All API keys in environment variables (not committed)
- [ ] SUPABASE_SERVICE_ROLE_KEY never exposed to client
- [ ] RLS policies active on all tables
- [ ] CRON_SECRET set and secured
- [ ] Rate limiting enabled (migration 106)
- [ ] CORS properly configured
- [ ] SQL injection protection (using parameterized queries)
- [ ] Auth properly implemented

---

## 🎯 Performance Checklist

Optimization ready:

- [x] Static pages pre-rendered
- [x] API routes optimized
- [x] Images optimized (if added later)
- [x] Loading states implemented
- [x] Error boundaries active
- [x] Proper cache headers
- [x] Sitemap for SEO
- [x] robots.txt configured

---

## 🐛 Troubleshooting

### Build Fails on Vercel

**Problem**: Build fails with "Module not found"
**Solution**:
```bash
# Clear cache and rebuild locally
rm -rf .next node_modules
npm install
npm run build

# If successful, push to GitHub and retry Vercel deploy
```

**Problem**: TypeScript errors during build
**Solution**:
```bash
# Check types locally
npm run type-check

# Fix any errors, commit, push
```

### Database Connection Issues

**Problem**: "Database connection failed"
**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` correct
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` correct
3. Check Supabase project status (not paused)
4. Verify RLS policies not blocking requests

### Cron Jobs Not Running

**Problem**: Cron jobs return 401 Unauthorized
**Solution**:
1. Verify `CRON_SECRET` set in Vercel
2. Check Vercel logs for actual error
3. Verify cron endpoints have proper auth check

### Auth Issues

**Problem**: Users can't register/login
**Solution**:
1. Supabase Dashboard > Authentication > Settings
2. Enable Email provider
3. Configure Site URL: `https://pricehunt-indonesia.vercel.app`
4. Add redirect URLs for auth callbacks

---

## 📊 Monitoring After Deploy

### Daily Checks (First Week)
- [ ] Check Vercel error logs
- [ ] Verify cron jobs running
- [ ] Check database usage (Supabase dashboard)
- [ ] Monitor API response times
- [ ] Check user signups/activity

### Weekly Checks
- [ ] Review analytics data
- [ ] Check database size growth
- [ ] Review error patterns
- [ ] Verify email delivery (Resend)
- [ ] Check API rate limits

---

## 🚀 Going Live

### Soft Launch
1. Deploy to production
2. Test all features yourself
3. Invite beta testers (friends/colleagues)
4. Fix any critical issues
5. Monitor for 1-2 days

### Public Launch
1. Announce on social media
2. Submit to directories:
   - ProductHunt
   - Hacker News (Show HN)
   - Reddit /r/Indonesia
   - Kaskus
3. Monitor traffic spikes
4. Scale up Supabase if needed

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## ✅ Final Deployment Command Summary

```bash
# 1. Link Supabase production
supabase link --project-ref [your-project-id]

# 2. Push migrations
supabase db push

# 3. Generate types
supabase gen types typescript --linked > src/lib/supabase/types.ts

# 4. Verify build
npm run build

# 5. Deploy to Vercel (via dashboard or CLI)
vercel --prod

# 6. Test health
curl https://your-domain.vercel.app/api/health
curl https://your-domain.vercel.app/api/health/db
```

---

**Ready to deploy?** Follow steps 1-9 above. Good luck! 🚀

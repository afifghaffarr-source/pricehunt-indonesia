# 🤖 Kiro Quick Reference - PriceHunt Indonesia

Generated: $(date '+%Y-%m-%d %H:%M')

---

## 🚀 Quick Commands

```bash
# Development
cd ~/projects/pricehunt-indonesia
bun run dev              # Start dev server (localhost:3000)
bun run build            # Production build
bun run test             # Run 59 tests
bun run test:watch       # Watch mode
bun run lint             # ESLint check

# Python Collectors
cd collectors
python tokopedia_collector.py --category electronics --limit 50
python shopee_collector.py --category fashion --limit 30
```

---

## 📁 Important Directories

**Core Business Logic:**
- `src/lib/deal-score.ts` - 6-factor deal scoring (0-100)
- `src/lib/fake-discount.ts` - Fraud detection engine
- `src/lib/buy-or-wait.ts` - Buy/wait recommendation
- `src/lib/total-cost-calculator.ts` - Real cost calculation

**API Routes:**
- `src/app/api/recommendation/` - Deal score, fake discount, buy-or-wait
- `src/app/api/products/` - Product CRUD
- `src/app/api/vexo/` - VexoAPI integration
- `src/app/api/cron/` - Scheduled jobs

**Components:**
- `src/components/ai/` - AI Advisor, Deal Verdict
- `src/components/product/` - ProductCard, PriceTable, Chart
- `src/components/search/` - SearchBar, Filters

**Server Actions:**
- `src/app/actions/admin.ts` - Admin operations
- `src/app/actions/auth.ts` - Authentication
- `src/app/actions/data.ts` - Data operations

---

## 🎯 Common Tasks via Kiro

### Development

**"Setup development environment"**
→ Install dependencies, setup .env, run migrations

**"Run tests"**
→ Execute Vitest test suite (59 tests)

**"Check TypeScript errors"**
→ Run `tsc --noEmit`

**"Add new API endpoint"**
→ Create route.ts with proper error handling

**"Add new component"**
→ Create component with TypeScript types

### Features

**"Test deal score calculation"**
→ Run deal-score.test.ts atau manual calculate

**"Test fake discount detector"**
→ Run fake-discount.test.ts atau manual test

**"Check database schema"**
→ Read supabase/migrations/001_initial_schema.sql

**"Update product price"**
→ Use admin action atau API endpoint

### Debugging

**"Check build errors"**
→ Clear .next cache, rebuild

**"Test database connection"**
→ Verify Supabase credentials

**"Check API health"**
→ curl http://localhost:3000/api/health

**"View recent cron job logs"**
→ Query job_logs table

### Deployment

**"Deploy to production"**
→ Push to GitHub, Vercel auto-deploys

**"Check production status"**
→ Visit Vercel dashboard

**"Update environment variables"**
→ Vercel settings → Environment Variables

---

## 🧠 Core Concepts

### Deal Score Engine (6 Factors)

1. **Price Discount (35%)** - Current vs 90-day median
2. **Price Percentile (20%)** - Position in historical range
3. **Seller Trust (15%)** - Rating & review count
4. **Official Store (10%)** - Verified seller bonus
5. **Stock Confidence (10%)** - Availability status
6. **Promotions (10%)** - Vouchers, free shipping

**Output:** 0-100 score with label (Beli sekarang, Harga bagus, Tunggu turun, etc.)

### Fake Discount Detection

**Red Flags:**
- Original price inflated >50% vs median
- Discount >70% (too good to be true)
- Recent price spike before discount
- Original price above historical max

**Output:** Status (legitimate, suspicious, likely_fake) + confidence score

### Buy or Wait Recommendation

**Factors:**
- Deal score threshold (>70 = buy)
- Fake discount status
- Campaign timing (sale events)
- Stock availability
- Price trend prediction

**Output:** Action (buy_now, wait, hold_off) with reasoning

---

## 🗄️ Database Schema (Simplified)

**Main Tables:**
- `products` - Product catalog (slug, name, category, specs)
- `marketplaces` - Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok
- `prices` - Current prices per marketplace
- `price_history` - Historical daily prices
- `user_profiles` - User data (preferences, admin flag)
- `wishlists` - Saved products
- `price_alerts` - Price drop notifications

**Relationships:**
- Product → Prices (1:N, one per marketplace)
- Product → Price History (1:N, daily records)
- User → Wishlists (N:M via junction)
- User → Price Alerts (1:N)

---

## 🔐 Authentication

**Supabase Auth:**
- Email/password signup
- Email confirmation (disable di dev)
- Row Level Security (RLS) policies
- Admin bypass via service role

**Check Admin:**
```typescript
const { data } = await supabase
  .from('user_profiles')
  .select('preferences')
  .eq('id', userId)
  .single();

const isAdmin = data?.preferences?.is_admin === true;
```

---

## 🛠️ Tech Stack Quick Ref

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Package Manager | Bun |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | OpenAI gpt-4o-mini |
| Testing | Vitest |
| Deployment | Vercel |
| Scraping | Python + Playwright |

---

## 📊 Project Stats

- **Files**: 187 TypeScript files
- **Components**: 55 React components
- **Tests**: 59 (100% passing)
- **API Endpoints**: 21+
- **Marketplaces**: 6 Indonesian platforms
- **Status**: Production-Ready MVP

---

## 🔍 Debugging Checklist

When something breaks:

1. **Check TypeScript**: `tsc --noEmit`
2. **Check Tests**: `bun run test`
3. **Check Logs**: Vercel dashboard or console.log
4. **Check Database**: Supabase dashboard
5. **Check Environment**: .env.local variables
6. **Clear Cache**: `rm -rf .next && bun run build`

---

## 💡 Best Practices

1. **Server Components First** - Use `'use client'` only when needed
2. **Type Everything** - No `any`, strict TypeScript
3. **Indonesian Text** - All UI text in Bahasa Indonesia
4. **Mobile-First** - Majority users on mobile
5. **Rate Limit AI** - Expensive operations need protection
6. **Test Core Logic** - Business logic must have tests
7. **Revalidate Paths** - After mutations, revalidate cache
8. **Admin Client Carefully** - Service role bypasses RLS

---

## 🚨 Common Pitfalls

1. **Next.js 16 Changes** - Read AGENTS.md, APIs different from training
2. **Cron Jobs** - Only work in Vercel production, not localhost
3. **Service Worker** - Disabled in dev, active in production
4. **RLS Policies** - Check policies if data not showing
5. **VexoAPI Optional** - App works without it (DB only)
6. **Bun vs npm** - Use Bun commands, not npm

---

## 📞 Quick Help

Ask Kiro:
- "Explain deal score calculation"
- "How to add new marketplace"
- "Fix TypeScript error in [file]"
- "Test fake discount for [product]"
- "Deploy to production"
- "Check why tests failing"
- "Add new API endpoint for [feature]"

Load skill: `hermes skills view pricehunt-development`

---

**Made with ❤️ for Indonesian shoppers**

# Extension Beta Monitoring Tools

Koleksi SQL queries untuk monitoring beta testing Chrome Extension BijakBeli v2.0.2+

## 📂 Files

### 1. `quick_check_extension.sql` ⚡
**Quick 30-second daily health check**

**What it shows:**
- 📊 Collection stats (24h, 7d, all-time)
- 🎯 Matching success rate
- 📈 Activity metrics
- 🏥 Health status + recommendations
- 📝 Last 5 collections

**When to use:** Daily check (pagi atau sore)

**Expected output:**
```
📊 EXTENSION BETA - QUICK CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 COLLECTIONS: 23 total | 15 last 7d | 5 last 24h
🎯 MATCHING: 19 matched (visible) | 4 orphaned | 82.6% success rate
📈 ACTIVITY: 18 unique products | 5 active days (7d) | Last: 13/06 10:45
🏥 HEALTH: 🟢 EXCELLENT - Everything working great!
💡 ACTION: → All good! Keep monitoring daily 🎉
```

---

### 2. `monitor_extension_beta.sql` 📊
**Comprehensive dashboard (5+ sections)**

**What it shows:**
1. 📊 Overview (totals, rates, last activity)
2. 🏪 Per-marketplace breakdown
3. 📝 Recent 10 collections
4. ⚠️ Top 5 orphaned offers
5. 📈 Hourly activity heatmap (24h)
6. 🏥 Health check + recommendations

**When to use:** 
- Weekly deep-dive
- Troubleshooting issues
- Progress reporting
- End of beta phase analysis

**Output:** ~50 rows formatted report

---

## 🚀 Usage

### Via Supabase SQL Editor (Recommended)

1. **Login ke Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/oklaxwjoyttpwgxhphko
   ```

2. **Navigate ke SQL Editor:**
   - Left sidebar → SQL Editor
   - Click "New query"

3. **Copy-paste query:**
   - Daily: Use `quick_check_extension.sql`
   - Weekly: Use `monitor_extension_beta.sql`

4. **Run query:**
   - Click "Run" button
   - Wait 1-3 seconds
   - Review results

5. **Export (optional):**
   - Click "Download CSV" untuk save report
   - Atau screenshot untuk sharing

---

### Via psql CLI

```bash
# Connect to Supabase
psql "postgresql://postgres.oklaxwjoyttpwgxhphko:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Run quick check
\i scripts/quick_check_extension.sql

# Or run full dashboard
\i scripts/monitor_extension_beta.sql
```

---

## 📊 Interpreting Results

### Health Status Colors

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| 🟢 EXCELLENT | Collections active, match rate >80% | Keep going! |
| 🟡 GOOD | On track, minor improvements | Monitor closely |
| 🟠 FAIR | Collections OK, matching issues | Add more products |
| 🔴 INACTIVE | No recent activity | Contact beta testers |
| ⚪ NO DATA | Extension not used yet | Share link to testers |

---

### Match Rate Benchmarks

| Rate | Grade | Action |
|------|-------|--------|
| >80% | 🟢 Excellent | Matching algorithm works great |
| 60-80% | 🟡 Good | Acceptable, room for improvement |
| 40-60% | 🟠 Fair | Need more products in database |
| <40% | 🔴 Poor | Critical: review matching logic |

---

### Collection Rate Targets

| Metric | Phase | Target |
|--------|-------|--------|
| Collections/day | Beta Week 1 | 5+ |
| Collections/day | Beta Week 2-3 | 10+ |
| Collections/day | Pre-launch | 20+ |
| Total products | Beta end goal | 50+ |
| Unique products | Beta end goal | 40+ |

---

## 🔧 Troubleshooting

### "No data" or empty results

**Cause:** Extension belum dipakai atau data belum masuk database

**Check:**
```sql
-- Verify offers table exists and has data
SELECT COUNT(*) FROM offers WHERE source = 'extension_snapshot';
```

**If 0:** Extension belum ada yang pakai. Share link ke beta testers.

---

### High orphaned rate (>30%)

**Cause:** Products belum ada di database

**Solution:**
```sql
-- List top orphaned titles
SELECT 
  title,
  COUNT(*) as count
FROM offers
WHERE source = 'extension_snapshot'
  AND product_id IS NULL
GROUP BY title
ORDER BY count DESC
LIMIT 10;
```

**Action:** Create products untuk title yang paling sering muncul.

---

### No collections in 24h

**Possible causes:**
1. Beta testers inactive
2. Extension error (check browser console)
3. API down (check Vercel logs)

**Action:**
1. Contact beta testers via Telegram/WhatsApp
2. Ask for browser console logs
3. Test extension yourself on live site

---

## 📅 Recommended Monitoring Schedule

### Daily (5 minutes)
- Run `quick_check_extension.sql`
- Check health status
- Review recent collections
- Take action if red/orange status

### Weekly (15 minutes)
- Run `monitor_extension_beta.sql`
- Review per-marketplace breakdown
- Analyze orphaned offers
- Create missing products
- Generate progress report

### End of Beta (1 hour)
- Run full dashboard
- Export results to CSV
- Calculate success metrics
- Prepare launch decision
- Thank beta testers

---

## 🎯 Beta Success Criteria

Extension ready for public launch when:

✅ **Volume:** 50+ products collected  
✅ **Quality:** 80%+ match rate (7-day average)  
✅ **Stability:** No critical bugs for 7 days  
✅ **Coverage:** 3 marketplaces represented  
✅ **Engagement:** 3+ beta testers active  

---

## 📚 Related Scripts

- `auto_match_offers.py` - Hourly cron matching
- `cron_auto_match.sh` - Cron wrapper with logging
- `monitor_beta.sh` - Bash version (terminal output)
- `generate_test_offers.py` - Test data generator

---

## 🐛 Known Issues

### v2.0.2 (Current)
- ✅ All critical bugs fixed
- ✅ CORS issue resolved
- ✅ Database constraint fixed
- ✅ Production ready

### Previous versions
- ❌ v2.0.0: CORS error (broken)
- ❌ v2.0.1: Database constraint error (broken)

---

## 📞 Support

**Issues with queries:**
- Check Supabase connection
- Verify database schema matches migration 114
- Ensure `source = 'extension_snapshot'` in offers table

**Issues with extension:**
- Check `/extension` page for latest version
- Verify ingestion secret in extension config
- Review browser console for errors

**Database access:**
- Supabase URL: `https://oklaxwjoyttpwgxhphko.supabase.co`
- Use service role key for admin queries
- Tables: `offers`, `products`, `marketplaces`

---

## 📝 Change Log

### 2026-06-13
- ✅ Created `quick_check_extension.sql` (daily check)
- ✅ Created `monitor_extension_beta.sql` (full dashboard)
- ✅ Added comprehensive README with usage guide

### Future Enhancements
- [ ] Automated daily email reports
- [ ] Slack/Telegram notifications for health changes
- [ ] Web-based dashboard (future)
- [ ] Real-time WebSocket updates (future)

---

**Last Updated:** 2026-06-13  
**Extension Version:** v2.0.2-beta  
**Status:** Production Ready ✅

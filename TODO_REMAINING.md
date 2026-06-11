# 📋 BijakBeli.app - TODO List (Remaining Work)

**Date:** 2026-06-12  
**Status:** Core rebranding complete, infrastructure cleanup needed

---

## ✅ COMPLETED (2026-06-12)

- [x] Source code rebranding (94 files)
- [x] Auth pages (login/register)
- [x] Extension files (popup.html, popup.js)
- [x] Tools & collectors rebranding
- [x] 13 autonomous agents active
- [x] 3 new agents added
- [x] All tests passing (215/215)
- [x] Git commits pushed
- [x] Documentation created
- [x] API health verified ✅

---

## ⏳ TODO - Infrastructure Cleanup

### 🔥 HIGH PRIORITY (Do Today)

#### 1. ⚠️ Vercel Environment Variable (5 min)
**Why:** Metadata og:url still shows old URL  
**Impact:** SEO & social sharing  
**Action:**
```
1. Login: https://vercel.com/afifghaffarr-source/pricehunt-indonesia
2. Settings → Environment Variables
3. Update: NEXT_PUBLIC_APP_URL = https://www.bijakbeli.app
4. Click "Redeploy"
```
**Status:** ⏳ Waiting for manual action

#### 2. 🧪 Test Extension After Updates (15 min)
**What Changed:** popup.html, popup.js, API URLs  
**Action:**
```
1. Load unpacked extension in Chrome
2. Test product search on Tokopedia/Shopee
3. Verify API calls to www.bijakbeli.app
4. Check BijakBeli branding shows correctly
```
**Status:** ⏳ Not tested yet

#### 3. 🔍 End-to-End Testing (30 min)
**What to Test:**
```
✓ Homepage loads (www.bijakbeli.app)
✓ Search works
✓ Product details page
✓ Price history charts
✓ Buy/Wait recommendations
✓ Fake discount detection
✓ User authentication (login/register)
✓ Price alerts (create/delete)
```
**Status:** ⏳ Not tested after rebranding

---

### 🟡 MEDIUM PRIORITY (This Week)

#### 4. 📦 Rename GitHub Repository (10 min)
**Current:** `pricehunt-indonesia`  
**Target:** `bijakbeli-app`  
**Action:**
```bash
# On GitHub:
1. Go to: https://github.com/afifghaffarr-source/pricehunt-indonesia/settings
2. Repository name → bijakbeli-app
3. Click "Rename"

# Update local remote:
cd ~/projects/bijakbeli-app
git remote set-url origin git@github.com:afifghaffarr-source/bijakbeli-app.git
git remote -v  # Verify
```
**Status:** ⏳ Optional but recommended

#### 5. 🔗 Rename Vercel Project (5 min)
**Current:** `pricehunt-indonesia`  
**Target:** `bijakbeli-app`  
**Action:**
```
1. Go to: https://vercel.com/dashboard
2. Select project
3. Settings → General → Project Name
4. Change to: bijakbeli-app
```
**Status:** ⏳ Optional

#### 6. 🎯 Rename Hermes Skills (20 min)
**Current Skills:**
```
~/.hermes/skills/pricehunt/
├── pricehunt-backend-dev
├── pricehunt-bug-hunter
├── pricehunt-development  ← Used by 3 agents
├── pricehunt-doc-writer
├── pricehunt-frontend-dev
└── pricehunt-test-engineer
```

**Action:**
```bash
# Rename skill folders
mv ~/.hermes/skills/pricehunt ~/.hermes/skills/bijakbeli
mv ~/.hermes/skills/pricehunt-development ~/.hermes/skills/bijakbeli-development

# Update agents that reference pricehunt-development:
# - QA Monitor
# - Performance Tracker
# - Collector Health
```
**Status:** ⏳ Optional (agents still work with current names)

---

### 🟢 LOW PRIORITY (Future)

#### 7. 👤 Rename Agent Profiles (Optional)
**Current Profiles:**
```
~/.hermes/profiles/pricehunt-orchestrator
~/.hermes/profiles/pricehunt-frontend
~/.hermes/profiles/pricehunt-backend
~/.hermes/profiles/pricehunt-devops
~/.hermes/profiles/pricehunt-qa
```
**Target:** Rename to `bijakbeli-*`  
**Status:** ⏳ Low priority, profiles work fine

#### 8. 📊 Analytics Integration
**Ideas:**
- Google Analytics for www.bijakbeli.app
- User behavior tracking
- Conversion metrics
**Status:** 💡 Future enhancement

#### 9. 🎨 UI/UX Improvements
**Ideas:**
- Mobile responsiveness review
- Loading states
- Error handling UX
- Dark mode support
**Status:** 💡 Future enhancement

#### 10. 📱 Mobile App
**Ideas:**
- React Native app
- Push notifications for price alerts
**Status:** 💡 Future project

---

## 🎯 TODAY'S PLAN (2026-06-12)

### Morning (Now - 12:00)
```
1. ✅ Vercel env var update (5 min)
2. 🧪 Test extension (15 min)
3. 🔍 End-to-end testing (30 min)
4. 📦 Rename GitHub repo (10 min)
5. 🔗 Rename Vercel project (5 min)

Total: ~65 minutes
```

### Afternoon (12:00 - 18:00)
```
6. 🎯 Rename Hermes skills (20 min)
7. 📝 Update agents to use new skill names (15 min)
8. 🧹 Clean up old symlinks if needed (5 min)
9. 📊 Create project status dashboard (30 min)

Total: ~70 minutes
```

### Evening (18:00 - 23:00)
```
10. 📖 Write user documentation
11. 🎥 Create demo video/screenshots
12. 📢 Prepare launch announcement

Total: Optional
```

---

## 📈 Progress Tracker

**Completion:** 85% (Core done, cleanup remaining)

| Category | Status |
|----------|--------|
| Source Code | ✅ 100% |
| Tests | ✅ 100% |
| Documentation | ✅ 100% |
| Agents | ✅ 100% |
| Infrastructure | ⏳ 60% |
| Testing | ⏳ 40% |
| Polish | ⏳ 20% |

---

## 🚀 Next Milestones

1. **Today:** Infrastructure cleanup complete
2. **This Week:** Full testing & documentation
3. **Next Week:** Marketing & user acquisition
4. **Month 1:** First 100 users
5. **Month 3:** Expand to more marketplaces

---

## 💡 Quick Wins

Easy tasks for quick progress:
- [ ] Update Vercel env var (5 min)
- [ ] Rename GitHub repo (10 min)
- [ ] Rename Vercel project (5 min)
- [ ] Test one user flow (10 min)

**Total: 30 minutes for big impact!**

---

**Last Updated:** 2026-06-12  
**Next Review:** After infrastructure cleanup complete

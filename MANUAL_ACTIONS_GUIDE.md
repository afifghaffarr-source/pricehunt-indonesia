# 🎯 BijakBeli.app - Manual Actions Guide

**Date:** 2026-06-12  
**Time Required:** 5-15 minutes  
**Priority:** HIGH (1 action), LOW (2 optional actions)

---

## ⚠️ HIGH PRIORITY (Do This Today!)

### 1. Update Vercel Environment Variable (5 minutes)

**Why:** SEO metadata still shows old URL in social sharing

**Impact:**
- ❌ Without: Social posts show `pricehunt-indonesia.vercel.app`
- ✅ With: Social posts show `www.bijakbeli.app`

**Steps:**

1. **Login to Vercel**
   - Go to: https://vercel.com/login
   - Login dengan account kamu

2. **Open Project Settings**
   - Click project: `pricehunt-indonesia`
   - Click "Settings" tab di sidebar

3. **Navigate to Environment Variables**
   - Click "Environment Variables" di sidebar
   - Look for: `NEXT_PUBLIC_APP_URL`

4. **Update the Value**
   ```
   Variable: NEXT_PUBLIC_APP_URL
   Old Value: https://pricehunt-indonesia.vercel.app
   New Value: https://www.bijakbeli.app
   
   Environment: Production ✓
   ```

5. **Save & Redeploy**
   - Click "Save"
   - Go to "Deployments" tab
   - Click "..." on latest deployment
   - Click "Redeploy"

6. **Verify (After 2-3 minutes)**
   ```bash
   curl -s https://www.bijakbeli.app/ | grep 'og:url'
   # Should show: https://www.bijakbeli.app
   ```

**Done!** ✅

---

## 🟡 OPTIONAL (Can Do Anytime)

### 2. Rename GitHub Repository (5 minutes)

**Why:** Clean naming consistency

**Impact:** Cosmetic only, everything works without this

**Steps:**

1. **Go to GitHub Settings**
   - Visit: https://github.com/afifghaffarr-source/pricehunt-indonesia
   - Click "Settings" tab

2. **Rename Repository**
   - Scroll to "Repository name"
   - Change: `pricehunt-indonesia` → `bijakbeli-app`
   - Click "Rename"

3. **Update Local Git Remote**
   ```bash
   cd ~/projects/bijakbeli-app
   git remote set-url origin git@github.com:afifghaffarr-source/bijakbeli-app.git
   git remote -v  # Verify
   ```

4. **Verify**
   ```bash
   git push origin master
   # Should work without issues
   ```

**Done!** ✅

---

### 3. Rename Vercel Project (5 minutes)

**Why:** Clean naming consistency

**Impact:** Cosmetic only, everything works without this

**Steps:**

1. **Login to Vercel**
   - Go to: https://vercel.com/login

2. **Open Project Settings**
   - Click project: `pricehunt-indonesia`
   - Click "Settings" tab

3. **Rename Project**
   - Scroll to "Project Name"
   - Change: `pricehunt-indonesia` → `bijakbeli-app`
   - Click "Save"

4. **Verify**
   - Project URL will still work
   - Production domain unchanged (www.bijakbeli.app)

**Done!** ✅

---

## ✅ Checklist

Print this and check off as you complete:

```
[ ] 1. Update Vercel NEXT_PUBLIC_APP_URL env var (5 min) - HIGH PRIORITY
[ ] 2. Redeploy Vercel after env var update (2 min)
[ ] 3. Verify og:url shows www.bijakbeli.app (1 min)

Optional:
[ ] 4. Rename GitHub repository (5 min)
[ ] 5. Update local git remote (2 min)
[ ] 6. Rename Vercel project (3 min)
```

---

## 🎯 What Happens After

### After Step 1 (Vercel Env Var):
- ✅ SEO metadata will be correct
- ✅ Social sharing will show correct URL
- ✅ Google/Facebook previews will be perfect
- ✅ 100% rebranding complete!

### After Steps 2-3 (Optional Renames):
- Clean infrastructure naming
- No functional changes
- Just cosmetic improvements

---

## 📸 Screenshots Guide

### Vercel Environment Variables:
1. Dashboard → Select Project
2. Settings (sidebar) → Environment Variables
3. Find `NEXT_PUBLIC_APP_URL`
4. Edit → Change value → Save
5. Deployments → Redeploy

### GitHub Repository Rename:
1. Repo page → Settings
2. Scroll to "Repository name"
3. Type new name → Click "Rename"

---

## ⚠️ Important Notes

1. **Vercel Redeploy Takes 2-3 Minutes**
   - Don't panic if changes aren't instant
   - Check after 3 minutes

2. **GitHub Rename is Safe**
   - GitHub creates automatic redirects
   - Old links will still work
   - No broken links

3. **No Rush on Optional Items**
   - Site works perfectly without renaming
   - Can do tomorrow, next week, or never
   - Zero functional impact

---

## 🚨 If Something Goes Wrong

### Vercel env var not updating?
- Clear browser cache
- Try incognito mode
- Wait 5 minutes for CDN propagation

### GitHub rename issues?
- Old URL redirects automatically
- Update git remote: `git remote set-url origin <new-url>`

### Need help?
- All changes are reversible
- Original values documented in VERCEL_ENV_UPDATE.md
- Can always ask me for help!

---

## 🎊 After Completion

Run this to verify everything:

```bash
# Test metadata
curl -s https://www.bijakbeli.app/ | grep 'og:url'

# Test API
curl -s https://www.bijakbeli.app/api/health | jq '.'

# Test auth pages
curl -s -o /dev/null -w "%{http_code}" https://www.bijakbeli.app/auth/login

# All should work perfectly!
```

---

**Estimated Total Time:**
- Minimum (just #1): 5 minutes
- Maximum (all 3): 15 minutes

**Difficulty:** Easy (just web UI clicks)

**Impact:** HIGH for #1, LOW for #2-3

**Status After:** 100% complete! 🎉

---

**Created:** 2026-06-12  
**Last Updated:** 2026-06-12  
**By:** Kiro (Hermes Agent)

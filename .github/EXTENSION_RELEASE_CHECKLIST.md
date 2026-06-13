# BijakBeli Extension Release Checklist

**Purpose:** Prevent broken extension releases (root cause of v2.0.0/2.0.1/2.0.2 incident)

---

## ✅ Pre-Release (Development)

- [ ] **1. Test locally in Chrome**
  - Load unpacked extension from `extension/` directory
  - Test on Tokopedia product page (e.g., https://www.tokopedia.com/example/product)
  - Test on Shopee product page (e.g., https://shopee.co.id/Product-i.123.456)
  - Test on Bukalapak product page (e.g., https://www.bukalapak.com/p/example/product)
  - Verify floating button appears
  - Click button, verify product data appears in popup
  - Click "Send to BijakBeli" and verify:
    - ✅ No CORS errors in console
    - ✅ Success notification appears
    - ✅ Data reaches database (check Supabase `raw_offers` table)

- [ ] **2. Verify manifest.json**
  - Version number incremented correctly (semantic versioning)
  - `host_permissions` includes `https://www.bijakbeli.app/*` and `https://bijakbeli.app/*`
  - No `http://localhost` URLs (common dev mistake)

- [ ] **3. Check source value in content.js**
  - Search for `source:` in API payload
  - MUST be `"extension_snapshot"` (not `"chrome-extension"` or `"collector"`)
  - This maps to confidence.ts DataSourceType and gets 82% base score

---

## 📦 Build & Package

- [ ] **4. Build extension package**
  ```bash
  cd extension/
  # Ensure no .DS_Store, node_modules, or dev files
  tar -czf ../public/downloads/bijakbeli-extension-v{VERSION}-beta.tar.gz chrome/
  ```

- [ ] **5. Compute SHA256 checksum**
  ```bash
  sha256sum public/downloads/bijakbeli-extension-v{VERSION}-beta.tar.gz
  # Copy full hash for next step
  ```

- [ ] **6. Update extension page**
  - Open `src/app/extension/page.tsx`
  - Find ALL download links (search for `.tar.gz`) — there are typically 2-3 locations:
    - Main download button (top section)
    - Bottom CTA button ("Download Extension Sekarang")
    - Changelog section link
  - Replace version number in ALL locations
  - Update SHA256 checksum display (line ~57)
  - Add new changelog entry with version badge

- [ ] **7. Remove old broken versions**
  ```bash
  # Keep ONLY the latest working version in public/downloads/
  rm public/downloads/bijakbeli-extension-v2.0.0-beta.tar.gz  # if broken
  rm public/downloads/bijakbeli-extension-v2.0.1-beta.tar.gz  # if broken
  # Keep: bijakbeli-extension-v2.0.2-beta.tar.gz (latest stable)
  ```

---

## 🧪 Staging Test (Critical!)

- [ ] **8. Extract and test the EXACT package users will download**
  ```bash
  cd /tmp/
  tar -xzf /path/to/bijakbeli-extension-v{VERSION}-beta.tar.gz
  # Load unpacked extension from extracted /tmp/chrome/ directory
  ```

- [ ] **9. Repeat all functional tests from Step 1**
  - This catches packaging issues (missing files, wrong paths, etc.)

- [ ] **10. Test on clean browser profile**
  - Create new Chrome profile
  - Install extension from package
  - Test full flow (never assume "it worked on my dev profile")

---

## 🚀 Deploy

- [ ] **11. Commit and push**
  ```bash
  git add extension/ public/downloads/ src/app/extension/page.tsx
  git commit -m "release(extension): v{VERSION} - {brief description}"
  git push origin main
  ```

- [ ] **12. Wait for Vercel deployment**
  - Check Vercel dashboard for successful deploy
  - Visit https://www.bijakbeli.app/extension
  - Verify new version number appears
  - Test download link works (returns correct file)

- [ ] **13. Verify download on production**
  ```bash
  # Download from production URL
  curl -O https://www.bijakbeli.app/downloads/bijakbeli-extension-v{VERSION}-beta.tar.gz
  # Verify checksum matches
  sha256sum bijakbeli-extension-v{VERSION}-beta.tar.gz
  ```

---

## 📢 Post-Release

- [ ] **14. Notify beta testers**
  - Message format:
    ```
    🚀 BijakBeli Extension v{VERSION} Available!
    
    What's new:
    - {changelog bullets}
    
    Download: https://www.bijakbeli.app/extension
    SHA256: {full checksum}
    
    If you have v{OLD_VERSION}, please update to avoid [issue description].
    ```

- [ ] **15. Monitor for issues**
  - Check Supabase `raw_offers` table for new extension submissions (source = 'extension_snapshot')
  - Check browser console for errors (ask beta testers to share screenshots)
  - Watch Telegram/support channels for bug reports

- [ ] **16. Update memory if new pitfalls discovered**
  - Add to USER.md or MEMORY.md if repeatable issue found
  - Update this checklist with new steps if process gap identified

---

## 🆘 Rollback Plan (If Release is Broken)

1. **Immediately remove broken package:**
   ```bash
   rm public/downloads/bijakbeli-extension-v{BROKEN_VERSION}-beta.tar.gz
   git add public/downloads/
   git commit -m "hotfix: remove broken extension v{BROKEN_VERSION}"
   git push
   ```

2. **Restore links to last known working version:**
   - Edit `src/app/extension/page.tsx`
   - Change ALL download links back to previous working version
   - Update changelog to mark broken version as "DO NOT USE"

3. **Notify users immediately:**
   ```
   ⚠️ URGENT: Extension v{BROKEN_VERSION} has critical bugs
   
   Please DO NOT download v{BROKEN_VERSION}.
   Use v{WORKING_VERSION} instead: https://www.bijakbeli.app/extension
   
   If you already installed v{BROKEN_VERSION}:
   1. Remove it from chrome://extensions/
   2. Download v{WORKING_VERSION}
   3. Install fresh
   
   We're working on a fix. Sorry for the inconvenience!
   ```

---

## 📋 Version History Reference

| Version | Status | Issue | Fix |
|---------|--------|-------|-----|
| v2.0.0 | 🔴 BROKEN | CORS error (wrong host_permissions) | v2.0.1 |
| v2.0.1 | 🔴 BROKEN | DB constraint (source='chrome-extension' not in enum) | v2.0.2 |
| v2.0.2 | ✅ STABLE | Message passing + correct source value | Current |

---

## 🎓 Lessons Learned

**Root Cause of 3-Versions-in-24h Incident:**
1. ❌ No staging test with packaged .tar.gz
2. ❌ No clean browser profile test
3. ❌ Multiple download links not updated consistently
4. ❌ Old broken versions not removed from public/downloads/
5. ❌ No rollback plan documented

**Prevention:**
- ✅ This checklist (mandatory for all releases)
- ✅ Staging test with EXACT user package
- ✅ Search ALL download links in code before deploy
- ✅ Keep only 1 version in downloads/ (latest stable)

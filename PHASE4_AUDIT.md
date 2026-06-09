# Phase 4: Extension + Notification - AUDIT

## Current Status: 50% Complete

### What Exists

#### 1. Price Alert Email ✅ (Complete)
**File:** `src/lib/email.ts`

**Status:** Production-ready
- Uses admin client properly
- Checks active price alerts
- Sends email when target price reached
- Updates alert status (triggered_at, is_active)
- HTML email with proper formatting
- Uses Resend API
- Proper error handling

**What's Good:**
- Clean separation of concerns
- Safe SQL operations with admin client
- User data fetched securely
- Email template is readable

#### 2. Chrome Extension (Partial Implementation)
**Files:**
- `extension/manifest.json` ✅
- `extension/popup.js` ✅
- `extension/content.js` ⚠️
- `extension/popup.html` ❌ MISSING
- Extension icons ❌ MISSING

**manifest.json Status:**
- ✅ Manifest v3
- ✅ Permissions: activeTab, storage
- ✅ Host permissions for PriceHunt domain
- ✅ Content scripts for 5 marketplaces:
  - Tokopedia
  - Shopee
  - Bukalapak
  - Lazada
  - Blibli
- ❌ Icons referenced but files don't exist

**popup.js Status:**
- ✅ Secure DOM manipulation (textContent, not innerHTML)
- ✅ Calls PriceHunt API
- ✅ formatRupiah helper
- ✅ Error states handled
- ✅ Sanitizes user input
- ✅ Shows lowest price
- ✅ Lists products from API
- ⚠️ Only shows prices, no buy/wait recommendation
- ⚠️ Doesn't use content.js extracted data
- ⚠️ Reads tab.title directly instead

**content.js Status:**
- ⚠️ Extracts product name and price from page
- ⚠️ Supports Tokopedia and Shopee selectors
- ⚠️ Falls back to document.title for others
- ❌ Sends message to runtime but no background.js to receive
- ❌ Not integrated with popup.js
- ❌ Selectors might be outdated

**What's Missing:**
- popup.html (referenced in manifest but doesn't exist)
- background.js or service worker
- Extension icons (16x16, 48x48, 128x128)
- Buy/wait recommendation in extension
- Better content.js integration
- Price comparison with current page

#### 3. Push Notification (Done in Phase 1)
**Files:**
- `src/components/common/PushNotificationButton.tsx` ✅
- `src/app/api/push/subscribe/route.ts` ✅
- `public/sw.js` ✅

**Status:** Should be working from Phase 1 implementation.

**Need to verify:**
- Service worker push event handler
- VAPID keys setup
- Subscription storage in preferences
- Unsubscribe flow

---

## What's Missing for 100% Complete

### 1. Email Digest (CRITICAL - 0% done)

**From AGENTS.md BAGIAN 22:**

Email digest should include:
- Wishlist products with price drops
- Alerts that reached target
- Buy/wait recommendations
- Top deals of the week
- Fake discount warnings (if any)

**Requirements:**
- Don't make it too long
- Use natural Indonesian copy
- Fetch from wishlists table
- Use buy-or-wait logic
- Use fake-discount detection
- Send via Resend API

**Current Status:** ❌ NOT IMPLEMENTED

Only price alert email exists. Email digest function completely missing.

---

### 2. Extension Realistic Upgrade

**From AGENTS.md BAGIAN 21:**

Extension MVP should:
1. ✅ Don't mock if can use API (already using real API)
2. ⚠️ Read product title (using tab.title, could be better)
3. ❌ Read current page price (not implemented)
4. ✅ Send query to PriceHunt API (working)
5. ✅ Show alternative prices (working)
6. ❌ Show buy/wait recommendation (not implemented)
7. ✅ Use textContent (security good)
8. ⚠️ Error states (partial)
9. ❌ No CSP violations (need to verify)

**Missing Files:**
- `extension/popup.html` (manifest references it)
- `extension/background.js` or service worker
- Icon files: icon16.png, icon48.png, icon128.png

**Improvements Needed:**
- Add popup.html with proper styling
- Show buy/wait recommendation from API
- Better integration with content.js
- Add icons or placeholder
- Improve error messages

---

## Priority Execution Plan

### Priority 1: Email Digest ⚠️ HIGH
**Why:** Completely missing, critical user feature from AGENTS.md

**Tasks:**
1. Create `sendEmailDigest()` function in email.ts
2. Fetch user wishlist with price drops
3. Fetch triggered alerts
4. Get top deals from products table
5. Call buy-or-wait API for recommendations
6. Call fake-discount API for warnings
7. Build HTML email template
8. Use Resend to send
9. Add to cron/digest route

**Estimated complexity:** Medium-High
**Impact:** High (key retention feature)

---

### Priority 2: Extension popup.html ⚠️ MEDIUM
**Why:** Referenced in manifest but doesn't exist, extension won't work

**Tasks:**
1. Create extension/popup.html
2. Add basic styling
3. Reference popup.js properly
4. Test in Chrome
5. Add loading/error/success states

**Estimated complexity:** Low
**Impact:** High (extension currently broken)

---

### Priority 3: Extension Buy/Wait Recommendation ⚠️ MEDIUM
**Why:** Extension shows prices but no decision guidance

**Tasks:**
1. Call /api/recommendation/buy-or-wait from popup.js
2. Show recommendation in popup
3. Add visual indicator (✅ Beli, ⏳ Tunggu, etc.)
4. Link to product detail for full analysis

**Estimated complexity:** Low
**Impact:** Medium (improves extension UX)

---

### Priority 4: Extension Icons ⚠️ LOW
**Why:** Visual polish, not critical for function

**Tasks:**
1. Create placeholder icon files or note they're needed
2. Basic 16x16, 48x48, 128x128 PNGs
3. Or document that designer should provide

**Estimated complexity:** Low (if placeholder) / Medium (if designed)
**Impact:** Low (cosmetic)

---

### Priority 5: Push Notification Verification ⚠️ LOW
**Why:** Should already work from Phase 1, just verify

**Tasks:**
1. Check service worker push event
2. Verify VAPID setup in env
3. Test subscribe/unsubscribe flow
4. Document what works

**Estimated complexity:** Low
**Impact:** Low (already implemented)

---

## Success Criteria

Phase 4 will be 100% complete when:

✅ Email digest function exists and works
- Sends weekly digest with wishlist drops
- Includes buy/wait recommendations
- Shows top deals
- Warns about fake discounts

✅ Extension functional
- popup.html exists
- Shows prices from API
- Shows buy/wait recommendation
- Error states work
- Can be loaded in Chrome

✅ Extension has icons
- At least placeholder icons
- Or clear documentation needed

✅ Push notification verified
- Service worker handles push events
- VAPID keys documented
- Subscribe/unsubscribe tested

✅ Documentation complete
- PHASE4_COMPLETE.md created
- All features documented
- Known limitations noted

---

## Notes

**Email Digest** is the biggest gap. This is a key retention feature that was specified in AGENTS.md but hasn't been implemented yet. It should:
- Be triggered by cron/digest
- Send to users who opted in
- Include personalized content
- Not spam (weekly or on-demand)

**Extension** is partially working but missing critical files (popup.html). The architecture is sound, just needs completion.

**Push Notification** should be working from Phase 1 but needs verification that all pieces are connected.

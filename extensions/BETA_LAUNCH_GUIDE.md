# 🚀 BijakBeli Chrome Extension - Beta Launch Guide

**Version:** 2.0.0-beta  
**Release Date:** 2026-06-12  
**Package:** `bijakbeli-extension-v2.0.0-beta.tar.gz` (14 KB)  

---

## 📦 What's Inside

**BijakBeli Product Collector** - One-click product data collection from Indonesian marketplaces.

**Supported Marketplaces:**
- ✅ Tokopedia
- ✅ Shopee
- ✅ Bukalapak

**Features:**
- 🎯 One-click product capture via floating button
- 📊 Automatic price tracking
- 🔔 Browser notifications
- 📝 Collection history
- ⚡ Instant sync to BijakBeli.app

---

## 🎯 Beta Test Goals

**We need your help to:**
1. Test extension stability across different product pages
2. Validate data extraction accuracy
3. Identify edge cases and bugs
4. Collect initial product dataset (target: 50+ products)

**Expected time commitment:** 10-15 minutes

---

## 📥 Installation Instructions

### **Step 1: Download Extension**

**Package location (VPS):**
```
/home/ubuntu/projects/bijakbeli-app/extensions/bijakbeli-extension-v2.0.0-beta.tar.gz
```

**Download via SCP:**
```bash
scp ubuntu@10.11.0.7:/home/ubuntu/projects/bijakbeli-app/extensions/bijakbeli-extension-v2.0.0-beta.tar.gz ~/Downloads/
```

**Extract:**
```bash
cd ~/Downloads
tar -xzf bijakbeli-extension-v2.0.0-beta.tar.gz
```

---

### **Step 2: Install in Chrome**

1. **Open Chrome Extensions page:**
   - Navigate to: `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle switch in top-right corner

3. **Load Extension:**
   - Click "Load unpacked" button
   - Navigate to extracted `chrome/` folder
   - Click "Select Folder"

4. **Verify Installation:**
   - ✅ "BijakBeli Product Collector" appears in extension list
   - ✅ 📦 Icon visible in Chrome toolbar

---

### **Step 3: Configure Extension**

1. **Click extension icon** 📦 in toolbar

2. **Enter settings:**
   - **API URL:** `https://www.bijakbeli.web.id` (pre-filled)
   - **Ingestion Secret:** `[BETA_TESTERS_GET_THIS_FROM_ADMIN]`

3. **Click "Save Configuration"**

4. **Verify status:** Should show "✅ Ready"

---

## 🎮 How to Use

### **Collecting a Product (10 seconds):**

1. **Visit any product page** on supported marketplace:
   ```
   Example: https://www.tokopedia.com/xiaomiofficial/xiaomi-smart-band-8
   ```

2. **Look for floating button** (bottom-right corner):
   ```
   📦 Add to BijakBeli
   ```

3. **Click the button:**
   - ⏳ "Collecting..." (2-3 seconds)
   - ✅ "Saved!" (success)
   - 🔔 Browser notification appears

4. **Done!** Product is now in BijakBeli.app database

---

## 🧪 Beta Testing Checklist

**Test these scenarios:**

### **Basic Functionality:**
- [ ] Extension installs without errors
- [ ] Configuration saves successfully
- [ ] Button appears on Tokopedia product pages
- [ ] Button appears on Shopee product pages
- [ ] Button appears on Bukalapak product pages
- [ ] Clicking button shows "Collecting..." state
- [ ] Success notification appears after collection
- [ ] Extension icon shows collection history

### **Edge Cases:**
- [ ] Very long product titles (100+ characters)
- [ ] Products with special characters in name
- [ ] Products with multiple price variations
- [ ] Products on sale (crossed-out prices)
- [ ] Out of stock products
- [ ] Search result pages (button should NOT appear)
- [ ] Category pages (button should NOT appear)

### **Data Accuracy:**
- [ ] Product name extracted correctly
- [ ] Price captured correctly (no extra zeros)
- [ ] Image URL valid
- [ ] Product URL saved correctly

---

## 🐛 Bug Reporting

**If you find a bug, please report:**

1. **What happened:** (e.g., "Button didn't appear")
2. **Product URL:** (full URL you were visiting)
3. **Marketplace:** (Tokopedia/Shopee/Bukalapak)
4. **Browser console errors:** (F12 → Console tab → screenshot)
5. **Expected behavior:** (what should have happened)

**Report via:**
- Telegram: [Your Telegram handle]
- WhatsApp: [Your WhatsApp number]
- Email: [Your email]

---

## 📊 Success Metrics

**Beta is successful if:**
- ✅ 80%+ collection success rate
- ✅ 50+ products collected across 3 marketplaces
- ✅ <5 critical bugs reported
- ✅ Data extraction accuracy >95%

---

## 🎁 Beta Tester Rewards

**Thank you for helping us test!**

- 🏆 Early access to all BijakBeli features
- 📈 Your name in "Beta Testers" credits page
- 🎉 Free premium features when launched
- 💰 [Optional: Compensation atau gift card]

---

## 📞 Support

**Need help?**
- 📱 Telegram: [Your handle]
- 💬 WhatsApp: [Your number]
- 📧 Email: [Your email]
- 🐛 GitHub Issues: [Repo URL]

**Beta testing period:** 1 week (2026-06-12 to 2026-06-19)

---

## 🔐 Security Note

**Your Ingestion Secret:**
- Keep it private (like a password)
- Don't share publicly
- Only use official extension files
- Verify you downloaded from official source

---

## 🚀 After Beta

**If beta is successful:**
1. We'll publish to Chrome Web Store (public)
2. You'll get auto-updates
3. No need to reinstall manually
4. Your collected data stays safe

---

## ✨ Tips for Best Experience

**Collect 10+ products quickly:**
1. Open multiple product tabs (⌘+Click links)
2. Click extension button on each tab
3. All products saved in seconds!

**Keyboard shortcut (optional):**
1. Go to `chrome://extensions/shortcuts`
2. Find "BijakBeli Product Collector"
3. Set shortcut (e.g., `Ctrl+Shift+B`)
4. Press shortcut to collect instantly!

---

## 📈 What Happens to Your Data

**When you collect a product:**
1. ✅ Data sent to BijakBeli.app API
2. ✅ Saved in offers database
3. ✅ Auto-matched to existing products (hourly)
4. ✅ Trust metadata calculated
5. ✅ Displayed on product pages

**Privacy:**
- ❌ We don't track browsing history
- ❌ Extension only runs on marketplace product pages
- ❌ No personal data collected
- ✅ Only product info (title, price, URL)

---

## 🎉 Ready to Start!

**Your mission:**
1. Install extension (5 minutes)
2. Collect 5-10 products you're interested in
3. Report any bugs you find
4. Enjoy early access to BijakBeli!

**Questions?** Contact us anytime.

**Thank you for being a beta tester!** 🚀

---

**Package:** `bijakbeli-extension-v2.0.0-beta.tar.gz`  
**SHA256:** `97ef0565d645665f41702046d28f00926ba221fae88a261663c054b942c614ea`  
**Size:** 14 KB  
**Files:** 12 (manifest, scripts, icons, docs)

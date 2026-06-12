# 🚀 Quick Start Guide - BijakBeli Chrome Extension

## 📦 Isi Extension:

```
✅ manifest.json       (1.2 KB)
✅ content.js          (8.7 KB) - Main logic
✅ popup.html          (5.6 KB) - Settings UI
✅ popup.js            (2.6 KB) - UI logic
✅ styles.css          (2.5 KB) - Button styles
✅ background.js       (1.3 KB) - Notifications
✅ README.md           (6.4 KB) - Full docs
✅ icons/
   ├── icon16.png     (204 B)
   ├── icon48.png     (547 B)
   └── icon128.png    (1.5 KB)
```

**Total: 8 files** ✅

---

## 🔧 Installation (2 Minutes)

### **Step 1: Download Extension Folder**

**Option A: Via Terminal (if you have laptop access)**
```bash
# Download from VPS to laptop
scp -r ubuntu@10.11.0.7:~/projects/bijakbeli-app/extensions/chrome ~/Downloads/bijakbeli-extension
```

**Option B: Via File Manager**
- Use SFTP client (FileZilla, WinSCP)
- Download: `/home/ubuntu/projects/bijakbeli-app/extensions/chrome/`

**Option C: Clone repo if using Git**
```bash
git clone <repo-url>
cd bijakbeli-app/extensions/chrome
```

---

### **Step 2: Get Ingestion Secret**

```bash
# On VPS:
cd ~/projects/bijakbeli-app
grep INGESTION_SECRET .env.local
```

**Copy the secret value** (you'll need it in Step 4)

Example:
```
INGESTION_SECRET=your-secret-key-here-abc123xyz
```

---

### **Step 3: Install Extension in Chrome**

1. **Open Chrome**

2. **Go to Extensions page:**
   - Type in address bar: `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle switch in top-right corner

4. **Click "Load unpacked"**
   - Button appears after enabling Developer Mode

5. **Select folder:**
   - Navigate to `~/Downloads/bijakbeli-extension/chrome/`
   - Click "Select Folder"

6. **Extension installed!** 🎉
   - You should see "BijakBeli Product Collector" in extension list
   - Icon appears in Chrome toolbar

---

### **Step 4: Configure Extension**

1. **Click extension icon** 📦 in Chrome toolbar

2. **Enter configuration:**
   - **API URL**: `https://www.bijakbeli.app` (already filled)
   - **Ingestion Secret**: Paste secret from Step 2

3. **Click "Save Configuration"**

4. **Status should show: ✅ Ready**

---

## 🎯 How to Use (10 Seconds per Product)

### **Collect a Product:**

1. **Visit Tokopedia product page**
   ```
   Example: https://www.tokopedia.com/sony-audio-official/sony-wh-1000xm5-...
   ```

2. **Floating button appears** (bottom-right):
   ```
   📦 Add to BijakBeli
   ```

3. **Click button**
   - ⏳ Collecting... (2-3 seconds)
   - ✅ Saved! (product added to database)
   - 🔔 Browser notification appears

4. **Done!** Product now in BijakBeli.app database with full URL

---

## 📊 Check Results

### **In Extension:**
- Click extension icon
- See "Recent Collections" list
- Shows products you've added

### **In Database:**
```bash
# Check via API
curl https://www.bijakbeli.app/api/products | jq '.products[] | {name, url: .prices[0].url}'
```

### **In Browser:**
```
https://www.bijakbeli.app/
```

Products now have **real Tokopedia URLs**! 🎉

---

## ⚡ Power User Tips

### **Collect 10 Products in 2 Minutes:**

1. Open 10 Tokopedia product tabs
2. Click extension button on each tab (⌘+Click to keep tabs)
3. All products saved with one click per tab!

### **Keyboard Shortcut (Optional):**

Add in Chrome:
1. `chrome://extensions/shortcuts`
2. Find "BijakBeli Product Collector"
3. Set shortcut (e.g., `Ctrl+Shift+B`)

---

## 🐛 Troubleshooting

### **Button not showing?**
✅ Refresh page (F5)
✅ Make sure you're on a **product page** (not search)
✅ Check console (F12) for errors

### **"Failed" error?**
✅ Check Ingestion Secret is correct
✅ Try again (might be network issue)
✅ Check browser console for detailed error

### **"Not Configured"?**
✅ Click extension icon
✅ Enter Ingestion Secret
✅ Click Save

---

## 🎉 Success Checklist

After installation, you should have:

- [x] Extension visible in `chrome://extensions/`
- [x] Icon 📦 in Chrome toolbar
- [x] Ingestion Secret configured
- [x] Status shows "✅ Ready"
- [x] Button appears on Tokopedia product pages
- [x] Clicking button saves product successfully
- [x] Browser notification shows "Product Added!"

---

## 📁 File Location

**VPS:**
```
/home/ubuntu/projects/bijakbeli-app/extensions/chrome/
```

**Your Laptop (after download):**
```
~/Downloads/bijakbeli-extension/chrome/
```

---

## 🚀 Next Steps

After installing:

1. ✅ Collect 10 products (test dengan products yang already di database)
2. ✅ Verify URLs di database via API
3. ✅ Test Deal Finder Agent (sekarang punya URLs!)
4. ✅ Share extension dengan friends (optional)

---

## 🎯 What This Solves

**Before Extension:**
❌ VPS IP blocked by Tokopedia
❌ Manual SQL updates tedious
❌ Batch collector failed

**With Extension:**
✅ Your residential IP (not blocked!)
✅ One-click collection (no SQL)
✅ Works from office/home/anywhere
✅ "Serba mudah dan cepat" ✨

---

**Ready to collect products?** 🚀

1. Download extension folder to laptop
2. Install in Chrome
3. Configure with Ingestion Secret
4. Start collecting!

**Location:** `/home/ubuntu/projects/bijakbeli-app/extensions/chrome/`

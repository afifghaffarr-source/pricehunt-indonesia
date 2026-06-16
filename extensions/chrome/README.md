# BijakBeli Product Collector - Chrome Extension

> **One-click product collection from Indonesian marketplaces to BijakBeli.app**

"Beli yang Tepat, di Waktu yang Tepat" 🎯

---

## ✨ Features

- 🚀 **One-Click Collection**: Floating button on product pages
- 🎯 **Auto-Detection**: Automatically detects Tokopedia, Shopee, Bukalapak product pages
- 📦 **Smart Extraction**: Captures name, price, URL, image, description
- 🔄 **Direct API Integration**: Sends data straight to BijakBeli.app
- 📊 **Collection History**: Track what you've added
- 🔔 **Browser Notifications**: Real-time success/error alerts
- 📱 **Mobile-Friendly**: Responsive button on mobile browsers

---

## 🔧 Installation

### **Method 1: Load Unpacked (Development)**

1. **Open Chrome Extensions page:**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode** (toggle in top-right corner)

3. **Click "Load unpacked"**

4. **Select the extension folder:**
   ```
   ~/projects/bijakbeli-app/extensions/chrome/
   ```

5. **Extension installed!** 🎉

### **Method 2: Package & Install (Production)**

```bash
cd ~/projects/bijakbeli-app/extensions/chrome/
zip -r bijakbeli-collector.zip . -x "*.DS_Store" "README.md"
```

Then drag `bijakbeli-collector.zip` to `chrome://extensions/`

---

## ⚙️ Configuration

### **1. Get Ingestion Secret**

Get the secret from your BijakBeli `.env` file:

```bash
# On VPS
cd ~/projects/bijakbeli-app
grep INGESTION_SECRET .env
```

Or check Vercel environment variables:
```
INGESTION_SECRET=your-secret-key-here
```

### **2. Configure Extension**

1. Click extension icon in Chrome toolbar
2. Enter **Ingestion Secret**
3. Click **Save Configuration**
4. Status should show: **✅ Ready**

---

## 🚀 Usage

### **Collect a Product (3 steps)**

1. **Visit a product page** on Tokopedia, Shopee, or Bukalapak
   ```
   Example: https://www.tokopedia.com/sony-audio-official/sony-wh-1000xm5-...
   ```

2. **Click the floating "Add to BijakBeli" button** (bottom-right corner)
   - Button shows: 📦 Add to BijakBeli
   - Loading: ⏳ Collecting...
   - Success: ✅ Saved!
   - Error: ❌ Failed

3. **Product automatically saved** to BijakBeli.app database!

### **Check Collection History**

- Click extension icon in toolbar
- See "Recent Collections" list
- View count of total products collected

---

## 🎯 Supported Marketplaces

| Marketplace | Status | URL Pattern |
|-------------|--------|-------------|
| **Tokopedia** | ✅ Full Support | `tokopedia.com/store/product-slug` |
| **Shopee** | ⚠️ Basic Support | `shopee.co.id/Product-Name-i.123.456` |
| **Bukalapak** | ⚠️ Basic Support | `bukalapak.com/p/category/product` |

---

## 🔍 How It Works

### **Data Flow:**

```
Tokopedia Page
    ↓
Content Script detects product page
    ↓
User clicks "Add to BijakBeli" button
    ↓
Extract data (name, price, URL, image)
    ↓
POST to /api/ingest with INGESTION_SECRET
    ↓
BijakBeli API processes & saves to database
    ↓
Browser notification: "Product Added!"
```

### **Extraction Methods:**

**Tokopedia** (Best Support):
- Reads Apollo GraphQL cache (`__APOLLO_STATE__`)
- Fallback: DOM selectors (`data-testid` attributes)
- Captures: Name, Price, URL, Image, Description

**Shopee & Bukalapak** (Basic):
- DOM selectors for common elements
- Captures: Name, Price, URL, Image

---

## 📊 API Endpoint

### **POST `/api/ingest`**

```json
{
  "source": "chrome-extension",
  "marketplace": "tokopedia",
  "product": {
    "name": "Sony WH-1000XM5 Headphone",
    "url": "https://www.tokopedia.com/...",
    "image_url": "https://images.tokopedia.net/...",
    "description": "Wireless noise cancelling headphone..."
  },
  "price": {
    "current": 4999000,
    "marketplace": "tokopedia",
    "url": "https://www.tokopedia.com/..."
  }
}
```

**Headers:**
```
Content-Type: application/json
X-Ingestion-Secret: your-secret-key
```

---

## 🛠️ Troubleshooting

### **Button not appearing?**

✅ Check you're on a **product page** (not search/category)
✅ Refresh the page
✅ Check browser console for errors (F12)

### **"Not Configured" status?**

✅ Click extension icon
✅ Enter Ingestion Secret
✅ Click Save

### **"Failed" error?**

✅ Check Ingestion Secret is correct
✅ Check API URL: `https://www.bijakbeli.web.id`
✅ Open browser console (F12) for detailed error
✅ Verify BijakBeli API is running

### **Product not matching?**

✅ API tries to match by product name
✅ If no match, creates new product
✅ Check product name is clear & complete

---

## 🔐 Security

- ✅ INGESTION_SECRET stored locally in Chrome storage
- ✅ Never logged or exposed in UI
- ✅ HTTPS-only API calls
- ✅ No data sent to third parties
- ✅ Minimal permissions requested

---

## 📁 File Structure

```
chrome/
├── manifest.json          # Extension config (Manifest V3)
├── content.js            # Main logic (runs on product pages)
├── background.js         # Service worker (notifications)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── styles.css            # Floating button styles
├── icons/
│   ├── icon16.png       # 16×16 toolbar icon
│   ├── icon48.png       # 48×48 extension icon
│   └── icon128.png      # 128×128 Chrome Web Store icon
└── README.md            # This file
```

---

## 🚀 Development

### **Test the extension:**

1. Make changes to any file
2. Go to `chrome://extensions/`
3. Click **Reload** button under BijakBeli Collector
4. Refresh Tokopedia page to test

### **Debug:**

```javascript
// In content.js - check console logs
console.log('Product data:', productData);

// In popup.js - check popup console
console.log('History:', history);
```

---

## 🎯 Roadmap

- [ ] Enhanced Shopee & Bukalapak extraction
- [ ] Bulk collection mode (multiple products)
- [ ] Price tracking alerts
- [ ] Keyboard shortcuts
- [ ] Firefox support
- [ ] Mobile app integration

---

## 🤝 Contributing

Found a bug? Want to improve extraction?

1. Edit the relevant file
2. Test on multiple products
3. Submit changes

---

## 📄 License

Part of BijakBeli.app project

---

## 💬 Support

Issues? Questions?

- Check BijakBeli.app logs
- Verify API is running
- Check browser console for errors

---

**Built with ❤️ for BijakBeli.app**

"Beli yang Tepat, di Waktu yang Tepat" 🎯

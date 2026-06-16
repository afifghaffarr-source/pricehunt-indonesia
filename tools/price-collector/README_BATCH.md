# Batch Collection Guide

## 🎯 Quick Start

### 1. Collect URLs dari Tokopedia

**Cara cepat:**
1. Buka Tokopedia di browser
2. Search produk (contoh: "iPhone 15 Pro Max 256GB")
3. Klik produk yang **official store** atau rating tinggi
4. **Copy URL penuh** dari address bar (Ctrl+L, Ctrl+C)
5. Paste ke `urls.txt`

**URL yang benar:**
```
✅ https://www.tokopedia.com/store-name/product-name-with-long-id-123456?extParam=...&t_id=...
```

**URL yang salah:**
```
❌ https://tokopedia.com/product
❌ /product/slug
```

### 2. Edit urls.txt

```bash
cd ~/projects/bijakbeli-app/tools/price-collector
nano urls.txt
```

Tambahkan URLs, satu per line:
```txt
# Sony WH-1000XM5 (sudah ada)
https://www.tokopedia.com/sony-audio-official/sony-wh-1000xm5-...

# iPhone 15 Pro Max
https://www.tokopedia.com/ibox-official/iphone-15-pro-max-...

# Samsung S24 Ultra
https://www.tokopedia.com/samsung-official/galaxy-s24-ultra-...
```

### 3. Run Batch Collection

```bash
cd ~/projects/bijakbeli-app/tools/price-collector

# Test dulu (dry run 2 products)
head -4 urls.txt | tail -2 > test_urls.txt
./batch_collect.sh test_urls.txt

# Kalau OK, run semua:
./batch_collect.sh urls.txt
```

**Output:**
```
🚀 Starting batch collection...
📄 Reading URLs from: urls.txt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Processing (1/10): https://www.tokopedia.com/...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Playwright browser opens]
[Extracts data]
[Sends to API]

✅ Success (1/1)

⏳ Waiting 5 seconds (rate limit)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Processing (2/10): https://www.tokopedia.com/...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

### 4. Check Results

**Di Telegram:** Agent akan report hasil

**Di Database:** URLs auto-saved via API

**Verify:**
```bash
curl https://www.bijakbeli.web.id/api/products/sony-wh1000xm5 | jq '.prices[0].url'
```

## ⚠️ Important Notes

**Rate Limiting:**
- Script wait 5 detik antar products
- Total time: ~10 products × 10 seconds = 2 menit

**VPS Limitation:**
- VPS IPs mungkin di-block Tokopedia (anti-bot)
- Kalau gagal: Run dari **laptop/home** (residential IP)
- Atau: Use manual mode

**Manual Mode (if VPS blocked):**
```bash
# Run manual - browser stays open, user navigates
python collector.py manual --marketplace tokopedia
```

## 🛠️ Troubleshooting

**Error: "ERR_HTTP2_PROTOCOL_ERROR"**
- VPS IP blocked
- Solution: Run dari laptop residential IP

**Error: "INGESTION_SECRET invalid"**
- Check .env file
- Secret harus sama dengan Vercel env var

**Error: "Product not found"**
- Product matching failed
- Check title similarity
- Manual create product di admin dashboard

## 📊 Expected Results

After batch collection:
```sql
-- Check URLs populated
SELECT 
  p.name,
  COUNT(pr.id) as price_count,
  COUNT(pr.url) as url_count
FROM products p
LEFT JOIN prices pr ON pr.product_id = p.id
GROUP BY p.id, p.name
ORDER BY p.name;
```

Should show:
```
name                          | price_count | url_count
Sony WH-1000XM5 Headphone    | 3           | 3
Samsung Galaxy S24 Ultra     | 3           | 3
...
```

## 🚀 Next Steps

After URLs populated:
1. ✅ Deal Finder Agent akan detect deals dengan links
2. ✅ Price Update Agent bisa refresh data
3. ✅ Users bisa click "Beli di Tokopedia" button

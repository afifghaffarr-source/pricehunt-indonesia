import { chromium } from "playwright";

async function debugShopeeResponse() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "id-ID",
  });

  const page = await context.newPage();
  let rawData: unknown = null;

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/v4/search/search_items")) {
      try {
        const json = await response.json();
        rawData = json;
        console.log(`\n=== CAPTURED API RESPONSE ===`);
        console.log(`URL: ${url}`);
        console.log(`Total items: ${json.items?.length || 0}`);
        
        if (json.items && json.items.length > 0) {
          const first = json.items[0];
          console.log(`\n=== FIRST ITEM RAW DATA ===`);
          console.log(JSON.stringify(first.item_basic, null, 2).slice(0, 2000));
          console.log(`\n=== PRICE FIELDS ===`);
          console.log(`price: ${first.item_basic?.price}`);
          console.log(`price_min: ${first.item_basic?.price_min}`);
          console.log(`price_max: ${first.item_basic?.price_max}`);
          console.log(`price_before_discount: ${first.item_basic?.price_before_discount}`);
          console.log(`name: ${first.item_basic?.name}`);
          console.log(`stock: ${first.item_basic?.stock}`);
          console.log(`sold: ${first.item_basic?.historical_sold}`);
          console.log(`shop_location: ${first.item_basic?.shop_location}`);
          
          console.log(`\n=== ALL KEYS IN item_basic ===`);
          console.log(Object.keys(first.item_basic || {}).join(", "));
          
          if (json.items.length > 1) {
            const second = json.items[1];
            console.log(`\n=== SECOND ITEM ===`);
            console.log(`name: ${second.item_basic?.name}`);
            console.log(`price: ${second.item_basic?.price}`);
            console.log(`price_min: ${second.item_basic?.price_min}`);
          }
        }
      } catch (e) {
        console.error("Failed to parse response:", e);
      }
    }
  });

  const searchUrl = "https://shopee.co.id/search?keyword=sepatu+nike&sortBy=ctime";
  console.log(`Navigating to: ${searchUrl}`);
  
  await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  if (!rawData) {
    console.log("No API response captured! Trying scroll...");
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
}

debugShopeeResponse().catch(console.error);

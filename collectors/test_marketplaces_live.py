"""Live-test Camofox schemas for 4 marketplaces (Shopee, Bukalapak, Blibli, TikTok).

Uses CamofoxScraperPool with marketplace-aware dispatch (schema + dataclass).
This validates that the schemas in collectors/camofox_scraper.py match real
page HTML on production marketplaces.

Run with:
    export PATH="/home/ubuntu/.hermes/node/bin:$PATH"
    python3 collectors/test_marketplaces_live.py

URL discovery notes (2026-06-15):
- Shopee: direct product URLs work but search URL triggers verification wall
- Bukalapak: blocks Camofox ("Halaman ini gak bisa diakses") - hard block
- Blibli: works! Use search-derived URLs
- TikTok: heavy bot detection, search returns 0 results
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from camofox_scraper import (
    CamofoxScraperPool,
    ShopeeProduct,
    BukalapakProduct,
    BlibliProduct,
    TikTokProduct,
    MARKETPLACE_REGISTRY,
)


def _format_idr(n):
    return f"Rp{n:,}" if n else "None"


# Test URLs - canonical product pages
# Format: (marketplace_name, url, expected_keyword_in_title, dataclass)
# Each tuple: (mp, url, expected_keyword)
TEST_URLS = [
    # Blibli - real iPhone 15 from search results (verified to load)
    ("blibli", "https://www.blibli.com/p/iphone-15/ps--APF-70017-00303?ds=APF-70017-00303-00004", "iPhone", BlibliProduct),
    # Blibli - second real iPhone 15 from search
    ("blibli", "https://www.blibli.com/p/iphone-15/ps--BLS-70244-00346?ds=BLS-70244-00346-00012", "iPhone", BlibliProduct),
    # Shopee - product URL (search is blocked)
    ("shopee", "https://shopee.co.id/iPhone-15-Pro-Max-256GB-i.422946421.24562800912", "iPhone", ShopeeProduct),
    # Bukalapak - hard to find working URL; try direct
    ("bukalapak", "https://www.bukalapak.com/p/handphone/handphone-aksesoris/iphone-15-pro-max-256gb/4h8yjx-jual-iphone-15-pro-max-256gb", "iPhone", BukalapakProduct),
    # TikTok - direct product view URL
    ("tiktok", "https://shop.tiktok.com/view/product/1729436356145026067", "iPhone", TikTokProduct),
]


async def test_marketplace(mp_name, url, expected, dataclass):
    print(f"\n{'='*70}")
    print(f"  {mp_name.upper()}")
    print(f"  URL: {url}")
    print(f"{'='*70}")
    if mp_name not in MARKETPLACE_REGISTRY:
        print(f"❌ UNKNOWN marketplace '{mp_name}'")
        return None
    try:
        async with CamofoxScraperPool(max_concurrent=1, marketplace=mp_name, wait_ms=5000) as pool:
            result = await pool.scrape(url)
        if result is None:
            print(f"❌ RETURNED NONE")
            return None
        if not isinstance(result, dataclass):
            print(f"❌ WRONG TYPE: got {type(result).__name__}, expected {dataclass.__name__}")
            return None
        print(f"✅ TYPE OK: {type(result).__name__}")
        print(f"   title:        {result.title[:80] if result.title else 'None'}")
        print(f"   price_idr:    {_format_idr(result.price_idr)}")
        print(f"   orig_price:   {_format_idr(result.original_price_idr)}")
        if hasattr(result, 'stock_count'):
            print(f"   stock:        {result.stock_count}")
        if hasattr(result, 'sold_count'):
            print(f"   sold:         {result.sold_count}")
        if hasattr(result, 'rating_count'):
            print(f"   rating_count: {result.rating_count}")
        if hasattr(result, 'seller_name'):
            print(f"   seller:       {result.seller_name}")
        if hasattr(result, 'seller_location'):
            print(f"   location:     {result.seller_location}")
        score = 0
        max_score = 0
        if result.title and expected.lower() in result.title.lower():
            print(f"   ✅ Title contains '{expected}'")
            score += 1
        else:
            print(f"   ⚠️  Title does NOT contain '{expected}'")
        max_score += 1
        if result.price_idr and result.price_idr > 1_000_000:
            print(f"   ✅ Price is realistic (Rp{result.price_idr:,})")
            score += 1
        else:
            print(f"   ⚠️  Price looks wrong: {_format_idr(result.price_idr)}")
        max_score += 1
        return (score, max_score)
    except Exception as e:
        print(f"❌ EXCEPTION: {type(e).__name__}: {e}")
        return (0, 2)


async def main():
    total_score = 0
    total_max = 0
    for mp_name, url, expected, dataclass in TEST_URLS:
        result = await test_marketplace(mp_name, url, expected, dataclass)
        if result:
            total_score += result[0]
            total_max += result[1]
        await asyncio.sleep(2)
    print(f"\n{'='*70}")
    print(f"  TOTAL: {total_score}/{total_max}")
    print(f"{'='*70}")


if __name__ == "__main__":
    asyncio.run(main())

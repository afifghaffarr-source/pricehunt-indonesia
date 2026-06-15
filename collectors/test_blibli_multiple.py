"""Validate Blibli parser on multiple products.

Tests 3 different Blibli products to confirm parser is generalizable.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from camofox_scraper import CamofoxScraperPool, BlibliProduct

URLS = [
    # Original iPhone 15 (verified)
    ("https://www.blibli.com/p/iphone-15/ps--APF-70017-00303?ds=APF-70017-00303-00004", "iPhone 15"),
    # Samsung Galaxy S24 FE
    ("https://www.blibli.com/p/samsung-galaxy-s24-fe-8gb-512gb-smartphone-garansi-resmi/ps--BBP-60023-01710", "Samsung"),
    # Plain Samsung Galaxy S24
    ("https://www.blibli.com/p/samsung-galaxy-s24/ps--SIA-60028-01916", "Samsung"),
    # Xiaomi product (random)
    ("https://www.blibli.com/p/xiaomi-redmi-note-13-pro-5g/ps--DIL-38128-02367", None),
]


async def main():
    print(f"{'URL':<70} {'Title':<30} {'Price':<15} {'Orig':<15} {'Sold':<6} {'Rating':<14} {'Seller':<20}")
    print("=" * 175)
    total = 0
    good = 0
    async with CamofoxScraperPool(max_concurrent=1, marketplace="blibli", wait_ms=6000) as pool:
        for url, expected_keyword in URLS:
            total += 1
            try:
                result = await pool.scrape(url)
                title = (result.title or "None")[:30]
                price = f"Rp{result.price_idr:,}" if result.price_idr else "None"
                orig = f"Rp{result.original_price_idr:,}" if result.original_price_idr else "None"
                sold = str(result.sold_count) if result.sold_count else "None"
                rating = f"{result.rating_value} ({result.rating_count})" if result.rating_value else "None"
                seller = (result.seller_name or "None")[:20]
                # Score: title correct + price realistic
                is_good = (
                    result.title
                    and (expected_keyword is None or expected_keyword.lower() in result.title.lower())
                    and result.price_idr
                    and result.price_idr > 1_000_000
                )
                if is_good:
                    good += 1
                marker = "✅" if is_good else "⚠️"
                print(f"{url[:68]:<70} {title:<30} {price:<15} {orig:<15} {sold:<6} {rating:<14} {seller:<20} {marker}")
            except Exception as e:
                print(f"{url[:68]:<70} ❌ EXCEPTION: {type(e).__name__}: {e}")
            await asyncio.sleep(2)
    print(f"\nResult: {good}/{total} passed (title+realistic price)")


if __name__ == "__main__":
    asyncio.run(main())

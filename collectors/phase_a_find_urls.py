#!/usr/bin/env python3
"""
Phase A: Find real product URLs from marketplace search results
Uses Playwright to search and extract real product URLs
"""
import asyncio
import json
from playwright.async_api import async_playwright

async def find_tokopedia_urls(query: str, limit: int = 10):
    """Search Tokopedia and extract real product URLs"""
    print(f"\n🔍 Searching Tokopedia: '{query}'")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='id-ID',
            timezone_id='Asia/Jakarta',
        )
        
        page = await context.new_page()
        
        try:
            # Search URL
            search_url = f"https://www.tokopedia.com/search?q={query.replace(' ', '+')}"
            print(f"   Loading: {search_url}")
            
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            
            # Extract product links
            # Tokopedia product links are in format: /store-name/product-name
            links = await page.evaluate("""
                () => {
                    const productLinks = new Set();
                    document.querySelectorAll('a[href*="/"]').forEach(link => {
                        const href = link.href;
                        // Match pattern: https://www.tokopedia.com/store/product
                        if (href.includes('tokopedia.com/') && 
                            !href.includes('/search') && 
                            !href.includes('/find') &&
                            !href.includes('/product-list') &&
                            href.split('/').length >= 5) {
                            productLinks.add(href.split('?')[0]); // Remove query params
                        }
                    });
                    return Array.from(productLinks);
                }
            """)
            
            # Filter and limit
            product_urls = [url for url in links if url.count('/') >= 4][:limit]
            
            print(f"   ✅ Found {len(product_urls)} product URLs")
            
            return product_urls
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return []
        finally:
            await browser.close()

async def find_shopee_urls(query: str, limit: int = 10):
    """Search Shopee and extract real product URLs"""
    print(f"\n🔍 Searching Shopee: '{query}'")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='id-ID',
            timezone_id='Asia/Jakarta',
        )
        
        page = await context.new_page()
        
        try:
            # Search URL
            search_url = f"https://shopee.co.id/search?keyword={query.replace(' ', '%20')}"
            print(f"   Loading: {search_url}")
            
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            
            # Extract product links
            links = await page.evaluate("""
                () => {
                    const productLinks = new Set();
                    document.querySelectorAll('a[href*="-i."]').forEach(link => {
                        const href = link.href;
                        // Match Shopee product pattern: /Product-Name-i.123.456
                        if (href.includes('shopee.co.id/') && href.includes('-i.')) {
                            productLinks.add(href.split('?')[0]);
                        }
                    });
                    return Array.from(productLinks);
                }
            """)
            
            product_urls = list(links)[:limit]
            
            print(f"   ✅ Found {len(product_urls)} product URLs")
            
            return product_urls
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return []
        finally:
            await browser.close()

async def main():
    print("="*60)
    print("PHASE A: Finding Real Product URLs")
    print("="*60)
    
    all_urls = []
    
    # Popular products that definitely exist
    queries = [
        "iphone 15",
        "samsung galaxy s24",
        "macbook air m3",
    ]
    
    for query in queries:
        # Get from Tokopedia
        tokped_urls = await find_tokopedia_urls(query, limit=5)
        all_urls.extend([{"marketplace": "tokopedia", "url": url, "query": query} for url in tokped_urls])
        
        await asyncio.sleep(2)
        
        # Get from Shopee
        shopee_urls = await find_shopee_urls(query, limit=5)
        all_urls.extend([{"marketplace": "shopee", "url": url, "query": query} for url in shopee_urls])
        
        await asyncio.sleep(2)
    
    # Save results
    output_file = "/tmp/real_product_urls.json"
    with open(output_file, 'w') as f:
        json.dump(all_urls, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"✅ PHASE A COMPLETE")
    print(f"{'='*60}")
    print(f"Total URLs found: {len(all_urls)}")
    print(f"Tokopedia: {len([u for u in all_urls if u['marketplace'] == 'tokopedia'])}")
    print(f"Shopee: {len([u for u in all_urls if u['marketplace'] == 'shopee'])}")
    print(f"\nSaved to: {output_file}")
    
    # Print first 5 for verification
    print(f"\nSample URLs:")
    for i, url_data in enumerate(all_urls[:5], 1):
        print(f"  {i}. [{url_data['marketplace']}] {url_data['url'][:80]}...")

if __name__ == "__main__":
    asyncio.run(main())

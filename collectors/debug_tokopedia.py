"""
Debug script to inspect Tokopedia HTML structure.
This will dump the page HTML so we can see what selectors to use.
"""

import asyncio
from playwright.async_api import async_playwright
import random

async def inspect_tokopedia():
    # Real product URL (popular item that should exist)
    url = "https://www.tokopedia.com/samsungofficial/samsung-galaxy-s24-5g"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='id-ID',
            timezone_id='Asia/Jakarta',
        )
        
        page = await context.new_page()
        
        # Anti-detection
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        """)
        
        print(f"\n🔍 Inspecting: {url}\n")
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            
            # Get page title
            title = await page.title()
            print(f"✅ Page loaded: {title}\n")
            
            # Try to find price with various selectors
            print("━━━━ PRICE SELECTORS ━━━━")
            price_selectors = [
                'div[data-testid="lblPDPDetailProductPrice"]',
                'div.price',
                'span[data-testid="pdpPrice"]',
                'div[class*="price"]',
                '[data-unify="Typography"]',
            ]
            
            for selector in price_selectors:
                elements = await page.query_selector_all(selector)
                if elements:
                    print(f"✅ Found {len(elements)} elements: {selector}")
                    for i, elem in enumerate(elements[:3]):  # Show first 3
                        text = await elem.inner_text()
                        if text.strip():
                            print(f"   [{i}] {text[:100]}")
                else:
                    print(f"❌ Not found: {selector}")
            
            print("\n━━━━ PRODUCT NAME SELECTORS ━━━━")
            name_selectors = [
                'h1[data-testid="lblPDPDetailProductName"]',
                'h1.product-name',
                'h1[class*="product"]',
            ]
            
            for selector in name_selectors:
                elem = await page.query_selector(selector)
                if elem:
                    text = await elem.inner_text()
                    print(f"✅ {selector}: {text[:100]}")
                else:
                    print(f"❌ Not found: {selector}")
            
            # Save full HTML for manual inspection
            html = await page.content()
            with open('/tmp/tokopedia_page.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"\n📄 Full HTML saved to: /tmp/tokopedia_page.html")
            print(f"   Size: {len(html):,} chars")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_tokopedia())

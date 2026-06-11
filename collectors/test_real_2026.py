"""
Test with REAL 2026 product URLs from web search.
"""

import asyncio
from playwright.async_api import async_playwright
import random

async def test_real_url():
    # REAL 2026 URL from web search
    url = "https://www.tokopedia.com/owllonenew/samsung-galaxy-s24-ultra-12-256-garansi-2026-1731786344964260912"
    
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
        
        print(f"\n🔍 Testing REAL 2026 URL")
        print(f"📍 {url}\n")
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            
            title = await page.title()
            print(f"✅ Page loaded: {title}\n")
            
            # Check for common patterns in 2026 structure
            print("━━━━ SEARCHING FOR PRICE PATTERNS ━━━━")
            
            # Try to find ANY text containing "Rp" (Indonesian Rupiah)
            rp_elements = await page.query_selector_all('text=/Rp/')
            print(f"Found {len(rp_elements)} elements containing 'Rp'")
            
            for i, elem in enumerate(rp_elements[:5]):
                text = await elem.inner_text()
                print(f"  [{i}] {text[:100]}")
            
            print("\n━━━━ SEARCHING FOR PRODUCT NAME ━━━━")
            # Try h1 tags (usually product names)
            h1_elements = await page.query_selector_all('h1')
            print(f"Found {len(h1_elements)} h1 elements")
            
            for i, elem in enumerate(h1_elements):
                text = await elem.inner_text()
                if text.strip():
                    print(f"  [{i}] {text[:100]}")
            
            # Save HTML for analysis
            html = await page.content()
            with open('/tmp/tokopedia_2026_real.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"\n📄 HTML saved: /tmp/tokopedia_2026_real.html ({len(html):,} chars)")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_real_url())

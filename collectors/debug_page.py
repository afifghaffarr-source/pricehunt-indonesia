#!/usr/bin/env python3
"""Debug what's actually on the page"""
import asyncio
from playwright.async_api import async_playwright

async def debug_page():
    url = "https://www.tokopedia.com/samsungofficial/samsung-galaxy-s24-ultra-12-256gb"
    
    print(f"\n{'='*60}")
    print(f"Debugging URL: {url}")
    print(f"{'='*60}\n")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='id-ID',
            timezone_id='Asia/Jakarta',
        )
        
        page = await context.new_page()
        
        try:
            print("Loading page...")
            response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            print(f"Status: {response.status}")
            
            await page.wait_for_timeout(3000)
            
            # Get page title
            title = await page.title()
            print(f"\nPage title: {title}")
            
            # Get page content length
            content = await page.content()
            print(f"Content length: {len(content)} chars")
            
            # Check for common error indicators
            has_404 = "404" in content or "tidak ditemukan" in content.lower()
            has_error = "error" in content.lower()
            
            print(f"\nPage analysis:")
            print(f"  Contains '404': {has_404}")
            print(f"  Contains 'error': {has_error}")
            
            # Try to find product name
            product_name = await page.query_selector('[data-testid="lblPDPDetailProductName"]')
            if product_name:
                name_text = await product_name.text_content()
                print(f"  Product name found: {name_text[:60]}...")
            else:
                print(f"  Product name NOT found")
            
            # Try to find price
            price_elem = await page.query_selector('[data-testid="lblPDPDetailProductPrice"]')
            if price_elem:
                price_text = await price_elem.text_content()
                print(f"  Price found: {price_text}")
            else:
                print(f"  Price NOT found")
            
            # Check for JSON data
            scripts = await page.query_selector_all('script[type="application/ld+json"]')
            print(f"\n  JSON-LD scripts found: {len(scripts)}")
            
            # Save screenshot for debugging
            screenshot_path = "/tmp/tokopedia_debug.png"
            await page.screenshot(path=screenshot_path, full_page=False)
            print(f"\n✅ Screenshot saved: {screenshot_path}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_page())

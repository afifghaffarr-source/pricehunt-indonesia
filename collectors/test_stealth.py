"""
Simple test to verify anti-detection is working
"""

import asyncio
from playwright.async_api import async_playwright

async def test_detection():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        """)
        
        # Test on detection checker
        await page.goto('https://bot.sannysoft.com/', timeout=15000)
        await page.wait_for_timeout(3000)
        
        # Take screenshot to see results
        await page.screenshot(path='/tmp/detection_test.png')
        print("✅ Screenshot saved to /tmp/detection_test.png")
        
        await browser.close()

asyncio.run(test_detection())

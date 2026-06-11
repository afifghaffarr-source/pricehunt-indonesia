"""
Tokopedia Marketplace Collector (Enhanced with Anti-Detection)

Scrapes product data from Tokopedia using Playwright with stealth mode.
Sends data to PriceHunt ingestion API.
"""

import asyncio
import re
import logging
import random
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Page, Browser
from base_collector import BaseCollector

logger = logging.getLogger(__name__)


class TokopediaCollector(BaseCollector):
    """Tokopedia marketplace collector using Playwright with anti-detection."""
    
    def __init__(self):
        super().__init__(marketplace_name="tokopedia")
        self.base_url = "https://www.tokopedia.com"
        
        # Realistic user agents
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ]
        
    async def scrape_product(self, product_url: str) -> Optional[Dict[str, Any]]:
        """
        Scrape single product from Tokopedia URL.
        
        Args:
            product_url: Tokopedia product URL
            
        Returns:
            Dict with product data or None if failed
        """
        async with async_playwright() as p:
            # Launch with anti-detection settings
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                ]
            )
            
            # Create context with realistic settings
            context = await browser.new_context(
                user_agent=random.choice(self.user_agents),
                viewport={'width': 1920, 'height': 1080},
                locale='id-ID',
                timezone_id='Asia/Jakarta',
                extra_http_headers={
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0',
                }
            )
            
            page = await context.new_page()
            
            # Manual stealth: Override navigator.webdriver
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
            """)
            
            try:
                self.logger.info(f"Scraping: {product_url}")
                
                # Random delay before navigation (human-like)
                await asyncio.sleep(random.uniform(1.0, 3.0))
                
                await page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
                
                # Wait with random delay (human-like)
                await page.wait_for_timeout(random.randint(2000, 4000))
                
                # Extract price
                price = await self._extract_price(page)
                if not price:
                    raise ValueError("Price not found")
                
                # Extract seller info
                seller_name = await self._extract_seller(page)
                is_official = await self._check_official_store(page)
                
                # Extract stock status
                in_stock = await self._check_stock(page)
                
                # Extract rating & reviews
                rating = await self._extract_rating(page)
                review_count = await self._extract_review_count(page)
                sold_count = await self._extract_sold_count(page)
                
                # Extract original price (if on discount)
                original_price = await self._extract_original_price(page)
                
                offer = {
                    "url": product_url,
                    "current_price": price,
                    "original_price": original_price if original_price else price,
                    "seller_name": seller_name,
                    "is_official_store": is_official,
                    "stock_status": "in_stock" if in_stock else "out_of_stock",
                    "rating": rating,
                    "review_count": review_count,
                    "sold_count": sold_count,
                    "condition": "new",
                    "confidence_score": 90,
                    "source": "tokopedia_playwright_collector",
                }
                
                self.logger.info(f"✅ Scraped: {seller_name} - Rp {price:,}")
                return offer
                
            except Exception as e:
                self.logger.error(f"❌ Failed to scrape {product_url}: {e}")
                return None
            finally:
                await browser.close()
    
    async def scrape_search(
        self, 
        query: str, 
        limit: int = 10,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None
    ) -> list:
        """
        Scrape search results from Tokopedia.
        
        Args:
            query: Search query
            limit: Max results to return
            min_price: Minimum price filter
            max_price: Maximum price filter
            
        Returns:
            List of product URLs
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                # Build search URL
                search_url = f"{self.base_url}/search?q={query}"
                if min_price:
                    search_url += f"&pmin={min_price}"
                if max_price:
                    search_url += f"&pmax={max_price}"
                
                self.logger.info(f"Searching: {search_url}")
                await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(3000)
                
                # Extract product links
                product_links = await page.query_selector_all('a[data-testid="lnkProductContainer"]')
                
                urls = []
                for link in product_links[:limit]:
                    href = await link.get_attribute("href")
                    if href:
                        urls.append(href)
                
                self.logger.info(f"✅ Found {len(urls)} products")
                return urls
                
            except Exception as e:
                self.logger.error(f"❌ Search failed: {e}")
                return []
            finally:
                await browser.close()
    
    # Helper methods for extraction
    
    async def _extract_price(self, page: Page) -> Optional[int]:
        """Extract current price from page."""
        selectors = [
            '[data-testid="lblPDPDetailProductPrice"]',
            '[data-testid="lblPDP Price"]',
            'div[data-testid="lblPDPDetailProductPrice"]'
        ]
        
        for selector in selectors:
            try:
                el = await page.query_selector(selector)
                if el:
                    text = await el.inner_text()
                    return self._parse_price(text)
            except:
                continue
        return None
    
    async def _extract_original_price(self, page: Page) -> Optional[int]:
        """Extract original price if product is on discount."""
        try:
            el = await page.query_selector('[data-testid="lblPDPDetailProductOriginalPrice"]')
            if el:
                text = await el.inner_text()
                return self._parse_price(text)
        except:
            pass
        return None
    
    async def _extract_seller(self, page: Page) -> str:
        """Extract seller name."""
        selectors = [
            '[data-testid="llbPDPFooterShopName"]',
            'a[data-testid="llbPDPFooterShopName"]'
        ]
        
        for selector in selectors:
            try:
                el = await page.query_selector(selector)
                if el:
                    return await el.inner_text()
            except:
                continue
        return "Unknown Seller"
    
    async def _check_official_store(self, page: Page) -> bool:
        """Check if seller is official store."""
        try:
            badge = await page.query_selector('[data-testid="icoPDPBadgeOS"]')
            return badge is not None
        except:
            return False
    
    async def _check_stock(self, page: Page) -> bool:
        """Check if product is in stock."""
        try:
            btn = await page.query_selector('[data-testid="btnAtc"]')
            if btn:
                text = await btn.inner_text()
                return "Tambah" in text or "Beli" in text
        except:
            pass
        return False
    
    async def _extract_rating(self, page: Page) -> float:
        """Extract product rating."""
        try:
            el = await page.query_selector('[data-testid="lblPDPDetailProductRatingNumber"]')
            if el:
                text = await el.inner_text()
                return float(text.replace(",", "."))
        except:
            pass
        return 0.0
    
    async def _extract_review_count(self, page: Page) -> int:
        """Extract number of reviews."""
        try:
            el = await page.query_selector('[data-testid="lblPDPDetailProductRatingCounter"]')
            if el:
                text = await el.inner_text()
                # Handle formats like "1.5rb", "150"
                return self._parse_number(text)
        except:
            pass
        return 0
    
    async def _extract_sold_count(self, page: Page) -> int:
        """Extract number of items sold."""
        try:
            el = await page.query_selector('[data-testid="lblPDPDetailProductSoldCounter"]')
            if el:
                text = await el.inner_text()
                return self._parse_number(text)
        except:
            pass
        return 0
    
    def _parse_price(self, price_text: str) -> int:
        """Parse Indonesian price format to integer."""
        # "Rp1.500.000" → 1500000
        # "Rp 1.500.000" → 1500000
        cleaned = re.sub(r"[Rp\s.]", "", price_text)
        cleaned = cleaned.replace(".", "")  # Remove thousand separators
        try:
            return int(cleaned)
        except ValueError:
            return 0
    
    def _parse_number(self, text: str) -> int:
        """Parse numbers with K/rb notation."""
        # "1.5rb" → 1500, "2K" → 2000, "150" → 150
        text = text.lower().strip()
        
        # Check for "rb" (ribu = thousand)
        if "rb" in text or "k" in text:
            num_str = re.sub(r"[^\d.,]", "", text)
            num_str = num_str.replace(",", ".")
            try:
                num = float(num_str)
                return int(num * 1000)
            except ValueError:
                return 0
        
        # Regular number
        cleaned = re.sub(r"[^\d]", "", text)
        try:
            return int(cleaned) if cleaned else 0
        except ValueError:
            return 0


async def main():
    """Test collector with example product."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    collector = TokopediaCollector()
    
    # Test with a real Tokopedia URL (replace with actual product)
    test_url = "https://www.tokopedia.com/samsungofficial/samsung-galaxy-s24-ultra-12-256gb"
    
    print("\n" + "="*70)
    print("🧪 TESTING TOKOPEDIA COLLECTOR")
    print("="*70)
    
    print(f"\n📍 URL: {test_url}")
    print("⏳ Scraping...")
    
    result = await collector.scrape_product(test_url)
    
    if result:
        print("\n✅ SCRAPING SUCCESSFUL!")
        print("\n📦 Product Data:")
        print(f"   💰 Price: Rp {result['current_price']:,}")
        if result['original_price'] != result['current_price']:
            print(f"   🏷️  Original: Rp {result['original_price']:,}")
            discount = ((result['original_price'] - result['current_price']) / result['original_price']) * 100
            print(f"   🔥 Discount: {discount:.1f}%")
        print(f"   🏪 Seller: {result['seller_name']}")
        print(f"   ✓  Official: {'Yes' if result['is_official_store'] else 'No'}")
        print(f"   📊 Stock: {result['stock_status']}")
        print(f"   ⭐ Rating: {result['rating']}/5")
        print(f"   💬 Reviews: {result['review_count']}")
        print(f"   📈 Sold: {result['sold_count']}")
        print(f"   🎯 Confidence: {result['confidence_score']}%")
    else:
        print("\n❌ SCRAPING FAILED!")
        print("Check the URL or selector changes in Tokopedia website.")
    
    print("\n" + "="*70)


if __name__ == "__main__":
    asyncio.run(main())

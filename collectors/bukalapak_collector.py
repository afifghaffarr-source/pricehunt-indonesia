"""
Bukalapak Marketplace Collector

Scrapes product data from Bukalapak using Playwright.
Alternative/backup to Tokopedia collector.
"""

import asyncio
import re
import logging
import random
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Page, Browser
from base_collector import BaseCollector

logger = logging.getLogger(__name__)


class BukalapakCollector(BaseCollector):
    """Bukalapak marketplace collector using Playwright with anti-detection."""
    
    def __init__(self):
        super().__init__(marketplace_name="bukalapak")
        self.base_url = "https://www.bukalapak.com"
        
        # Realistic user agents
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ]
        
    async def scrape_product(self, product_url: str) -> Optional[Dict[str, Any]]:
        """
        Scrape single product from Bukalapak URL.
        
        Args:
            product_url: Bukalapak product URL (e.g., https://www.bukalapak.com/p/.../)
            
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
                ]
            )
            
            # Create context with realistic settings
            context = await browser.new_context(
                user_agent=random.choice(self.user_agents),
                viewport={'width': 1920, 'height': 1080},
                locale='id-ID',
                timezone_id='Asia/Jakarta',
                extra_http_headers={
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            )
            
            page = await context.new_page()
            
            # Override navigator.webdriver
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
            """)
            
            try:
                self.logger.info(f"Scraping Bukalapak: {product_url}")
                
                # Random delay before navigation (human-like)
                await asyncio.sleep(random.uniform(1.0, 3.0))
                
                await page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
                
                # Wait with random delay (human-like)
                await page.wait_for_timeout(random.randint(2000, 4000))
                
                # Extract data
                price = await self._extract_price(page)
                if not price:
                    self.logger.error(f"❌ Failed to scrape {product_url}: Price not found")
                    return None
                
                # Extract other fields
                product_name = await self._extract_name(page)
                seller_name = await self._extract_seller(page)
                rating = await self._extract_rating(page)
                sold_count = await self._extract_sold_count(page)
                image_url = await self._extract_image(page)
                
                data = {
                    'url': product_url,
                    'marketplace': 'bukalapak',
                    'name': product_name,
                    'price': price,
                    'seller_name': seller_name,
                    'rating': rating,
                    'sold_count': sold_count,
                    'image_url': image_url,
                }
                
                self.logger.info(f"✅ Scraped: {product_name} - Rp {price:,.0f}")
                return data
                
            except Exception as e:
                self.logger.error(f"❌ Failed to scrape {product_url}: {e}")
                return None
            finally:
                await browser.close()
    
    async def _extract_price(self, page: Page) -> Optional[float]:
        """Extract price from Bukalapak product page."""
        try:
            # Bukalapak price selectors (multiple fallbacks)
            selectors = [
                'div.c-product-price > span',  # Main price container
                '[data-testid="product-price"]',
                'span.c-main-price__price',
                'div[class*="price"] span',
            ]
            
            for selector in selectors:
                element = await page.query_selector(selector)
                if element:
                    text = await element.inner_text()
                    price = self._parse_indonesian_price(text)
                    if price:
                        return price
            
            return None
            
        except Exception as e:
            self.logger.debug(f"Price extraction error: {e}")
            return None
    
    async def _extract_name(self, page: Page) -> str:
        """Extract product name from Bukalapak page."""
        try:
            selectors = [
                'h1.c-product__title',
                '[data-testid="product-name"]',
                'h1[class*="product-name"]',
            ]
            
            for selector in selectors:
                element = await page.query_selector(selector)
                if element:
                    return (await element.inner_text()).strip()
            
            return "Unknown Product"
            
        except Exception as e:
            self.logger.debug(f"Name extraction error: {e}")
            return "Unknown Product"
    
    async def _extract_seller(self, page: Page) -> str:
        """Extract seller name from Bukalapak page."""
        try:
            selectors = [
                'a.c-seller__name',
                '[data-testid="seller-name"]',
                'div.o-merchant__name',
            ]
            
            for selector in selectors:
                element = await page.query_selector(selector)
                if element:
                    return (await element.inner_text()).strip()
            
            return "Unknown Seller"
            
        except Exception as e:
            self.logger.debug(f"Seller extraction error: {e}")
            return "Unknown Seller"
    
    async def _extract_rating(self, page: Page) -> Optional[float]:
        """Extract product rating from Bukalapak page."""
        try:
            selectors = [
                'span.c-review__rating',
                '[data-testid="product-rating"]',
                'div[class*="rating"] span',
            ]
            
            for selector in selectors:
                element = await page.query_selector(selector)
                if element:
                    text = await element.inner_text()
                    # Extract number (e.g., "4.5" from "4.5 / 5")
                    match = re.search(r'(\d+\.?\d*)', text)
                    if match:
                        return float(match.group(1))
            
            return None
            
        except Exception as e:
            self.logger.debug(f"Rating extraction error: {e}")
            return None
    
    async def _extract_sold_count(self, page: Page) -> Optional[int]:
        """Extract sold count from Bukalapak page."""
        try:
            selectors = [
                'span.c-review__sold',
                '[data-testid="product-sold"]',
                'span[class*="sold"]',
            ]
            
            for selector in selectors:
                element = await page.query_selector(selector)
                if element:
                    text = await element.inner_text()
                    # Extract number (e.g., "1.2rb terjual" -> 1200)
                    return self._parse_indonesian_number(text)
            
            return None
            
        except Exception as e:
            self.logger.debug(f"Sold count extraction error: {e}")
            return None
    
    async def _extract_image(self, page: Page) -> Optional[str]:
        """Extract main product image URL from Bukalapak page."""
        try:
            selectors = [
                'img.c-gallery__image',
                '[data-testid="product-image"]',
                'div.c-product-gallery img',
            ]
            
            for selector in selectors:
                element = await page.query_selector(selector)
                if element:
                    src = await element.get_attribute('src')
                    if src:
                        return src
            
            return None
            
        except Exception as e:
            self.logger.debug(f"Image extraction error: {e}")
            return None
    
    def _parse_indonesian_price(self, text: str) -> Optional[float]:
        """Parse Indonesian price format (e.g., 'Rp 1.234.567')"""
        try:
            # Remove currency symbols, spaces, and convert
            cleaned = re.sub(r'[Rp\s]', '', text)
            # Replace dots with nothing (Indonesian thousands separator)
            cleaned = cleaned.replace('.', '')
            # Remove any remaining non-digits except decimal comma
            cleaned = re.sub(r'[^\d,]', '', cleaned)
            # Replace comma with dot for decimal
            cleaned = cleaned.replace(',', '.')
            return float(cleaned)
        except (ValueError, AttributeError):
            return None
    
    def _parse_indonesian_number(self, text: str) -> Optional[int]:
        """Parse Indonesian number format with abbreviations (e.g., '1.2rb', '3.5jt')"""
        try:
            text = text.lower()
            # Extract number and multiplier
            match = re.search(r'([\d.,]+)\s*(rb|ribu|jt|juta)?', text)
            if not match:
                return None
            
            number_str = match.group(1).replace('.', '').replace(',', '.')
            multiplier_str = match.group(2)
            
            number = float(number_str)
            
            # Apply multiplier
            if multiplier_str in ['rb', 'ribu']:
                number *= 1000
            elif multiplier_str in ['jt', 'juta']:
                number *= 1000000
            
            return int(number)
            
        except (ValueError, AttributeError):
            return None
    
    async def scrape_search(self, query: str, limit: int = 10):
        """
        Search products by keyword on Bukalapak.
        
        Args:
            query: Search query
            limit: Maximum number of products to return
            
        Returns:
            List of product URLs
        """
        # TODO: Implement search functionality
        raise NotImplementedError("Search functionality not yet implemented for Bukalapak")


# Test if run directly
if __name__ == "__main__":
    import sys
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    async def test_scraping():
        collector = BukalapakCollector()
        
        # Test URL (Samsung Galaxy S24 example)
        test_url = "https://www.bukalapak.com/p/handphone/hp-smartphone/5cvqq5-jual-samsung-galaxy-s24-ultra-12-256gb"
        
        print("\n" + "="*70)
        print("🧪 TESTING BUKALAPAK COLLECTOR")
        print("="*70)
        print(f"\n📍 URL: {test_url}")
        print("⏳ Scraping...\n")
        
        result = await collector.scrape_product(test_url)
        
        if result:
            print("\n✅ SCRAPING SUCCESS!")
            print("\n📦 Product Data:")
            for key, value in result.items():
                print(f"  {key}: {value}")
        else:
            print("\n❌ SCRAPING FAILED!")
            print("Check the URL or selector changes in Bukalapak website.")
        
        print("\n" + "="*70)
    
    asyncio.run(test_scraping())

"""
Tokopedia 2026 Collector - Updated with correct selectors

Strategy: Extract from embedded JSON data (most reliable) + fallback to DOM selectors
"""

import asyncio
import re
import logging
import random
import json
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Page
from base_collector import BaseCollector
from config import get_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TokopediaCollector(BaseCollector):
    """Tokopedia marketplace collector for 2026"""
    
    def __init__(self):
        super().__init__("tokopedia")
        self.base_url = "https://www.tokopedia.com"
        self.playwright = None
        self.browser = None
        self.context = None
    
    async def _ensure_browser(self):
        """Initialize browser if not already running"""
        if self.browser is None:
            from playwright.async_api import async_playwright
            
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # Visible browser via XVFB
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                ]
            )
            
            self.context = await self.browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                viewport={'width': 1920, 'height': 1080},
                locale='id-ID',
                timezone_id='Asia/Jakarta',
            )
            
            logger.info("Browser initialized successfully")
    
    async def close(self):
        """Close browser and cleanup resources"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Browser closed")
    
    async def scrape_product(self, product_url: str) -> Optional[Dict[str, Any]]:
        """Extract product data from Tokopedia 2026 page"""
        
        await self._ensure_browser()
        
        page = await self.context.new_page()
        
        # Anti-detection
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        """)
        
        try:
            logger.info(f"Navigating to {product_url}")
            await page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(random.randint(2000, 4000))
            
            # Strategy 1: Extract from embedded JSON (most reliable)
            product_data = await self._extract_from_json(page)
            
            # Strategy 2: Fallback to DOM selectors if JSON fails
            if not product_data:
                logger.warning("JSON extraction failed, falling back to DOM selectors")
                product_data = await self._extract_from_dom(page)
            
            if product_data:
                product_data['url'] = product_url
                product_data['marketplace'] = 'tokopedia'
                logger.info(f"Successfully extracted: {product_data.get('name', 'Unknown')}")
                return product_data
            else:
                logger.error("Failed to extract product data")
                return None
                
        except Exception as e:
            logger.error(f"Scraping error: {e}")
            return None
        finally:
            await page.close()
    
    async def _extract_from_json(self, page: Page) -> Optional[Dict[str, Any]]:
        """Extract product data from embedded JSON in script tags"""
        try:
            # Get page content
            html = await page.content()
            
            # Find Apollo GraphQL cache data (Tokopedia 2026 uses this)
            json_match = re.search(r'window\.__APOLLO_STATE__\s*=\s*({.+?});', html, re.DOTALL)
            
            product_info = {}
            
            if json_match:
                try:
                    apollo_data = json.loads(json_match.group(1))
                    
                    # Extract from different parts of Apollo cache
                    for key, value in apollo_data.items():
                        if not isinstance(value, dict):
                            continue
                        
                        # Product name and price
                        if 'productName' in value:
                            product_info['name'] = value.get('productName', '')
                        if 'priceFmt' in value:
                            product_info['price_display'] = value.get('priceFmt', '')
                            product_info['price'] = value.get('price', 0)
                        
                        # Rating data
                        if 'ratingScore' in value:
                            try:
                                product_info['rating'] = float(value.get('ratingScore', 0))
                            except (ValueError, TypeError):
                                pass
                        
                        # Shop/seller info
                        if 'shopName' in value or 'name' in value and 'badge' in str(value):
                            product_info['seller'] = value.get('shopName') or value.get('name', '')
                        
                        # Sold count
                        if 'totalSold' in value:
                            product_info['sold'] = value.get('totalSold', 0)
                    
                    if product_info.get('name') or product_info.get('price'):
                        product_info['currency'] = 'IDR'
                        
                        # Parse price if we have display format but no numeric
                        if not product_info.get('price') and product_info.get('price_display'):
                            product_info['price'] = self._parse_price(product_info['price_display'])
                        
                        # Format price display if needed
                        if product_info.get('price') and not product_info.get('price_display'):
                            product_info['price_display'] = f"Rp{product_info['price']:,}"
                        
                        return product_info
                        
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse Apollo JSON: {e}")
            
            # Fallback: Try meta tags
            price_meta = await page.query_selector('meta[property="product:price:amount"]')
            title_meta = await page.query_selector('meta[property="og:title"]')
            rating_meta = await page.query_selector('meta[itemprop="ratingValue"]')
            
            if price_meta and title_meta:
                price_content = await price_meta.get_attribute('content')
                title_content = await title_meta.get_attribute('content')
                
                result = {
                    'name': title_content.split(' di ')[0] if ' di ' in title_content else title_content,
                    'price': int(price_content) if price_content and price_content.isdigit() else None,
                    'currency': 'IDR',
                }
                
                # Format price display
                if result['price']:
                    result['price_display'] = f"Rp{result['price']:,}"
                
                # Extract seller from title (format: "Product di SellerName | Tokopedia")
                if ' di ' in title_content:
                    seller_part = title_content.split(' di ')[1].split(' | ')[0].strip()
                    result['seller'] = seller_part
                
                # Rating from meta tag
                if rating_meta:
                    rating_content = await rating_meta.get_attribute('content')
                    try:
                        result['rating'] = float(rating_content)
                    except (ValueError, TypeError):
                        pass
                
                return result
            
            return None
            
        except Exception as e:
            logger.error(f"JSON extraction error: {e}")
            return None
    
    async def _extract_from_dom(self, page: Page) -> Optional[Dict[str, Any]]:
        """Fallback: Extract from DOM using 2026 selectors"""
        try:
            product_data = {}
            
            # Product name
            name_selectors = [
                '[data-testid="lblPDPDetailProductName"]',
                'h1',
            ]
            for selector in name_selectors:
                elem = await page.query_selector(selector)
                if elem:
                    product_data['name'] = (await elem.inner_text()).strip()
                    break
            
            # Price - try multiple strategies
            # Strategy 1: data-testid
            price_elem = await page.query_selector('[data-testid="lblPDPDetailProductPrice"]')
            if not price_elem:
                price_elem = await page.query_selector('[data-testid="pdpProductPrice"]')
            
            if price_elem:
                price_text = await price_elem.inner_text()
                product_data['price_display'] = price_text
                product_data['price'] = self._parse_price(price_text)
                product_data['currency'] = 'IDR'
            
            # Rating
            rating_elem = await page.query_selector('[data-testid="lblPDPDetailProductRatingNumber"]')
            if rating_elem:
                rating_text = await rating_elem.inner_text()
                try:
                    product_data['rating'] = float(rating_text)
                except ValueError:
                    pass
            
            # Sold count
            sold_elem = await page.query_selector('[data-testid="lblPDPDetailProductSoldCounter"]')
            if sold_elem:
                sold_text = await sold_elem.inner_text()
                product_data['sold'] = self._parse_indonesian_number(sold_text)
            
            # Seller name
            seller_elem = await page.query_selector('[data-testid="llbPDPFooterShopName"]')
            if seller_elem:
                product_data['seller'] = (await seller_elem.inner_text()).strip()
            
            return product_data if product_data.get('name') else None
            
        except Exception as e:
            logger.error(f"DOM extraction error: {e}")
            return None
    
    def _parse_price(self, price_text: str) -> Optional[int]:
        """Parse Indonesian price format"""
        try:
            # Remove Rp, dots, and commas
            clean = re.sub(r'[Rp.\s]', '', price_text)
            return int(clean)
        except (ValueError, AttributeError):
            return None
    
    def _parse_indonesian_number(self, text: str) -> Optional[int]:
        """Parse Indonesian number abbreviations (rb, jt, etc)"""
        try:
            text = text.lower().strip()
            multipliers = {'rb': 1000, 'ribu': 1000, 'jt': 1000000, 'juta': 1000000}
            
            for abbr, mult in multipliers.items():
                if abbr in text:
                    num_part = text.replace(abbr, '').replace(',', '.').strip()
                    return int(float(num_part) * mult)
            
            # Plain number
            return int(re.sub(r'[^\d]', '', text))
        except (ValueError, AttributeError):
            return None
    
    async def scrape_search(self, query: str, limit: int = 10):
        """Search products - placeholder for future implementation"""
        logger.warning("Search not yet implemented for Tokopedia 2026")
        return []


async def main():
    """Test the collector"""
    collector = TokopediaCollector()
    
    # Test with real 2026 URL
    url = "https://www.tokopedia.com/owllonenew/samsung-galaxy-s24-ultra-12-256-garansi-2026-1731786344964260912"
    
    print(f"\n🧪 Testing Tokopedia 2026 Collector\n{'='*50}\n")
    
    result = await collector.scrape_product(url)
    
    if result:
        print("✅ SUCCESS! Extracted data:\n")
        print(f"📱 Name: {result.get('name')}")
        print(f"💰 Price: {result.get('price_display')} ({result.get('price')} {result.get('currency')})")
        print(f"⭐ Rating: {result.get('rating', 'N/A')}")
        print(f"📦 Sold: {result.get('sold', 'N/A')}")
        print(f"🏪 Seller: {result.get('seller', 'N/A')}")
        print(f"🔗 URL: {result.get('url')}")
    else:
        print("❌ FAILED to extract data")


if __name__ == "__main__":
    asyncio.run(main())

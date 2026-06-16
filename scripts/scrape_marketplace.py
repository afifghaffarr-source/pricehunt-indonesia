#!/usr/bin/env python3
"""
Real marketplace scraper for BijakBeli.app

Scrapes actual product data from Indonesian e-commerce platforms:
- Tokopedia
- Shopee
- Bukalapak
- Lazada
- Blibli

Usage:
    python3 scrape_marketplace.py --marketplace tokopedia --url "https://tokopedia.com/..."
    python3 scrape_marketplace.py --search "macbook pro m3" --marketplace tokopedia
"""

import os
import sys
import time
import re
import logging
import argparse
from typing import Optional, Dict
from urllib.parse import urlparse

# Check dependencies
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    import requests
except ImportError as e:
    print(f"ERROR: Missing dependency: {e}")
    print("Install with: pip install playwright requests")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/projects/bijakbeli-app/logs/scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class MarketplaceScraper:
    """Base scraper for Indonesian marketplaces."""
    
    INGESTION_API = "https://www.bijakbeli.web.id/api/ingestion/offer-snapshot"
    
    def __init__(self, headless: bool = True, slow_mo: int = 100):
        """
        Initialize scraper.
        
        Args:
            headless: Run browser in headless mode (default: True for production)
            slow_mo: Slow down operations by N milliseconds (anti-bot)
        """
        self.headless = headless
        self.slow_mo = slow_mo
        self.ingestion_secret = os.getenv('INGESTION_SECRET')
        
        if not self.ingestion_secret:
            raise ValueError("INGESTION_SECRET environment variable not set")
    
    def scrape_product_page(self, url: str, marketplace: str) -> Optional[Dict]:
        """
        Scrape a single product page.
        
        Returns:
            Dict with keys: marketplace, product_url, title, price, image_url
            None if scraping fails
        """
        raise NotImplementedError("Subclass must implement scrape_product_page()")
    
    def ingest_offer(self, offer_data: Dict) -> Dict:
        """Send scraped data to ingestion API."""
        headers = {
            'Authorization': f'Bearer {self.ingestion_secret}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(
                self.INGESTION_API,
                json=offer_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'data': result
                }
            else:
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}: {response.text}"
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


class TokopediaScraper(MarketplaceScraper):
    """Scraper for Tokopedia.com"""
    
    def scrape_product_page(self, url: str, marketplace: str = "tokopedia") -> Optional[Dict]:
        """Scrape Tokopedia product page."""
        logger.info(f"Scraping Tokopedia: {url}")
        
        with sync_playwright() as p:
            # Launch browser with stealth settings
            browser = p.chromium.launch(
                headless=self.headless,
                slow_mo=self.slow_mo,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox'
                ]
            )
            
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = context.new_page()
            
            try:
                # Navigate to product page
                logger.info(f"Loading page: {url}")
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Wait for key elements to load
                page.wait_for_selector('h1', timeout=10000)
                
                # Extract title
                title_element = page.query_selector('h1[data-testid="lblPDPDetailProductName"]')
                if not title_element:
                    title_element = page.query_selector('h1')
                
                title = title_element.inner_text().strip() if title_element else None
                
                if not title:
                    logger.error("Could not extract product title")
                    return None
                
                # Extract price
                price_text = None
                price_selectors = [
                    'div[data-testid="lblPDPDetailProductPrice"]',
                    'div.price',
                    'span.price'
                ]
                
                for selector in price_selectors:
                    price_element = page.query_selector(selector)
                    if price_element:
                        price_text = price_element.inner_text().strip()
                        break
                
                if not price_text:
                    logger.error("Could not extract product price")
                    return None
                
                # Parse price (remove "Rp" and dots)
                price_clean = re.sub(r'[^\d]', '', price_text)
                try:
                    price = int(price_clean)
                except ValueError:
                    logger.error(f"Could not parse price: {price_text}")
                    return None
                
                # Extract image URL
                image_url = None
                image_selectors = [
                    'img[data-testid="PDPImageMain"]',
                    'img.main-image',
                    'img[alt*="product"]'
                ]
                
                for selector in image_selectors:
                    image_element = page.query_selector(selector)
                    if image_element:
                        image_url = image_element.get_attribute('src')
                        break
                
                # Log extracted data
                logger.info(f"✅ Extracted: {title[:50]}... | Rp{price:,} | Image: {'Yes' if image_url else 'No'}")
                
                browser.close()
                
                return {
                    'marketplace': marketplace,
                    'product_url': url,
                    'title': title,
                    'price': price,
                    'image_url': image_url
                }
            
            except PlaywrightTimeout as e:
                logger.error(f"Timeout while scraping: {e}")
                browser.close()
                return None
            
            except Exception as e:
                logger.error(f"Error scraping Tokopedia: {e}", exc_info=True)
                browser.close()
                return None


class ShopeeScraper(MarketplaceScraper):
    """Scraper for Shopee.co.id"""
    
    def scrape_product_page(self, url: str, marketplace: str = "shopee") -> Optional[Dict]:
        """Scrape Shopee product page."""
        logger.info(f"Scraping Shopee: {url}")
        
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=self.headless,
                slow_mo=self.slow_mo
            )
            
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            page = context.new_page()
            
            try:
                page.goto(url, wait_until='networkidle', timeout=30000)
                page.wait_for_selector('h1, div[class*="title"]', timeout=10000)
                
                # Extract title
                title = page.locator('span[class*="product-title"], h1').first.inner_text().strip()
                
                # Extract price
                price_text = page.locator('div[class*="price"], span[class*="price"]').first.inner_text().strip()
                price_clean = re.sub(r'[^\d]', '', price_text)
                price = int(price_clean)
                
                # Extract image
                image_url = page.locator('img[class*="product-image"], img').first.get_attribute('src')
                
                logger.info(f"✅ Extracted: {title[:50]}... | Rp{price:,}")
                
                browser.close()
                
                return {
                    'marketplace': marketplace,
                    'product_url': url,
                    'title': title,
                    'price': price,
                    'image_url': image_url
                }
            
            except Exception as e:
                logger.error(f"Error scraping Shopee: {e}", exc_info=True)
                browser.close()
                return None


def detect_marketplace(url: str) -> Optional[str]:
    """Detect marketplace from URL."""
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    
    if 'tokopedia.com' in domain:
        return 'tokopedia'
    elif 'shopee.co.id' in domain:
        return 'shopee'
    elif 'bukalapak.com' in domain:
        return 'bukalapak'
    elif 'lazada.co.id' in domain:
        return 'lazada'
    elif 'blibli.com' in domain:
        return 'blibli'
    else:
        return None


def main():
    """CLI interface."""
    parser = argparse.ArgumentParser(description='Scrape Indonesian marketplace product data')
    parser.add_argument('--url', help='Product URL to scrape')
    parser.add_argument('--marketplace', choices=['tokopedia', 'shopee', 'bukalapak', 'lazada', 'blibli'], 
                       help='Marketplace name (auto-detected from URL if not specified)')
    parser.add_argument('--headless', action='store_true', default=True, help='Run browser in headless mode')
    parser.add_argument('--no-headless', action='store_true', help='Run browser with visible UI (debugging)')
    parser.add_argument('--ingest', action='store_true', help='Send scraped data to ingestion API')
    
    args = parser.parse_args()
    
    if not args.url:
        parser.error("--url is required")
    
    # Detect marketplace if not specified
    marketplace = args.marketplace
    if not marketplace:
        marketplace = detect_marketplace(args.url)
        if not marketplace:
            logger.error(f"Could not detect marketplace from URL: {args.url}")
            sys.exit(1)
        logger.info(f"Auto-detected marketplace: {marketplace}")
    
    # Determine headless mode
    headless = args.headless and not args.no_headless
    
    # Initialize scraper
    if marketplace == 'tokopedia':
        scraper = TokopediaScraper(headless=headless)
    elif marketplace == 'shopee':
        scraper = ShopeeScraper(headless=headless)
    else:
        logger.error(f"Scraper not implemented for: {marketplace}")
        sys.exit(1)
    
    # Scrape product
    logger.info("=" * 80)
    logger.info(f"Scraping {marketplace} product")
    logger.info(f"URL: {args.url}")
    logger.info(f"Headless: {headless}")
    logger.info("=" * 80)
    
    result = scraper.scrape_product_page(args.url, marketplace)
    
    if not result:
        logger.error("❌ Scraping failed")
        sys.exit(1)
    
    logger.info("")
    logger.info("=" * 80)
    logger.info("SCRAPED DATA")
    logger.info("=" * 80)
    logger.info(f"Marketplace:  {result['marketplace']}")
    logger.info(f"Title:        {result['title']}")
    logger.info(f"Price:        Rp{result['price']:,}")
    logger.info(f"Image URL:    {result['image_url'][:80] if result['image_url'] else 'None'}...")
    logger.info(f"Product URL:  {result['product_url']}")
    logger.info("")
    
    # Ingest to API if requested
    if args.ingest:
        logger.info("Sending to ingestion API...")
        ingest_result = scraper.ingest_offer(result)
        
        if ingest_result['success']:
            logger.info(f"✅ Ingestion successful: offer_id={ingest_result['data'].get('offer_id', 'unknown')}")
        else:
            logger.error(f"❌ Ingestion failed: {ingest_result['error']}")
            sys.exit(1)
    else:
        logger.info("Skipping ingestion (use --ingest to send to API)")
    
    logger.info("")
    logger.info("✅ Scraping complete")
    sys.exit(0)


if __name__ == '__main__':
    main()

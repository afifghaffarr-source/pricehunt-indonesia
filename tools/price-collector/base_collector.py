"""
Base Collector Class for Browser-based Data Collection
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import time
import random
from playwright.sync_api import Page, Browser, sync_playwright
from rich.console import Console
from rich.table import Table

from config import (
    HEADLESS, BROWSER_TIMEOUT, VIEWPORT_WIDTH, VIEWPORT_HEIGHT,
    USER_AGENT, MIN_DELAY, MAX_DELAY, SAVE_HTML, OUTPUT_DIR, DEBUG
)
from normalizer import (
    normalize_price, normalize_marketplace, normalize_stock_status,
    normalize_condition, clean_title, extract_domain_from_url
)

console = Console()


class BaseCollector(ABC):
    """Base class for marketplace collectors"""
    
    def __init__(self, marketplace_name: str):
        self.marketplace_name = marketplace_name
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright_context = None
        
    def launch_browser(self, headless: bool = HEADLESS) -> Page:
        """Launch Playwright browser and return page
        
        Note: This is a transparent semi-automated collector.
        We do NOT hide automation signals or bypass anti-bot measures.
        Admin manually reviews pages and approves data extraction.
        """
        console.print(f"🌐 Launching browser ({'headless' if headless else 'visible'})...")
        
        self.playwright_context = sync_playwright().start()
        self.browser = self.playwright_context.chromium.launch(
            headless=headless,
            args=[
                '--disable-dev-shm-usage',  # Reduce memory usage only
            ]
        )
        
        context = self.browser.new_context(
            viewport={'width': VIEWPORT_WIDTH, 'height': VIEWPORT_HEIGHT},
            user_agent=USER_AGENT,
        )
        
        self.page = context.new_page()
        self.page.set_default_timeout(BROWSER_TIMEOUT)
        
        console.print("✅ Browser ready")
        return self.page
    
    def close_browser(self):
        """Close browser and cleanup"""
        if self.browser:
            self.browser.close()
        if self.playwright_context:
            self.playwright_context.stop()
        console.print("🔒 Browser closed")
    
    def navigate_to(self, url: str):
        """Navigate to URL with error handling"""
        if not self.page:
            raise RuntimeError("Browser not launched. Call launch_browser() first.")
        
        console.print(f"→ Navigating to: {url}")
        
        try:
            self.page.goto(url, wait_until="domcontentloaded")
            time.sleep(1)  # Small delay for dynamic content
            console.print("✅ Page loaded")
        except Exception as e:
            console.print(f"❌ Navigation failed: {e}")
            raise
    
    def wait_for_user(self, message: str = "Press Enter when ready..."):
        """Wait for user input"""
        console.print(f"\n[yellow]⏸️  {message}[/yellow]")
        input()
    
    def random_delay(self):
        """Random delay to be respectful"""
        delay = random.uniform(MIN_DELAY, MAX_DELAY)
        if DEBUG:
            console.print(f"[dim]⏱️  Waiting {delay:.1f}s...[/dim]")
        time.sleep(delay)
    
    def save_html_snapshot(self, filename: str):
        """Save current page HTML for debugging"""
        if not SAVE_HTML:
            return
        
        if not self.page:
            return
        
        html = self.page.content()
        filepath = OUTPUT_DIR / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        
        console.print(f"[dim]💾 HTML saved: {filepath}[/dim]")
    
    def extract_meta_og(self) -> Dict[str, Optional[str]]:
        """Extract Open Graph meta tags as fallback"""
        if not self.page:
            return {}
        
        try:
            og_data = self.page.evaluate("""
                () => {
                    const meta = {};
                    document.querySelectorAll('meta[property^="og:"]').forEach(tag => {
                        const prop = tag.getAttribute('property').replace('og:', '');
                        meta[prop] = tag.getAttribute('content');
                    });
                    return meta;
                }
            """)
            return og_data
        except Exception:
            return {}
    
    def extract_json_ld(self) -> Dict[str, Any]:
        """Extract JSON-LD structured data as fallback"""
        if not self.page:
            return {}
        
        try:
            json_ld = self.page.evaluate("""
                () => {
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    const data = [];
                    scripts.forEach(script => {
                        try {
                            data.push(JSON.parse(script.textContent));
                        } catch (e) {}
                    });
                    return data;
                }
            """)
            return json_ld[0] if json_ld else {}
        except Exception:
            return {}
    
    def preview_data(self, data: Dict[str, Any]):
        """Display extracted data in a nice table"""
        table = Table(title="📦 Extracted Data Preview", show_header=False)
        table.add_column("Field", style="cyan")
        table.add_column("Value", style="white")
        
        # Key fields to display
        display_fields = [
            ("marketplace", "Marketplace"),
            ("product_url", "URL"),
            ("title", "Title"),
            ("price", "Price"),
            ("original_price", "Original Price"),
            ("seller_name", "Seller"),
            ("is_official_store", "Official Store"),
            ("stock_status", "Stock"),
            ("condition", "Condition"),
            ("variant", "Variant"),
            ("rating", "Rating"),
            ("sold_count", "Sold Count"),
            ("image_url", "Image URL"),
        ]
        
        for key, label in display_fields:
            value = data.get(key)
            if value is not None and value != "":
                # Format value
                if isinstance(value, bool):
                    value = "✅ Yes" if value else "❌ No"
                elif isinstance(value, (int, float)):
                    if key == "price" or key == "original_price":
                        value = f"Rp {value:,}"
                    else:
                        value = str(value)
                
                # Truncate long strings
                if isinstance(value, str) and len(value) > 60:
                    value = value[:57] + "..."
                
                table.add_row(label, str(value))
        
        console.print(table)
        
        # Display warnings if any
        warnings = data.get("_warnings", [])
        if warnings:
            console.print("\n⚠️  Warnings:")
            for warning in warnings:
                console.print(f"  • {warning}")
    
    def confirm_send(self) -> bool:
        """Ask user to confirm sending data"""
        response = console.input("\n[bold yellow]Send this data to BijakBeli? (y/n): [/bold yellow]")
        return response.strip().lower() in ['y', 'yes']
    
    def normalize_extracted_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize extracted data before sending"""
        normalized = {}
        warnings = []
        
        # Required fields
        normalized["marketplace"] = normalize_marketplace(
            raw_data.get("marketplace", self.marketplace_name)
        )
        normalized["product_url"] = raw_data.get("product_url", "")
        normalized["title"] = clean_title(raw_data.get("title", ""))
        
        # Price (critical)
        price = normalize_price(raw_data.get("price"))
        if price and price > 0:
            normalized["price"] = price
        else:
            warnings.append("❌ Invalid price - cannot send without valid price")
            normalized["price"] = None
        
        # Optional fields
        original_price = normalize_price(raw_data.get("original_price"))
        if original_price and original_price > 0:
            normalized["original_price"] = original_price
        
        normalized["seller_name"] = raw_data.get("seller_name")
        normalized["seller_id"] = raw_data.get("seller_id")
        normalized["seller_rating"] = raw_data.get("seller_rating")
        normalized["seller_location"] = raw_data.get("seller_location")
        normalized["is_official_store"] = raw_data.get("is_official_store", False)
        
        normalized["condition"] = normalize_condition(raw_data.get("condition"))
        normalized["variant"] = raw_data.get("variant")
        normalized["stock_status"] = normalize_stock_status(raw_data.get("stock_status"))
        
        normalized["rating"] = raw_data.get("rating")
        normalized["review_count"] = raw_data.get("review_count")
        normalized["sold_count"] = raw_data.get("sold_count")
        
        shipping = normalize_price(raw_data.get("shipping_estimate"))
        if shipping:
            normalized["shipping_estimate"] = shipping
        
        normalized["voucher_text"] = raw_data.get("voucher_text")
        normalized["image_url"] = raw_data.get("image_url")
        normalized["category_hint"] = raw_data.get("category_hint")
        normalized["marketplace_product_id"] = raw_data.get("marketplace_product_id")
        
        # Metadata
        normalized["source"] = "browser_collector"
        normalized["captured_at"] = datetime.utcnow().isoformat() + "Z"
        normalized["parser_version"] = f"{self.marketplace_name}_v1"
        
        # Remove None values
        normalized = {k: v for k, v in normalized.items() if v is not None}
        
        # Add warnings for display
        normalized["_warnings"] = warnings
        
        return normalized
    
    @abstractmethod
    def extract_product_data(self, url: str) -> Dict[str, Any]:
        """
        Extract product data from URL
        Must be implemented by subclass
        
        Returns:
            Dictionary with extracted data
        """
        pass
    
    @abstractmethod
    def search_products(self, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for products by keyword
        Must be implemented by subclass
        
        Returns:
            List of product dictionaries with at least {title, url, price}
        """
        pass

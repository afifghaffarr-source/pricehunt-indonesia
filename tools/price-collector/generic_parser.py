"""
Generic Product Data Parser
Fallback parser that works on any marketplace
"""

from typing import Dict, Any, Optional, List
import re
from playwright.sync_api import Page
from rich.console import Console

from normalizer import normalize_price, extract_domain_from_url

console = Console()


class GenericParser:
    """
    Generic parser that tries multiple strategies to extract product data
    Use this when marketplace-specific parser is not available
    """
    
    def __init__(self, page: Page):
        self.page = page
    
    def parse(self, url: str) -> Dict[str, Any]:
        """
        Parse product page using multiple fallback strategies
        
        Returns:
            Dictionary with extracted data (may be incomplete)
        """
        console.print("[yellow]⚙️  Using generic parser (fallback)[/yellow]")
        
        data = {
            "product_url": url,
            "marketplace": extract_domain_from_url(url),
        }
        
        # Strategy 1: Open Graph meta tags
        og_data = self._extract_og_meta()
        if og_data:
            data["title"] = og_data.get("title") or data.get("title")
            data["image_url"] = og_data.get("image") or data.get("image_url")
            
            # Try to extract price from og:price:amount
            if "price:amount" in og_data:
                data["price"] = og_data["price:amount"]
            
            console.print("[dim]  ✓ Extracted from Open Graph meta[/dim]")
        
        # Strategy 2: JSON-LD structured data
        json_ld = self._extract_json_ld()
        if json_ld:
            if json_ld.get("@type") == "Product":
                data["title"] = json_ld.get("name") or data.get("title")
                data["image_url"] = json_ld.get("image") or data.get("image_url")
                
                # Extract offers
                offers = json_ld.get("offers", {})
                if isinstance(offers, dict):
                    data["price"] = offers.get("price")
                    data["stock_status"] = offers.get("availability", "").split("/")[-1]
                
                # Extract rating
                rating = json_ld.get("aggregateRating", {})
                if rating:
                    data["rating"] = rating.get("ratingValue")
                    data["review_count"] = rating.get("reviewCount")
                
                console.print("[dim]  ✓ Extracted from JSON-LD[/dim]")
        
        # Strategy 3: Common HTML patterns (regex-based)
        if not data.get("title"):
            data["title"] = self._extract_title_fallback()
        
        if not data.get("price"):
            data["price"] = self._extract_price_fallback()
        
        if not data.get("image_url"):
            data["image_url"] = self._extract_image_fallback()
        
        # Try to extract seller info
        seller = self._extract_seller_fallback()
        if seller:
            data.update(seller)
        
        return data
    
    def _extract_og_meta(self) -> Dict[str, Optional[str]]:
        """Extract Open Graph meta tags"""
        try:
            og_data = self.page.evaluate("""
                () => {
                    const meta = {};
                    document.querySelectorAll('meta[property^="og:"]').forEach(tag => {
                        const prop = tag.getAttribute('property').replace('og:', '');
                        meta[prop] = tag.getAttribute('content');
                    });
                    
                    // Also check for product-specific meta
                    document.querySelectorAll('meta[property^="product:"]').forEach(tag => {
                        const prop = tag.getAttribute('property').replace('product:', '');
                        meta[prop] = tag.getAttribute('content');
                    });
                    
                    return meta;
                }
            """)
            return og_data
        except Exception:
            return {}
    
    def _extract_json_ld(self) -> Dict[str, Any]:
        """Extract JSON-LD structured data"""
        try:
            json_ld_list = self.page.evaluate("""
                () => {
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    const data = [];
                    scripts.forEach(script => {
                        try {
                            const parsed = JSON.parse(script.textContent);
                            data.push(parsed);
                        } catch (e) {}
                    });
                    return data;
                }
            """)
            
            # Find Product type
            for item in json_ld_list:
                if isinstance(item, dict):
                    if item.get("@type") == "Product":
                        return item
                    # Check nested graph
                    if "@graph" in item:
                        for graph_item in item["@graph"]:
                            if isinstance(graph_item, dict) and graph_item.get("@type") == "Product":
                                return graph_item
            
            return json_ld_list[0] if json_ld_list else {}
        except Exception:
            return {}
    
    def _extract_title_fallback(self) -> Optional[str]:
        """Try multiple strategies to find product title"""
        strategies = [
            # Common product title selectors
            "h1",
            "[data-testid*='title']",
            "[class*='product-title']",
            "[class*='ProductName']",
            "[id*='product-title']",
            ".product-name",
            ".item-title",
            # Fallback to page title
            "title",
        ]
        
        for selector in strategies:
            try:
                element = self.page.query_selector(selector)
                if element:
                    text = element.text_content()
                    if text and len(text.strip()) > 5:
                        console.print(f"[dim]  ✓ Title from: {selector}[/dim]")
                        return text.strip()
            except Exception:
                continue
        
        # Last resort: document.title via JS
        try:
            title = self.page.evaluate("() => document.title")
            if title:
                console.print("[dim]  ✓ Title from document.title[/dim]")
                return title
        except Exception:
            pass
        
        return None
    
    def _extract_price_fallback(self) -> Optional[str]:
        """Try to find price in page content"""
        # Try common price selectors
        price_selectors = [
            "[data-testid*='price']",
            "[class*='price']",
            "[id*='price']",
            ".product-price",
            ".item-price",
            ".sale-price",
        ]
        
        for selector in price_selectors:
            try:
                elements = self.page.query_selector_all(selector)
                for element in elements[:5]:  # Check first 5 matches
                    text = element.text_content()
                    if text:
                        # Check if contains price pattern
                        if re.search(r'Rp|rupiah|\d[.,]\d{3}', text, re.IGNORECASE):
                            price = normalize_price(text)
                            if price and price > 0:
                                console.print(f"[dim]  ✓ Price from: {selector}[/dim]")
                                return text.strip()
            except Exception:
                continue
        
        # Regex search in body text
        try:
            body_text = self.page.evaluate("() => document.body.innerText")
            # Find Indonesian price format
            matches = re.findall(r'Rp[\s]*[\d.,]+(?:\s*(?:juta|jt|ribu|rb))?', body_text, re.IGNORECASE)
            if matches:
                # Get the most likely price (usually highest value or most prominent)
                prices = []
                for match in matches:
                    normalized = normalize_price(match)
                    if normalized and 1000 < normalized < 1_000_000_000:  # Reasonable range
                        prices.append((normalized, match))
                
                if prices:
                    # Return the first reasonable price
                    prices.sort(key=lambda x: x[0], reverse=True)
                    console.print(f"[dim]  ✓ Price from body text regex[/dim]")
                    return prices[0][1]
        except Exception:
            pass
        
        return None
    
    def _extract_image_fallback(self) -> Optional[str]:
        """Try to find product image"""
        strategies = [
            "[data-testid*='image'] img",
            ".product-image img",
            ".item-image img",
            "[class*='ProductImage'] img",
            "main img",
            ".gallery img",
        ]
        
        for selector in strategies:
            try:
                element = self.page.query_selector(selector)
                if element:
                    src = element.get_attribute("src") or element.get_attribute("data-src")
                    if src and src.startswith("http"):
                        console.print(f"[dim]  ✓ Image from: {selector}[/dim]")
                        return src
            except Exception:
                continue
        
        return None
    
    def _extract_seller_fallback(self) -> Dict[str, Any]:
        """Try to extract seller information"""
        seller_data = {}
        
        # Common seller selectors
        seller_selectors = [
            "[data-testid*='seller']",
            "[class*='seller']",
            "[class*='shop']",
            "[class*='store']",
            ".merchant-name",
        ]
        
        for selector in seller_selectors:
            try:
                element = self.page.query_selector(selector)
                if element:
                    text = element.text_content()
                    if text and len(text.strip()) > 2:
                        seller_data["seller_name"] = text.strip()
                        console.print(f"[dim]  ✓ Seller from: {selector}[/dim]")
                        break
            except Exception:
                continue
        
        # Check for official store badge
        try:
            official_keywords = ["official", "resmi", "verified", "terverifikasi"]
            body_text = self.page.evaluate("() => document.body.innerText.toLowerCase()")
            
            for keyword in official_keywords:
                if keyword in body_text:
                    # Do a more careful check near seller name
                    seller_data["is_official_store"] = True
                    break
        except Exception:
            pass
        
        return seller_data

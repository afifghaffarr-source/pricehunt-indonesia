"""
Tokopedia Collector
Enhanced version integrated with new browser collector architecture
"""

import re
import json
from typing import Dict, Any, List, Optional
from rich.console import Console

from base_collector import BaseCollector
from generic_parser import GenericParser
from normalizer import normalize_price

console = Console()


class TokopediaCollector(BaseCollector):
    """Tokopedia-specific data collector"""
    
    def __init__(self):
        super().__init__("tokopedia")
        self.base_url = "https://www.tokopedia.com"
    
    def extract_product_data(self, url: str) -> Dict[str, Any]:
        """
        Extract product data from Tokopedia product URL
        
        Uses Apollo GraphQL cache extraction (proven working method)
        Falls back to generic parser if Apollo cache not found
        """
        console.print("[cyan]🔍 Tokopedia: Extracting product data...[/cyan]")
        
        if not self.page:
            raise RuntimeError("Browser not launched")
        
        # Navigate to product page
        self.navigate_to(url)
        
        # Try Apollo GraphQL cache method first (most reliable)
        data = self._extract_from_apollo_cache()
        
        if data and data.get("title") and data.get("price"):
            console.print("[green]✅ Extracted from Apollo GraphQL cache[/green]")
        else:
            # Fallback to generic parser
            console.print("[yellow]⚠️  Apollo cache not found, using generic parser[/yellow]")
            parser = GenericParser(self.page)
            data = parser.parse(url)
        
        # Add marketplace and URL
        data["marketplace"] = "tokopedia"
        data["product_url"] = url
        
        return data
    
    def _extract_from_apollo_cache(self) -> Dict[str, Any]:
        """
        Extract data from Apollo GraphQL cache in page
        This is the most reliable method for Tokopedia (tested 2026-06-11)
        """
        try:
            apollo_data = self.page.evaluate("""
                () => {
                    // Find Apollo state script
                    const scripts = document.querySelectorAll('script');
                    for (const script of scripts) {
                        const text = script.textContent;
                        if (text && text.includes('__APOLLO_STATE__')) {
                            try {
                                // Extract JSON from script
                                const match = text.match(/__APOLLO_STATE__\\s*=\\s*({.+?});?\\s*(?:<\\/script|$)/s);
                                if (match) {
                                    return JSON.parse(match[1]);
                                }
                            } catch (e) {
                                console.error('Apollo parse error:', e);
                            }
                        }
                    }
                    return null;
                }
            """)
            
            if not apollo_data:
                return {}
            
            # Navigate Apollo cache structure
            data = {}
            
            # Find pdpGetLayout or pdpGetData
            for key, value in apollo_data.items():
                if isinstance(value, dict):
                    # Look for product data structure
                    if "pdpGetData" in value or "basicInfo" in value:
                        product_data = value.get("pdpGetData", value)
                        
                        # Extract fields
                        if isinstance(product_data, dict):
                            data["title"] = product_data.get("name")
                            
                            # Price
                            price_obj = product_data.get("price", {})
                            if isinstance(price_obj, dict):
                                data["price"] = price_obj.get("value")
                            
                            # Original price (before discount)
                            campaign = product_data.get("campaign", {})
                            if isinstance(campaign, dict):
                                original = campaign.get("originalPrice")
                                if original:
                                    data["original_price"] = original
                            
                            # Rating
                            stats = product_data.get("stats", {})
                            if isinstance(stats, dict):
                                rating = stats.get("rating")
                                if rating:
                                    data["rating"] = float(rating)
                                
                                review_count = stats.get("countReview")
                                if review_count:
                                    data["review_count"] = int(review_count)
                            
                            # Stock
                            stock = product_data.get("stock", {})
                            if isinstance(stock, dict):
                                stock_available = stock.get("value", 0)
                                if stock_available > 0:
                                    data["stock_status"] = "tersedia"
                                else:
                                    data["stock_status"] = "habis"
                            
                            # Seller/Shop
                            shop = product_data.get("shop", {})
                            if isinstance(shop, dict):
                                data["seller_name"] = shop.get("name")
                                data["seller_id"] = shop.get("id")
                                
                                # Check for official store badges
                                badges = shop.get("badges", [])
                                if isinstance(badges, list):
                                    for badge in badges:
                                        if isinstance(badge, dict):
                                            badge_title = badge.get("title", "").lower()
                                            if "official" in badge_title or "resmi" in badge_title:
                                                data["is_official_store"] = True
                                                break
                                
                                # Location
                                location = shop.get("location")
                                if location:
                                    data["seller_location"] = location
                            
                            # Category
                            category = product_data.get("category", {})
                            if isinstance(category, dict):
                                cat_name = category.get("name")
                                if cat_name:
                                    data["category_hint"] = self._map_category(cat_name)
                            
                            # Image
                            pictures = product_data.get("pictures", [])
                            if isinstance(pictures, list) and len(pictures) > 0:
                                first_pic = pictures[0]
                                if isinstance(first_pic, dict):
                                    data["image_url"] = first_pic.get("urlOriginal") or first_pic.get("url300")
                            
                            # Marketplace product ID
                            data["marketplace_product_id"] = product_data.get("productID")
                            
                            break
            
            return data
            
        except Exception as e:
            console.print(f"[dim]  Apollo extraction error: {e}[/dim]")
            return {}
    
    def _map_category(self, category_name: str) -> str:
        """Map Tokopedia category to generic category hint"""
        category_lower = category_name.lower()
        
        mapping = {
            "handphone": "smartphone",
            "smartphone": "smartphone",
            "laptop": "laptop",
            "komputer": "laptop",
            "tablet": "tablet",
            "fashion": "fashion",
            "pakaian": "fashion",
            "sepatu": "fashion",
            "tas": "fashion",
            "elektronik": "electronics",
            "kamera": "electronics",
            "tv": "electronics",
            "audio": "electronics",
            "gaming": "gaming",
            "console": "gaming",
            "olahraga": "sports",
            "kesehatan": "health",
            "kecantikan": "beauty",
            "makanan": "groceries",
            "minuman": "groceries",
        }
        
        for key, value in mapping.items():
            if key in category_lower:
                return value
        
        return "other"
    
    def search_products(self, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search Tokopedia for products by keyword
        
        Returns list of {title, url, price} dictionaries
        """
        console.print(f"[cyan]🔍 Tokopedia: Searching for '{keyword}'...[/cyan]")
        
        if not self.page:
            raise RuntimeError("Browser not launched")
        
        # Construct search URL
        search_url = f"{self.base_url}/search?q={keyword.replace(' ', '+')}"
        self.navigate_to(search_url)
        
        # Wait a bit for dynamic content
        self.page.wait_for_selector("[data-testid='divProductWrapper']", timeout=10000)
        
        # Extract product cards
        products = self.page.evaluate(f"""
            (limit) => {{
                const items = [];
                const cards = document.querySelectorAll("[data-testid='divProductWrapper']");
                
                for (let i = 0; i < Math.min(cards.length, limit); i++) {{
                    const card = cards[i];
                    
                    // Extract data
                    const titleEl = card.querySelector("[data-testid='spnSRPProdName']");
                    const linkEl = card.querySelector("a[href*='/product']");
                    const priceEl = card.querySelector("[data-testid='spnSRPProdPrice']");
                    
                    if (titleEl && linkEl && priceEl) {{
                        items.push({{
                            title: titleEl.textContent.trim(),
                            url: linkEl.href,
                            price: priceEl.textContent.trim(),
                        }});
                    }}
                }}
                
                return items;
            }}
        """, limit)
        
        console.print(f"[green]✅ Found {len(products)} products[/green]")
        
        return products

"""
Base collector class - template for marketplace-specific collectors.
All collectors should extend this class.
"""

import asyncio
import logging
import random
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime

from config import get_config
from ingestion_client import IngestionClient, IngestionResult

logger = logging.getLogger(__name__)


import re

# Variant attribute regexes (Indonesian + English)
_STORAGE_RE  = re.compile(r"(\d+)\s*(gb|tb|mb)", re.I)
_RAM_RE      = re.compile(r"(\d+)\s*gb\s*ram|ram\s*(\d+)\s*gb", re.I)
_COLOR_RE    = re.compile(
    r"\b(hitam|putih|merah|biru|hijau|ungu|emas|perak|"
    r"black|white|red|blue|green|purple|pink|gold|silver|gray|grey)\b",
    re.I,
)
_MODEL_RE    = re.compile(r"\b(pro|max|plus|ultra|lite|mini)\b", re.I)
_CONNECT_RE  = re.compile(r"\b(5g|4g|wifi|nfc|esim|dual[\s-]?sim)\b", re.I)


def _normalize_variant(text: str | None) -> dict[str, str | None]:
    """Tokenize a variant label into structured attributes.

    Returns dict with keys: storage, ram, color, model, connectivity.
    All values are lowercased (except storage/ram case preserved as e.g. '128GB').
    """
    if not text or not text.strip():
        return {"storage": None, "ram": None, "color": None, "model": None, "connectivity": None}

    s = text.lower()
    storage_match = _STORAGE_RE.search(s)
    ram_match = _RAM_RE.search(s)
    color_match = _COLOR_RE.search(s)
    # Take the LAST model match so hierarchical tier names like
    # "iPhone 16 Pro Max" resolve to "max" (most-specific), not "pro".
    _model_matches = _MODEL_RE.findall(s)
    model_match = _model_matches[-1] if _model_matches else None
    connect_match = _CONNECT_RE.search(s)

    return {
        "storage": (
            f"{storage_match.group(1)}{storage_match.group(2).upper()}"
            if storage_match else None
        ),
        "ram": (
            f"{(ram_match.group(1) or ram_match.group(2))}GB"
            if ram_match else None
        ),
        "color": color_match.group(0).lower() if color_match else None,
        "model": model_match.lower() if model_match else None,
        "connectivity": (
            connect_match.group(0).replace(" ", "").replace("-", "").lower()
            if connect_match else None
        ),
    }


class BaseCollector(ABC):
    """
    Abstract base class for marketplace collectors.
    
    Subclasses must implement:
    - scrape_product(url) - Scrape single product
    - scrape_search(query, limit) - Scrape search results
    """
    
    def __init__(self, marketplace_name: str):
        """
        Initialize collector.
        
        Args:
            marketplace_name: Name of marketplace (e.g., 'tokopedia', 'shopee')
        """
        self.marketplace_name = marketplace_name
        self.config = get_config()
        self.ingestion_client = IngestionClient()
        self.logger = logging.getLogger(f"{__name__}.{marketplace_name}")
        
        # Statistics
        self.stats = {
            "products_attempted": 0,
            "products_success": 0,
            "products_failed": 0,
            "start_time": datetime.now(),
        }
    
    @abstractmethod
    async def scrape_product(self, product_url: str) -> Optional[Dict[str, Any]]:
        """
        Scrape single product data from marketplace.
        
        Args:
            product_url: Full URL to product page
        
        Returns:
            Dict with product data matching offer schema, or None if failed
        
        Example return:
            {
                "product_id": "uuid-from-database",
                "marketplace_id": "uuid-from-database",
                "marketplace_product_id": "marketplace-123",
                "seller_name": "Official Store",
                "is_official_store": True,
                "url": "https://...",
                "current_price": 5000000,
                "original_price": 6000000,
                "stock_status": "in_stock",
                "rating": 4.8,
                "review_count": 1234,
                "sold_count": 567,
                "confidence_score": 95,
            }
        """
        pass
    
    @abstractmethod
    async def scrape_search(
        self, 
        query: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Scrape search results from marketplace.
        
        Args:
            query: Search query
            limit: Maximum number of products to scrape
        
        Returns:
            List of product data dicts
        """
        pass
    
    async def collect_and_ingest(
        self,
        queries: List[str],
        limit_per_query: int = 50,
        batch_size: int = 20,
    ) -> IngestionResult:
        """
        Collect products for multiple queries and send to ingestion API.
        
        Args:
            queries: List of search queries
            limit_per_query: Max products per query
            batch_size: Send to API in batches of this size
        
        Returns:
            IngestionResult with statistics
        """
        all_offers = []
        
        for query in queries:
            self.logger.info(f"Collecting: {query} (limit={limit_per_query})")
            
            try:
                offers = await self.scrape_search(query, limit_per_query)
                all_offers.extend(offers)
                self.logger.info(f"Collected {len(offers)} offers for '{query}'")
                
                # Rate limiting delay
                await self._random_delay()
                
            except Exception as e:
                self.logger.error(f"Failed to scrape '{query}': {e}")
                continue
        
        # Send to ingestion API in batches
        self.logger.info(f"Sending {len(all_offers)} offers to ingestion API...")
        
        job_name = f"{self.marketplace_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            result = self.ingestion_client.ingest(
                job_name=job_name,
                offers=all_offers,
                metadata={
                    "marketplace": self.marketplace_name,
                    "queries": queries,
                    "total_collected": len(all_offers),
                }
            )
            
            self.logger.info(
                f"Ingestion complete: "
                f"success={result.success}, "
                f"processed={result.total_processed}, "
                f"failed={result.total_failed}"
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Ingestion failed: {e}")
            raise
    
    async def _random_delay(self):
        """Add random delay for rate limiting."""
        delay = random.uniform(
            self.config.request_delay_min,
            self.config.request_delay_max
        )
        await asyncio.sleep(delay)
    
    def calculate_confidence_score(self, data: Dict[str, Any]) -> int:
        """
        Calculate confidence score based on data completeness.
        
        Args:
            data: Scraped data dict
        
        Returns:
            Confidence score (0-100)
        """
        score = 50  # Base score
        
        # Required fields present
        if data.get("current_price"):
            score += 20
        if data.get("url"):
            score += 10
        if data.get("seller_name"):
            score += 5
        
        # Optional but valuable fields
        if data.get("original_price"):
            score += 5
        if data.get("rating"):
            score += 3
        if data.get("review_count"):
            score += 3
        if data.get("sold_count"):
            score += 2
        if data.get("is_official_store"):
            score += 2
        
        return min(score, 100)
    
    def validate_price(self, price: int) -> bool:
        """
        Validate that price is reasonable.
        
        Args:
            price: Price in rupiah
        
        Returns:
            True if valid, False otherwise
        """
        if not self.config.enable_price_validation:
            return True
        
        # Basic sanity checks
        if price <= 0:
            return False
        if price > 100_000_000_000:  # 100 billion seems unreasonable
            return False
        
        return True
    
    def log_stats(self):
        """Log collection statistics."""
        duration = (datetime.now() - self.stats["start_time"]).total_seconds()
        
        self.logger.info("=" * 50)
        self.logger.info(f"Collection Statistics - {self.marketplace_name}")
        self.logger.info(f"  Duration: {duration:.1f}s")
        self.logger.info(f"  Attempted: {self.stats['products_attempted']}")
        self.logger.info(f"  Success: {self.stats['products_success']}")
        self.logger.info(f"  Failed: {self.stats['products_failed']}")
        
        if self.stats['products_attempted'] > 0:
            success_rate = (
                self.stats['products_success'] / self.stats['products_attempted']
            ) * 100
            self.logger.info(f"  Success Rate: {success_rate:.1f}%")
        
        self.logger.info("=" * 50)
    
    def close(self):
        """Cleanup resources."""
        self.ingestion_client.close()
        self.log_stats()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# Example implementation (skeleton)
class ExampleCollector(BaseCollector):
    """
    Example collector implementation.
    Replace this with actual marketplace-specific logic.
    """
    
    def __init__(self):
        super().__init__(marketplace_name="example")
    
    async def scrape_product(self, product_url: str) -> Optional[Dict[str, Any]]:
        """Scrape single product - IMPLEMENT THIS."""
        self.logger.warning("ExampleCollector.scrape_product not implemented")
        
        # TODO: Implement actual scraping logic
        # 1. Fetch page HTML
        # 2. Parse product data
        # 3. Validate and normalize
        # 4. Return dict matching offer schema
        
        return None
    
    async def scrape_search(
        self, 
        query: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Scrape search results - IMPLEMENT THIS."""
        self.logger.warning("ExampleCollector.scrape_search not implemented")
        
        # TODO: Implement search scraping
        # 1. Build search URL
        # 2. Fetch search results page
        # 3. Extract product URLs
        # 4. Scrape each product (up to limit)
        # 5. Return list of product dicts
        
        return []


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    async def main():
        with ExampleCollector() as collector:
            # Test scraping
            offers = await collector.scrape_search("laptop gaming", limit=10)
            print(f"Collected {len(offers)} offers")
            
            if offers:
                # Send to ingestion API
                result = await collector.collect_and_ingest(
                    queries=["laptop gaming"],
                    limit_per_query=10
                )
                print(f"Ingestion result: {result}")
    
    # Run
    # asyncio.run(main())
    print("ExampleCollector is a skeleton - implement scrape methods for actual use")

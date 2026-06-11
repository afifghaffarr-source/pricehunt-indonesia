"""
Ingestion API client for sending scraped data to BijakBeli.
Handles authentication, retries, and error handling.
"""

import requests
import time
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from config import get_config, get_ingestion_url

logger = logging.getLogger(__name__)


@dataclass
class IngestionResult:
    """Result of an ingestion operation."""
    success: bool
    status: str  # 'success', 'partial', 'failed'
    offers_processed: int
    offers_failed: int
    snapshots_processed: int
    snapshots_failed: int
    duration_ms: int
    errors: Optional[List[str]] = None
    
    @property
    def total_processed(self) -> int:
        return self.offers_processed + self.snapshots_processed
    
    @property
    def total_failed(self) -> int:
        return self.offers_failed + self.snapshots_failed


class IngestionClient:
    """Client for BijakBeli ingestion API."""
    
    def __init__(self):
        self.config = get_config()
        self.ingestion_url = get_ingestion_url()
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.config.ingestion_secret}",
            "Content-Type": "application/json",
            "User-Agent": f"BijakBeli-Collector/{self.config.collector_name}",
        })
    
    def ingest(
        self,
        job_name: str,
        offers: Optional[List[Dict[str, Any]]] = None,
        price_snapshots: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> IngestionResult:
        """
        Send scraped data to ingestion API.
        
        Args:
            job_name: Identifier for this ingestion job
            offers: List of offer objects to upsert
            price_snapshots: List of price snapshot objects to insert
            metadata: Additional metadata about the job
        
        Returns:
            IngestionResult with status and statistics
        
        Raises:
            IngestionError: If ingestion fails after all retries
        """
        payload = {
            "job_name": job_name,
            "source": self.config.collector_name,
        }
        
        if offers:
            payload["offers"] = offers
        if price_snapshots:
            payload["price_snapshots"] = price_snapshots
        if metadata:
            payload["metadata"] = metadata
        
        logger.info(
            f"Ingesting data: job={job_name}, "
            f"offers={len(offers or [])}, "
            f"snapshots={len(price_snapshots or [])}"
        )
        
        # Retry logic
        last_error = None
        for attempt in range(self.config.retry_count + 1):
            try:
                response = self.session.post(
                    self.ingestion_url,
                    json=payload,
                    timeout=60,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result = self._parse_response(data)
                    
                    if result.success:
                        logger.info(
                            f"✅ Ingestion successful: "
                            f"processed={result.total_processed}, "
                            f"failed={result.total_failed}, "
                            f"duration={result.duration_ms}ms"
                        )
                    else:
                        logger.warning(
                            f"⚠️  Ingestion partial: "
                            f"status={result.status}, "
                            f"processed={result.total_processed}, "
                            f"failed={result.total_failed}"
                        )
                    
                    return result
                
                elif response.status_code == 401:
                    raise IngestionError(
                        "Unauthorized: Check INGESTION_SECRET configuration"
                    )
                
                elif response.status_code == 400:
                    error_data = response.json()
                    raise IngestionError(
                        f"Invalid request: {error_data.get('error', 'Unknown error')}"
                    )
                
                else:
                    last_error = IngestionError(
                        f"HTTP {response.status_code}: {response.text[:200]}"
                    )
                    logger.warning(
                        f"Ingestion attempt {attempt + 1} failed: {last_error}"
                    )
            
            except requests.exceptions.Timeout as e:
                last_error = IngestionError(f"Timeout: {str(e)}")
                logger.warning(f"Ingestion attempt {attempt + 1} timed out")
            
            except requests.exceptions.ConnectionError as e:
                last_error = IngestionError(f"Connection error: {str(e)}")
                logger.warning(f"Ingestion attempt {attempt + 1} connection failed")
            
            except requests.exceptions.RequestException as e:
                last_error = IngestionError(f"Request error: {str(e)}")
                logger.error(f"Ingestion attempt {attempt + 1} failed: {e}")
            
            # Retry with delay (if not last attempt)
            if attempt < self.config.retry_count:
                delay = self.config.retry_delay * (2 ** attempt)  # Exponential backoff
                logger.info(f"Retrying in {delay}s...")
                time.sleep(delay)
        
        # All retries failed
        logger.error(f"❌ Ingestion failed after {self.config.retry_count + 1} attempts")
        raise last_error or IngestionError("Unknown error")
    
    def _parse_response(self, data: Dict[str, Any]) -> IngestionResult:
        """Parse ingestion API response into IngestionResult."""
        summary = data.get("summary", {})
        offers_sum = summary.get("offers", {})
        snapshots_sum = summary.get("price_snapshots", {})
        
        return IngestionResult(
            success=data.get("success", False),
            status=data.get("status", "unknown"),
            offers_processed=offers_sum.get("processed", 0),
            offers_failed=offers_sum.get("failed", 0),
            snapshots_processed=snapshots_sum.get("processed", 0),
            snapshots_failed=snapshots_sum.get("failed", 0),
            duration_ms=data.get("duration_ms", 0),
            errors=data.get("errors"),
        )
    
    def test_connection(self) -> bool:
        """Test connection to ingestion API (GET endpoint)."""
        try:
            response = self.session.get(self.ingestion_url, timeout=10)
            if response.status_code == 200:
                logger.info("✅ Ingestion API connection successful")
                return True
            else:
                logger.error(f"❌ Ingestion API returned {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to connect to ingestion API: {e}")
            return False
    
    def close(self):
        """Close the HTTP session."""
        self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class IngestionError(Exception):
    """Exception raised when ingestion fails."""
    pass


# Convenience function
def send_to_ingestion(
    job_name: str,
    offers: Optional[List[Dict[str, Any]]] = None,
    price_snapshots: Optional[List[Dict[str, Any]]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> IngestionResult:
    """
    Convenience function to send data to ingestion API.
    
    Example:
        result = send_to_ingestion(
            job_name="tokopedia_electronics",
            offers=[{...}, {...}],
            metadata={"category": "electronics", "source_url": "..."}
        )
        print(f"Processed: {result.total_processed}")
    """
    with IngestionClient() as client:
        return client.ingest(job_name, offers, price_snapshots, metadata)


if __name__ == "__main__":
    # Test ingestion client
    logging.basicConfig(level=logging.INFO)
    
    print("Testing Ingestion Client...")
    print("-" * 50)
    
    try:
        with IngestionClient() as client:
            # Test connection
            if client.test_connection():
                print("\n✅ Connection test passed!")
            else:
                print("\n❌ Connection test failed!")
                print("   Check your PRICEHUNT_API_URL and INGESTION_SECRET")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("   Make sure .env file is configured correctly")

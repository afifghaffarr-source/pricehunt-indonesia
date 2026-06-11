"""
Configuration for BijakBeli Browser Collector
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Paths
PROJECT_ROOT = Path(__file__).parent
OUTPUT_DIR = PROJECT_ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# API Configuration
API_URL = os.getenv("BIJAKBELI_API_URL", "http://localhost:3000")
INGESTION_SECRET = os.getenv("INGESTION_SECRET", "")
INGESTION_ENDPOINT = f"{API_URL}/api/ingestion/offer-snapshot"

# Collector Settings
DEFAULT_MARKETPLACE = os.getenv("DEFAULT_MARKETPLACE", "tokopedia")
DEFAULT_LIMIT = int(os.getenv("COLLECTOR_DEFAULT_LIMIT", "10"))
HEADLESS = os.getenv("COLLECTOR_HEADLESS", "false").lower() == "true"

# Browser Settings
BROWSER_TIMEOUT = int(os.getenv("BROWSER_TIMEOUT", "30000"))
VIEWPORT_WIDTH = int(os.getenv("BROWSER_VIEWPORT_WIDTH", "1280"))
VIEWPORT_HEIGHT = int(os.getenv("BROWSER_VIEWPORT_HEIGHT", "720"))

# Rate Limiting
MIN_DELAY = int(os.getenv("MIN_DELAY_SECONDS", "2"))
MAX_DELAY = int(os.getenv("MAX_DELAY_SECONDS", "5"))

# Debug
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
SAVE_HTML = os.getenv("SAVE_HTML", "false").lower() == "true"

# Marketplace URLs
MARKETPLACE_URLS = {
    "tokopedia": "https://www.tokopedia.com",
    "shopee": "https://shopee.co.id",
    "lazada": "https://www.lazada.co.id",
    "blibli": "https://www.blibli.com",
    "bukalapak": "https://www.bukalapak.com",
}

# User Agent (mimic real browser)
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

def get_marketplace_url(marketplace: str) -> str:
    """Get base URL for marketplace"""
    return MARKETPLACE_URLS.get(marketplace.lower(), "")

def validate_config():
    """Validate critical configuration"""
    errors = []
    
    if not API_URL:
        errors.append("❌ BIJAKBELI_API_URL not set")
    
    if not INGESTION_SECRET:
        errors.append("⚠️  INGESTION_SECRET not set (required for authentication)")
    
    if errors:
        for error in errors:
            print(error)
        return False
    
    return True

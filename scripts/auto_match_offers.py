#!/usr/bin/env python3
"""
Automated offer-to-product matching with direct Supabase integration.

This script:
1. Fetches orphaned offers and products from Supabase
2. Runs matching algorithm with 6 strategies
3. Auto-applies SQL updates back to Supabase
4. Logs results for monitoring

Usage:
    python3 auto_match_offers.py [--dry-run]

Environment:
    SUPABASE_URL: Supabase project URL
    SUPABASE_SERVICE_KEY: Service role key (has write permissions)
"""

import os
import sys
import re
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher

# Check for required dependencies
try:
    import requests
except ImportError:
    print("ERROR: requests library not installed. Run: pip install requests")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/projects/bijakbeli-app/logs/auto_match.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SupabaseClient:
    """Simplified Supabase client for matching operations."""
    
    def __init__(self):
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not self.url or not self.key:
            raise ValueError(
                "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY"
            )
        
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json'
        }
    
    def fetch_orphaned_offers(self) -> List[Dict]:
        """Fetch active offers with product_id = NULL."""
        url = f"{self.url}/rest/v1/offers"
        params = {
            'select': 'id,title,url,marketplace_id',
            'product_id': 'is.null',
            'is_active': 'eq.true'
        }
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        
        offers = response.json()
        
        # Fetch marketplace names
        for offer in offers:
            marketplace_url = f"{self.url}/rest/v1/marketplaces"
            marketplace_params = {'select': 'name', 'id': f"eq.{offer['marketplace_id']}"}
            marketplace_response = requests.get(marketplace_url, headers=self.headers, params=marketplace_params)
            marketplace_response.raise_for_status()
            marketplace_data = marketplace_response.json()
            offer['marketplace'] = marketplace_data[0]['name'] if marketplace_data else 'unknown'
        
        return offers
    
    def fetch_products(self) -> List[Dict]:
        """Fetch all products."""
        url = f"{self.url}/rest/v1/products"
        params = {'select': 'id,name,slug'}
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def update_offer_product(self, offer_id: str, product_id: str, marketplace_id: str = None) -> bool:
        """Update offer with matched product_id.
        Returns True if updated, False if skipped or failed."""
        # Check for duplicate: if an active offer already exists with
        # the same (product_id, marketplace_id), deactivate the orphan
        # instead of creating a unique-constraint violation.
        if marketplace_id:
            check_url = f"{self.url}/rest/v1/offers"
            check_params = {
                'select': 'id',
                'product_id': f'eq.{product_id}',
                'marketplace_id': f'eq.{marketplace_id}',
                'is_active': 'eq.true'
            }
            check_resp = requests.get(check_url, headers=self.headers, params=check_params)
            if check_resp.status_code == 200:
                existing = check_resp.json()
                if existing:
                    # Duplicate exists — deactivate the orphan offer instead
                    logger.info(f"  ⏭️  Skipping update — existing offer {existing[0]['id'][:8]} already links "
                                f"product_id={product_id[:8]} + marketplace_id={marketplace_id[:8]}. "
                                f"Deactivating orphan {offer_id[:8]} instead.")
                    deact_url = f"{self.url}/rest/v1/offers"
                    deact_params = {'id': f'eq.{offer_id}'}
                    deact_data = {'is_active': False, 'product_id': product_id}
                    deact_resp = requests.patch(deact_url, headers=self.headers, params=deact_params, json=deact_data)
                    return deact_resp.status_code == 204

        url = f"{self.url}/rest/v1/offers"
        params = {'id': f'eq.{offer_id}'}
        data = {'product_id': product_id}
        
        response = requests.patch(url, headers=self.headers, params=params, json=data)
        
        if response.status_code == 204:
            return True
        else:
            logger.error(f"Failed to update offer {offer_id}: {response.text}")
            return False


def extract_slug(url: str) -> str:
    """Extract product slug from marketplace URL."""
    patterns = [
        r'(?:tokopedia\.com|shopee\.co\.id|bukalapak\.com|lazada\.co\.id|blibli\.com)/[^/]+/([a-z0-9\-]+)',
        r'(?:tokopedia\.com|shopee\.co\.id|bukalapak\.com|lazada\.co\.id|blibli\.com)/p/([a-z0-9\-]+)',
        r'(?:tokopedia\.com|shopee\.co\.id|bukalapak\.com)/products/([a-z0-9\-]+)',
        r'(?:tokopedia\.com|shopee\.co\.id)/official-shop/([a-z0-9\-]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url.lower())
        if match:
            return match.group(1)
    
    # Fallback: last path segment
    return url.rstrip('/').split('/')[-1].lower()


def normalize_text(text: str) -> str:
    """Normalize text for comparison: lowercase, remove special chars."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def fingerprint(text: str) -> str:
    """Create fingerprint by removing all non-alphanumeric chars."""
    return re.sub(r'[^a-z0-9]', '', text.lower())


def jaccard_similarity(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts."""
    set1 = set(normalize_text(text1).split())
    set2 = set(normalize_text(text2).split())
    
    if not set1 or not set2:
        return 0.0
    
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    
    return len(intersection) / len(union)


def match_product(offer: Dict, products: List[Dict]) -> Optional[Tuple[str, float, str]]:
    """
    Match an offer to a product using 6 strategies.
    
    Returns: (product_id, confidence, strategy_name) or None
    """
    offer_slug = extract_slug(offer['url'])
    
    # Strategy 1: Exact slug match (1.0 confidence)
    for product in products:
        if offer_slug == product['slug']:
            return (product['id'], 1.0, 'exact_slug_match')
    
    # Strategy 2: Fingerprint match (0.98 confidence)
    # Handles variations like "sony-wh1000xm5" vs "sony-wh-1000xm5"
    offer_fp = fingerprint(offer_slug)
    for product in products:
        product_fp = fingerprint(product['slug'])
        if offer_fp == product_fp:
            return (product['id'], 0.98, 'fingerprint_match')
    
    # Strategy 3: Normalized slug match (0.95 confidence)
    offer_normalized = normalize_text(offer_slug)
    for product in products:
        product_normalized = normalize_text(product['slug'])
        if offer_normalized == product_normalized:
            return (product['id'], 0.95, 'normalized_slug_match')
    
    # Strategy 4: Slug substring match (0.88 confidence)
    # Prefer shortest product slug (closest match)
    candidates = []
    for product in products:
        product_slug_normalized = normalize_text(product['slug'])
        offer_slug_normalized = normalize_text(offer_slug)
        
        if (product_slug_normalized in offer_slug_normalized or 
            offer_slug_normalized in product_slug_normalized):
            candidates.append((product['id'], len(product['slug']), 'slug_substring_match'))
    
    if candidates:
        # Return candidate with shortest slug (most specific match)
        best_match = min(candidates, key=lambda x: x[1])
        return (best_match[0], 0.88, best_match[2])
    
    # Strategy 5: High Jaccard similarity on slug (≥0.85 confidence)
    best_similarity = 0.0
    best_product_id = None
    
    for product in products:
        similarity = jaccard_similarity(offer_slug, product['slug'])
        if similarity > best_similarity:
            best_similarity = similarity
            best_product_id = product['id']
    
    if best_similarity >= 0.85:
        return (best_product_id, best_similarity, 'high_similarity_match')
    
    # Strategy 6: Keyword match on product name (≥0.7 confidence)
    for product in products:
        similarity = jaccard_similarity(offer_slug, product['name'])
        if similarity >= 0.7:
            return (product['id'], similarity, 'name_keyword_match')
    
    # No match found
    return None


def main():
    """Main execution flow."""
    dry_run = '--dry-run' in sys.argv
    
    logger.info("=" * 80)
    logger.info("BijakBeli.app - Automated Offer Matching")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info(f"Mode: {'DRY RUN (no database updates)' if dry_run else 'LIVE (will update database)'}")
    logger.info("=" * 80)
    
    try:
        # Initialize Supabase client
        client = SupabaseClient()
        logger.info("✅ Supabase client initialized")
        
        # Fetch data
        logger.info("Fetching orphaned offers...")
        offers = client.fetch_orphaned_offers()
        logger.info(f"Found {len(offers)} orphaned offers")
        
        if len(offers) == 0:
            logger.info("No orphaned offers to match. Exiting.")
            return 0
        
        logger.info("Fetching products...")
        products = client.fetch_products()
        logger.info(f"Found {len(products)} products")
        
        # Run matching
        logger.info("")
        logger.info("Running matching algorithm...")
        logger.info("")
        
        matches = []
        unmatched = []
        
        for i, offer in enumerate(offers, 1):
            offer_id = offer['id']
            offer_url = offer['url']
            offer_marketplace = offer.get('marketplace', 'unknown')
            
            logger.info(f"[{i}/{len(offers)}] Matching: {offer_marketplace} - {offer_url}")
            
            result = match_product(offer, products)
            
            if result:
                product_id, confidence, strategy = result
                matches.append({
                    'offer_id': offer_id,
                    'product_id': product_id,
                    'marketplace_id': offer.get('marketplace_id'),
                    'confidence': confidence,
                    'strategy': strategy
                })
                logger.info(f"    ✅ Matched: product_id={product_id[:8]}... (confidence={confidence:.2f}, strategy={strategy})")
            else:
                unmatched.append(offer_id)
                logger.info(f"    ❌ No match found")
        
        # Apply updates
        logger.info("")
        logger.info("=" * 80)
        logger.info("APPLYING UPDATES")
        logger.info("=" * 80)
        
        if dry_run:
            logger.info("DRY RUN MODE: Skipping database updates")
        else:
            success_count = 0
            fail_count = 0
            
            for match in matches:
                offer_id = match['offer_id']
                product_id = match['product_id']
                marketplace_id = match.get('marketplace_id')
                
                if client.update_offer_product(offer_id, product_id, marketplace_id):
                    success_count += 1
                    logger.info(f"✅ Updated offer {offer_id[:8]}... → product {product_id[:8]}...")
                else:
                    fail_count += 1
                    logger.error(f"❌ Failed to update offer {offer_id[:8]}...")
            
            logger.info("")
            logger.info(f"Updates applied: {success_count}/{len(matches)} successful, {fail_count} failed")
        
        # Summary
        logger.info("")
        logger.info("=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total offers processed: {len(offers)}")
        logger.info(f"Matched:                {len(matches)} ({len(matches)/len(offers)*100:.1f}%)")
        logger.info(f"Unmatched:              {len(unmatched)} ({len(unmatched)/len(offers)*100:.1f}%)")
        logger.info("")
        
        if matches:
            logger.info("Strategy breakdown:")
            strategy_counts = {}
            for match in matches:
                strategy = match['strategy']
                strategy_counts[strategy] = strategy_counts.get(strategy, 0) + 1
            
            for strategy, count in sorted(strategy_counts.items(), key=lambda x: -x[1]):
                logger.info(f"  {strategy:25s}: {count:3d} ({count/len(matches)*100:.1f}%)")
        
        logger.info("")
        logger.info("✅ Matching complete")
        
        return 0
    
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())

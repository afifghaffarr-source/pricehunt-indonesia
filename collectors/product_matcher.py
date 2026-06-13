#!/usr/bin/env python3
"""
Product Matcher: Link offers to products based on title similarity
Uses fuzzy matching to connect marketplace listings to canonical products
"""
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from supabase import create_client
from dotenv import load_dotenv
from fuzzywuzzy import fuzz
import re

# Load environment
load_dotenv(Path(__file__).parent.parent / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials!")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def normalize_title(title: str) -> str:
    """Normalize title for better matching"""
    if not title:
        return ""
    
    # Lowercase
    t = title.lower()
    
    # Remove common marketplace noise
    noise = [
        r'\bpromo\b', r'\bresmi\b', r'\boriginal\b', r'\bgaransi\b',
        r'\bibox\b', r'\binternasional\b', r'\bsecond\b', r'\bbekas\b',
        r'\bmulus\b', r'\bfullset\b', r'\bunit\b', r'\bonly\b',
        r'\bmurah\b', r'\bterbaru\b', r'\bnew\b', r'\blike new\b',
        r'\bex\b', r'\bwifi\b', r'\bcellular\b', r'\b-\s*\w+\s*,\s*\w+\b'
    ]
    
    for pattern in noise:
        t = re.sub(pattern, ' ', t)
    
    # Remove extra whitespace
    t = ' '.join(t.split())
    
    return t

def extract_key_terms(title: str) -> set:
    """Extract important keywords from title"""
    normalized = normalize_title(title)
    
    # Extract brand, model, specs
    keywords = set()
    
    # Common brands
    brands = [
        'apple', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme',
        'iphone', 'macbook', 'ipad', 'airpods', 'galaxy', 'redmi',
        'poco', 'asus', 'acer', 'lenovo', 'hp', 'dell', 'msi',
        'sony', 'jbl', 'bose', 'sennheiser', 'logitech'
    ]
    
    for brand in brands:
        if brand in normalized:
            keywords.add(brand)
    
    # Extract numbers (RAM, storage, model numbers)
    numbers = re.findall(r'\b\d+(?:gb|tb|inch|core)?\b', normalized)
    keywords.update(numbers)
    
    # Extract model identifiers
    models = re.findall(r'\b(?:m\d+|s\d+|pro|max|ultra|air|mini|plus)\b', normalized)
    keywords.update(models)
    
    return keywords

def calculate_match_score(offer_title: str, product_name: str) -> float:
    """
    Calculate match score between offer and product
    Returns 0-100 score
    """
    
    # Fuzzy ratio
    fuzzy_score = fuzz.token_sort_ratio(offer_title, product_name)
    
    # Keyword overlap bonus
    offer_keywords = extract_key_terms(offer_title)
    product_keywords = extract_key_terms(product_name)
    
    if offer_keywords and product_keywords:
        overlap = len(offer_keywords & product_keywords)
        total = len(offer_keywords | product_keywords)
        keyword_score = (overlap / total) * 100 if total > 0 else 0
    else:
        keyword_score = 0
    
    # Weighted average
    final_score = (fuzzy_score * 0.7) + (keyword_score * 0.3)
    
    return final_score

def main():
    print(f"\n{'='*60}")
    print(f"PRODUCT MATCHER")
    print(f"{'='*60}\n")
    
    # 1. Fetch unmatched offers
    print("Fetching unmatched offers...")
    
    result = supabase.table('offers').select('id, title, marketplace_id, product_id').is_('product_id', 'null').execute()
    
    unmatched_offers = result.data
    print(f"✅ Found {len(unmatched_offers)} unmatched offers\n")
    
    if not unmatched_offers:
        print("No unmatched offers. Exiting.")
        return
    
    # 2. Fetch all products
    print("Fetching products...")
    
    result = supabase.table('products').select('id, name, category').execute()
    
    products = result.data
    print(f"✅ Found {len(products)} products\n")
    
    # 3. Match offers to products
    print(f"Matching offers to products...\n")
    
    THRESHOLD = 75  # Minimum match score to auto-link
    
    matched_count = 0
    skipped_count = 0
    
    for i, offer in enumerate(unmatched_offers, 1):
        offer_id = offer['id']
        offer_title = offer['title']
        
        print(f"[{i}/{len(unmatched_offers)}] {offer_title[:60]}...")
        
        # Find best matching product
        best_score = 0
        best_product = None
        
        for product in products:
            score = calculate_match_score(offer_title, product['name'])
            
            if score > best_score:
                best_score = score
                best_product = product
        
        if best_score >= THRESHOLD and best_product:
            print(f"   ✅ Match: {best_product['name'][:50]}... (score: {best_score:.1f})")
            
            # Update offer with product_id
            try:
                supabase.table('offers').update({
                    'product_id': best_product['id']
                }).eq('id', offer_id).execute()
                
                matched_count += 1
            except Exception as e:
                print(f"   ❌ Update failed: {str(e)[:50]}")
        else:
            print(f"   ⚠️  No good match (best: {best_score:.1f})")
            skipped_count += 1
    
    # Summary
    print(f"\n{'='*60}")
    print(f"MATCHER SUMMARY")
    print(f"{'='*60}")
    print(f"Total offers: {len(unmatched_offers)}")
    print(f"Matched: {matched_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Threshold: {THRESHOLD}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()

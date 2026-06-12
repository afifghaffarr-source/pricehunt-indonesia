#!/usr/bin/env python3
"""
Product Matching Algorithm for BijakBeli.app
Matches orphaned offers to products based on URL slugs and normalized names.
"""

import re
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher

# ============================================================================
# DATA: Products (from database)
# ============================================================================

PRODUCTS = [
    {"id": "494f21ee-b688-4ea2-9e9d-5f250d076b30", "name": "Apple AirPods Pro 2nd Gen USB-C", "slug": "airpods-pro-2-usbc"},
    {"id": "00000000-0000-0000-0000-000000000002", "name": "Apple iPhone 15 Pro Max 256GB", "slug": "apple-iphone-15-pro-max"},
    {"id": "00000000-0000-0000-0000-000000000004", "name": "ASUS ROG Zephyrus G14 GA402", "slug": "asus-rog-zephyrus-g14"},
    {"id": "00000000-0000-0000-0000-000000000006", "name": "Dyson V15 Detect Absolute", "slug": "dyson-v15-detect"},
    {"id": "0a24c5b0-08c6-4e77-a1ea-5ab6a79d1d1c", "name": "iPhone 15 Pro Max 256GB", "slug": "iphone-15-pro-max-256gb"},
    {"id": "f66128d6-c0af-4519-95b7-6c6f6dc72c0d", "name": "LG Kulkas Side by Side 613L", "slug": "lg-kulkas-side-by-side-613l"},
    {"id": "00000000-0000-0000-0000-000000000007", "name": "Logitech MX Master 3S Mouse", "slug": "logitech-mx-master-3s"},
    {"id": "c6e4b39d-966c-4612-a306-e996edaa7857", "name": "MacBook Pro 16 M3 Max", "slug": "macbook-pro-16-m3-max"},
    {"id": "edde3fd7-1cbc-49c4-9b90-32c561b8686f", "name": "Nike Air Max 270 Black White", "slug": "nike-air-max-270"},
    {"id": "00000000-0000-0000-0000-000000000008", "name": "Nintendo Switch OLED Model", "slug": "nintendo-switch-oled"},
    {"id": "7b321903-9118-478a-bec0-025e60f6a6ed", "name": "Samsung AC Split 1 PK Inverter", "slug": "samsung-ac-1pk-inverter"},
    {"id": "00000000-0000-0000-0000-000000000001", "name": "Samsung Galaxy S24 Ultra 256GB", "slug": "samsung-galaxy-s24-ultra"},
    {"id": "480ae3cd-9a35-49a2-938d-11b4a0af39be", "name": "Samsung Galaxy S24 Ultra 512GB", "slug": "samsung-s24-ultra-512gb"},
    {"id": "cd5bcf79-c1e9-43bc-9247-257c39200a69", "name": "Samsung Galaxy S24 Ultra 512GB", "slug": "samsung-galaxy-s24-ultra-512gb"},
    {"id": "250240cb-9af5-4011-9ed1-fe096a1508a3", "name": "Sony WH-1000XM5 Headphone", "slug": "sony-wh1000xm5"},
    {"id": "1f15efb0-61de-4e1d-9ae8-8406a6f86f64", "name": "Xiaomi 14 Pro 256GB", "slug": "xiaomi-14-pro-256gb"},
    {"id": "00000000-0000-0000-0000-000000000005", "name": "Xiaomi Smart Band 8", "slug": "xiaomi-smart-band-8"},
]

# ============================================================================
# DATA: Offers (from database)
# ============================================================================

OFFERS = [
    {"id": "1472f06e-4d61-40e2-820b-61d3768c6863", "title": "product from shopee", "url": "https://shopee.co.id/apple-official/iphone-15-pro-max-256gb", "marketplace": "shopee"},
    {"id": "4d73a6db-2000-42c4-934f-b032d7cb0e30", "title": "product from shopee", "url": "https://shopee.co.id/samsung-official/galaxy-s24-ultra-512gb", "marketplace": "shopee"},
    {"id": "5b9fa74d-de8c-4ea2-839a-8ff5d490603b", "title": "product from shopee", "url": "https://shopee.co.id/sony-official/wh-1000xm5", "marketplace": "shopee"},
    {"id": "cf4692b2-9966-4f75-a41b-3a152230b5e8", "title": "product from tokopedia", "url": "https://www.tokopedia.com/gadgetmurah/iphone-15-pro-max-256gb", "marketplace": "tokopedia"},
    {"id": "4b1fea34-b47c-4c3f-a304-1f230de78fbb", "title": "product from tokopedia", "url": "https://www.tokopedia.com/sony/wh-1000xm5", "marketplace": "tokopedia"},
    {"id": "4008a34d-65dd-4117-9b08-1eccd5229133", "title": "product from tokopedia", "url": "https://tokopedia.com/test-1781161905957", "marketplace": "tokopedia"},
    {"id": "48229631-6e4b-4654-9915-519f4b4ca999", "title": "product from tokopedia", "url": "https://www.tokopedia.com/samsung/galaxy-s24-ultra-512gb", "marketplace": "tokopedia"},
    {"id": "2e100bf8-f075-4413-a6b2-4e77ab54cd9b", "title": "product from tokopedia", "url": "https://www.tokopedia.com/apple/iphone-15-pro-max-256gb", "marketplace": "tokopedia"},
    {"id": "abf8d871-629f-4396-b0ec-24f4bc4563fa", "title": "product from tokopedia", "url": "https://tokopedia.com/test-final-success-1781259683", "marketplace": "tokopedia"},
    {"id": "df20abcf-6a7d-4c01-91ca-d98531170fb1", "title": "product from tokopedia", "url": "https://tokopedia.com/verify-snapshot-working-1781260492", "marketplace": "tokopedia"},
    {"id": "6f57d967-8061-43cb-802f-f1fb5ef50ee1", "title": "Test Manual Admin Entry - P2 Verification", "url": "https://tokopedia.com/test-manual-admin-p2-1781268028", "marketplace": "tokopedia"},
    {"id": "3dff68b6-33c3-48b6-80e1-46e6d5bdd9a2", "title": "test product - complete data trust pipeline", "url": "https://tokopedia.com/complete-success-test-1781260786", "marketplace": "tokopedia"},
]

# ============================================================================
# NORMALIZATION FUNCTIONS
# ============================================================================

def normalize_text(text: str) -> str:
    """Normalize text for matching: lowercase, remove special chars, standardize spaces."""
    text = text.lower()
    # Remove common separators but keep alphanumeric
    text = re.sub(r'[^\w\s]', ' ', text)  # Fixed: ^ inside brackets means "NOT"
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def slug_fingerprint(text: str) -> str:
    """
    Create a fingerprint for slug matching that ignores all separators.
    Handles hyphen variations: 'wh-1000xm5', 'wh1000xm5', 'wh_1000xm5' all become 'wh1000xm5'.
    """
    text = text.lower()
    # Remove ALL non-alphanumeric characters (hyphens, underscores, spaces, etc.)
    text = re.sub(r'[^a-z0-9]', '', text)
    return text

def extract_product_slug_from_url(url: str) -> str:
    """
    Extract product identifier from marketplace URL.
    
    Examples:
        https://tokopedia.com/apple/iphone-15-pro-max-256gb → iphone-15-pro-max-256gb
        https://shopee.co.id/sony-official/wh-1000xm5 → wh-1000xm5
        https://tokopedia.com/test-1781161905957 → test-1781161905957
    """
    # Remove query params and fragments
    url = url.split('?')[0].split('#')[0]
    
    # Extract path segments
    path_parts = url.split('/')
    
    # Get last non-empty segment (usually the product slug)
    for part in reversed(path_parts):
        if part and part not in ['www.tokopedia.com', 'tokopedia.com', 'shopee.co.id', 'lazada.co.id', 'blibli.com']:
            return part
    
    return ""

def similarity_score(str1: str, str2: str) -> float:
    """Calculate similarity ratio between two strings (0.0 to 1.0)."""
    return SequenceMatcher(None, normalize_text(str1), normalize_text(str2)).ratio()

# ============================================================================
# MATCHING ALGORITHM
# ============================================================================

def find_best_product_match(offer: Dict) -> Optional[Tuple[Dict, float, str]]:
    """
    Find the best matching product for an offer.
    
    Returns: (product, confidence_score, match_reason) or None
    """
    url_slug = extract_product_slug_from_url(offer['url'])
    normalized_url_slug = normalize_text(url_slug)
    
    best_match = None
    best_score = 0.0
    best_reason = ""
    
    # Strategy 1: Direct slug match (highest confidence)
    for product in PRODUCTS:
        if product['slug'] == url_slug:
            return (product, 1.0, f"exact_slug_match: '{url_slug}'")
    
    # Strategy 1.5: Fingerprint match (ignores hyphens/underscores/spaces)
    # Handles variations like 'wh-1000xm5' vs 'wh1000xm5'
    url_fingerprint = slug_fingerprint(url_slug)
    for product in PRODUCTS:
        product_fingerprint = slug_fingerprint(product['slug'])
        if product_fingerprint == url_fingerprint:
            return (product, 0.98, f"fingerprint_match: '{url_slug}' ≈ '{product['slug']}' (both normalize to '{url_fingerprint}')")
    
    # Strategy 2: Normalized slug match
    for product in PRODUCTS:
        normalized_product_slug = normalize_text(product['slug'])
        if normalized_product_slug == normalized_url_slug:
            return (product, 0.95, f"normalized_slug_match: '{url_slug}' ≈ '{product['slug']}'")
    
    # Strategy 3: High similarity slug match (>= 0.85)
    for product in PRODUCTS:
        slug_similarity = similarity_score(url_slug, product['slug'])
        if slug_similarity >= 0.85 and slug_similarity > best_score:
            best_match = product
            best_score = slug_similarity
            best_reason = f"slug_similarity: '{url_slug}' ≈ '{product['slug']}' (score={slug_similarity:.2f})"
    
    if best_score >= 0.85:
        return (best_match, best_score, best_reason)
    
    # Strategy 4: URL slug is substring of product slug (0.88 confidence)
    # If multiple matches, prefer shortest product slug (closest match)
    substring_matches = []
    for product in PRODUCTS:
        normalized_product_slug = normalize_text(product['slug'])
        if len(normalized_url_slug) >= 5 and normalized_url_slug in normalized_product_slug:
            # Calculate how much "extra" the product slug has
            extra_length = len(normalized_product_slug) - len(normalized_url_slug)
            substring_matches.append((product, extra_length))
    
    if substring_matches:
        # Sort by extra_length (prefer shortest, i.e., closest match)
        substring_matches.sort(key=lambda x: x[1])
        best_product, extra_len = substring_matches[0]
        return (best_product, 0.88, f"slug_substring_match: '{url_slug}' found in '{best_product['slug']}' (closest match, extra={extra_len})")
    
    # Strategy 5: Product name keywords in URL slug (>= 0.7)
    for product in PRODUCTS:
        normalized_name = normalize_text(product['name'])
        # Check if major keywords from product name appear in URL slug
        name_similarity = similarity_score(normalized_name, normalized_url_slug)
        
        if name_similarity >= 0.7 and name_similarity > best_score:
            best_match = product
            best_score = name_similarity
            best_reason = f"name_in_url: '{product['name']}' found in '{url_slug}' (score={name_similarity:.2f})"
    
    if best_score >= 0.7:
        return (best_match, best_score, best_reason)
    
    # No confident match found
    return None

# ============================================================================
# MAIN MATCHING LOGIC
# ============================================================================

def main():
    """Run product matching and generate SQL updates."""
    
    print("=" * 80)
    print("BijakBeli.app - Product Matching Algorithm")
    print("=" * 80)
    print(f"\nProducts: {len(PRODUCTS)}")
    print(f"Offers: {len(OFFERS)}")
    print("\n" + "=" * 80)
    print("MATCHING RESULTS")
    print("=" * 80 + "\n")
    
    matches = []
    no_matches = []
    
    for offer in OFFERS:
        url_slug = extract_product_slug_from_url(offer['url'])
        
        match_result = find_best_product_match(offer)
        
        if match_result:
            product, confidence, reason = match_result
            matches.append({
                'offer_id': offer['id'],
                'product_id': product['id'],
                'offer_title': offer['title'],
                'offer_url': offer['url'],
                'url_slug': url_slug,
                'product_name': product['name'],
                'product_slug': product['slug'],
                'confidence': confidence,
                'reason': reason
            })
            
            status = "✅ MATCH" if confidence >= 0.9 else "⚠️  PARTIAL"
            print(f"{status} [{confidence:.2f}]")
            print(f"  Offer:   {offer['title'][:50]}")
            print(f"  URL:     {url_slug}")
            print(f"  Product: {product['name']}")
            print(f"  Reason:  {reason}")
            print()
        else:
            no_matches.append({
                'offer_id': offer['id'],
                'offer_title': offer['title'],
                'offer_url': offer['url'],
                'url_slug': url_slug
            })
            
            print(f"❌ NO MATCH")
            print(f"  Offer: {offer['title'][:50]}")
            print(f"  URL:   {url_slug}")
            print()
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Offers:     {len(OFFERS)}")
    print(f"Matched:          {len(matches)} ({len(matches)/len(OFFERS)*100:.1f}%)")
    print(f"High Confidence:  {len([m for m in matches if m['confidence'] >= 0.9])}")
    print(f"Medium Confidence:{len([m for m in matches if 0.7 <= m['confidence'] < 0.9])}")
    print(f"No Match:         {len(no_matches)}")
    print()
    
    # ========================================================================
    # GENERATE SQL UPDATE STATEMENTS
    # ========================================================================
    
    if matches:
        print("=" * 80)
        print("SQL UPDATE STATEMENTS (High Confidence >= 0.9)")
        print("=" * 80 + "\n")
        
        high_confidence_matches = [m for m in matches if m['confidence'] >= 0.9]
        
        if high_confidence_matches:
            print("-- High confidence matches - safe to apply")
            for match in high_confidence_matches:
                print(f"UPDATE offers SET product_id = '{match['product_id']}' WHERE id = '{match['offer_id']}'; -- {match['product_name'][:40]}")
            print()
        
        medium_confidence_matches = [m for m in matches if 0.7 <= m['confidence'] < 0.9]
        
        if medium_confidence_matches:
            print("=" * 80)
            print("SQL UPDATE STATEMENTS (Medium Confidence 0.7-0.9) - REVIEW FIRST")
            print("=" * 80 + "\n")
            print("-- Medium confidence - manual review recommended")
            for match in medium_confidence_matches:
                print(f"-- Confidence: {match['confidence']:.2f} | {match['reason']}")
                print(f"-- UPDATE offers SET product_id = '{match['product_id']}' WHERE id = '{match['offer_id']}'; -- {match['product_name'][:40]}")
            print()
    
    if no_matches:
        print("=" * 80)
        print("UNMATCHED OFFERS (Manual Linking Required)")
        print("=" * 80 + "\n")
        for item in no_matches:
            print(f"Offer ID: {item['offer_id']}")
            print(f"Title:    {item['offer_title']}")
            print(f"URL:      {item['offer_url']}")
            print(f"Slug:     {item['url_slug']}")
            print()

if __name__ == "__main__":
    main()

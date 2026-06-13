#!/usr/bin/env python3
"""
Phase B: URL Hunter - Automated system to find and populate database with real product URLs
Creates crawl_targets from actual marketplace search results
"""
import asyncio
import json
from playwright.async_api import async_playwright
from datetime import datetime
import sys
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent))

from config import get_config
import requests

class URLHunter:
    """Automated URL discovery and database population"""
    
    def __init__(self):
        self.cfg = get_config()
        self.found_urls = []
    
    async def hunt_tokopedia(self, queries: list[str], limit_per_query: int = 10):
        """Hunt for real Tokopedia product URLs"""
        print(f"\n🎯 Hunting Tokopedia URLs...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                viewport={'width': 1920, 'height': 1080},
                locale='id-ID',
                timezone_id='Asia/Jakarta',
            )
            
            page = await context.new_page()
            
            for query in queries:
                try:
                    search_url = f"https://www.tokopedia.com/search?q={query.replace(' ', '+')}"
                    print(f"\n   Query: '{query}'")
                    print(f"   Loading: {search_url}")
                    
                    await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_timeout(3000)
                    
                    # Extract product cards
                    products = await page.evaluate("""
                        () => {
                            const results = [];
                            document.querySelectorAll('a[href]').forEach(link => {
                                const href = link.href;
                                const parts = href.replace('https://www.tokopedia.com/', '').split('/');
                                
                                // Valid product pattern: /store-name/product-slug
                                if (parts.length >= 2 && 
                                    !href.includes('/search') && 
                                    !href.includes('/find') &&
                                    !href.includes('/about') &&
                                    !href.includes('/help') &&
                                    !href.includes('/promo') &&
                                    !href.includes('seller.tokopedia') &&
                                    parts[0] && parts[1]) {
                                    
                                    const url = href.split('?')[0];
                                    const domain = 'tokopedia.com';
                                    
                                    results.push({url, domain});
                                }
                            });
                            return results;
                        }
                    """)
                    
                    # Filter unique
                    seen = set()
                    unique_products = []
                    for p in products:
                        if p['url'] not in seen:
                            seen.add(p['url'])
                            unique_products.append({
                                **p,
                                'source_query': query,
                                'priority_score': 50,  # Default priority
                            })
                    
                    unique_products = unique_products[:limit_per_query]
                    
                    print(f"   ✅ Found {len(unique_products)} unique products")
                    self.found_urls.extend(unique_products)
                    
                    await asyncio.sleep(2)  # Rate limiting
                    
                except Exception as e:
                    print(f"   ❌ Error: {e}")
                    continue
            
            await browser.close()
    
    def save_to_database(self):
        """Save found URLs to database via API"""
        if not self.found_urls:
            print("\n❌ No URLs to save")
            return False
        
        print(f"\n💾 Saving {len(self.found_urls)} URLs to database...")
        
        # Group by batches
        batch_size = 50
        batches = [self.found_urls[i:i+batch_size] for i in range(0, len(self.found_urls), batch_size)]
        
        saved_count = 0
        failed_count = 0
        
        for i, batch in enumerate(batches, 1):
            print(f"\n   Batch {i}/{len(batches)}: {len(batch)} URLs")
            
            # Prepare batch insert
            targets = []
            for item in batch:
                targets.append({
                    'url': item['url'],
                    'domain': item['domain'],
                    'source_query': item['source_query'],
                    'priority_score': item['priority_score'],
                    'status': 'queued',
                })
            
            # Call API endpoint
            url = f"{self.cfg.pricehunt_api_url}/api/refresh/queue"
            headers = {
                "Authorization": f"Bearer {self.cfg.ingestion_secret}",
                "Content-Type": "application/json",
            }
            
            payload = {
                "action": "bulk_create",
                "targets": targets,
            }
            
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=60)
                
                if response.status_code == 200:
                    result = response.json()
                    count = result.get('data', {}).get('created', 0)
                    saved_count += count
                    print(f"   ✅ Saved {count} URLs")
                else:
                    print(f"   ❌ API error: {response.status_code}")
                    print(f"   {response.text[:200]}")
                    failed_count += len(batch)
                    
            except Exception as e:
                print(f"   ❌ Request error: {e}")
                failed_count += len(batch)
        
        print(f"\n{'='*60}")
        print(f"DATABASE SAVE SUMMARY")
        print(f"{'='*60}")
        print(f"Total URLs: {len(self.found_urls)}")
        print(f"Saved: {saved_count}")
        print(f"Failed: {failed_count}")
        
        return saved_count > 0

async def main():
    print("="*60)
    print("PHASE B: URL HUNTER")
    print("="*60)
    
    hunter = URLHunter()
    
    # Product categories to hunt
    queries = [
        # Electronics
        "iphone 15 pro max",
        "samsung galaxy s24 ultra",
        "macbook pro m3",
        "ipad air m2",
        "airpods pro",
        
        # Laptops
        "asus rog laptop",
        "lenovo thinkpad",
        "dell xps",
        
        # Accessories
        "mechanical keyboard",
        "gaming mouse",
    ]
    
    # Hunt URLs
    await hunter.hunt_tokopedia(queries, limit_per_query=10)
    
    # Save results locally first
    output_file = "/tmp/url_hunter_results.json"
    with open(output_file, 'w') as f:
        json.dump(hunter.found_urls, f, indent=2)
    
    print(f"\n✅ Saved {len(hunter.found_urls)} URLs to {output_file}")
    
    # Save to database
    success = hunter.save_to_database()
    
    if success:
        print(f"\n{'='*60}")
        print(f"✅ PHASE B COMPLETE")
        print(f"{'='*60}")
        print(f"Database populated with real product URLs!")
        print(f"Ready for automated scraping.")
    else:
        print(f"\n❌ Phase B failed - database save error")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

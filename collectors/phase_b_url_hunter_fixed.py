#!/usr/bin/env python3
"""
Phase B: URL Hunter - Fixed version with direct database insert
"""
import asyncio
import json
from playwright.async_api import async_playwright
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import get_config
from supabase import create_client

class URLHunter:
    """Automated URL discovery and database population"""
    
    def __init__(self):
        self.cfg = get_config()
        self.found_urls = []
        
        # Initialize Supabase client
        supabase_url = self.cfg.supabase_url
        supabase_key = self.cfg.supabase_key
        self.supabase = create_client(supabase_url, supabase_key)
    
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
                                'priority_score': 50,
                            })
                    
                    unique_products = unique_products[:limit_per_query]
                    
                    print(f"   ✅ Found {len(unique_products)} unique products")
                    self.found_urls.extend(unique_products)
                    
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    print(f"   ❌ Error: {e}")
                    continue
            
            await browser.close()
    
    def save_to_database(self):
        """Save found URLs to database via Supabase client"""
        if not self.found_urls:
            print("\n❌ No URLs to save")
            return False
        
        print(f"\n💾 Saving {len(self.found_urls)} URLs to database...")
        
        # Prepare records
        records = []
        for item in self.found_urls:
            records.append({
                'url': item['url'],
                'domain': item['domain'],
                'priority_score': item['priority_score'],
                'crawl_status': 'queued',
                'source': 'url_hunter',
                'metadata': {
                    'source_query': item['source_query'],
                }
            })
        
        # Batch insert (Supabase supports up to 1000 per batch)
        batch_size = 100
        batches = [records[i:i+batch_size] for i in range(0, len(records), batch_size)]
        
        saved_count = 0
        failed_count = 0
        
        for i, batch in enumerate(batches, 1):
            print(f"\n   Batch {i}/{len(batches)}: {len(batch)} URLs")
            
            try:
                # Use upsert with conflict on url (UNIQUE constraint)
                response = self.supabase.table('crawl_targets').upsert(
                    batch,
                    on_conflict='url',
                    ignore_duplicates=True
                ).execute()
                
                count = len(response.data) if response.data else 0
                saved_count += count
                print(f"   ✅ Saved {count} URLs")
                    
            except Exception as e:
                print(f"   ❌ Error: {e}")
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
    print("PHASE B: URL HUNTER (Database Direct)")
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

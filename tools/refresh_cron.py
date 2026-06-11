#!/usr/bin/env python3
"""
BijakBeli Automated Refresh Cron Job

Runs periodically to:
1. Calculate refresh priorities for all crawl targets
2. Enqueue high-priority targets for crawling
3. Trigger Python browser collector for queued targets
4. Update crawl_targets table with results

Usage:
  python refresh_cron.py [--limit N] [--dry-run]

Schedule with crontab:
  */30 * * * * cd ~/projects/bijakbeli-app && python tools/refresh_cron.py >> logs/refresh_cron.log 2>&1
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import requests
from rich.console import Console
from rich.table import Table

console = Console()

# Configuration
API_BASE_URL = os.getenv("BIJAKBELI_API_URL", "http://localhost:3000")
COLLECTOR_PATH = Path(__file__).parent / "price-collector" / "collector.py"
MAX_CONCURRENT_CRAWLS = int(os.getenv("MAX_CONCURRENT_CRAWLS", "5"))


def fetch_priority_queue(limit: int = 20) -> List[Dict]:
    """Fetch targets due for crawling from API"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/refresh/queue",
            params={"limit": limit, "status": "pending"},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            console.print(f"[red]API Error:[/red] {data.get('error')}")
            return []
        
        return data.get("data", {}).get("targets", [])
    except requests.RequestException as e:
        console.print(f"[red]Request failed:[/red] {e}")
        return []


def calculate_priorities() -> Dict:
    """Calculate refresh priorities for all targets"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/refresh/calculate-priorities",
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            console.print(f"[red]Priority calculation failed:[/red] {data.get('error')}")
            return {}
        
        return data.get("data", {})
    except requests.RequestException as e:
        console.print(f"[red]Request failed:[/red] {e}")
        return {}


def crawl_target(target: Dict, dry_run: bool = False) -> bool:
    """Crawl a single target using browser collector"""
    url = target.get("url")
    target_id = target.get("id")
    
    console.print(f"[cyan]Crawling:[/cyan] {url}")
    
    if dry_run:
        console.print("[yellow]  (DRY RUN - skipping actual crawl)[/yellow]")
        time.sleep(0.5)  # Simulate crawl time
        return True
    
    # Call Python browser collector
    # TODO: Implement actual collector integration
    # For now, just log the intent
    console.print(f"[yellow]  TODO: Integrate with collector.py[/yellow]")
    
    # In production, this would:
    # 1. subprocess.run([sys.executable, COLLECTOR_PATH, "--url", url])
    # 2. Or call collector API if it's running as a service
    # 3. Update crawl_targets table with status
    
    return True


def display_queue_summary(queue: List[Dict]):
    """Display rich table of queue"""
    if not queue:
        console.print("[yellow]Queue is empty[/yellow]")
        return
    
    table = Table(title="Refresh Queue", show_lines=True)
    table.add_column("Priority", style="cyan", width=8)
    table.add_column("Product", style="green")
    table.add_column("Marketplace", style="blue", width=12)
    table.add_column("Last Checked", style="magenta", width=15)
    
    for target in queue[:10]:  # Show top 10
        last_checked = target.get("last_crawled_at")
        if last_checked:
            last_checked = datetime.fromisoformat(last_checked.replace("Z", "+00:00"))
            last_checked_str = f"{(datetime.now().astimezone() - last_checked).total_seconds() / 3600:.1f}h ago"
        else:
            last_checked_str = "Never"
        
        table.add_row(
            str(target.get("priority_score", 0)),
            target.get("product_name", "Unknown")[:40],
            target.get("marketplace", "Unknown"),
            last_checked_str,
        )
    
    console.print(table)


def main():
    parser = argparse.ArgumentParser(description="BijakBeli Automated Refresh")
    parser.add_argument("--limit", type=int, default=20, help="Max targets to process")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually crawl")
    parser.add_argument("--recalculate", action="store_true", help="Recalculate priorities first")
    args = parser.parse_args()
    
    console.print(f"\n[bold blue]BijakBeli Automated Refresh[/bold blue]")
    console.print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Step 1: Optionally recalculate priorities
    if args.recalculate:
        console.print("[cyan]Step 1:[/cyan] Calculating priorities...")
        priorities = calculate_priorities()
        
        if priorities:
            console.print(f"[green]✓[/green] Calculated priorities for {priorities.get('total_targets', 0)} targets")
            console.print(f"  High priority: {priorities.get('high_priority', 0)}")
            console.print(f"  Medium priority: {priorities.get('medium_priority', 0)}")
            console.print(f"  Low priority: {priorities.get('low_priority', 0)}")
        else:
            console.print("[red]✗[/red] Priority calculation failed")
        
        console.print()
    
    # Step 2: Fetch queue
    console.print(f"[cyan]Step 2:[/cyan] Fetching refresh queue (limit={args.limit})...")
    queue = fetch_priority_queue(args.limit)
    
    if not queue:
        console.print("[yellow]No targets due for refresh[/yellow]")
        return 0
    
    console.print(f"[green]✓[/green] Found {len(queue)} targets\n")
    
    # Step 3: Display queue
    display_queue_summary(queue)
    console.print()
    
    # Step 4: Process queue
    console.print(f"[cyan]Step 3:[/cyan] Processing queue...")
    success_count = 0
    fail_count = 0
    
    for i, target in enumerate(queue[:MAX_CONCURRENT_CRAWLS], 1):
        console.print(f"[{i}/{min(len(queue), MAX_CONCURRENT_CRAWLS)}] ", end="")
        
        try:
            if crawl_target(target, dry_run=args.dry_run):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            console.print(f"[red]  Error:[/red] {e}")
            fail_count += 1
    
    # Summary
    console.print()
    console.print("[bold]Summary:[/bold]")
    console.print(f"  Success: {success_count}")
    console.print(f"  Failed: {fail_count}")
    console.print(f"  Skipped: {len(queue) - success_count - fail_count}")
    
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

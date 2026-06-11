#!/usr/bin/env python3
"""
PriceHunt Indonesia - Browser Collector CLI
Semi-automated browser-based price data collection tool
"""

import sys
import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm

from config import validate_config, DEFAULT_MARKETPLACE, DEFAULT_LIMIT
from api_client import IngestionClient
from marketplaces import TokopediaCollector, ShopeeCollector

console = Console()


def get_collector(marketplace: str):
    """Get collector instance for marketplace"""
    marketplace = marketplace.lower()
    
    if marketplace == "tokopedia":
        return TokopediaCollector()
    elif marketplace == "shopee":
        return ShopeeCollector()
    else:
        console.print(f"[red]❌ Marketplace '{marketplace}' not supported yet[/red]")
        console.print("[yellow]Supported: tokopedia, shopee[/yellow]")
        sys.exit(1)


def send_to_api(data: dict, client: IngestionClient) -> bool:
    """Send data to PriceHunt API and handle response"""
    console.print("\n[cyan]📤 Sending to PriceHunt API...[/cyan]")
    
    response = client.send_offer_snapshot(data)
    
    if response.get("success"):
        console.print("\n[green]✅ SUCCESS![/green]")
        console.print(f"[dim]Offer ID: {response.get('offer_id')}[/dim]")
        console.print(f"[dim]Confidence: {response.get('confidence_score')}/100 ({response.get('confidence_label')})[/dim]")
        
        warnings = response.get("warnings")
        if warnings:
            console.print("\n[yellow]⚠️  Warnings:[/yellow]")
            for warning in warnings:
                console.print(f"  • {warning}")
        
        return True
    else:
        console.print("\n[red]❌ FAILED[/red]")
        console.print(f"[red]Error: {response.get('message', 'Unknown error')}[/red]")
        
        if response.get("code"):
            console.print(f"[dim]Code: {response.get('code')}[/dim]")
        
        return False


@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    """
    PriceHunt Browser Collector
    
    Semi-automated tool untuk collect data harga dari marketplace Indonesia
    """
    if ctx.invoked_subcommand is None:
        console.print(Panel.fit(
            "[bold cyan]PriceHunt Browser Collector[/bold cyan]\n\n"
            "Usage:\n"
            "  [yellow]python collector.py --manual[/yellow]                    Manual mode (browse freely)\n"
            "  [yellow]python collector.py --url <URL>[/yellow]                 Extract single product URL\n"
            "  [yellow]python collector.py --keyword <text>[/yellow]            Search by keyword\n\n"
            "Options:\n"
            "  --marketplace <name>  Choose marketplace (default: tokopedia)\n"
            "  --limit <n>          Max results for search (default: 10)\n"
            "  --test               Test API connection\n"
            "  --help               Show this message\n",
            title="🔍 Browser Collector",
            border_style="cyan"
        ))


@click.command()
def test():
    """Test API connection"""
    console.print("[cyan]🔍 Testing PriceHunt API connection...[/cyan]\n")
    
    if not validate_config():
        console.print("\n[red]❌ Configuration errors. Check your .env file.[/red]")
        sys.exit(1)
    
    client = IngestionClient()
    
    if client.test_connection():
        console.print("\n[green]✅ All good! Ready to collect data.[/green]")
    else:
        console.print("\n[red]❌ Cannot connect to API. Make sure PriceHunt is running.[/red]")
        sys.exit(1)


@click.command()
@click.option("--marketplace", default=DEFAULT_MARKETPLACE, help="Marketplace name")
def manual(marketplace: str):
    """
    Manual mode: Open browser, user browses freely, then extracts visible data
    """
    console.print(Panel.fit(
        "[bold cyan]Manual Mode[/bold cyan]\n\n"
        "The browser will open. Navigate to any product page.\n"
        "When you're ready, come back here and press Enter.\n"
        "The tool will extract whatever data is visible on the page.",
        border_style="cyan"
    ))
    
    if not validate_config():
        sys.exit(1)
    
    collector = get_collector(marketplace)
    client = IngestionClient()
    
    try:
        # Launch visible browser
        collector.launch_browser(headless=False)
        
        console.print(f"\n[yellow]🌐 Browser opened. Navigate to a product page on {marketplace}.[/yellow]")
        console.print("[yellow]When the page is loaded and ready, come back here.[/yellow]")
        
        # Wait for user
        collector.wait_for_user()
        
        # Get current URL
        current_url = collector.page.url
        console.print(f"\n[cyan]📍 Current URL: {current_url}[/cyan]")
        
        # Extract data
        console.print("[cyan]🔍 Extracting data...[/cyan]")
        raw_data = collector.extract_product_data(current_url)
        
        # Normalize
        normalized = collector.normalize_extracted_data(raw_data)
        
        # Preview
        console.print("")
        collector.preview_data(normalized)
        
        # Check if valid
        if not normalized.get("price"):
            console.print("\n[red]❌ Cannot proceed: No valid price found[/red]")
            return
        
        # Confirm send
        if collector.confirm_send():
            # Remove internal fields
            send_data = {k: v for k, v in normalized.items() if not k.startswith("_")}
            send_to_api(send_data, client)
        else:
            console.print("[yellow]⏭️  Skipped[/yellow]")
        
    finally:
        collector.close_browser()


@click.command()
@click.argument("url")
@click.option("--marketplace", default=None, help="Override marketplace detection")
def url(url: str, marketplace: str):
    """
    URL mode: Extract data from a specific product URL
    """
    console.print(Panel.fit(
        f"[bold cyan]URL Mode[/bold cyan]\n\n"
        f"Extracting: {url}",
        border_style="cyan"
    ))
    
    if not validate_config():
        sys.exit(1)
    
    # Detect marketplace from URL if not specified
    if not marketplace:
        from normalizer import extract_domain_from_url
        marketplace = extract_domain_from_url(url)
        console.print(f"[dim]Detected marketplace: {marketplace}[/dim]")
    
    collector = get_collector(marketplace)
    client = IngestionClient()
    
    try:
        # Launch browser (can be headless)
        collector.launch_browser(headless=True)
        
        # Extract data
        raw_data = collector.extract_product_data(url)
        
        # Normalize
        normalized = collector.normalize_extracted_data(raw_data)
        
        # Preview
        console.print("")
        collector.preview_data(normalized)
        
        # Check if valid
        if not normalized.get("price"):
            console.print("\n[red]❌ Cannot proceed: No valid price found[/red]")
            return
        
        # Confirm send
        if collector.confirm_send():
            # Remove internal fields
            send_data = {k: v for k, v in normalized.items() if not k.startswith("_")}
            send_to_api(send_data, client)
        else:
            console.print("[yellow]⏭️  Skipped[/yellow]")
        
    finally:
        collector.close_browser()


@click.command()
@click.argument("keyword")
@click.option("--marketplace", default=DEFAULT_MARKETPLACE, help="Marketplace to search")
@click.option("--limit", default=DEFAULT_LIMIT, help="Max number of results")
def keyword(keyword: str, marketplace: str, limit: int):
    """
    Keyword mode: Search marketplace by keyword, user selects products
    """
    console.print(Panel.fit(
        f"[bold cyan]Keyword Search Mode[/bold cyan]\n\n"
        f"Searching: {keyword}\n"
        f"Marketplace: {marketplace}\n"
        f"Limit: {limit}",
        border_style="cyan"
    ))
    
    if not validate_config():
        sys.exit(1)
    
    collector = get_collector(marketplace)
    client = IngestionClient()
    
    try:
        # Launch browser
        collector.launch_browser(headless=False)
        
        # Search
        products = collector.search_products(keyword, limit=limit)
        
        if not products:
            console.print("[yellow]No products found[/yellow]")
            return
        
        # Display results
        console.print(f"\n[green]Found {len(products)} products:[/green]\n")
        for i, product in enumerate(products, 1):
            console.print(f"[cyan]{i}.[/cyan] {product.get('title', 'No title')}")
            console.print(f"    Price: {product.get('price', 'N/A')}")
            console.print(f"    URL: [dim]{product.get('url', 'N/A')}[/dim]\n")
        
        # Ask user which products to collect
        console.print("[yellow]Enter product numbers to collect (comma-separated), or 'all', or 'none':[/yellow]")
        selection = Prompt.ask("Select", default="none")
        
        if selection.lower() == "none":
            console.print("[yellow]⏭️  Skipped all[/yellow]")
            return
        
        # Parse selection
        if selection.lower() == "all":
            indices = list(range(len(products)))
        else:
            try:
                indices = [int(x.strip()) - 1 for x in selection.split(",")]
                indices = [i for i in indices if 0 <= i < len(products)]
            except ValueError:
                console.print("[red]Invalid selection[/red]")
                return
        
        if not indices:
            console.print("[yellow]No valid selection[/yellow]")
            return
        
        # Process selected products
        success_count = 0
        for idx in indices:
            product = products[idx]
            product_url = product.get("url")
            
            if not product_url:
                console.print(f"\n[red]Skipping: No URL for product {idx+1}[/red]")
                continue
            
            console.print(f"\n[cyan]{'='*60}[/cyan]")
            console.print(f"[cyan]Processing: {product.get('title', 'Unknown')}[/cyan]")
            console.print(f"[cyan]{'='*60}[/cyan]")
            
            try:
                # Extract full data
                raw_data = collector.extract_product_data(product_url)
                normalized = collector.normalize_extracted_data(raw_data)
                
                # Preview
                collector.preview_data(normalized)
                
                # Check if valid
                if not normalized.get("price"):
                    console.print("[red]❌ Skipping: No valid price[/red]")
                    continue
                
                # Confirm
                if Confirm.ask("Send this product?", default=True):
                    send_data = {k: v for k, v in normalized.items() if not k.startswith("_")}
                    if send_to_api(send_data, client):
                        success_count += 1
                    
                    # Small delay between products
                    if idx < indices[-1]:
                        collector.random_delay()
                else:
                    console.print("[yellow]⏭️  Skipped[/yellow]")
                    
            except Exception as e:
                console.print(f"[red]❌ Error: {e}[/red]")
                continue
        
        console.print(f"\n[green]✅ Sent {success_count}/{len(indices)} products successfully[/green]")
        
    finally:
        collector.close_browser()


# Register commands
cli.add_command(test)
cli.add_command(manual)
cli.add_command(url)
cli.add_command(keyword)


if __name__ == "__main__":
    cli()

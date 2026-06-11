"""
Data normalizer for browser collector
Matches server-side normalization logic
"""

import re
from typing import Optional


def normalize_price(raw: str | int | float | None) -> Optional[int]:
    """
    Normalize price to integer IDR
    
    Handles:
    - "Rp 1.299.000"
    - "Rp1.299.000"
    - "1.299.000"
    - "1,299,000"
    - "Rp 1,2 jt"
    - "1.2 juta"
    - 1299000 (already int)
    
    Returns:
        Integer price in IDR, or None if invalid
    """
    if raw is None or raw == "":
        return None
    
    # If already a number
    if isinstance(raw, (int, float)):
        return int(raw)
    
    # Convert to string
    text = str(raw).strip().lower()
    
    # Remove "rp", "rupiah", etc
    text = re.sub(r'\brp\.?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\brupiah\b', '', text, flags=re.IGNORECASE)
    
    # Handle "juta" / "jt" (millions)
    if 'juta' in text or 'jt' in text:
        # Extract number before "juta/jt"
        match = re.search(r'([\d.,]+)\s*(?:juta|jt)', text)
        if match:
            num_str = match.group(1).replace(',', '.')
            try:
                num = float(num_str)
                return int(num * 1_000_000)
            except ValueError:
                pass
    
    # Handle "ribu" / "rb" (thousands)
    if 'ribu' in text or 'rb' in text:
        match = re.search(r'([\d.,]+)\s*(?:ribu|rb)', text)
        if match:
            num_str = match.group(1).replace(',', '.')
            try:
                num = float(num_str)
                return int(num * 1_000)
            except ValueError:
                pass
    
    # Remove all non-digit characters except dots and commas
    text = re.sub(r'[^\d.,]', '', text)
    
    if not text:
        return None
    
    # Determine if dot or comma is decimal separator
    # Indonesian format: 1.299.000 (dots for thousands) or 1,299,000 (commas for thousands)
    # If last separator is 2 chars from end, it's decimal
    # Otherwise, it's thousands separator
    
    dot_count = text.count('.')
    comma_count = text.count(',')
    
    # If has both, assume Indonesian format (dots for thousands, comma for decimal)
    if dot_count > 0 and comma_count > 0:
        # Remove thousand separators (dots)
        text = text.replace('.', '')
        # Decimal separator (comma) -> dot
        text = text.replace(',', '.')
    elif dot_count > 1:
        # Multiple dots = thousand separator
        text = text.replace('.', '')
    elif comma_count > 1:
        # Multiple commas = thousand separator
        text = text.replace(',', '')
    elif dot_count == 1:
        # Single dot - could be decimal or thousand separator
        # If there are 3 digits after the dot, it's thousands
        if re.search(r'\.(\d{3})$', text):
            text = text.replace('.', '')
    elif comma_count == 1:
        # Single comma - same logic
        if re.search(r',(\d{3})$', text):
            text = text.replace(',', '')
        else:
            text = text.replace(',', '.')
    
    # Try to convert to float then int
    try:
        price = float(text)
        return int(price)
    except ValueError:
        return None


def normalize_marketplace(raw: str) -> str:
    """Normalize marketplace name"""
    if not raw:
        return "unknown"
    
    text = raw.strip().lower()
    
    # Remove common suffixes
    text = re.sub(r'\.(com|co\.id|id)$', '', text)
    
    # Map variations
    mapping = {
        "tokopedia": "tokopedia",
        "tokped": "tokopedia",
        "shopee": "shopee",
        "lazada": "lazada",
        "blibli": "blibli",
        "bukalapak": "bukalapak",
        "buklapak": "bukalapak",
        "buka lapak": "bukalapak",
    }
    
    return mapping.get(text, text)


def normalize_stock_status(raw: Optional[str]) -> str:
    """Normalize stock status"""
    if not raw:
        return "unknown"
    
    text = raw.strip().lower()
    
    # Map variations
    if any(word in text for word in ["tersedia", "ready", "in stock", "stok ada"]):
        return "in_stock"
    elif any(word in text for word in ["habis", "kosong", "out of stock", "sold out"]):
        return "out_of_stock"
    elif any(word in text for word in ["sedikit", "terbatas", "low stock"]):
        return "low_stock"
    elif "pre" in text and "order" in text:
        return "pre_order"
    else:
        return "unknown"


def normalize_condition(raw: Optional[str]) -> str:
    """Normalize product condition"""
    if not raw:
        return "new"
    
    text = raw.strip().lower()
    
    if any(word in text for word in ["bekas", "second", "used", "preloved"]):
        return "used"
    elif any(word in text for word in ["refurb", "refurbished", "rekondisi"]):
        return "refurbished"
    elif any(word in text for word in ["baru", "new", "original"]):
        return "new"
    else:
        return "new"  # Default to new


def extract_domain_from_url(url: str) -> str:
    """Extract marketplace domain from URL"""
    match = re.search(r'https?://(?:www\.)?([^/]+)', url)
    if match:
        domain = match.group(1)
        # Remove .com, .co.id, etc
        domain = re.sub(r'\.(com|co\.id|id)$', '', domain)
        return normalize_marketplace(domain)
    return "unknown"


def clean_title(raw: str) -> str:
    """Clean product title"""
    if not raw:
        return ""
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', raw)
    text = text.strip()
    
    # Remove emoji (basic regex)
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    
    # Limit length
    if len(text) > 200:
        text = text[:200] + "..."
    
    return text

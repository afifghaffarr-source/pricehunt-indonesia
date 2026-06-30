"""
extract_variant.py — Python port of src/lib/ingestion/extract-variant.ts
+ variant-normalizer.ts.

Extracts a variant label from an offer title, then matches it against
the product's existing product_variants rows to find the variant_id.

Usage:
    from extract_variant import extract_and_match_variant

    variant_id = extract_and_match_variant(
        title="iPhone 15 Pro Max 256GB - Official Store",
        product_id="...",
        supabase_url="...",
        service_key="...",
    )
"""
import re
import json
import urllib.request

# Regex patterns ported from variant-normalizer.ts
STORAGE_RE = re.compile(r"(\d+)\s*(gb|tb|mb)", re.IGNORECASE)
RAM_RE = re.compile(r"(\d+)\s*gb\s*ram|ram\s*(\d+)\s*gb", re.IGNORECASE)
COLOR_RE = re.compile(
    r"\b(hitam|putih|merah|biru|hijau|ungu|emas|perak|"
    r"black|white|red|blue|green|purple|pink|gold|silver|gray|grey)\b",
    re.IGNORECASE,
)
MODEL_RE = re.compile(r"\b(pro|max|plus|ultra|lite|mini)\b", re.IGNORECASE)
CONNECT_RE = re.compile(r"\b(5g|4g|wifi|nfc|esim|dual[\s-]?sim)\b", re.IGNORECASE)


def variant_normalize(text):
    """Port of variantNormalize() from variant-normalizer.ts."""
    if not text or not text.strip():
        return {"storage": None, "ram": None, "color": None, "model": None, "connectivity": None}

    s = text.lower()
    storage_match = STORAGE_RE.search(s)
    ram_match = RAM_RE.search(s)
    color_match = COLOR_RE.search(s)
    connect_match = CONNECT_RE.search(s)

    # Model: take LAST match (so "iPhone 16 Pro Max" → "max")
    model_matches = MODEL_RE.findall(s)
    last_model = model_matches[-1].lower() if model_matches else None

    return {
        "storage": f"{storage_match.group(1)}{storage_match.group(2).upper()}" if storage_match else None,
        "ram": f"{ram_match.group(1) or ram_match.group(2)}GB" if ram_match else None,
        "color": color_match.group(0).lower() if color_match else None,
        "model": last_model,
        "connectivity": connect_match.group(0).replace(" ", "").replace("-", "").lower() if connect_match else None,
    }


def extract_variant_from_title(title):
    """Port of extractVariantFromTitle() from extract-variant.ts.
    Returns a compact variant label like '256GB Black' or None."""
    if not title or not title.strip():
        return None

    n = variant_normalize(title)
    parts = [n["storage"], n["color"], n["connectivity"]]
    parts = [p for p in parts if p]
    return " ".join(parts) if parts else None


def find_matching_variant_id(product_id, title, supabase_url, service_key):
    """
    Extract variant from title and match against product's existing variants.
    Returns variant_id (str) or None.

    Strategy:
    1. Extract storage + color from title
    2. Fetch all active variants for the product
    3. Score each variant by how well it matches the extracted attributes
    4. Return the best match if score >= 2 (both storage AND color match)
       or score >= 1 (only storage match, color might be in title differently)

    Falls back to the default variant if no good match.
    """
    extracted = variant_normalize(title)
    if not extracted["storage"] and not extracted["color"]:
        return None  # No variant info in title

    # Fetch variants for the product
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/product_variants?product_id=eq.{product_id}&is_active=eq.true&select=id,storage,color,is_default",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "User-Agent": "curl/8.5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            variants = json.loads(r.read().decode())
    except Exception:
        return None

    if not variants:
        return None

    # Score each variant
    best = None
    best_score = 0
    for v in variants:
        score = 0
        if extracted["storage"] and v.get("storage") and extracted["storage"].lower() == v["storage"].lower():
            score += 2
        if extracted["color"] and v.get("color") and extracted["color"].lower() == v["color"].lower():
            score += 2
        # Prefer default variant as tiebreaker
        if v.get("is_default"):
            score += 0.5

        if score > best_score:
            best_score = score
            best = v

    # Require at least storage match (score >= 2) to be confident
    if best_score >= 2 and best is not None:
        return best["id"]
    return None

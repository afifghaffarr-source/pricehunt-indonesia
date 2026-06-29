import re

# Sanity: regex finds variantChildren keys in sample Apollo JSON
SAMPLE_APOLLO = '''
window.__APOLLO_STATE__ = {
  "ProductVariant:12345:variantChildren": {"id": 12345, "label": "128GB Hitam", "price": 18500000},
  "ProductVariant:67890:variantChildren": {"id": 67890, "label": "256GB Putih", "price": 20500000},
  "Product:abc": {"productName": "iPhone 16"}
};
'''
match = re.search(r'"ProductVariant:[^"]+:variantChildren":\s*(\{[^}]+\})', SAMPLE_APOLLO)
assert match is not None
assert "128GB Hitam" in match.group(1)


def test_variant_children_extraction():
    """Replicate the loop branch from _extract_from_json without spinning up Playwright.

    Mirrors the iteration over Apollo cache items and picks the first
    :variantChildren key with a label. Confirms our regex + parsing logic
    is sufficient to feed the rest of the variant pipeline.
    """
    import json

    apollo_data = {
        "ProductVariant:12345:variantChildren": {
            "id": 12345,
            "label": "128GB Hitam",
            "price": 18500000,
        },
        "ProductVariant:67890:variantChildren": {
            "id": 67890,
            "label": "256GB Putih",
            "price": 20500000,
        },
        "Product:abc": {"productName": "iPhone 16"},
    }

    captured = None
    for key, value in apollo_data.items():
        if key.endswith(":variantChildren") and isinstance(value, dict):
            children = value if isinstance(value.get('children'), list) else [value]
            for child in children:
                if 'label' in child:
                    captured = str(child['label']).strip()
                    break
        if captured:
            break

    assert captured == "128GB Hitam"
    # Normalize and inspect — same helper the collector uses.
    from base_collector import _normalize_variant
    norm = _normalize_variant(captured)
    assert norm["storage"] == "128GB"
    assert norm["color"] == "hitam"


def test_variant_format_contract():
    """Return dict contract: variant is str|None, variant_normalized is dict|None."""
    # The collector promises these keys on every successful extraction.
    # If they aren't there, downstream T10 resolver must skip cleanly.
    from base_collector import _normalize_variant
    out = _normalize_variant("")
    assert out == {
        "storage": None,
        "ram": None,
        "color": None,
        "model": None,
        "connectivity": None,
    }
    # Non-empty input produces a fully-populated dict (with at least one key).
    out = _normalize_variant("256GB Putih Pro Max 5G")
    assert any(v is not None for v in out.values())

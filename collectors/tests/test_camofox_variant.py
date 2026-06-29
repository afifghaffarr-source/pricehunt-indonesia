"""Phase 2 — Variant extraction sanity tests for Camofox scraper.

Tests the 3 regex patterns for Shopee (NEXT_DATA + DOM fallback),
Bukalapak ("Varian:" prefix), Blibli ("Varian dipilih:" prefix).

Mirrors tests/test_tokopedia_variant.py structure. No live browser;
purely exercises from_extraction() classmethods with synthetic data
dicts so this is safe to run in CI.
"""
import re

from camofox_scraper import (
    ShopeeProduct,
    BukalapakProduct,
    BlibliProduct,
)


def test_shopee_variant_via_next_data():
    """Primary path: __NEXT_DATA__ models[0].name → variant label.

    Shopee PDP hydrates a JSON script with `models[0].name` containing
    the currently-selected variant. Sanity-test that this regex finds
    it inside a synthetic blob.
    """
    blob = (
        '{"props":{"pageProps":{"initialState":{"models":['
        '{"id":"abc","name":"128GB Hitam","price":20000000}'
        ']}}}}'
    )
    m = re.search(
        r'"models"\s*:\s*\[\s*\{[^{}]*?"name"\s*:\s*"([^"]+)"',
        blob,
    )
    assert m is not None, "NEXT_DATA regex failed"
    assert m.group(1) == "128GB Hitam"

    # End-to-end through from_extraction: when __NEXT_DATA__ is in
    # data, variant must be populated even when bodyText lacks the
    # "Variasi" fallback marker.
    data = {
        "title": "iPhone 15 Pro Max",
        "price": "Rp20.000.000",
        "bodyText": "Stok: 50 Terjual 1.2rb Penilaian 1234 Nama Toko MYSHOP",
        "__NEXT_DATA__": blob,
    }
    p = ShopeeProduct.from_extraction("https://shopee.co.id/test", data)
    assert p.variant == "128GB Hitam", f"expected '128GB Hitam', got {p.variant!r}"


def test_shopee_variant_fallback_regex():
    """DOM fallback: visible text after "Variasi" label.

    When __NEXT_DATA__ is not in the data dict, fall back to a DOM-style
    regex on bodyText — the textual content of the element with
    data-testid="pdpVariationValue" appears right after the "Variasi"
    label.
    """
    body = (
        "Stok: 50 Terjual 1.2rb Penilaian 1234 Nama Toko MYSHOP\n"
        "Variasi\n"
        "128GB Hitam\n"
        "Spesifikasi tambahan"
    )
    data = {
        "title": "iPhone 15 Pro Max",
        "price": "Rp20.000.000",
        "bodyText": body,
    }
    p = ShopeeProduct.from_extraction("https://shopee.co.id/test", data)
    assert p.variant == "128GB Hitam", f"expected '128GB Hitam', got {p.variant!r}"


def test_bukalapak_variant_prefix():
    """Bukalapak: "Varian: <name>" prefix parse.

    The Bukalapak PDP UI renders the selected variant as
    "Varian:<name>" (or "Varian\\n<name>" when JS strips the colon).
    """
    body = "Varian:128GB Hitam\nStok:25\n150+ terjual\n89 Ulasan\nMYSHOP Follow"
    data = {
        "title": "Samsung Galaxy S24",
        "price": "Rp12.000.000",
        "bodyText": body,
    }
    p = BukalapakProduct.from_extraction("https://bukalapak.com/test", data)
    assert p.variant == "128GB Hitam", f"expected '128GB Hitam', got {p.variant!r}"


def test_blibli_variant_prefix():
    """Blibli: "Varian dipilih: <name>" prefix parse.

    Blibli labels the currently-selected variant with the longer
    Indonesian phrase "Varian dipilih:" (= "selected variant:").
    """
    body = (
        "iPhone 15 Pro Max\n"
        "Bagikan\n"
        "Rp12.999.000Rp16.499.00021%\n"
        "Varian dipilih:128GB Hitam\n"
        "Terjual 9,6 rb\n"
        "4,9 (3428)"
    )
    data = {
        "title": "iPhone 15 Pro Max",
        "price": "Rp12.999.000Rp16.499.00021%",
        "bodyText": body,
    }
    p = BlibliProduct.from_extraction("https://blibli.com/test", data)
    assert p.variant == "128GB Hitam", f"expected '128GB Hitam', got {p.variant!r}"

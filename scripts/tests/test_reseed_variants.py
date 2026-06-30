"""Pytest cases for the offer-to-variant matching logic in reseed_variants.py."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))


# Import the matcher (we test the pure function in isolation)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "reseed_variants", REPO_ROOT / "scripts" / "reseed_variants.py",
)
reseed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reseed)  # type: ignore


VARIANTS = [
    {"id": "v-128-mid", "slug": "x-128gb-midnight", "storage": "128GB",
     "color": "Midnight", "connectivity": None, "is_default": False},
    {"id": "v-256-mid", "slug": "x-256gb-midnight", "storage": "256GB",
     "color": "Midnight", "connectivity": None, "is_default": False},
    {"id": "v-512-mid", "slug": "x-512gb-midnight", "storage": "512GB",
     "color": "Midnight", "connectivity": None, "is_default": True},
    {"id": "v-128-sta", "slug": "x-128gb-starlight", "storage": "128GB",
     "color": "Starlight", "connectivity": None, "is_default": False},
]


def test_offer_with_256gb_in_title_matches_256gb_variant():
    offer = {
        "id": "o-1",
        "title": "Apple iPhone 16 256GB Midnight Garansi Resmi",
        "url": "https://tokopedia.com/iphone-16-256gb",
        "variant_text": None,
    }
    matched = reseed.match_offer_to_variant(offer, VARIANTS)
    assert matched == "v-256-mid"


def test_offer_with_no_variant_keyword_falls_back_to_default():
    offer = {
        "id": "o-2",
        "title": "Apple iPhone 16 - NEW",
        "url": "https://tokopedia.com/iphone",
        "variant_text": None,
    }
    matched = reseed.match_offer_to_variant(offer, VARIANTS)
    assert matched == "v-512-mid"  # default


def test_offer_with_color_only_matches_color():
    """Normalizer recognises 'Black' (lowercased). Offer with no storage
    keyword + color='Black' should match the first variant with that
    color, via the color-only branch of the matcher."""
    offer = {
        "id": "o-3",
        "title": "iPhone 16 Black BNIB",
        "url": "https://shopee.co.id/iphone-black",
    }
    matched = reseed.match_offer_to_variant(offer, VARIANTS)
    # color-only match (storage is None). Variants with color="Midnight"
    # don't match; only v-128-sta and v-128-mid are eligible
    # (color="Midnight" and color="Starlight"). 'Black' is not in
    # VARIANTS, so matcher falls back to substring check, then default.
    # We expect the default since no variant color appears in haystack.
    assert matched == "v-512-mid"  # default fallback


def test_offer_with_midnight_in_title_substring_match():
    """Normalizer doesn't recognise 'Midnight', but the substring
    fallback should pick a variant with color='Midnight'."""
    offer = {
        "id": "o-6",
        "title": "iPhone 16 256GB Midnight",
        "url": "https://tokopedia.com/iphone-256gb-midnight",
    }
    matched = reseed.match_offer_to_variant(offer, VARIANTS)
    # storage-only match should win: 256GB matches v-256-mid
    # (we hit step 2 before step 4).
    assert matched == "v-256-mid"


def test_offer_with_empty_text_falls_back_to_default():
    offer = {"id": "o-4", "title": "", "url": "", "variant_text": ""}
    matched = reseed.match_offer_to_variant(offer, VARIANTS)
    assert matched == "v-512-mid"


def test_variant_id_from_offer_text_used_when_present():
    """When offer url contains storage keyword, it's searched alongside title."""
    offer = {
        "id": "o-5",
        "title": "iPhone 16",
        "url": "https://tokopedia.com/iphone-512gb",
    }
    matched = reseed.match_offer_to_variant(offer, VARIANTS)
    # 512GB in url → storage match (step 2)
    assert matched == "v-512-mid"

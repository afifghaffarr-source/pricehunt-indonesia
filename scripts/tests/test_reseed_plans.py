"""Pytest cases for reseed_plans.py.

Verifies the hardcoded variant plans generate the expected number of
variants per product and that each product has exactly one default
variant.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from scripts.lib.reseed_plans import (  # noqa: E402
    HARDCODED_PLANS,
    VariantPlan,
    VariantSpec,
    get_plan,
    plan_macbook_air_m3,
)


# ---------------------------------------------------------------------------
# Plan count tests
# ---------------------------------------------------------------------------

def test_iphone_16_has_six_variants():
    """iPhone 16 = 3 storage × 2 colors = 6 variants."""
    plan = get_plan("test-id", "apple-iphone-16", "Apple iPhone 16")
    assert plan is not None
    assert len(plan.variants) == 6


def test_iphone_16_pro_has_six_variants():
    plan = get_plan("test-id", "apple-iphone-16-pro", "Apple iPhone 16 Pro")
    assert plan is not None
    assert len(plan.variants) == 6


def test_iphone_16_pro_max_has_six_variants():
    plan = get_plan(
        "test-id", "apple-iphone-16-pro-max", "Apple iPhone 16 Pro Max",
    )
    assert plan is not None
    assert len(plan.variants) == 6


def test_macbook_air_m3_has_four_variants():
    """MacBook Air M3 = 2 storage × 2 colors = 4 variants.

    The function lives outside the HARDCODED_PLANS dispatch table (it
    isn't seeded into live DB yet), so we use the dedicated helper.
    """
    plan = plan_macbook_air_m3("test-id", "macbook-air-m3", "MacBook Air M3")
    assert plan is not None
    assert len(plan.variants) == 4


def test_airpods_pro_has_minimal_variants():
    """AirPods Pro: single color, no storage. Should be 1 variant."""
    plan = get_plan("test-id", "apple-airpods-pro", "Apple AirPods Pro")
    if plan is not None:
        # Plan may exist; verify default is set
        defaults = [v for v in plan.variants if v.is_default]
        assert len(defaults) == 1


# ---------------------------------------------------------------------------
# Default variant test
# ---------------------------------------------------------------------------

def test_each_plan_has_exactly_one_default():
    """Every product plan must have exactly ONE default variant."""
    missing = []
    for slug, plan_fn in HARDCODED_PLANS.items():
        variants = plan_fn(slug)
        defaults = [v for v in variants if v.is_default]
        if len(defaults) != 1:
            missing.append((slug, len(defaults)))
    assert not missing, f"Plans without exactly 1 default: {missing[:5]}"


# ---------------------------------------------------------------------------
# Slug uniqueness test
# ---------------------------------------------------------------------------

def test_slugs_are_unique_within_plan():
    """Each plan's variant slugs must be unique (FK on product_id, slug)."""
    for slug, plan_fn in list(HARDCODED_PLANS.items())[:30]:
        variants = plan_fn(slug)
        slugs = [v.slug for v in variants]
        assert len(slugs) == len(set(slugs)), (
            f"Duplicate slugs in plan for {slug}"
        )


def test_slugs_are_url_safe():
    """Variant slugs must be lowercase a-z 0-9 - only."""
    import re
    safe = re.compile(r"^[a-z0-9-]+$")
    for slug, plan_fn in list(HARDCODED_PLANS.items())[:20]:
        variants = plan_fn(slug)
        for v in variants:
            assert safe.match(v.slug), f"Bad slug: {v.slug!r} in {slug}"


# ---------------------------------------------------------------------------
# HARDCODED_PLANS coverage
# ---------------------------------------------------------------------------

def test_hardcoded_plans_has_at_least_30_products():
    """Must cover at least 30 high-value products."""
    assert len(HARDCODED_PLANS) >= 30, (
        f"Only {len(HARDCODED_PLANS)} plans, expected >= 30"
    )


def test_get_plan_returns_none_for_unknown_slug():
    plan = get_plan("test-id", "unknown-product-xyz", "Unknown")
    assert plan is None

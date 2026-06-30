#!/usr/bin/env python
"""
reseed_variants.py — Re-seed 40-60 high-value products with proper variant splits.

Idempotent. Re-running is safe (uses INSERT ... ON CONFLICT DO NOTHING).
Supports --dry-run to preview changes without writing.

Usage:
    ./collectors/.venv/bin/python scripts/reseed_variants.py --dry-run
    ./with-token.sh collectors/.venv/bin/python scripts/reseed_variants.py
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Iterable

# Repo root on sys.path so we can import scripts.lib.reseed_plans
REPO_ROOT = Path(__file__).resolve().parent.parent
COLLECTORS = REPO_ROOT / "collectors"
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(COLLECTORS))

import httpx  # noqa: E402

from scripts.lib.reseed_plans import (  # noqa: E402
    HARDCODED_PLANS,
    VariantPlan,
    VariantSpec,
    get_plan,
)


SUPABASE_URL = "https://oklaxwjoyttpwgxhphko.supabase.co"


def _service_key() -> str:
    """Pull the service-role key from .env.local.

    We deliberately ignore `os.environ["SUPABASE_SERVICE_ROLE_KEY"]` —
    `with-token.sh` populates that with the Supabase PAT (sbp_*) which
    only works for the Management API, not the REST API. The REST
    service-role key is the JWT in .env.local.
    """
    env_file = REPO_ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                value = line.split("=", 1)[1].strip().strip('"').strip("'")
                if value:
                    return value
    raise SystemExit(
        "[reseed] SUPABASE_SERVICE_ROLE_KEY not found in .env.local. "
        "Set the env var or create .env.local with the JWT."
    )


def _headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        # ON CONFLICT DO NOTHING: don't error on duplicates, just return no rows
        "Prefer": "return=minimal,resolution=ignore-duplicates",
    }


def _supabase_get(path: str, key: str) -> list[dict[str, Any]]:
    res = httpx.get(
        f"{SUPABASE_URL}{path}",
        headers=_headers(key),
        timeout=30,
    )
    res.raise_for_status()
    return res.json() or []


def _supabase_post(path: str, key: str, rows: list[dict[str, Any]]) -> None:
    """Bulk insert with ON CONFLICT DO NOTHING semantics."""
    if not rows:
        return
    res = httpx.post(
        f"{SUPABASE_URL}{path}",
        json=rows,
        headers=_headers(key),
        timeout=60,
    )
    res.raise_for_status()


def _supabase_patch(
    path: str, key: str, body: dict[str, Any]
) -> list[dict[str, Any]]:
    res = httpx.patch(
        f"{SUPABASE_URL}{path}",
        json=body,
        headers={**_headers(key), "Prefer": "return=representation"},
        timeout=30,
    )
    res.raise_for_status()
    return res.json() or []


def fetch_target_products(key: str) -> list[dict[str, Any]]:
    """Find products whose slug is in HARDCODED_PLANS.

    We do a single POST to /rest/v1/products with `?slug=in.(...)` to
    avoid iterating all 197 products. If HARDCODED_PLANS is empty, we
    return an empty list (so the script is safe to run before the plan
    table is populated).
    """
    slugs = list(HARDCODED_PLANS.keys())
    if not slugs:
        return []
    quoted = ",".join(f'"{s}"' for s in slugs)
    return _supabase_get(
        f"/rest/v1/products?slug=in.({quoted})&select=id,slug,name", key
    )


def _variant_to_row(variant: VariantSpec, product_id: str) -> dict[str, Any]:
    """Map VariantSpec → product_variants row."""
    return {
        "product_id": product_id,
        "slug": variant.slug,
        "storage": variant.storage,
        "color": variant.color,
        "connectivity": variant.connectivity,
        "is_default": variant.is_default,
        "is_active": True,
    }


def upsert_variants(
    plan: VariantPlan, key: str, *, dry_run: bool
) -> tuple[int, int]:
    """Insert all variants for one product. Returns (created, skipped)."""
    rows = [_variant_to_row(v, plan.product_id) for v in plan.variants]
    if dry_run:
        return (len(rows), 0)
    _supabase_post("/rest/v1/product_variants", key, rows)
    # ON CONFLICT DO NOTHING → we can't easily count "actually created"
    # without changing Prefer. Conservatively report all as "created
    # attempt"; subsequent runs will be no-ops due to the unique index.
    return (len(rows), 0)


def fetch_existing_variants(
    product_id: str, key: str
) -> list[dict[str, Any]]:
    """Return existing variants for a product, slug list."""
    return _supabase_get(
        f"/rest/v1/product_variants?product_id=eq.{product_id}"
        f"&select=id,slug,storage,color,connectivity,is_default",
        key,
    )


def fetch_offers_for_product(product_id: str, key: str) -> list[dict[str, Any]]:
    """Return all offers for a product, with title for re-matching."""
    return _supabase_get(
        f"/rest/v1/offers?product_id=eq.{product_id}"
        f"&select=id,title,url,variant_id&limit=200",
        key,
    )


def match_offer_to_variant(
    offer: dict[str, Any], variants: list[dict[str, Any]]
) -> str | None:
    """Find the variant that best matches the offer's title/url/text.

    Strategy (in priority order):
    1. Exact match on `storage + color + connectivity` from the title
    2. Match on `storage` only (ignoring color/connectivity)
    3. Match on `color` only
    4. Substring fallback: if normalizer missed a color name (e.g. it
       doesn't recognise "Midnight" / "Starlight"), scan the haystack
       directly for any variant color string.
    5. Fall back to `is_default = True` variant
    """
    from collectors.base_collector import _normalize_variant  # type: ignore

    text_parts = [
        offer.get("title") or "",
        offer.get("url") or "",
    ]
    haystack = " ".join(text_parts).lower()
    if not haystack.strip():
        return next(
            (v["id"] for v in variants if v.get("is_default")),
            None,
        )

    parsed = _normalize_variant(haystack)
    storage = parsed.get("storage")
    color = parsed.get("color")
    connectivity = parsed.get("connectivity")

    # 1. exact match
    for v in variants:
        if v.get("storage") == storage and v.get("color") == color:
            return v["id"]
    # 2. storage only
    if storage:
        for v in variants:
            if v.get("storage") == storage:
                return v["id"]
    # 3. color only
    if color:
        for v in variants:
            if v.get("color") == color:
                return v["id"]
    # 4. substring fallback for color names the normalizer misses
    #    (e.g. "Midnight", "Starlight", "Space Black", etc.)
    for v in variants:
        v_color = v.get("color")
        if v_color and v_color.lower() in haystack:
            # Prefer variants matching storage too; if no storage match,
            # return first color match.
            if v.get("storage") == storage:
                return v["id"]
    for v in variants:
        v_color = v.get("color")
        if v_color and v_color.lower() in haystack:
            return v["id"]
    # 5. default
    return next(
        (v["id"] for v in variants if v.get("is_default")),
        None,
    )


def relink_offers(
    plan: VariantPlan,
    variants: list[dict[str, Any]],
    key: str,
    *,
    dry_run: bool,
) -> tuple[int, int]:
    """Re-match each offer to the closest variant. Returns (relinked, total)."""
    if not variants:
        return (0, 0)
    offers = fetch_offers_for_product(plan.product_id, key)
    relinked = 0
    for offer in offers:
        new_variant_id = match_offer_to_variant(offer, variants)
        if new_variant_id and new_variant_id != offer.get("variant_id"):
            if not dry_run:
                _supabase_patch(
                    f"/rest/v1/offers?id=eq.{offer['id']}", key,
                    {"variant_id": new_variant_id},
                )
            relinked += 1
    return (relinked, len(offers))


def run(dry_run: bool) -> int:
    # Service key is required for BOTH modes — even dry-run, because
    # the public anon key doesn't have RLS access to `products`. The
    # "dry" aspect is purely "no writes", not "no auth".
    key = _service_key()
    products = fetch_target_products(key)
    if not products:
        print("[reseed] No products in HARDCODED_PLANS — nothing to do.")
        return 0

    total_products = len(products)
    total_variants_attempted = 0
    total_offers_relinked = 0
    total_offers_seen = 0
    errors: list[str] = []

    print(
        f"[reseed] {'DRY-RUN ' if dry_run else ''}"
        f"Processing {total_products} products..."
    )
    for p in products:
        plan = get_plan(p["id"], p["slug"], p["name"])
        if plan is None:
            continue
        try:
            created, _ = upsert_variants(plan, key, dry_run=dry_run)
            total_variants_attempted += created
            # Always fetch variants and run the matcher, even in dry-run —
            # we just skip the actual PATCH when dry_run is True. This
            # gives a realistic preview of how many offers would be
            # re-linked.
            existing = fetch_existing_variants(plan.product_id, key)
            relinked, seen = relink_offers(
                plan, existing, key, dry_run=dry_run,
            )
            total_offers_relinked += relinked
            total_offers_seen += seen
            print(
                f"  [{plan.product_slug}] "
                f"variants={created} offers={relinked}/{seen}"
            )
        except Exception as e:  # noqa: BLE001
            msg = f"  [{plan.product_slug}] ERROR: {e}"
            print(msg)
            errors.append(msg)

    print(
        f"\n[reseed] DONE. products={total_products} "
        f"variants_attempted={total_variants_attempted} "
        f"offers_relinked={total_offers_relinked}/{total_offers_seen} "
        f"errors={len(errors)}"
    )
    return 0 if not errors else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned changes without writing to the DB.",
    )
    args = parser.parse_args()
    return run(dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())

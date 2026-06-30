"""
reseed_plans.py — Hardcoded variant plans for top 40-50 products.

This module is the source of truth for *which* variants each high-value
product should have. Re-seeding just iterates `HARDCODED_PLANS` and
upserts product_variants rows from the (storage × color × connectivity)
cartesian product.

Design notes
------------
* We hardcode plans instead of inferring from offer data: the offer
  set is sparse (148 offers for 60 products), so inference would miss
  real-world variants. Hardcoded knowledge is safer.
* Products NOT in this list are skipped — we never auto-generate plans
  from names (see Phase 5 brief "Out of scope: auto-generating plans
  via AI").
* `slug` is built from product slug + storage + color, lowercased and
  sanitised to URL-safe (a-z 0-9 -). This guarantees uniqueness inside
  one product and matches Phase 4's `product_variants_product_slug_uq`
  partial unique index.
* Exactly ONE variant per product gets `is_default = True`. The
  "popular" default is 128GB / WiFi / Black / Midnight where applicable
  (i.e. the entry point tier most buyers start from).
* Re-running this script is idempotent: `INSERT … ON CONFLICT
  (product_id, slug) DO NOTHING` is the contract (see ReseedRunner).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class VariantSpec:
    """One row of a product's variant matrix."""
    slug: str
    storage: Optional[str] = None
    color: Optional[str] = None
    connectivity: Optional[str] = None
    is_default: bool = False


@dataclass(frozen=True)
class VariantPlan:
    """A product's full variant matrix."""
    product_id: str
    product_slug: str
    product_name: str
    variants: list[VariantSpec] = field(default_factory=list)

    @property
    def default_variant(self) -> Optional[VariantSpec]:
        for v in self.variants:
            if v.is_default:
                return v
        return None


# ---------------------------------------------------------------------------
# Plan builder — cartesian product of (storage × color × connectivity)
# ---------------------------------------------------------------------------

def _slug(*parts: Optional[str]) -> str:
    """Join parts with `-`, lowercase, strip empties, sanitise to [a-z0-9-]."""
    out: list[str] = []
    for p in parts:
        if not p:
            continue
        s = p.lower().strip()
        s = s.replace(" ", "-").replace("/", "-")
        # Keep only alphanumerics + hyphens
        s = "".join(c if (c.isalnum() or c == "-") else "" for c in s)
        if s and s != "-":
            out.append(s)
    return "-".join(out) if out else "default"


def _build_variant(
    product_slug: str,
    *,
    storage: Optional[str] = None,
    color: Optional[str] = None,
    connectivity: Optional[str] = None,
    is_default: bool = False,
) -> VariantSpec:
    """Create one VariantSpec. Slug is product-slug + the non-None attrs."""
    slug = _slug(product_slug, storage, color, connectivity)
    return VariantSpec(
        slug=slug,
        storage=storage,
        color=color,
        connectivity=connectivity,
        is_default=is_default,
    )


def _cartesian(
    product_slug: str,
    storages: list[str],
    colors: list[str],
    connectivity: Optional[str] = None,
    default_storage: Optional[str] = None,
    default_color: Optional[str] = None,
) -> list[VariantSpec]:
    """Build the full variant matrix; mark exactly one as default."""
    default_storage = default_storage or (storages[0] if storages else None)
    default_color = default_color or (colors[0] if colors else None)
    out: list[VariantSpec] = []
    for s in storages:
        for c in colors:
            out.append(
                _build_variant(
                    product_slug,
                    storage=s,
                    color=c,
                    connectivity=connectivity,
                    is_default=(s == default_storage and c == default_color),
                )
            )
    # Defensive: if no variant was marked default (e.g. default_storage
    # wasn't in storages), fall back to the first.
    if out and not any(v.is_default for v in out):
        out = list(out)
        first = out[0]
        out[0] = VariantSpec(
            slug=first.slug,
            storage=first.storage,
            color=first.color,
            connectivity=first.connectivity,
            is_default=True,
        )
    return out


# ---------------------------------------------------------------------------
# Hardcoded plans — keyed by product slug
# ---------------------------------------------------------------------------

# Storage tiers per line. iPhone 16 has 128/256/512; Pro Max starts at 256.
# Samsung S24 starts at 256 (no 128 SKU sold in ID).
# MacBook Air / Pro storage tiers (smaller set).
# iPad Air / Pro storage tiers.

IPHONE16_STORAGES   = ["128GB", "256GB", "512GB"]
IPHONE16PM_STORAGES = ["256GB", "512GB", "1TB"]
SAMSUNG_S_STORAGES  = ["256GB", "512GB"]
SAMSUNG_S_ULTRA_STORAGES = ["256GB", "512GB", "1TB"]
MAC_AIR_STORAGES    = ["256GB", "512GB"]
MAC_PRO_STORAGES    = ["512GB", "1TB"]
IPAD_AIR_STORAGES   = ["128GB", "256GB"]
XIAOMI_STORAGES     = ["256GB", "512GB"]
REDMI_STORAGES      = ["128GB", "256GB"]

# Color sets per product line. iPhone 16 (non-Pro) and Samsung base S
# lines share a colorful palette; Pro/Ultra lines use Titanium.
# We keep 2 colors per product to stay within the brief's
# 100-200 total variants budget.
IPHONE16_COLORS     = ["Ultramarine", "Black"]
IPHONE16_PRO_COLORS = ["Natural Titanium", "Black Titanium"]
SAMSUNG_S_COLORS    = ["Onyx Black", "Marble Gray"]
SAMSUNG_S_ULTRA_COLORS = ["Titanium Black", "Titanium Gray"]
SAMSUNG_A_COLORS    = ["Black", "Blue"]
MAC_AIR_COLORS      = ["Midnight", "Starlight"]
MAC_PRO_COLORS      = ["Space Black", "Silver"]
IPAD_AIR_COLORS     = ["Space Gray", "Blue"]
XIAOMI_COLORS       = ["Black", "White"]
REDMI_COLORS        = ["Black", "Blue"]


def get_plan(product_id: str, product_slug: str, product_name: str) -> Optional[VariantPlan]:
    """Return a VariantPlan for this product, or None if we have no plan.

    The match is by `product_slug` (the canonical URL slug is the most
    stable identifier — names sometimes have version-cased variants
    like "Apple iPhone 16" vs "apple iphone 16" but slug is normalised).
    """
    plan_fn = HARDCODED_PLANS.get(product_slug)
    if plan_fn is None:
        return None
    variants = plan_fn(product_slug)
    return VariantPlan(
        product_id=product_id,
        product_slug=product_slug,
        product_name=product_name,
        variants=variants,
    )


# ---------------------------------------------------------------------------
# Plan functions per product slug
# ---------------------------------------------------------------------------

def _iphone16(slug: str) -> list[VariantSpec]:
    # 3 storage × 2 colors = 6 variants
    return _cartesian(
        slug, IPHONE16_STORAGES, IPHONE16_COLORS,
        default_storage="128GB", default_color="Ultramarine",
    )

def _iphone16_plus(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, IPHONE16_COLORS,
        default_storage="128GB", default_color="Ultramarine",
    )

def _iphone16_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, IPHONE16_PRO_COLORS,
        default_storage="128GB", default_color="Natural Titanium",
    )

def _iphone16_pro_max(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16PM_STORAGES, IPHONE16_PRO_COLORS,
        default_storage="256GB", default_color="Natural Titanium",
    )

def _iphone15(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Black", "Pink"],
        default_storage="128GB", default_color="Black",
    )

def _iphone15_plus(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Black", "Pink"],
        default_storage="128GB", default_color="Black",
    )

def _iphone15_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Natural Titanium", "Black Titanium"],
        default_storage="128GB", default_color="Natural Titanium",
    )

def _iphone15_pro_max(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16PM_STORAGES, ["Natural Titanium", "Black Titanium"],
        default_storage="256GB", default_color="Natural Titanium",
    )

def _iphone14(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Midnight", "Starlight"],
        default_storage="128GB", default_color="Midnight",
    )

def _iphone14_plus(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Midnight", "Starlight"],
        default_storage="128GB", default_color="Midnight",
    )

def _iphone14_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Space Black", "Silver"],
        default_storage="128GB", default_color="Space Black",
    )

def _iphone14_pro_max(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16PM_STORAGES, ["Space Black", "Silver"],
        default_storage="256GB", default_color="Space Black",
    )

def _iphone13(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Midnight", "Starlight"],
        default_storage="128GB", default_color="Midnight",
    )

def _iphone13_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB", "512GB"], ["Graphite", "Silver"],
        default_storage="128GB", default_color="Graphite",
    )

def _iphone12(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB", "256GB"], ["Black", "White"],
        default_storage="128GB", default_color="Black",
    )

def _iphone12_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Graphite", "Silver"],
        default_storage="128GB", default_color="Graphite",
    )

def _iphone11(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB", "256GB"], ["Black", "White"],
        default_storage="128GB", default_color="Black",
    )

def _iphone11_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "256GB", "512GB"], ["Space Gray", "Silver"],
        default_storage="64GB", default_color="Space Gray",
    )

def _iphone11_pro_max(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "256GB", "512GB"], ["Space Gray", "Silver"],
        default_storage="64GB", default_color="Space Gray",
    )

def _iphone13_mini(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Midnight", "Starlight"],
        default_storage="128GB", default_color="Midnight",
    )

def _iphone13_pro_max(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB", "1TB"], ["Graphite", "Silver"],
        default_storage="256GB", default_color="Graphite",
    )

def _iphone12_mini(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB", "256GB"], ["Black", "White"],
        default_storage="128GB", default_color="Black",
    )

def _iphone12_pro_max(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Graphite", "Silver"],
        default_storage="128GB", default_color="Graphite",
    )

def _iphone16e(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPHONE16_STORAGES, ["Black", "White"],
        default_storage="128GB", default_color="Black",
    )

# --- Samsung Galaxy S -------------------------------------------------------

def _samsung_s(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, SAMSUNG_S_STORAGES, SAMSUNG_S_COLORS[:2],
        default_storage="256GB", default_color="Onyx Black",
    )

def _samsung_s_plus(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, SAMSUNG_S_STORAGES, SAMSUNG_S_COLORS[:2],
        default_storage="256GB", default_color="Onyx Black",
    )

def _samsung_s_ultra(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB", "1TB"], ["Titanium Black", "Titanium Gray", "Titanium Violet", "Titanium Yellow"],
        default_storage="256GB", default_color="Titanium Black",
    )

def _samsung_s_fe(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], SAMSUNG_S_COLORS[:2],
        default_storage="128GB", default_color="Onyx Black",
    )

def _samsung_s25(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB", "512GB"], ["Silver Shadow", "Mint", "Iceblue", "Navy"],
        default_storage="256GB", default_color="Silver Shadow",
    )

def _samsung_s25_plus(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Silver Shadow", "Mint", "Iceblue", "Navy"],
        default_storage="256GB", default_color="Silver Shadow",
    )

def _samsung_s25_ultra(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB", "1TB"], ["Titanium Silverblue", "Titanium Black", "Titanium Whitesilver", "Titanium Gray"],
        default_storage="256GB", default_color="Titanium Black",
    )

def _samsung_s23(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB", "512GB"], ["Phantom Black", "Cream", "Green", "Lavender"],
        default_storage="128GB", default_color="Phantom Black",
    )

def _samsung_s23_plus(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Phantom Black", "Cream", "Green", "Lavender"],
        default_storage="256GB", default_color="Phantom Black",
    )

def _samsung_s23_ultra(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB", "1TB"], ["Phantom Black", "Cream", "Green", "Lavender"],
        default_storage="256GB", default_color="Phantom Black",
    )

def _samsung_s23_fe(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Graphite", "Mint", "Purple", "Cream"],
        default_storage="128GB", default_color="Graphite",
    )

def _samsung_s22(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Phantom Black", "White", "Pink Gold", "Green", "Graphite"],
        default_storage="128GB", default_color="Phantom Black",
    )

def _samsung_s22_plus(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Phantom Black", "White", "Pink Gold", "Green", "Graphite"],
        default_storage="128GB", default_color="Phantom Black",
    )

def _samsung_s22_ultra(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB", "512GB", "1TB"], ["Phantom Black", "White", "Burgundy", "Green", "Graphite"],
        default_storage="128GB", default_color="Phantom Black",
    )

# --- Samsung Galaxy A -------------------------------------------------------

def _samsung_a(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB"], SAMSUNG_A_COLORS,
        default_storage="128GB", default_color="Black",
    )

def _samsung_a15(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Black", "Blue", "Yellow", "Light Blue"],
        default_storage="128GB", default_color="Black",
    )

def _samsung_a25(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Black", "Blue", "Yellow", "Light Blue"],
        default_storage="128GB", default_color="Black",
    )

def _samsung_a35(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Awesome Iceblue", "Awesome Navy", "Awesome Lilac", "Awesome Lemon"],
        default_storage="128GB", default_color="Awesome Navy",
    )

def _samsung_a55(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Awesome Iceblue", "Awesome Navy", "Awesome Lilac", "Awesome Lemon"],
        default_storage="128GB", default_color="Awesome Navy",
    )

def _samsung_a56(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Awesome Graphite", "Awesome Olive", "Awesome Pink", "Awesome Lightgray"],
        default_storage="128GB", default_color="Awesome Graphite",
    )

def _samsung_a36(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Awesome Graphite", "Awesome Olive", "Awesome Pink", "Awesome Lightgray"],
        default_storage="128GB", default_color="Awesome Graphite",
    )

def _samsung_a16(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Black", "Blue", "Yellow", "Light Green"],
        default_storage="128GB", default_color="Black",
    )

def _samsung_a26(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Black", "Mint", "Peach", "White"],
        default_storage="128GB", default_color="Black",
    )

def _samsung_a15s(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB"], ["Black", "Blue", "Yellow", "Red"],
        default_storage="128GB", default_color="Black",
    )

def _samsung_a05(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB"], ["Black", "Silver", "Light Green"],
        default_storage="128GB", default_color="Black",
    )

def _samsung_a05s(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB"], ["Black", "Silver", "Light Violet"],
        default_storage="128GB", default_color="Black",
    )

def _samsung_a06(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB"], ["Black", "Silver", "Light Green"],
        default_storage="128GB", default_color="Black",
    )

# --- Samsung Galaxy Z -------------------------------------------------------

def _samsung_zflip(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Mint", "Graphite", "Cream", "Lavender", "Silver", "Yellow", "Blue"],
        default_storage="256GB", default_color="Graphite",
    )

def _samsung_zfold(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB", "1TB"], ["Phantom Black", "Cream", "Silver", "Navy", "Pink"],
        default_storage="256GB", default_color="Phantom Black",
    )

# --- Xiaomi -----------------------------------------------------------------

def _xiaomi(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, XIAOMI_STORAGES, XIAOMI_COLORS,
        default_storage="256GB", default_color="Black",
    )

def _xiaomi_14_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Black", "White", "Titan Gray"],
        default_storage="256GB", default_color="Black",
    )

def _xiaomi_14_ultra(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Black", "White"],
        default_storage="256GB", default_color="Black",
    )

def _xiaomi_13t(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB"], ["Black", "Blue", "Green"],
        default_storage="256GB", default_color="Black",
    )

def _xiaomi_13t_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Black", "Blue", "Green"],
        default_storage="256GB", default_color="Black",
    )

def _xiaomi_15(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Black", "White", "Green", "Liquid Silver"],
        default_storage="256GB", default_color="Black",
    )

# --- Xiaomi Redmi -----------------------------------------------------------

def _xiaomi_redmi(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, REDMI_STORAGES, REDMI_COLORS,
        default_storage="128GB", default_color="Black",
    )

def _xiaomi_redmi_note_13(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Ice Blue", "Mint Green", "Midnight Black", "Ocean Sunset"],
        default_storage="128GB", default_color="Midnight Black",
    )

def _xiaomi_redmi_note_13_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Midnight Black", "Forest Green", "Lavender Purple"],
        default_storage="256GB", default_color="Midnight Black",
    )

def _xiaomi_redmi_note_14(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Midnight Black", "Ocean Blue", "Lime Green", "Purple Mist"],
        default_storage="128GB", default_color="Midnight Black",
    )

def _xiaomi_redmi_note_14_pro(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Midnight Black", "Ocean Blue", "Coral Green", "Lavender Purple"],
        default_storage="256GB", default_color="Midnight Black",
    )

def _xiaomi_redmi_13(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Midnight Black", "Sandy Gold", "Ocean Blue", "Lily White"],
        default_storage="128GB", default_color="Midnight Black",
    )

def _xiaomi_redmi_13c(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Midnight Black", "Navy Blue", "Clover Green", "Glacier White"],
        default_storage="128GB", default_color="Midnight Black",
    )

# --- Oppo -------------------------------------------------------------------

def _oppo_reno(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Matte Gray", "Sunset Pink", "Feather Blue", "Black"],
        default_storage="256GB", default_color="Black",
    )

def _oppo_find(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Black", "Blue", "White"],
        default_storage="256GB", default_color="Black",
    )

def _oppo_a(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Glowing Black", "Dazzling Purple", "Sunset Orange"],
        default_storage="128GB", default_color="Glowing Black",
    )

# --- Vivo -------------------------------------------------------------------

def _vivo_v(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Bloom White", "Lava Black", "Noble Blue", "Rose Gold"],
        default_storage="256GB", default_color="Lava Black",
    )

def _vivo_x(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB", "1TB"], ["Asteroid Black", "Startrail Blue", "Sunset Orange", "White"],
        default_storage="256GB", default_color="Asteroid Black",
    )

def _vivo_y(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Glitter Aqua", "Meteor Black", "Sunset Gold"],
        default_storage="128GB", default_color="Meteor Black",
    )

# --- Realme -----------------------------------------------------------------

def _realme_number(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB", "512GB"], ["Skyline Gold", "Victory Gold", "Speed Green", "Dark Purple"],
        default_storage="256GB", default_color="Speed Green",
    )

def _realme_gt(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["256GB", "512GB"], ["Fluid Silver", "Razer Green", "Nitro Blue"],
        default_storage="256GB", default_color="Razer Green",
    )

def _realme_c(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["128GB", "256GB"], ["Sunny Oasis", "Black Rock", "Starry Black"],
        default_storage="128GB", default_color="Starry Black",
    )

def _realme_note(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, ["64GB", "128GB"], ["Sky Blue", "Midnight Black"],
        default_storage="128GB", default_color="Midnight Black",
    )

# --- Apple iPad / MacBook / AirPods / Sony ----------------------------------

def _ipad_air_11(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPAD_AIR_STORAGES, IPAD_AIR_COLORS,
        default_storage="128GB", default_color="Space Gray",
    )

def _ipad_air_13(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, IPAD_AIR_STORAGES, IPAD_AIR_COLORS,
        default_storage="128GB", default_color="Space Gray",
    )

def _macbook_pro_16_m3_max(slug: str) -> list[VariantSpec]:
    # 2 storage × 2 colors = 4 variants
    return _cartesian(
        slug, MAC_PRO_STORAGES, MAC_PRO_COLORS,
        default_storage="1TB", default_color="Space Black",
    )

def _airpods_pro_2(slug: str) -> list[VariantSpec]:
    # Single SKU; connectivity = "Bluetooth"; minor colour variants
    return [
        _build_variant(slug, connectivity="Bluetooth", is_default=True),
    ]

def _sony_wh1000xm5(slug: str) -> list[VariantSpec]:
    # 2 colors × 1 storage = 2 variants
    return _cartesian(
        slug, ["Onboard Storage"], ["Black", "Silver"],
        default_storage="Onboard Storage", default_color="Black",
    )

# ---------------------------------------------------------------------------
# Dispatch table — slug → plan function
# ---------------------------------------------------------------------------

HARDCODED_PLANS: dict[str, Callable[[str], list[VariantSpec]]] = {
    # iPhones
    "apple-iphone-16": _iphone16,
    "apple-iphone-16-plus": _iphone16_plus,
    "apple-iphone-16-pro": _iphone16_pro,
    "apple-iphone-16-pro-max": _iphone16_pro_max,
    "apple-iphone-16e": _iphone16e,
    "apple-iphone-15": _iphone15,
    "apple-iphone-15-plus": _iphone15_plus,
    "apple-iphone-15-pro": _iphone15_pro,
    "apple-iphone-15-pro-max": _iphone15_pro_max,
    "apple-iphone-14": _iphone14,
    "apple-iphone-14-plus": _iphone14_plus,
    "apple-iphone-14-pro": _iphone14_pro,
    "apple-iphone-14-pro-max": _iphone14_pro_max,
    "apple-iphone-13": _iphone13,
    "apple-iphone-13-mini": _iphone13_mini,
    "apple-iphone-13-pro": _iphone13_pro,
    "apple-iphone-13-pro-max": _iphone13_pro_max,
    "apple-iphone-12": _iphone12,
    "apple-iphone-12-mini": _iphone12_mini,
    "apple-iphone-12-pro": _iphone12_pro,
    "apple-iphone-12-pro-max": _iphone12_pro_max,
    "apple-iphone-11": _iphone11,
    "apple-iphone-11-pro": _iphone11_pro,
    "apple-iphone-11-pro-max": _iphone11_pro_max,
    # Samsung Galaxy S
    "samsung-galaxy-s24": _samsung_s,
    "samsung-galaxy-s24-plus": _samsung_s_plus,
    "samsung-galaxy-s24-ultra": _samsung_s_ultra,
    "samsung-galaxy-s24-fe": _samsung_s_fe,
    "samsung-galaxy-s23": _samsung_s23,
    "samsung-galaxy-s23-plus": _samsung_s23_plus,
    "samsung-galaxy-s23-ultra": _samsung_s23_ultra,
    "samsung-galaxy-s23-fe": _samsung_s23_fe,
    "samsung-galaxy-s22": _samsung_s22,
    "samsung-galaxy-s22-plus": _samsung_s22_plus,
    "samsung-galaxy-s22-ultra": _samsung_s22_ultra,
    "samsung-galaxy-s25": _samsung_s25,
    "samsung-galaxy-s25-plus": _samsung_s25_plus,
    "samsung-galaxy-s25-ultra": _samsung_s25_ultra,
    # Samsung Galaxy A
    "samsung-galaxy-a05": _samsung_a05,
    "samsung-galaxy-a05s": _samsung_a05s,
    "samsung-galaxy-a06": _samsung_a06,
    "samsung-galaxy-a15": _samsung_a15,
    "samsung-galaxy-a15s": _samsung_a15s,
    "samsung-galaxy-a16": _samsung_a16,
    "samsung-galaxy-a25": _samsung_a25,
    "samsung-galaxy-a26": _samsung_a26,
    "samsung-galaxy-a35": _samsung_a35,
    "samsung-galaxy-a36": _samsung_a36,
    "samsung-galaxy-a55": _samsung_a55,
    "samsung-galaxy-a56": _samsung_a56,
    # Samsung Galaxy Z
    "samsung-galaxy-z-flip-5": _samsung_zflip,
    "samsung-galaxy-z-flip-6": _samsung_zflip,
    "samsung-galaxy-z-fold-5": _samsung_zfold,
    "samsung-galaxy-z-fold-6": _samsung_zfold,
    # Xiaomi
    "xiaomi-14": _xiaomi,
    "xiaomi-14-pro": _xiaomi_14_pro,
    "xiaomi-14-ultra": _xiaomi_14_ultra,
    "xiaomi-13t": _xiaomi_13t,
    "xiaomi-13t-pro": _xiaomi_13t_pro,
    "xiaomi-15": _xiaomi_15,
    # Xiaomi Redmi
    "xiaomi-redmi-13": _xiaomi_redmi_13,
    "xiaomi-redmi-13c": _xiaomi_redmi_13c,
    "xiaomi-redmi-note-13": _xiaomi_redmi_note_13,
    "xiaomi-redmi-note-13-pro": _xiaomi_redmi_note_13_pro,
    "xiaomi-redmi-note-14": _xiaomi_redmi_note_14,
    "xiaomi-redmi-note-14-pro": _xiaomi_redmi_note_14_pro,
    # Oppo
    "oppo-reno-11": _oppo_reno,
    "oppo-reno-11-pro": _oppo_reno,
    "oppo-reno-12": _oppo_reno,
    "oppo-reno-12-pro": _oppo_reno,
    "oppo-find-x7": _oppo_find,
    "oppo-find-x8": _oppo_find,
    "oppo-a78": _oppo_a,
    "oppo-a79": _oppo_a,
    "oppo-a98": _oppo_a,
    # Vivo
    "vivo-v29": _vivo_v,
    "vivo-v30": _vivo_v,
    "vivo-v30-pro": _vivo_v,
    "vivo-x100": _vivo_x,
    "vivo-x100-pro": _vivo_x,
    "vivo-x200": _vivo_x,
    "vivo-x200-pro": _vivo_x,
    "vivo-y28": _vivo_y,
    "vivo-y36": _vivo_y,
    # Realme
    "realme-12": _realme_number,
    "realme-12-pro-plus": _realme_number,
    "realme-13": _realme_number,
    "realme-13-pro-plus": _realme_number,
    "realme-c67": _realme_c,
    "realme-gt-6": _realme_gt,
    "realme-gt-6t": _realme_gt,
    "realme-note-50": _realme_note,
    # Apple iPad
    "apple-ipad-air-6-m2-2024-11-inch": _ipad_air_11,
    "apple-ipad-air-6-m2-2024-13-inch": _ipad_air_13,
    # MacBook
    "macbook-pro-16-m3-max": _macbook_pro_16_m3_max,
    # AirPods
    "airpods-pro-2-usbc": _airpods_pro_2,
    # Sony
    "sony-wh1000xm5": _sony_wh1000xm5,
}


# MacBook Air M3 plan — kept separate as a callable for tests
# (the brief requires test_macbook_air_m3_has_4_variants even though
# MacBook Air M3 isn't in the live DB yet).
def _macbook_air_m3(slug: str) -> list[VariantSpec]:
    return _cartesian(
        slug, MAC_AIR_STORAGES, MAC_AIR_COLORS,
        default_storage="256GB", default_color="Midnight",
    )


def plan_macbook_air_m3(product_id: str, product_slug: str, product_name: str) -> VariantPlan:
    """Public helper for tests — generates a MacBook Air M3 plan."""
    return VariantPlan(
        product_id=product_id,
        product_slug=product_slug,
        product_name=product_name,
        variants=_macbook_air_m3(product_slug),
    )


def plan_iphone_16(product_id: str, product_slug: str, product_name: str) -> VariantPlan:
    """Public helper for tests — generates an iPhone 16 plan (6 variants)."""
    return VariantPlan(
        product_id=product_id,
        product_slug=product_slug,
        product_name=product_name,
        variants=_iphone16(product_slug),
    )

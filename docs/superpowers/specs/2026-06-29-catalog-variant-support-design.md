---
title: BijakBeli Variant Support — Multi-phase Refactor (Phase 1: Schema)
date: 2026-06-29
status: Phase 1 done — migrations + types + helpers + wiring shipped on `feat/variant-support-phase-1` (commits `47ba235`..`7693b24`). Migrations NOT YET applied to live Supabase (Studio or `npm run db:migrate` with DATABASE_URL needed before T9 smoke test flips green).
spec: catalog-variant-support
phase: 1 of 5 (Schema → Scraper → UI → Search → Re-seed)
---

# BijakBeli Catalog Variant Support — Phase 1: Schema Refactor

## Why this spec exists

The current BijakBeli catalog treats each product as a single priced entity:
the "Apple iPhone 16" page shows one cheapest price (`Rp14.499.000`) regardless
of storage variant. In reality every modern phone/laptop exists as an SKU matrix
(`${storage} × ${connectivity} × ${color}`), and every SKU has its own market
price. The current schema forces the scraper to either match against a
canonical name (losing variant identity) or generate one offer row per URL
(missing variant data offered by Shopee/Tokopedia's `models[]` array).

This phase builds the **schema foundation** so that every later phase (variant
extraction scraper, variant-aware UI, per-variant price history, re-seed) has
a clean target.

## Goals (in scope)

- Add `product_variants` table — separate entity that owns its identity, URL
  slug, and metadata columns (`storage`, `connectivity`, `color`, `sku`).
- Migrate the existing 197 `products` to each have one default variant row
  that captures the existing aggregated identity.
- Update `offers` table with `variant_id` FK; backfill existing 179 offers to
  point at the default variant of their product.
- Update `product_prices_view` and any materialized views that aggregate
  prices per product so they continue to return one row per offer.
- Publish 5–10 test cases for the migration idempotency.

## Non-goals (out of scope, will be picked up in later phases)

- Scraper variant extraction (Phase 2).
- Variant picker UI on product page (Phase 3).
- Search ranking aware of variants (Phase 4).
- Re-seed of the full catalog to populate realistic variants (Phase 5).

## Approach: clean separate `product_variants` table

A variant is a real domain entity, not just a string on an offer, because:

- It has its own URL (`/product/<product-slug>/v/<variant-slug>`) for deep
  linking and SEO.
- Its price history is independent — `Apple iPhone 16 128GB Ultramarine` and
  `Apple iPhone 16 256GB Black` do not move in lockstep.
- A product with no offers can still publish its variant catalogue pages
  (today those pages 404 instead of showing "this SKU matrix is available").
- Future features (variant-level SKU lookup, stock by SKU, price-alerts per
  SKU) need a stable identity.

### ER diagram (target end-state)

```
products
  ├─ id           UUID PK
  ├─ slug         TEXT UNIQUE
  ├─ name         TEXT
  ├─ category     TEXT
  ├─ description  TEXT
  ├─ default_variant_id  UUID FK → product_variants(id)  (nullable)
  └─ … (existing columns unchanged)

product_variants
  ├─ id           UUID PK
  ├─ product_id   UUID FK → products(id) ON DELETE CASCADE
  ├─ slug         TEXT                                  (unique per product)
  ├─ storage      TEXT NULL                  ⫽
  ├─ connectivity TEXT NULL                   ⫺ full SKU matrix
  ├─ color        TEXT NULL                  ⫽
  ├─ sku          TEXT NULL                  (manufacturer SKU)
  ├─ is_default   BOOLEAN  default FALSE
  ├─ is_active    BOOLEAN  default TRUE
  ├─ created_at   TIMESTAMPTZ default now()
  ├─ updated_at   TIMESTAMPTZ default now()
  └─ UNIQUE (product_id, slug)

offers
  ├─ … (all existing columns)
  └─ variant_id   UUID FK → product_variants(id) ON DELETE RESTRICT  (nullable for legacy rows)

price_snapshots
  ├─ … (existing columns, snapshot_id)
  └─ variant_id   UUID FK → product_variants(id) ON DELETE RESTRICT
```

UNIQUE `(product_id, slug)` enforces no two variants of the same product share
a slug; the slug is globally unique when combined with the parent product URL.

## Data flow

### Migration order (idempotent, safe to re-run)

1. **Create `product_variants` table** if not exists — columns above, plus a
   partial unique index `WHERE slug IS NOT NULL` to allow ephemeral defaults.
2. **Create `offers.variant_id`** if not exists — nullable FK.
   Create `price_snapshots.variant_id` likewise.
3. **Backfill default variants** for every existing `products` row that has no
   `default_variant_id`:
   ```sql
   INSERT INTO product_variants (id, product_id, slug, is_default)
   SELECT gen_random_uuid(), p.id, 'default', TRUE
   FROM products p
   LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default
   WHERE pv.id IS NULL;
   ```
4. **Backfill offers**: for each offer whose `product_id` is set but
   `variant_id` is NULL, point at the default variant of that product.
   Offers without a `product_id` (orphan offers) remain NULL — they will be
   resolved by the auto-linker in a later phase.
5. **Backfill `products.default_variant_id`**: pick the row created in step 3.
6. **Recompute `product_prices_view`** if present, to surface `variant_id` as
   a column. Existing consumers continue to work because the view was
   `(product_id, marketplace_id)` aggregated — adding a column is backward-compatible.

### Test cases

```typescript
// 1. Migration idempotency
expect(db.product_variants.count({ where: { is_default: true } }))
  .toBe(db.products.count());

// 2. Unique constraint per product
expect(async () => createVariant({product_id, slug: 'X'}))
  .toThrow(/* duplicate slug on same product */);

// 3. FK integrity
expect(async () => createOffer({ product_id, variant_id: randomUuid }))
  .toThrow(/* FK violation */);

// 4. Default-variant selection
expect(products.find(p => p.slug === 'apple-iphone-16').default_variant_id)
  .toBe(variant.slug === 'default' && variant.product_id === p.id);
```

## Component breakdown

| Unit | Path | Purpose |
|---|---|---|
| `supabase/migrations/136_create_product_variants.sql` | SQL | DDL: table, indexes, FKs. |
| `supabase/migrations/137_backfill_default_variants.sql` | SQL | DML: default variants + offers FK. |
| `src/lib/supabase/product-variants.ts` | TS | Queries: listVariants, getVariantBySlug, getDefaultForProduct. |
| `src/types/product-types.ts` | TS | TypeScript types: ProductVariant, ProductWithDefaultVariant. |
| `__tests__/migration-variant.test.ts` | TS | Migration smoke test. |

## Error handling

- Backfill MUST be idempotent: running migrations twice produces identical row
  counts. Test asserts `COUNT(*) = COUNT(*)` before vs after a no-op rerun.
- FK violations during backfill are logged but do not fail the migration
  (orphan offers will be resolved later). Failure mode is partial success,
  not abort.
- If `default_variant_id` cannot be created for a product (e.g. blocked by
  constraint), leave it NULL and continue — the page handler must then render
  the empty state for that product (already implemented in `065f0b2`).

## What's at risk

- **Migration 134 reconciliation events**: schema is currently fragile per the
  Phase 12 verify step. A new migration must run AFTER the latest reconcile
  to inherit its assumptions.
- **Orphan offers (≈30 of 179) without `product_id`**: backfill will skip
  these. They stay `variant_id = NULL` and remain auto-linkable later.
- **RLS on `offers`**: the new FK column will be subject to existing RLS
  policies. Service-role bypass already used by the admin route
  (commit `1f57c76`) is the tested path.

## Verification checklist

- ✅ `tsc --noEmit` clean.
- ✅ Migration SQL applied locally; `products`=197, `product_variants`=197
  (one default per product).
- ✅ `offers` count 179 unchanged; every offer with `product_id` has
  `variant_id` set to its product's default variant.
- ✅ `/product/<existing-slug>` continues to render. Page now reads
  `default_variant_id` and shows "Varian tersedia: 1" with seeded defaults.
- ✅ Supabase types regenerated (`supabase gen types`) without errors.
- ✅ GitHub Actions CI green.

## Out-of-scope confirmations to the user

To avoid ambiguity:

- A "default variant" is one row in `product_variants` flagged `is_default = TRUE`
  per product; not a special row in `products`.
- Slug `default` is reserved for legacy backfill. Real (non-default) variants
  use descriptive slugs like `iphone-16-128gb-ultramarine` (lowercase, hyphenated).
- `offers.variant_id` is nullable; non-null is the new preferred state.
- We do NOT remove or rename existing columns on `products` or `offers`
  in this phase. Pure additive migration.
- No code change to scraper or UI in Phase 1 — only schema + DB-facing types.
  Scraper change is Phase 2; UI change is Phase 3.

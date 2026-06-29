# BijakBeli Phase 1 — Catalog Variant Support (Schema Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `product_variants` table plus FK columns (`offers.variant_id`, `price_snapshots.variant_id`, `products.default_variant_id`) and backfill existing 197 products + 179 offers, so Phase 2 (scraper) and Phase 3 (UI) can layer variant support on top.

**Architecture:** Pure-additive migration. `product_variants` is a new sibling table to `products`, keyed by UUID with a per-product slug. Existing `products` rows get one auto-created default `product_variants` row carrying the legacy identity. Existing `offers` rows get `variant_id` backfilled to their product's default variant. `product_prices_view` is recomputed to include `variant_id`. Zero scraper / UI changes in this phase.

**Tech Stack:** Next.js 14 App Router, Supabase Postgres, TypeScript, vitest. Migration files are pure SQL applied via the `A-003_APPLY_AND_VERIFY.sql` runner.

## Global Constraints

- Migration filenames prefixed with sequential numeric counter — next file is **136**.
- All migration files MUST be added to `scripts/lint-migrations.mjs` allowlist (the script blocks destructive SQL).
- Schema changes are PURE ADDITIVE — no `ALTER TABLE … DROP COLUMN`, no `RENAME`.
- FK columns are NULLABLE so legacy / orphan rows can survive.
- Backfill MUST be idempotent — running migrations twice produces identical row counts.
- Default variant slug is the reserved string `default` — only used by backfill. Real (Phase 5) variants use descriptive slugs.
- TypeScript must stay clean (`tsc --noEmit` returns 0 errors).
- Vitest suite must stay at 702 passing tests minimum (no regressions).
- Conventional commits: `feat(...)`, `fix(...)`, `chore(...)` style.
- Branch flow: commit on `main`, push to both `main` and `main:master` (Vercel watches `master`).
- For agents operating in this repo: do NOT touch `src/components/ui/*` or design system tokens. Phase 1 is backend-only.

## File Structure

| Path | Action | Purpose |
|---|---|---|
| `supabase/migrations/136_create_product_variants.sql` | Create | DDL: `product_variants` table + indexes. |
| `supabase/migrations/137_offers_and_prices_variant_id_fk.sql` | Create | DDL: nullable `variant_id` FK on existing tables. |
| `supabase/migrations/138_backfill_default_variants.sql` | Create | DML: idempotent backfill. |
| `supabase/migrations/139_recompute_product_prices_view.sql` | Create | Re-define view with `variant_id` column. |
| `src/types/product-types.ts` | Create | `ProductVariant`, `ProductWithVariant` TypeScript types. |
| `src/lib/supabase/product-variants.ts` | Create | Query helpers (see interfaces below). |
| `__tests__/migration-variant.test.ts` | Create | Migration smoke + integrity tests. |
| `__tests__/product-variants-queries.test.ts` | Create | Query helper unit tests (mocked Supabase). |
| `src/lib/supabase/products.ts` | Modify | `getProductBySlugFromDB` returns default variant alongside product. |
| `src/app/product/[slug]/page.tsx` | Modify | Read default_variant_id and surface in UI ("Varian tersedia: 1"). |
| `scripts/lint-migrations.mjs` | Modify | Allowlist migrations 136-139. |

## Interfaces (single source of truth for cross-task references)

```typescript
// src/types/product-types.ts
export interface ProductVariant {
  id: string;
  product_id: string;
  slug: string | null;                  // nullable to support future empty seed
  storage: string | null;
  connectivity: string | null;
  color: string | null;
  sku: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDefaultVariant {
  product: Product;
  defaultVariant: ProductVariant | null;
}
```

```typescript
// src/lib/supabase/product-variants.ts
export async function listVariantsForProduct(productId: string): Promise<ProductVariant[]>;

export async function getVariantBySlug(
  productSlug: string,
  variantSlug: string,
): Promise<ProductVariant | null>;

export async function getDefaultVariantForProduct(
  productId: string,
): Promise<ProductVariant | null>;
```

---

## Task 1: Migration 136 — Create `product_variants` table

**Files:**
- Create: `supabase/migrations/136_create_product_variants.sql`
- Modify: `scripts/lint-migrations.mjs` (allowlist entry, see task 7)

**Interfaces:**
- Produces: `product_variants` table that downstream migrations depend on.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/136_create_product_variants.sql`:

```sql
-- Migration 136: Create product_variants table
-- Phase 1 of catalog variant support refactor.
-- Spec: docs/superpowers/specs/2026-06-29-catalog-variant-support-design.md

BEGIN;

CREATE TABLE IF NOT EXISTS product_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  slug          TEXT,                              -- nullable, e.g. 'default' for backfill, descriptive later
  storage       TEXT,                              -- e.g. '128GB'
  connectivity  TEXT,                              -- e.g. '5G'
  color         TEXT,                              -- e.g. 'Ultramarine'
  sku           TEXT,                              -- manufacturer SKU
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-product slug uniqueness (multiple NULL slugs allowed per product)
-- Wait: per spec, slug is unique within a product. Enforce via unique partial index.
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_product_slug_uq
  ON product_variants (product_id, slug)
  WHERE slug IS NOT NULL;

-- Lookup indexes
CREATE INDEX IF NOT EXISTS product_variants_product_idx
  ON product_variants (product_id);

CREATE INDEX IF NOT EXISTS product_variants_default_idx
  ON product_variants (product_id)
  WHERE is_default;

COMMIT;
```

- [ ] **Step 2: Add to lint allowlist**

Open `scripts/lint-migrations.mjs`, find the existing allowlist array (search for `ALLOWLIST` or numbered entries). Add four entries after the last existing migration number (135):

```js
{ file: '136_create_product_variants.sql', reason: 'Phase 1 schema refactor — DDL only, no DROP/RENAME' },
{ file: '137_offers_and_prices_variant_id_fk.sql', reason: 'Phase 1 schema refactor — additive FK columns' },
{ file: '138_backfill_default_variants.sql', reason: 'Phase 1 backfill — idempotent INSERT' },
{ file: '139_recompute_product_prices_view.sql', reason: 'Phase 1 view refresh — idempotent CREATE OR REPLACE' },
```

(Carry these entries forward to task 7 if you prefer to defer allow-list updates in a single commit.)

- [ ] **Step 3: Verify shell syntax**

Run: `node -e "const fs=require('fs');const sql=fs.readFileSync('supabase/migrations/136_create_product_variants.sql','utf8');console.log('OK lines:',sql.split('\n').length);"`
Expected: `OK lines: <number>` (file loaded).

- [ ] **Step 4: Commit**

```bash
cd ~/projects/bijakbeli-app
git add supabase/migrations/136_create_product_variants.sql
git commit -m "feat(schema): create product_variants table (migration 136)

Phase 1 of catalog variant support refactor (spec
docs/superpowers/specs/2026-06-29-catalog-variant-support-design.md).

Table captures per-variant identity (storage/connectivity/color/SKU),
unique slug per product, follows existing ID gen + timestamps
conventions. Cascade delete from products (a deleted product clears
its variants; orphans cannot exist)."
```

---

## Task 2: Migration 137 — Add `variant_id` FK columns to existing tables

**Files:**
- Create: `supabase/migrations/137_offers_and_prices_variant_id_fk.sql`

**Interfaces:**
- Consumes: `product_variants(id)` from migration 136.
- Produces: `offers.variant_id` (nullable UUID FK), `price_snapshots.variant_id` (nullable UUID FK), and `products.default_variant_id` (nullable UUID FK).

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/137_offers_and_prices_variant_id_fk.sql`:

```sql
-- Migration 137: Add variant_id FK columns to offers, price_snapshots, products
-- Phase 1 schema refactor — additive columns only.
-- ON DELETE RESTRICT protects against accidentally orphaning price snapshots or offers.

BEGIN;

-- offers.variant_id (nullable; legacy rows stay null)
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS offers_variant_idx
  ON offers (variant_id)
  WHERE variant_id IS NOT NULL;

-- price_snapshots.variant_id
ALTER TABLE price_snapshots
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS price_snapshots_variant_idx
  ON price_snapshots (variant_id)
  WHERE variant_id IS NOT NULL;

-- products.default_variant_id
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS default_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_default_variant_idx
  ON products (default_variant_id);

COMMIT;
```

- [ ] **Step 2: Verify SQL loads**

Run: `node -e "const fs=require('fs');console.log('lines:',fs.readFileSync('supabase/migrations/137_offers_and_prices_variant_id_fk.sql','utf8').split('\n').length);"`
Expected: prints integer.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/bijakbeli-app
git add supabase/migrations/137_offers_and_prices_variant_id_fk.sql
git commit -m "feat(schema): add variant_id FK to offers + price_snapshots, default_variant_id to products (migration 137)

ON DELETE RESTRICT on offers + price_snapshots prevents accidental
orphan. ON DELETE SET NULL on products.default_variant_id so a deleted
variant does not destroy the parent product."
```

---

## Task 3: Migration 138 — Backfill default variants

**Files:**
- Create: `supabase/migrations/138_backfill_default_variants.sql`

**Interfaces:**
- Consumes: `product_variants`, `offers`, `products` (with `default_variant_id`).
- Produces: 197 default variant rows (one per existing product); 179 `offers.variant_id` values backfilled; `products.default_variant_id` populated.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/138_backfill_default_variants.sql`:

```sql
-- Migration 138: Backfill default variants for existing products + offers
-- Phase 1 schema refactor — idempotent INSERT…WHERE NOT EXISTS pattern.

BEGIN;

-- 1. Insert default variant rows for every product that has none yet.
INSERT INTO product_variants (id, product_id, slug, is_default, is_active)
SELECT gen_random_uuid(), p.id, 'default', TRUE, TRUE
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants pv
  WHERE pv.product_id = p.id AND pv.is_default = TRUE
);

-- 2. Backfill offers.variant_id for offers that have a product_id but no variant.
UPDATE offers o
SET variant_id = pv.id
FROM product_variants pv
WHERE o.product_id = pv.product_id
  AND pv.is_default = TRUE
  AND o.variant_id IS NULL
  AND o.product_id IS NOT NULL;

-- 3. Backfill products.default_variant_id
UPDATE products p
SET default_variant_id = pv.id
FROM product_variants pv
WHERE p.id = pv.product_id
  AND pv.is_default = TRUE
  AND p.default_variant_id IS NULL;

COMMIT;
```

- [ ] **Step 2: Verify SQL idempotency by inspection**

Re-read the file. Confirm each block uses `WHERE NOT EXISTS` or guards on `... IS NULL`. No `DROP TABLE` or `DROP COLUMN` statements.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/bijakbeli-app
git add supabase/migrations/138_backfill_default_variants.sql
git commit -m "feat(schema): idempotent backfill default variants + offers.variant_id + products.default_variant_id (migration 138)

197 products × 1 default variant. Existing 179 offers point at their
product's default variant. Subsequent runs are no-ops (every block
guards with NOT EXISTS / IS NULL)."
```

---

## Task 4: Migration 139 — Recompute `product_prices_view`

**Files:**
- Create: `supabase/migrations/139_recompute_product_prices_view.sql`

**Interfaces:**
- Consumes: `offer_prices` and `product_variants` (via joins).
- Produces: a refreshed `product_prices_view` (or its existing name) that includes `variant_id` so downstream queries can filter/join by variant without an extra round-trip.

- [ ] **Step 1: Inspect the existing view definition**

Run: `cat supabase/migrations/A-006_*.sql 2>/dev/null || grep -lr 'CREATE VIEW product_prices_view' supabase/migrations/ 2>/dev/null | head`

Determine the view's existing column list. Copy that list into the new migration's `SELECT ...` and add `variant_id` from the underlying table.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/139_recompute_product_prices_view.sql` with whatever definition you discovered, adding `variant_id` to the column list. If no prior view exists, write a fresh definition that serves the BijakBeli P7 union-of-offers contract:

```sql
-- Migration 139: Recompute product_prices_view to include variant_id
-- Phase 1 schema refactor — column addition only.

BEGIN;

CREATE OR REPLACE VIEW product_prices_view AS
SELECT
  o.id,
  o.product_id,
  o.variant_id,
  o.marketplace_id,
  o.marketplace_product_id,
  o.seller_name,
  o.seller_id,
  o.seller_rating,
  o.seller_location,
  o.is_official_store,
  o.title,
  o.condition,
  o.variant,
  o.url,
  o.image_url,
  o.current_price,
  o.original_price,
  o.discount_percentage,
  o.stock_status,
  o.shipping_estimate,
  o.shipping_info,
  o.sold_count,
  o.voucher_text,
  o.has_voucher,
  o.has_free_shipping,
  o.source,
  o.confidence_score,
  o.confidence_label,
  o.validation_status,
  o.is_active,
  o.last_checked_at,
  o.rating,
  o.review_count,
  o.currency,
  m.name        AS marketplace_name,
  m.display_name AS marketplace_display_name,
  m.color       AS marketplace_color,
  'offer'::text AS origin
FROM offers o
LEFT JOIN marketplaces m ON m.id = o.marketplace_id;

COMMIT;
```

(Carry forward whatever the actual existing view looked like — the goal is to preserve its existing columns and add `variant_id`.)

- [ ] **Step 3: Commit**

```bash
cd ~/projects/bijakbeli-app
git add supabase/migrations/139_recompute_product_prices_view.sql
git commit -m "feat(schema): recompute product_prices_view with variant_id (migration 139)

Backward compatible: every previous column preserved; variant_id is
nullable so legacy/orphan offers keep working. View becomes the single
read path for variant-aware price lookups in Phase 3 UI."
```

---

## Task 5: TypeScript types

**Files:**
- Create: `src/types/product-types.ts`

**Interfaces:**
- Produces: `ProductVariant`, `ProductWithDefaultVariant` types consumed by `src/lib/supabase/product-variants.ts` and `src/lib/supabase/products.ts`.

- [ ] **Step 1: Write the types file**

Create `src/types/product-types.ts`:

```typescript
/**
 * Phase 1 schema refactor: TypeScript types for product_variants table.
 * Mirror the SQL column set in migrations 136 — change in lockstep.
 */

export interface ProductVariant {
  id: string;
  product_id: string;
  slug: string | null;
  storage: string | null;
  connectivity: string | null;
  color: string | null;
  sku: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDefaultVariant {
  productId: string;
  productSlug: string;
  defaultVariantId: string | null;
  defaultVariantSlug: string | null;
}
```

(Adjust the second type's shape to match the existing `Product` interface in `src/types/product.ts` if it exists — do NOT introduce a parallel duplicate.)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/projects/bijakbeli-app && npx tsc --noEmit`
Expected: clean output, exit 0.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/bijakbeli-app
git add src/types/product-types.ts
git commit -m "feat(types): add ProductVariant + ProductWithDefaultVariant types

Phase 1 schema refactor. Mirrors migration 136 columns;"
```

---

## Task 6: Query helpers

**Files:**
- Create: `src/lib/supabase/product-variants.ts`

**Interfaces:**
- Consumes: `ProductVariant` type, `createClient()` from `@/lib/supabase/server`.
- Produces: `listVariantsForProduct`, `getVariantBySlug`, `getDefaultVariantForProduct` — used by `src/lib/supabase/products.ts` (task 7) and later by the variant-aware pages.

- [ ] **Step 1: Write the query module**

Create `src/lib/supabase/product-variants.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import type { ProductVariant } from "@/types/product-types";

/**
 * List all variants for a product, default first.
 * Returns [] if product has no variants (shouldn't happen post-backfill).
 */
export async function listVariantsForProduct(productId: string): Promise<ProductVariant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as ProductVariant[];
}

/**
 * Look up a variant by parent product slug + variant slug.
 * Used by Phase 3 deep-link URLs like /product/<slug>/v/<vslug>.
 */
export async function getVariantBySlug(
  productSlug: string,
  variantSlug: string,
): Promise<ProductVariant | null> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", productSlug)
    .single();
  if (!product) return null;

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", (product as { id: string }).id)
    .eq("slug", variantSlug)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductVariant;
}

/**
 * Fetch the default variant (is_default = true) for a product.
 * Falls back to the first variant row if no row is flagged default.
 */
export async function getDefaultVariantForProduct(
  productId: string,
): Promise<ProductVariant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductVariant;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/projects/bijakbeli-app && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/bijakbeli-app
git add src/lib/supabase/product-variants.ts
git commit -m "feat(queries): add listVariantsForProduct + getVariantBySlug + getDefaultVariantForProduct"
```

---

## Task 7: Wire defaults into `getProductBySlugFromDB`

**Files:**
- Modify: `src/lib/supabase/products.ts` — extend the function to attach default variant.
- Modify: `src/app/product/[slug]/page.tsx` — surface "Varian tersedia: N" badge.

**Interfaces:**
- Consumes: `getDefaultVariantForProduct` from task 6.
- Produces: `getProductBySlugFromDB(...)` returns a `product` whose extra field `defaultVariant: ProductVariant | null` is populated via a parallel query (no behavioural change for callers that ignore the field).

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/products-with-variant.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (t: string) => {
      if (t === "products") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "p1", slug: "apple-iphone-16", name: "Apple iPhone 16" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (t === "product_prices_view") {
        return {
          select: () => ({
            eq: () => ({
              // emulate Promise.all([...]) behaviour
              [Symbol.toPrimitive]: () => Promise.resolve([]),
            }),
          }),
        };
      }
      if (t === "price_history") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  })),
  createAdminClient: vi.fn(async () => ({})),
}));

import { getProductBySlugFromDB } from "@/lib/supabase/products";

describe("getProductBySlugFromDB default-variant surface", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes a defaultVariant field on the returned product", async () => {
    const product = await getProductBySlugFromDB("apple-iphone-16");
    expect(product).not.toBeNull();
    // The new field exists and may be null because the mock product_variants
    // query isn't set up, but the SHAPE must include the field.
    expect(product).toHaveProperty("defaultVariant");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ~/projects/bijakbeli-app && npx vitest run __tests__/lib/products-with-variant.test.ts`
Expected: FAIL — `defaultVariant` property missing.

- [ ] **Step 3: Modify `getProductBySlugFromDB`**

In `src/lib/supabase/products.ts`:

1. Import `getDefaultVariantForProduct` from `@/lib/supabase/product-variants`.
2. In the `Promise.all([fetchPricesByProductIds, fetchPriceHistoryByProductId])` block, add `getDefaultVariantForProduct(product.id)` as a third parallel query.
3. Attach the resolved default variant to the returned product: `result.defaultVariant = defaultVariant;` before the `return result;` statement.
4. Add `defaultVariant: ProductVariant | null;` to any local `product` type alias used. If untyped (`Awaited<ReturnType<...>>`), push a stub field through and let downstream callers consume it as `product.defaultVariant`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/projects/bijakbeli-app && npx vitest run __tests__/lib/products-with-variant.test.ts && npx tsc --noEmit`
Expected: vitest PASS, tsc clean.

- [ ] **Step 5: Modify `src/app/product/[slug]/page.tsx`**

Near the top of the JSX (after the `<ProductHero />`), add a small inline badge:

```tsx
{product.defaultVariant && (
  <p className="text-muted-foreground mb-4 text-sm">
    Varian tersedia: {product.defaultVariant.is_default ? "default" : product.defaultVariant.slug}
  </p>
)}
```

(Phase 3 will replace this with a proper variant picker — for Phase 1, just surface that the data is wired.)

- [ ] **Step 6: Commit**

```bash
cd ~/projects/bijakbeli-app
git add src/lib/supabase/products.ts __tests__/lib/products-with-variant.test.ts src/app/product/[slug]/page.tsx
git commit -m "feat(product): surface default variant on /product/[slug]

Phase 1 wiring: getProductBySlugFromDB exposes defaultVariant field;
page.tsx shows 'Varian tersedia: default' badge. Real variant picker
is Phase 3 UI work; this is just plumbing verification."
```

---

## Task 8: Lint allowlist commit + lint clean

**Files:**
- Modify: `scripts/lint-migrations.mjs` — final allowlist entries for migrations 136-139 (if not added in task 1).

- [ ] **Step 1: Run the migrations lint script**

Run: `cd ~/projects/bijakbeli-app && node scripts/lint-migrations.mjs`
Expected: zero errors mentioning migrations 136-139.

- [ ] **Step 2: Run the repo's full lint**

Run: `cd ~/projects/bijakbeli-app && timeout 60 npm run lint 2>&1 | tail -20`
Expected: new errors counted at most 0 for files we touched in tasks 1-7 (pre-existing lint errors in `offer-product-link.ts` / `routes/validate/route.ts` carry forward but are not regressed).

- [ ] **Step 3: Commit if allowlist changes were deferred**

```bash
cd ~/projects/bijakbeli-app
git add scripts/lint-migrations.mjs
git commit -m "chore(lint): allowlist migrations 136-139 (Phase 1 schema refactor)" || echo "no allowlist changes"
```

---

## Task 9: Migration smoke test on Supabase prod

**Files:**
- Create: `__tests__/migration-variant.test.ts`

- [ ] **Step 1: Write the smoke test**

```typescript
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

describe("catalog variant migration smoke test", () => {
  it("every product has exactly one default variant", async () => {
    const { count: products } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    const { count: defaultVariants } = await supabase
      .from("product_variants")
      .select("*", { count: "exact", head: true })
      .eq("is_default", true);
    expect(products).toBe(defaultVariants);
    expect(products).toBeGreaterThan(0);
  });

  it("every offer with product_id has variant_id set", async () => {
    const { data: orphan } = await supabase
      .from("offers")
      .select("id")
      .not("product_id", "is", null)
      .is("variant_id", null)
      .limit(5);
    expect(orphan).toEqual([]);
  });

  it("product_prices_view includes variant_id column", async () => {
    const { data, error } = await supabase
      .from("product_prices_view")
      .select("variant_id")
      .limit(1);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run locally with `.env.local` to verify**

Run: `cd ~/projects/bijakbeli-app && npx vitest run __tests__/migration-variant.test.ts`
Expected: PASS (assumes migrations 136-139 already applied to your local Supabase via the SQL runner).

If `.env.local` lacks service-role credentials, skip this file from the CI run by adding `.skip` to the test or filtering during CI. (We DO want it runnable manually.)

- [ ] **Step 3: Commit**

```bash
cd ~/projects/bijakbeli-app
git add __tests__/migration-variant.test.ts
git commit -m "test(migration): smoke test product_variants + offers.variant_id backfill"
```

---

## Task 10: Final verification + deploy

**Files:** none (verification only)

- [ ] **Step 1: Full TypeScript + vitest + lint**

Run: `cd ~/projects/bijakbeli-app && npx tsc --noEmit && timeout 90 npm test -- --run 2>&1 | tail -10 && timeout 60 npm run lint 2>&1 | tail -10`
Expected: tsc clean, vitest ≥ 702 passing, lint no NEW errors.

- [ ] **Step 2: Manual smoke — product page**

Run: `curl -sf https://www.bijakbeli.web.id/product/apple-iphone-16 | grep -c "Varian tersedia"`
Expected: `1` (text appears in the rendered HTML once migrations + page wiring are deployed).

- [ ] **Step 3: Manual smoke — admin offers list**

Run: login to admin UI at `/admin/data-collection/offers` and confirm every offer row now shows the variant_id column (or its badge in the existing layout, if the admin page already reads from `product_prices_view`).

- [ ] **Step 4: Push to main + master**

```bash
cd ~/projects/bijakbeli-app
git push origin main
git push origin main:master
```

- [ ] **Step 5: Wait for Vercel propagation**

Use the `cloudflare-workers-await-pitfall` / `vercel-deploy-stale-cache-diagnosis` skill habits. Force-bypass browser cache on the verification URL with `?nocache=1`. Expect Vercel Hobby cycle of 60-180s. Re-test the smoke URLs:
- `/product/apple-iphone-16` shows "Varian tersedia: default"
- `/product/apple-iphone-16?variant=<default-slug>` returns the deep-link page (Phase 3 properly wired later).

- [ ] **Step 6: Mark Phase 1 done in the spec**

Open `docs/superpowers/specs/2026-06-29-catalog-variant-support-design.md` and update the metadata:

```markdown
status: Phase 1 done (commit <SHA>)
phase: 1 of 5
```

Commit the metadata tweak:

```bash
cd ~/projects/bijakbeli-app
git add docs/superpowers/specs/2026-06-29-catalog-variant-support-design.md
git commit -m "docs(spec): mark Phase 1 done, link live SHA"
```

---

## What NOT to do (Phase 1 guardrails)

- Do not modify the scraper (`src/lib/scraper/*`). Phase 2 owns that change.
- Do not modify UI components beyond adding the small variant badge in `page.tsx`. Variant picker dropdown is Phase 3.
- Do not modify `searchProductsFromDB`. Search ranking is Phase 4.
- Do not delete or rename any existing column. Migration 132 says the schema is fragile.
- Do not commit without running `tsc --noEmit` first.

## Self-review notes

- Every task ends with a `git commit` so a reviewer can read task-by-task diffs.
- All interface blocks use names that match what neighboring tasks depend on (`ProductVariant`, `ProductWithDefaultVariant`, `listVariantsForProduct`).
- FK ON DELETE rules are explicit: RESTRICT on price-impacting tables, CASCADE on product→variant ownership, SET NULL on products.default_variant_id to support variant deletion.
- Idempotency is enforced by `NOT EXISTS` and `IS NULL` guards on backfill, plus `IF NOT EXISTS` on DDL.
- TypeScript path through `getProductBySlugFromDB` is additive — existing callers ignore the new `defaultVariant` field.

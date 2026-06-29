# Catalog Phase 2: Variant Extraction + Periodic Auto-Link Design

> **For agentic workers:** This is a design document. Implementation happens
> via writing-plans skill and produced sub-plans. Design scope lives here.

**Companion to:** `2026-06-29-catalog-variant-support-design.md` (Phase 1)
**Date:** 2026-06-30
**Author:** Hermes (built from Phase 1 spec + gap analysis of scrapers/ingestion)
**Status:** PROPOSED — awaiting user approval to proceed to plan

---

## Goal

Complete the **end-to-end variant pipeline** that Phase 1 only enabled at the storage layer:

1. **🅒 Capture explicit variants from scrapers** so `offers.variant` and the resulting `offers.variant_id` are populated by the source, not inferred from title.
2. **🅷 Periodically auto-re-match orphan offers** so rejected/dropped offers get a second chance when new products or improved matchers ship.

Together these turn `product_variants` rows from passive schema scaffolding into living, populated entries the rest of the catalog UI can rely on.

---

## Why now (gap analysis)

```
┌─────────────────────────────────────────────────────────────────┐
│ CURRENT PRODUCTION STATE (2026-06-30, after Phase 1)            │
├─────────────────────────────────────────────────────────────────┤
│ product_variants table    ✓ exists, 197 default rows            │
│ offers.variant_id FK      ✓ exists, 148/179 offers → variant    │
│ product_prices view       ✓ recomputed, exposes variant_id      │
│ Matcher (TS)              ✓ variant-aware (extractVariantInfo)  │
├─────────────────────────────────────────────────────────────────┤
│ GAPS (what this spec closes)                  │
├─────────────────────────────────────────────────────────────────┤
│ Scraper → payload  ✗ "variant" field never sent in any marketplace │
│ Ingestion → DB     ✗ when sent, would land in offers.variant TEXT  │
│                  but offers.variant_id is not derived from it yet  │
│ Cron orphan round ✗ no scheduled job matches orphans periodically  │
│ Backfill script    ✗ no batch variant resolver for legacy data    │
└─────────────────────────────────────────────────────────────────┘
```

**Root cause:** Phase 1 delivered the schema, but the data sources (Tokopedia, Shopee, Bukalapak, Lazada, Blibli collectors) do not currently capture variant attributes (storage/RAM, connectivity, color) from product pages. Matchers always had to fall back to title-based heuristic extraction. The result: 31 orphan offers and many `product_variants` rows with only the default variant populated.

---

## Scope (in / out)

**In scope:**
- 🅒 **Phase 2A — Scraper variant extraction**: extend the 5 marketplace collectors (Tokopedia, Shopee, Bukalapak, Lazada, Blibli) to capture variant attributes and emit them through the ingestion pipeline.
- 🅒 **Phase 2B — Ingestion-side variant resolution**: when an offer with `variant` string arrives, resolve it to (or create) a `product_variants` row and populate `offers.variant_id`.
- 🅷 **Phase 2C — Periodic auto-link cron**: nightly cron job that re-runs the matcher for unlinked offers (`variant_id IS NULL`) using the freshest `product_variants` index, and writes a summary to `admin_audit_log`.

**Out of scope (deferred to later phases):**
- UI variant picker at `/product/[slug]` (Phase 3, separate spec)
- Variant-aware search filter (Phase 4, separate spec)
- Bulk re-seed of 197 catalog products with proper variant splits (Phase 5, separate spec)
- ML-based variant attribute extraction from images

---

## Architecture

### Data flow (new)

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ Marketplace PDP page │ →  │ Collector (Python)   │ →  │ /api/ingestion/      │
│ (Shopee: models[])   │    │  +variant extraction │    │  offer-snapshot      │
│ (Tokopedia: Apollo   │    │  (Phase 2A)          │    │  (existing endpoint) │
│  variantChildren)    │    │                      │    │                      │
└──────────────────────┘    └──────────────────────┘    └──────────┬───────────┘
                                                                   │
                                                                   ▼
                                            ┌─────────────────────────────────┐
                                            │  src/lib/ingestion/             │
                                            │  variant-resolver.ts (NEW)      │
                                            │  (Phase 2B)                     │
                                            │                                 │
                                            │  1. normalize("128GB Hitam")    │
                                            │     → { storage:'128GB',        │
                                            │          color:'Hitam' }        │
                                            │  2. match against existing      │
                                            │     product_variants for offer  │
                                            │  3. CREATE if missing (default  │
                                            │     FALSE unless only one)      │
                                            │  4. writer: offer.variant_id =  │
                                            │     resolved.id,                │
                                            │     offer.variant_text kept     │
                                            └──────────┬──────────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────────────────┐
                                            │  offers table                   │
                                            │   variant_id  ← was NULL        │
                                            │   variant     ← text "128GB..." │
                                            └─────────────────────────────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────────────────┐
                                            │  PHASE 2C — auto-link cron      │
                                            │  /api/cron/orphan-auto-link     │
                                            │  (NEW)                          │
                                            │                                 │
                                            │  every 24h:                     │
                                            │   1. SELECT id FROM offers       │
                                            │      WHERE variant_id IS NULL   │
                                            │   2. matcher.score(input)       │
                                            │   3. UPDATE product_id          │
                                            │   4. write admin_audit_log row  │
                                            └─────────────────────────────────┘
```

### Component map

| Component | Phase | Input | Output | Lives in |
|---|---|---|---|---|
| 5 marketplace collectors | 2A | PDP HTML / Apollo JSON | `{ ...payload, variant: "128GB Hitam" }` | `collectors/*_collector.py` |
| Camofox schema | 2A | PDP HTML (fallback) | `CamofoxProduct.variant` | `collectors/camofox_scraper.py` |
| Ingestion client | 2A | collector dict | `POST /api/ingestion/offer-snapshot` with `variant` field | `collectors/ingestion_client.py` |
| `variant-resolver.ts` | 2B | `OfferSnapshotInput.variant`, `product_id` (from matcher) | `{ variant_id, action: 'created' \| 'matched' \| 'unchanged' }` | `src/lib/ingestion/variant-resolver.ts` (NEW) |
| `variant-normalizer.ts` | 2B | variant string | `{ storage, ram, connectivity, color, model: string \| null }` | `src/lib/ingestion/variant-normalizer.ts` (NEW) |
| `resolveAndAttachVariant` (orchestrator) | 2B | pipeline output + variant-resolver result | upserts `product_variants` + sets `offer.variant_id` | `src/lib/ingestion/offer-snapshot-pipeline.ts` (EXTEND) |
| `/api/ingestion/offer-snapshot` route | 2B | existing route | calls new `resolveAndAttachVariant` after matcher | `src/app/api/ingestion/offer-snapshot/route.ts` (EXTEND) |
| Orphan auto-link cron route | 2C | `Bearer ${CRON_SECRET}` | `{ processed, linked, still_orphan }` summary | `src/app/api/cron/orphan-auto-link/route.ts` (NEW) |
| Cron auto-link library | 2C | offer list, current matcher | re-scores + writes product_id + audit row | `src/lib/cron/orphan-auto-link.ts` (NEW) |

### File structure (new)

```
src/lib/ingestion/
├── variant-normalizer.ts       (NEW, ~120 lines, pure)
├── variant-resolver.ts         (NEW, ~200 lines, depends on @/lib/supabase variants-queries)
├── offer-snapshot-pipeline.ts  (EXTEND, +30 lines)
src/app/api/ingestion/offer-snapshot/
└── route.ts                    (EXTEND, +15 lines)
src/lib/cron/
└── orphan-auto-link.ts         (NEW, ~250 lines)
src/app/api/cron/
└── orphan-auto-link/
    └── route.ts                (NEW, ~80 lines)
collectors/
├── tokopedia_collector.py      (EXTEND, +variant extraction)
├── shopee_collector.py         (EXTEND, +variant extraction)
├── bukalapak_collector.py      (EXTEND, +variant extraction)
├── lazada_collector.py         (EXTEND, +variant extraction)
├── blibli_collector.py         (EXTEND, +variant extraction)
├── camofox_scraper.py          (EXTEND, schema adds variant)
├── ingestion_client.py         (EXTEND, +variant in payload)
└── base_collector.py           (EXTEND, common variant logic)

__tests__/
├── lib/ingestion/variant-normalizer.test.ts       (NEW, ~30 cases)
├── lib/ingestion/variant-resolver.test.ts         (NEW, ~20 cases)
├── lib/cron/orphan-auto-link.test.ts              (NEW, ~15 cases)
└── lib/ingestion/offer-snapshot-pipeline.test.ts (EXTEND, +5 cases)
```

---

## Phase 2A — Scraper variant extraction

### Per-marketplace strategies

| Marketplace | Selector strategy | Variant JSON location (2026) | Example payload |
|---|---|---|---|
| **Tokopedia** | Apollo cache → `variants.variantChildren[]` array | `window.__APOLLO_STATE__` key containing `variantChildren` | `[{name:"128GB Hitam", price:18500000, url:"..."}]` |
| **Shopee** | DOM selector `[data-testid="pdpVariationValue"]:not([data-active="false"])` | `__NEXT_DATA__.props.pageProps.item.models[]` | `{name:"128GB Hitam", price:18500000, stock:0}` |
| **Bukalapak** | DOM selector `.c-product-variation__item` | SSR HTML, Klaviyo scripts may hold JSON | `[{label:"128GB", price:18500000}]` |
| **Lazada** | DOM `[data-sku-id]` attribute + sku-selector script | `page.skuList` script tag | `{skuId:12345, price:18500000, label:"128GB"}` |
| **Blibli** | DOM `.bli-product-variant__item` (always single image) | `window.__PRELOADED_STATE__` | `[{displayValue:"128GB Hitam"}]` |

### Variant normalization strategy

Use a single tokenizer in `variant-normalizer.ts` (Python equivalent in `base_collector._normalize_variant`) that recognizes **Indonesian and English** attribute names:

```python
# Python (collectors/base_collector.py)
_STORAGE_RE = re.compile(r"(\d+)\s*(gb|tb|mb)", re.I)
_RAM_RE     = re.compile(r"(\d+)\s*gb\s*ram|ram\s*(\d+)\s*gb", re.I)
_COLOR_RE   = re.compile(r"\b(hitam|putih|merah|biru|hijau|ungu|emas|perak|black|white|red|blue|green|purple|pink|gold|silver|gray|grey)\b", re.I)
_MODEL_RE   = re.compile(r"\b(pro|max|plus|ultra|lite|mini)\b", re.I)
_CONNECT_RE = re.compile(r"\b(5g|4g|wifi|nfc|esim|dual[\s-]?sim)\b", re.I)

def _normalize_variant(text: str) -> dict:
    s = text.lower().strip()
    return {
        "storage":      (m := _STORAGE_RE.search(s)) and ("".join(m.groups()).upper().replace(" ", "")),
        "ram":          (m := _RAM_RE.search(s)) and (f"{m.group(1) or m.group(2)}GB"),
        "color":        (m := _COLOR_RE.search(s)) and m.group(0).lower(),
        "model":        (m := _MODEL_RE.search(s)) and m.group(0).lower(),
        "connectivity": (m := _CONNECT_RE.search(s)) and m.group(0).replace(" ", "").replace("-", "").lower(),
    }
```

Output:
- `"128GB Hitam Black Pro 5G"` → `{"storage":"128GB", "color":"black", "model":"pro", "connectivity":"5g"}`

### Scraper output format

Collectors emit a new `variant` field in the ingestion payload (currently absent). The contract:

```json
{
  "marketplace": "tokopedia",
  "product_url": "https://...",
  "title": "Apple iPhone 16 128GB Hitam",
  "price": 18500000,
  "variant": "128GB Hitam"
}
```

`variant` is the **first selected variant child** when the user has not yet interacted; for the currently-selected variant (`-selected` or `[data-active="true"]`), emit that.

If no variant UI is present (e.g., a generic product), emit `variant: ""` (empty string) so the resolver knows no variant was found vs a scraping failure.

### Camofox fallback schema (Phase 2A)

`camofox_scraper.py` currently has a `TokopediaProduct` Pydantic schema. Add a `variant: Optional[str] = None` field, populated from each call site's selection logic. When Camofox returns no variant but the title contains one, the resolver will still extract from title (defensive default).

### Backward compatibility

All changes to scrapers are **additive** (new field, existing fields untouched). When `variant` is `None` or absent, the ingestion route proceeds as before — no breaking change to existing scripts running against the API.

---

## Phase 2B — Ingestion-side variant resolution

### Resolver logic (`variant-resolver.ts`)

```typescript
export interface ResolvedVariant {
  variantId: string;          // FK → product_variants.id
  action: 'matched_existing' | 'created_new' | 'unchanged_no_variant';
  variantSlug: string | null; // product_variants.slug
}

export async function resolveAndAttachVariant(
  supabase: SupabaseClient,   // service-role client
  productId: string,
  variantText: string | null,
):
```

### Algorithm

```
resolveAndAttachVariant(productId, variantText):
  if !variantText or variantText.trim() === '':
    # No variant emitted by scraper
    return getDefaultVariantForProduct(productId)        // fallback to default
    → { action: 'unchanged_no_variant' }

  normalized = variantNormalize(variantText)              // → NormalizedVariant

  # 1. Look for an exact match against existing product_variants
  existing = await listVariantsForProduct(productId)
  candidate = existing.find(v =>
    (v.storage ?? null)      === normalized.storage     &&
    (v.color ?? null)        === normalized.color       &&
    (v.connectivity ?? null) === normalized.connectivity &&
    (v.ram ?? null)          === normalized.ram
  )

  if candidate:
    return { variantId: candidate.id, action: 'matched_existing' }

  # 2. Create a new variant row
  slug = generateVariantSlug(productId, normalized)
  #   e.g. "apple-iphone-16-128gb-hitam"

  row = await supabase.from('product_variants').insert({
    product_id:    productId,
    slug:          slug,
    storage:       normalized.storage,
    ram:           normalized.ram,
    color:         normalized.color,
    connectivity:  normalized.connectivity,
    sku:           null,            // population deferred
    is_default:    false,           // already have default
    is_active:     true,
  }).select('id').single()

  return { variantId: row.id, action: 'created_new' }
```

### Slug generation

Deterministic, deterministic-collision-safe:

```
slug(productId, normalized) =
  lower(product.slug) + '-' + kebabCase(
    concatIfSet(storage, ram, color, model, connectivity, separator='-')
  )
  //  e.g. "apple-iphone-16-128gb-hitam"
  // fall back to "-default" if all fields null
Collision: append "-2", "-3", ... up to "-99"
Limit: max 100 variants per product; reject beyond that with warning log
```

### Pipeline integration

`offer-snapshot-pipeline.ts` `processOfferSnapshot` currently writes the offer in one INSERT. Extend:

```typescript
// after matching → product_id decided
const resolved = await resolveAndAttachVariant(supabase, productId, input.variant);

return {
  ...rest,
  variant_id: resolved.variantId,
  // (offers.variant_id FK is set here; the offers.variant TEXT is already set)
};
```

Backwards-compatible: when `input.variant` is null/empty, resolver returns the default variant, so all existing offers continue to be attached to a `variant_id` instead of NULL.

### Performance budget

- 1 SELECT + (sometimes) 1 INSERT per offer — both indexed
- 1 extra round-trip per offer; total `offer-snapshot` latency +30ms target
- Wall-clock budget for 100-batch insertion: ≤3 seconds extra

---

## Phase 2C — Periodic orphan auto-link cron

### Trigger

A new Next.js route `/api/cron/orphan-auto-link` behind the existing `CRON_SECRET` gate (already enforced by Vercel Cron config). Schedule: **daily at 02:00 WIB (19:00 UTC)**.

Example cron spec:
```
0 19 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
     https://www.bijakbeli.web.id/api/cron/orphan-auto-link
```

### Algorithm (`orphan-auto-link.ts`)

```
async function runOrphanAutoLink(opts: {
  cap?:         number,        // default 500 → avoids runaway
  maxAgeDays?:  number,        // default 90 → don't re-look at very old data
}) {
  startTime = now()

  # 1. find candidates
  candidates = await supabase
    .from('offers')
    .select('id, title, price, marketplace, variant, seller_name, created_at, status')
    .is('product_id', null)        // orphan
    .gt('created_at', daysAgo(maxAgeDays))
    .order('created_at', { ascending: false })
    .limit(cap)

  # 2. for each: try matcher
  seenProductIds = new Map<string, number>()   // product_id → count linked
  results = []

  for offer of candidates:
    match = await findBestProductMatch({
      offerTitle: offer.title,
      offerVariant: offer.variant,
      offerPrice: offer.price,
      offerMarketplace: offer.marketplace,
      offerCondition: extractCondition(offer.title),
    })

    if match.isMatch && match.confidence in ['high', 'medium'] && match.score >= MIN_MATCH_SCORE:
      await supabase.from('offers').update({ product_id: match.productId }).eq('id', offer.id)
      seenProductIds[match.productId] = ++count
      results.push({ offer_id: offer.id, action: 'linked', product_id: match.productId, score: match.score })
    else:
      results.push({ offer_id: offer.id, action: 'still_orphan', reason: match.reasons })

  # 3. write audit row
  await logAdminAction({
    actor: 'cron',
    action: 'orphan_auto_link',
    target_type: 'offers_bulk',
    target_id: 'batch',
    metadata: {
      processed:       candidates.length,
      linked:          results.filter(r => r.action === 'linked').length,
      still_orphan:    results.filter(r => r.action === 'still_orphan').length,
      duration_ms:     now() - startTime,
      see_product_ids: Object.fromEntries(seenProductIds),
      // top 5 highest score that linked — for visibility
      top_links:       results.filter(r=>r.action==='linked').sort(by score desc).slice(0,5),
    },
  })

  return { processed: candidates.length, linked: ..., still_orphan: ... }
}
```

### Idempotency & safety guards

- `is('product_id', null)` predicate: never overwrite an existing match (still allow inventory to revert by hand).
- `cap` default 500: prevents a runaway if there's a sudden spike in orphans. Returns a `next_cursor` if more rows remain.
- `confidence in ['high', 'medium']`: never auto-link `low` or `reject` (avoid polluting catalog with guesses).
- Each write wrapped in try/catch — one offer failure doesn't fail the whole batch.
- Audit row written even when zero rows linked (so we can detect a broken matcher).

### Acceptance criteria

- p95 latency under 30 seconds for a 500-row batch.
- Re-running one hour later produces the same outcome (idempotent).
- The matcher's existing tests still pass (no regressions).
- Mocked fetch of `matcher.findBestProductMatch` covers all confidence branches.

---

## Vitest testing strategy

### Variant normalizer (`variant-normalizer.test.ts`)

- ~30 cases, 5 categories: phones, laptops, accessories, multi-attribute strings, empty
- Pure function, no DB needed.

### Variant resolver (`variant-resolver.test.ts`)

- ~20 cases using a **mocked `SupabaseClient`** (no live DB needed for unit tests).
- Categories:
  - Unmatched → creates new variant row
  - Matched → reuses
  - Empty input → returns default
  - Storage-only / color-only / multi-attribute matches
  - Slug collision handling
  - 100-variant cap (rejects + warning)
- 1 integration test against live Supabase with a test product + variant reset to baseline.

### Pipeline extension (`offer-snapshot-pipeline.test.ts`)

- ~5 new cases extending existing suite
- Verifies `variant_id` is set in returned offer data
- Verifies `offers.variant_id` and `offers.variant` end up in DB after route call

### Orphan auto-link (`orphan-auto-link.test.ts`)

- ~15 cases with mocked supabase + mocked matcher
- Categories:
  - Empty candidate set → writes audit row anyway
  - All rejected → still_orphan counter continues
  - Mix → only high/medium linked
  - cap=10 → only 10 processed
  - maxAge filter excludes old offers
  - Throw in matcher for 1 offer → others continue

### Live smoke test

Post-deployment, manually run cron once with curl:
```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://www.bijakbeli.web.id/api/cron/orphan-auto-link
```
Expect: `{"processed": 31, "linked": 13, "still_orphan": 18}` (assuming matcher unchanged from Phase 0 dry-run).

---

## Security & privacy

- No PII collected. `variant` is product attribute, no user info.
- Cron route uses same `CRON_SECRET` env pattern as existing `/api/cron/prices`, `/api/cron/digest`, `/api/cron/alerts`.
- No new environment variables.
- All migration-related destructive checks already configured (lint-migrations.mjs allowlist). The only NEW migration in this spec is **none** — all schema is in place from Phase 1.
- Service-role client bypasses RLS — explicit, only used in server routes.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scrapers extract wrong variant (UI confusion) | Med | Med | Defensive — resolver still falls back to default variant; matcher remains authoritative on `product_id` |
| Resolver creates too many variant rows | Med | Low | Cap at 100 per product; warning log |
| Cron matcher regresses on daily run | Med | High | Read existing matcher tests before and after; cron run is idempotent |
| Cron auth bypass | Low | High | Same `CRON_SECRET` pattern as existing cron routes |
| Camofox schema change (ext. partner) | Med | Med | Defensive — if variant absent in Camofox payload, fall back to scraping via Playwright once |
| Significantly more DB writes per scrape | Med | Low | variant_resolver write rate matches insertion rate ≤ 1:1 |

---

## Acceptance criteria (overall)

After deploying all three sub-phases:

1. **🅒 Scrapers emit `variant`** — verified by inspecting 5 collector outputs.
2. **🅒 Ingestion populates `offers.variant_id`** — live offers table count rises from 148/179 to >165/200 over a typical scrape run.
3. **🅷 Cron runs nightly** — first run observed in `admin_audit_log` with `action='orphan_auto_link'`.
4. **🅷 Orphan count drops** — measurable reduction week-over-week (goal: <10 orphans by week 2).
5. **All existing tests pass** — vitest 711 + new tests; tsc 0 errors; lint clean.
6. **No regressions** — feature flag to disable cron if a regression is observed; scraper additions non-breaking.

---

## What this spec does NOT cover (deferred)

- 🅳 **UI variant picker** — separate Phase 3 spec (will reference `product_variants` table).
- 🅴 **Variant-aware search** — Phase 4 spec; depends on Phase 3.
- 🅵 **Re-seed 197 products with proper variants** — Phase 5 spec; optional, depends on Phase 2B output.
- 🅶 **External API for variant lookup** — admin endpoint for manually adjusting offers' variant_id — small but useful; included in Phase 3 spec if user requests.
- **Variant image gallery** — separate spec.

---

## Decision points (resolved by this design)

| Question | Decision | Why |
|---|---|---|
| Where does variant come from? | Scraper + matcher fallback | Scraper source-of-truth; matcher robust when missing |
| New variant row vs reuse? | Lookup-first, create-if-missing | Default variant catches unconditional creation |
| Cap on variants per product? | 100 (hard limit) + warning | Database safety; outlier products flagged for manual review |
| Cron schedule? | Daily 02:00 WIB | Off-peak; >=16 hours apart from existing 6h-prices cron |
| Cron cap? | 500 offers per run | Bounded runtime; recovery via next-nightly run |
| Audit logging? | Yes — every run writes 1 row | Observability; debug matcher regressions |

---

## Open questions (please confirm before plan)

1. **Variant attribute taxonomy:** I've chosen 5 fields (storage, ram, color, model, connectivity). Want to add `warranty` or `region` (CN vs Global)? Default: skip — YAGNI.
2. **Per-product variant cap:** Default 100. Want higher/lower? Default: 100.
3. **Cron schedule:** Default daily 02:00 WIB. Want different?
4. **Auto-link confidence threshold:** Default `score ≥ 70 (high) OR score ≥ 50 (medium) — i.e. never 'low' or 'reject'`. Want stricter/looser?
5. **Should the orphan auto-link runner publish a summary to Telegram?** Default: no — write to audit log only. Easy to add later.

If user does not specify, I'll proceed with the defaults above.

---

## Companion implementation plans (to be drafted after spec approval)

- `docs/superpowers/plans/2026-06-30-catalog-phase2-variant-extraction.md` (12-15 tasks)
- `docs/superpowers/plans/2026-06-30-catalog-orphan-auto-link.md` (5-7 tasks)

These will be written by the writing-plans skill once spec is approved.

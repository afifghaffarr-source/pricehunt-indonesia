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

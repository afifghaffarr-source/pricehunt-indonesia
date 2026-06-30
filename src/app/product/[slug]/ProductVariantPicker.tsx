"use client";

/**
 * ProductVariantPicker — desktop chip group for selecting a product variant.
 *
 * Phase 3 of the catalog refactor. Renders a compact row of chips per
 * variant axis (storage / color / connectivity). Clicking a chip calls
 * `router.replace(?v=<variantSlug>)` so the URL becomes the canonical
 * state and a deep-link re-renders the same selection.
 *
 * Server-side: the page already reads `?v=` from searchParams and passes
 * `selectedVariant` (resolved via `getVariantBySlug` / default fallback).
 * This component is purely a URL writer + visual chip group; it does not
 * own state beyond the URL.
 *
 * Visual rules (taste-skill):
 *   - canvas #F9FAFB, primary #18181B, secondary #71717A, accent #10B981
 *   - selected chip: bg #10B981, white text, subtle scale-105
 *   - unselected: border-zinc-200, text #18181B
 *   - sentence case
 *   - rounded-2xl cards, whisper borders
 *   - NO emoji
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductVariant } from "@/types/product-types";

export type VariantAxis = "storage" | "color" | "connectivity";

interface AxisGroup {
  axis: VariantAxis;
  label: string;
  variants: ProductVariant[];
}

/**
 * Group raw variants by axis (storage / color / connectivity), preserving
 * the input order so default variants surface first within each axis.
 * Variants with no recognizable axis label are skipped from the desktop
 * chip group (they're rendered in the mobile "Default" pill instead).
 */
export function groupVariantsByAxis(
  variants: ProductVariant[],
): AxisGroup[] {
  const buckets: Record<VariantAxis, ProductVariant[]> = {
    storage: [],
    color: [],
    connectivity: [],
  };
  for (const v of variants) {
    if (!v.is_active) continue;
    if (v.storage) buckets.storage.push(v);
    else if (v.color) buckets.color.push(v);
    else if (v.connectivity) buckets.connectivity.push(v);
  }
  const labels: Record<VariantAxis, string> = {
    storage: "Penyimpanan",
    color: "Warna",
    connectivity: "Konektivitas",
  };
  return (Object.keys(buckets) as VariantAxis[])
    .filter((k) => buckets[k].length > 0)
    .map((axis) => ({ axis, label: labels[axis], variants: buckets[axis] }));
}

export interface ProductVariantPickerProps {
  productSlug: string;
  /** The currently selected variant (or null = default fallback). */
  selectedVariant: ProductVariant | null;
  /** All active variants for the product. */
  variants: ProductVariant[];
}

/**
 * Returns the best human-readable chip label for a variant. Falls back
 * to the slug if storage/color/connectivity are all empty (e.g. the
 * product's only "Default" variant row).
 */
export function chipLabelForVariant(v: ProductVariant): string {
  return v.storage ?? v.color ?? v.connectivity ?? v.slug ?? "Default";
}

export function ProductVariantPicker({
  productSlug,
  selectedVariant,
  variants,
}: ProductVariantPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Empty / single-variant: render nothing. The brief allows omitting the
  // picker for products with no real variant choices (e.g. 197/197
  // products today ship with just a "default" row). Keeps the page clean
  // for the common case.
  const visibleVariants = variants.filter((v) => v.is_active);
  if (visibleVariants.length === 0) return null;

  const groups = groupVariantsByAxis(visibleVariants);

  const handleSelect = (slug: string | null) => {
    const params = new URLSearchParams();
    if (slug) params.set("v", slug);
    const qs = params.toString();
    const href = qs
      ? `/product/${productSlug}?${qs}`
      : `/product/${productSlug}`;
    // startTransition: keep UI responsive while the server re-renders the
    // page with the new searchParams. `router.replace` updates the URL
    // without adding a history entry (browser-back returns to the
    // category page, not the previous variant).
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-4"
      data-testid="variant-picker"
      aria-busy={isPending}
    >
      {groups.length === 0 ? (
        // Fallback: variants exist but none have a typed axis (e.g. the
        // single "default" row from migration 138). Show one chip so the
        // UI is honest about what's available.
        <ChipRow
          label="Varian"
          variants={visibleVariants}
          selectedId={selectedVariant?.id ?? null}
          onSelect={handleSelect}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <ChipRow
              key={g.axis}
              label={g.label}
              variants={g.variants}
              selectedId={selectedVariant?.id ?? null}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChipRowProps {
  label: string;
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (slug: string | null) => void;
}

function ChipRow({ label, variants, selectedId, onSelect }: ChipRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="min-w-[110px] text-sm font-medium text-zinc-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          const slug = v.slug ?? "";
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid="variant-chip"
              data-variant-slug={slug}
              data-selected={isSelected ? "true" : "false"}
              onClick={() => onSelect(isSelected ? null : slug)}
              className={
                isSelected
                  ? "inline-flex h-9 items-center rounded-full bg-[#10B981] px-4 text-sm font-medium text-white shadow-sm transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/40"
                  : "inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
              }
            >
              {chipLabelForVariant(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

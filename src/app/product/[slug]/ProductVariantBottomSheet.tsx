"use client";

/**
 * ProductVariantBottomSheet — mobile entry point for variant selection.
 *
 * On screens < md, the desktop chip group is hidden and a single
 * "Pilih varian" button takes its place. Tapping the button opens a
 * bottom sheet (full width, 60vh, rounded-t-2xl) that contains the same
 * chip group + a "Tutup" close button. Selecting a chip closes the
 * sheet AND updates the URL via `router.replace` (mirrors the desktop
 * behaviour so the canonical state lives in the URL on every viewport).
 *
 * Built on the project's existing Radix Dialog primitive
 * (`@/components/ui/dialog`) which handles focus trap + escape-to-close
 * out of the box. We re-skin the DialogContent to a bottom sheet via
 * Tailwind utilities (no new dependencies).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import type { ProductVariant } from "@/types/product-types";
import {
  chipLabelForVariant,
  groupVariantsByAxis,
} from "./ProductVariantPicker";

export interface ProductVariantBottomSheetProps {
  productSlug: string;
  selectedVariant: ProductVariant | null;
  variants: ProductVariant[];
}

export function ProductVariantBottomSheet({
  productSlug,
  selectedVariant,
  variants,
}: ProductVariantBottomSheetProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const visibleVariants = variants.filter((v) => v.is_active);

  // No variants at all -> render nothing (mirrors desktop).
  if (visibleVariants.length === 0) return null;

  const handleSelect = (slug: string | null) => {
    const params = new URLSearchParams();
    if (slug) params.set("v", slug);
    const qs = params.toString();
    const href = qs
      ? `/product/${productSlug}?${qs}`
      : `/product/${productSlug}`;
    setOpen(false);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const groups = groupVariantsByAxis(visibleVariants);
  const selectedLabel = selectedVariant
    ? chipLabelForVariant(selectedVariant)
    : "Pilih varian";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full justify-between rounded-2xl border-zinc-200 bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        onClick={() => setOpen(true)}
        data-testid="variant-bottom-sheet-trigger"
      >
        <span className="flex items-center gap-2">
          <span className="text-zinc-500">Varian</span>
          <span className="text-zinc-900">{selectedLabel}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-500" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          // Re-skin the Radix dialog as a bottom sheet: full width, glued
          // to the bottom of the viewport, 60vh tall, rounded top corners.
          // Closed state slides out to bottom; open state slides in.
          className="fixed right-0 bottom-0 left-0 top-auto max-h-[60vh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-2xl border-zinc-200 bg-white p-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:max-w-lg sm:bottom-6 sm:left-1/2 sm:right-auto sm:translate-x-[-50%]"
        >
          {/* Hidden but required for a11y — Radix warns if no Title/Description */}
          <DialogTitle className="sr-only">Pilih varian</DialogTitle>
          <DialogDescription className="sr-only">
            Pilih penyimpanan, warna, atau konektivitas untuk varian produk ini.
          </DialogDescription>

          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
            <h2 className="text-base font-semibold text-zinc-900">
              Pilih varian
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              data-testid="variant-bottom-sheet-close"
            >
              Tutup
            </Button>
          </div>

          <div className="space-y-5 p-4">
            {groups.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {visibleVariants.map((v) => {
                  const isSelected = v.id === selectedVariant?.id;
                  const slug = v.slug ?? "";
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelect(isSelected ? null : slug)}
                      className={
                        isSelected
                          ? "inline-flex h-9 items-center rounded-full bg-[#047857] px-4 text-sm font-medium text-white"
                          : "inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900"
                      }
                    >
                      {chipLabelForVariant(v)}
                    </button>
                  );
                })}
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.axis} className="space-y-2">
                  <p className="text-sm font-medium text-zinc-500">{g.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.variants.map((v) => {
                      const isSelected = v.id === selectedVariant?.id;
                      const slug = v.slug ?? "";
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            handleSelect(isSelected ? null : slug)
                          }
                          className={
                            isSelected
                              ? "inline-flex h-9 items-center rounded-full bg-[#047857] px-4 text-sm font-medium text-white"
                              : "inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900"
                          }
                        >
                          {chipLabelForVariant(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

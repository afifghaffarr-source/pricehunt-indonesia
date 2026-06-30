"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

/**
 * Distinct axis values that exist in the result set. Empty arrays mean
 * "no values in the current result set" (the chip group renders nothing
 * for that axis). Same shape as the API response.
 */
export interface VariantValues {
  storage: string[];
  color: string[];
  connectivity: string[];
}

export type VariantFilterAxis = "storage" | "color" | "connectivity";

export interface VariantFilterState {
  storage: string[];
  color: string[];
  connectivity: string[];
}

export interface VariantFilterChipsProps {
  /** Distinct values from the API (only values that exist in results). */
  values: VariantValues;
  /** Current selection — multi-value per axis. */
  selected: VariantFilterState;
  /** Called when selection changes. Receives the new state. */
  onChange: (next: VariantFilterState) => void;
}

const AXES: Array<{
  key: keyof VariantValues;
  label: string;
}> = [
  { key: "storage", label: "Penyimpanan" },
  { key: "color", label: "Warna" },
  { key: "connectivity", label: "Konektivitas" },
];

function isEmpty(state: VariantFilterState): boolean {
  return (
    state.storage.length === 0 &&
    state.color.length === 0 &&
    state.connectivity.length === 0
  );
}

/**
 * Multi-select chip group for variant filter axes.
 *
 * Multiple values within the same axis are OR-ed (e.g. storage: 256GB OR
 * 512GB matches BOTH); the axes themselves are AND-ed. Clicking a chip
 * toggles its membership in the axis; clicking the active category's
 * "× Reset" button clears all axes.
 *
 * Visual style matches the product page picker: filled accent for
 * selected chips, whisper border for unselected, no emoji, sentence case
 * labels in Indonesian.
 */
export function VariantFilterChips({
  values,
  selected,
  onChange,
}: VariantFilterChipsProps) {
  const toggle = useCallback(
    (axis: keyof VariantFilterState, value: string) => {
      const current = selected[axis];
      const nextAxis = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onChange({ ...selected, [axis]: nextAxis });
    },
    [selected, onChange],
  );

  const reset = useCallback(() => {
    onChange({ storage: [], color: [], connectivity: [] });
  }, [onChange]);

  // If every axis has no values, render nothing (no filters available).
  if (
    values.storage.length === 0 &&
    values.color.length === 0 &&
    values.connectivity.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="variant-filter-chips">
      {AXES.map(({ key, label }) => {
        const axisValues = values[key];
        if (axisValues.length === 0) return null;
        const selectedAxis = selected[key];
        return (
          <div key={key} className="flex flex-wrap items-center gap-2">
            <span className="min-w-[110px] text-sm text-muted-foreground">
              {label}:
            </span>
            {axisValues.map((value) => {
              const isSelected = selectedAxis.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggle(key, value)}
                  aria-pressed={isSelected}
                  data-testid={`chip-${key}-${value}`}
                  className={
                    isSelected
                      ? "inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition-transform hover:scale-105"
                      : "inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-900 transition-colors hover:border-zinc-300"
                  }
                >
                  {value}
                </button>
              );
            })}
          </div>
        );
      })}
      {!isEmpty(selected) && (
        <button
          type="button"
          onClick={reset}
          data-testid="variant-filter-reset"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Reset filter
        </button>
      )}
    </div>
  );
}

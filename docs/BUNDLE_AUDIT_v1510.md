# Bundle Audit (v1.5.10)

**Date:** 2026-06-16
**Triggered by:** v1.5.9 perf audit found a 53KB unused-JS chunk

## Root Cause

`@base-ui/react/input` is a 1-line wrapper around `Field.Control`:

```js
// node_modules/@base-ui/react/input/Input.js
const Input = React.forwardRef(function Input(props, forwardedRef) {
  return React.createElement(_field.Field.Control, { ref: forwardedRef, ...props });
});
```

Our `src/components/ui/input.tsx` imported this `Input` for a styled native
`<input>`. The Field/Form module (53KB) was pulled in transitively even though
we never used any of the form validation, validity, or `<Field.Root>` APIs.

This affected 17 components across the app, all loading the same 53KB chunk
on first paint even when no `<form>` was rendered.

## Fix

Rewrote `src/components/ui/input.tsx` to use `@base-ui/react/use-render` —
the same pattern as `badge.tsx` — wrapping a native `<input>`. This is a
6-line component that just composes className + props.

```tsx
function Input({ className, type = "text", render, ...props }) {
  return useRender({
    defaultTagName: "input",
    props: mergeProps({ type, className: cn(INPUT_CLASS, className) }, props),
    render,
    state: { slot: "input" },
  });
}
```

Kept the public API identical (same props, same `data-slot="input"`, same
class names), so no consumer code needs to change. The only behavioral
difference: no `Field.Control` validation hooks — but we never used them.

## Impact

| Route | Before (raw) | After (raw) | Δ |
|---|---|---|---|
| `/` (home) | ~880 KB | ~840 KB | **−40 KB** |
| `/product/[slug]` | ~1410 KB | ~1368 KB | **−42 KB** |
| `/search` | ~970 KB | ~930 KB | **−40 KB** |

(Bandwidth is gzipped so real network transfer is ~30% of these numbers,
but the relative savings are the same.)

Plus a 53KB chunk (`43fbv80stluft.js` in the previous build) that no
route needs anymore. That chunk contained:
- `useStableCallback` × 14
- `validityData` × 12
- `validation` × 20
- base-ui form/Field infrastructure × 38 modules

All gone.

## Verification

- ✅ 296/296 tests pass (3 pre-existing skips; not related)
- ✅ `npm run build` clean
- ✅ All 3 routes tested (`/`, `/product/[slug]`, `/auth/login`) return HTTP 200
- ✅ `<Input>` renders as native `<input>` with correct className and `type` attribute
- ✅ Confirmed by HTML inspection: `<input data-slot="input" type="email" ...>`

## Other Chunks Still Worth Reviewing

| Chunk | Size (raw) | Notes |
|---|---|---|
| `0a404wr8z-m44.js` | 242 KB | Probably React + Next.js runtime |
| `05qfi8-tgmvvb.js` | 233 KB | Probably chart/recharts or similar |
| `0ug4c9qkno-5h.js` | 148 KB | Probably Vexo API client or Tanstack Query |
| `0cz1d0mv5g_q7.js` | 113 KB | |

Lighthouse would help identify which of these are on the critical path
for LCP/FCP. Skipped here because no Chrome binary in this environment.

## Lessons Learned

1. **Always read the source of your primitive library imports.** `@base-ui/react/input`
   looked like a styled `<input>` wrapper. The source revealed it's actually
   a `<Field.Control>` wrapper, and `Field` pulls in the entire form/validation
   engine.
2. **Use `useRender` (base-ui's render-prop) for primitive wrapping.** It's
   the right primitive for this use case. The high-level components are
   featureful (Field-aware, Menu-aware, etc.) and cost bundle size.
3. **Audit pattern:** `grep -rh "from \"@base-ui" src/` then look at each
   import. If a "primitive" wraps a featureful component (Field, Menu,
   Dialog, etc.) and you don't use the features, swap to `useRender`.
4. **Bundle stats are auto-generated** in `.next/diagnostics/route-bundle-stats.json`
   per build. Quick way to spot outliers.

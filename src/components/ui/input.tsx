import * as React from "react"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

// Wrapper around native <input>. We use base-ui's `useRender` (same pattern as
// badge.tsx) instead of `@base-ui/react/input` because the latter is just a
// 1-line wrapper around Field.Control that pulls in the entire 53KB
// form/validation machinery we never use.
function Input({
  className,
  type = "text",
  render,
  ...props
}: useRender.ComponentProps<"input"> & { type?: React.HTMLInputTypeAttribute }) {
  return useRender({
    defaultTagName: "input",
    props: mergeProps(
      {
        type,
        className: cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        ),
      },
      props
    ),
    render,
    state: { slot: "input" },
  })
}

// Tiny inline merge (avoids pulling in @base-ui/react/merge-props for a 6-line
// helper). Behaves like Object.assign but skips undefined values.
function mergeProps<A extends object, B extends object>(a: A, b: B): A & B {
  const out = { ...a } as A & B
  for (const k of Object.keys(b) as (keyof B)[]) {
    const v = b[k]
    if (v !== undefined) Object.assign(out, { [k]: v })
  }
  return out
}

export { Input }

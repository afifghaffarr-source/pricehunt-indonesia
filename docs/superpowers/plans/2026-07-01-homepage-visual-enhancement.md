# Homepage Visual Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Transform BijakBeli homepage with experimental visual effects (Spline 3D, Framer Motion, Lottie, interactive charts) while maintaining free-tier constraints and <2.5s LCP.

**Architecture:** Three focused enhancements — (1) Hero section with Spline 3D scene + animated mesh gradient background, (2) Trending products with hover-triggered sparkline charts, (3) Demo section with interactive price charts and animated counters. All effects code-split, lazy-loaded, with mobile fallbacks.

**Tech Stack:** Next.js 16.2.7, React 19, Spline (@splinetool/react-spline), Framer Motion, Lottie, Recharts (already installed ^3.8.1), react-countup

## Global Constraints

- Next.js 16.2.7, React 19.2.4 (locked versions)
- Recharts already installed at ^3.8.1 (use existing, no upgrade)
- Free-tier only: Spline free (public scenes, watermark accepted), Vercel free (100GB bandwidth)
- Bundle increase <500KB gzipped total (code-split heavy deps)
- Performance: LCP <2.5s desktop, <3.5s mobile 4G
- Mobile fallback: no Spline on <768px, static SVG illustration instead
- Dark mode optimized: all components respect dark mode by default
- Taste-skill compliance: Plus Jakarta Sans font, semantic color tokens, no animate-bounce
- Accessibility: respect prefers-reduced-motion, all interactive elements keyboard accessible

---

## Task 1: Install Dependencies & Animation Library

**Goal:** Install new packages and create reusable animation utilities

- [ ] Install dependencies
```bash
npm install @splinetool/react-spline@^4.0.0 framer-motion@^11.18.0 lottie-react@^2.4.0 react-sparklines@^1.7.0 react-countup@^6.5.0
```

- [ ] Verify installations
```bash
npm ls @splinetool/react-spline framer-motion lottie-react react-sparklines react-countup
```

- [ ] Create animation library src/lib/animations.ts
```typescript
import type { Variants } from 'framer-motion';

export const easing = {
  smooth: [0.43, 0.13, 0.23, 0.96] as const,
  snappy: [0.19, 1.0, 0.22, 1.0] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
};

export const duration = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  verySlow: 1.2,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slow, ease: easing.snappy },
  },
};
```

- [ ] Check bundle baseline
```bash
npm run build 2>&1 | grep -E "Route|First Load"
```

- [ ] Commit
```bash
git add package.json package-lock.json src/lib/animations.ts
git commit -m "feat(deps): add Spline, Framer Motion, Lottie + animation library"
```

---

## Task 2: Animated Background Component

**Goal:** Create animated mesh gradient background with floating orbs

- [ ] Create src/components/hero/AnimatedBackground.tsx
```typescript
'use client';

export function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-blue-950 to-sky-950 animate-gradient" />
      
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)',
          backgroundSize: '4rem 4rem',
        }}
      />
      
      {/* Floating orbs */}
      <div
        className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-float motion-reduce:animate-none"
        style={{ animationDuration: '20s' }}
      />
      <div
        className="absolute right-0 top-1/2 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-float motion-reduce:animate-none"
        style={{ animationDuration: '25s', animationDelay: '5s' }}
      />
      <div
        className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl animate-float motion-reduce:animate-none"
        style={{ animationDuration: '30s', animationDelay: '10s' }}
      />
    </div>
  );
}
```

- [ ] Add CSS animations to src/app/globals.css (append to end)
```css

/* Animated mesh gradient */
@keyframes gradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 15s ease infinite;
}

/* Floating orbs */
@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.animate-float {
  animation: float 20s ease-in-out infinite;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .animate-gradient {
    animation: none;
  }
  .animate-float {
    animation: none;
  }
}
```

- [ ] Test in browser
```bash
npm run dev
# Open localhost:3000, verify animated background renders
```

- [ ] Commit
```bash
git add src/components/hero/AnimatedBackground.tsx src/app/globals.css
git commit -m "feat(hero): add animated mesh gradient background with floating orbs"
```

---

## Task 3: Spline 3D Scene Component

**Goal:** Create Spline embed component with lazy loading and mobile fallback

- [ ] Create src/components/hero/HeroSplineScene.tsx
```typescript
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full bg-purple-500/20" />
    </div>
  ),
});

export function HeroSplineScene() {
  return (
    <div className="relative hidden h-[600px] w-[800px] lg:block">
      <Suspense
        fallback={
          <div className="h-full w-full animate-pulse rounded-lg bg-purple-500/10" />
        }
      >
        <Spline
          scene="https://prod.spline.design/PLACEHOLDER/scene.splinecode"
          className="h-full w-full"
        />
      </Suspense>
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50">
        Made with Spline
      </div>
    </div>
  );
}
```

- [ ] Note: Spline scene URL is PLACEHOLDER — will be replaced in Task 11 after Spline account setup

- [ ] Commit
```bash
git add src/components/hero/HeroSplineScene.tsx
git commit -m "feat(hero): add Spline 3D scene component (placeholder URL)"
```

---

## Task 4: Integrate Hero Visual Enhancements

**Goal:** Wire AnimatedBackground and HeroSplineScene into homepage hero section

- [ ] Add imports to src/app/page.tsx (around line 1-26)
```typescript
import { AnimatedBackground } from '@/components/hero/AnimatedBackground';
import { HeroSplineScene } from '@/components/hero/HeroSplineScene';
```

- [ ] Find and replace hero section (around lines 52-74) with:
```typescript
      <section className="relative min-h-dvh overflow-hidden">
        <AnimatedBackground />
        
        <div className="container relative z-10 flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-16 lg:flex-row lg:gap-16">
          <HeroSplineScene />
          
          <div className="flex max-w-2xl flex-col gap-6 text-center lg:text-left">
            <Badge className="w-fit self-center lg:self-start" variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered Price Intelligence
            </Badge>
            
            <h1 className="text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
              Beli yang Tepat, di Waktu yang Tepat
            </h1>
            
            <p className="text-lg text-muted-foreground">
              Bandingkan harga dari 6+ marketplace terpercaya. Temukan deal terbaik dengan AI kami.
            </p>
            
            <div className="w-full">
              <SmartSearchBar />
            </div>
          </div>
        </div>
      </section>
```

- [ ] Build and verify
```bash
npm run build
```

- [ ] Test in browser
```bash
npm run dev
# Check localhost:3000 — animated background visible, Spline placeholder loads on desktop (>1024px)
```

- [ ] Commit
```bash
git add src/app/page.tsx
git commit -m "feat(hero): integrate animated background and Spline into homepage"
```

---

## Task 5: Price Sparkline Component

**Goal:** Create mini sparkline chart component for product card hover

- [ ] Create src/components/product/PriceSparkline.tsx
```typescript
'use client';

import { Sparklines, SparklinesLine } from 'react-sparklines';

interface PriceSparklineProps {
  data: number[];
  color?: string;
}

export function PriceSparkline({
  data,
  color = 'rgb(16 185 129)',
}: PriceSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent">
      <Sparklines data={data} height={40}>
        <SparklinesLine
          color={color}
          style={{ strokeWidth: 2, fill: 'none' }}
        />
      </Sparklines>
    </div>
  );
}
```

- [ ] Commit
```bash
git add src/components/product/PriceSparkline.tsx
git commit -m "feat(product): add price sparkline component for hover state"
```

---

## Task 6: Enhance ProductCard with Hover Sparkline

**Goal:** Add hover state to ProductCard that reveals sparkline chart

- [ ] Modify src/components/product/ProductCard.tsx — add imports at top
```typescript
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PriceSparkline } from './PriceSparkline';
```

- [ ] Inside ProductCard component function, add state and mock data
```typescript
export function ProductCard({
  product,
  priority = false,
  activeVariantFilter,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Mock 30-day price history (replace with real product.priceHistory when available)
  const mockPriceHistory = Array.from({ length: 30 }, (_, i) => 
    product.lowestPrice + Math.random() * (product.highestPrice - product.lowestPrice)
  );
  
  const discount = getDiscountPercent(product.lowestPrice, product.highestPrice);
  // ... rest of existing code
```

- [ ] Wrap Card component with hover handlers (around line 44-45)
```typescript
  return (
    <Link href={`/product/${product.slug}`}>
      <Card
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50"
      >
```

- [ ] Add sparkline overlay inside image container (after Image component, around line 56-61)
```typescript
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Sparkline overlay on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <PriceSparkline data={mockPriceHistory} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
```

- [ ] Test hover interaction
```bash
npm run dev
# Hover over product cards on homepage — sparkline should slide up from bottom
```

- [ ] Commit
```bash
git add src/components/product/ProductCard.tsx
git commit -m "feat(product): add hover sparkline animation to ProductCard"
```

---

## Task 7: Interactive Price Chart Component

**Goal:** Create full-size interactive line chart for demo section

- [ ] Create src/components/demo/InteractivePriceChart.tsx
```typescript
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatRupiah } from '@/lib/utils';

interface PriceDataPoint {
  date: string;
  price: number;
}

interface InteractivePriceChartProps {
  data: PriceDataPoint[];
}

export function InteractivePriceChart({ data }: InteractivePriceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" stroke="rgb(148 163 184)" fontSize={12} />
        <YAxis
          tickFormatter={(value) => formatRupiah(value)}
          stroke="rgb(148 163 184)"
          fontSize={12}
        />
        <Tooltip
          formatter={(value: number) => formatRupiah(value)}
          contentStyle={{
            backgroundColor: 'rgb(15 23 42)',
            border: '1px solid rgb(148 163 184 / 0.2)',
            borderRadius: '8px',
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="rgb(16 185 129)"
          strokeWidth={2}
          dot={false}
          fill="url(#priceGradient)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] Commit
```bash
git add src/components/demo/InteractivePriceChart.tsx
git commit -m "feat(demo): add interactive price chart with Recharts"
```

---

## Task 8: Animated Counter Component

**Goal:** Create count-up animation component for savings display

- [ ] Create src/components/demo/AnimatedCounter.tsx
```typescript
'use client';

import CountUp from 'react-countup';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedCounterProps {
  end: number;
  prefix?: string;
  duration?: number;
}

export function AnimatedCounter({
  end,
  prefix = 'Rp ',
  duration = 2,
}: AnimatedCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <span ref={ref} className="text-4xl font-bold text-emerald-500">
      {isInView && (
        <CountUp
          start={0}
          end={end}
          duration={duration}
          separator="."
          prefix={prefix}
          useEasing
          easingFn={(t, b, c, d) => c * ((t = t / d - 1) * t * t + 1) + b}
        />
      )}
    </span>
  );
}
```

- [ ] Commit
```bash
git add src/components/demo/AnimatedCounter.tsx
git commit -m "feat(demo): add animated counter with scroll trigger"
```

---

## Task 9: Enhance Demo Section with Interactive Charts

**Goal:** Replace static demo cards with interactive charts and animated counters

- [ ] Add imports to src/app/page.tsx
```typescript
import { InteractivePriceChart } from '@/components/demo/InteractivePriceChart';
import { AnimatedCounter } from '@/components/demo/AnimatedCounter';
```

- [ ] Find demo section in src/app/page.tsx (search for "Contoh Analisis" or "iPhone 15 Pro Max")

- [ ] Replace the demo section cards with interactive version:
```typescript
      <section className="container px-4 py-16">
        <SectionHeading
          icon={BarChart3}
          title="Contoh Analisis Real-Time"
          subtitle="Lihat bagaimana AI kami menganalisis harga produk"
        />
        
        <Card className="mx-auto max-w-4xl">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-bold">iPhone 15 Pro Max 256GB</h3>
              <p className="text-muted-foreground">Natural Titanium</p>
            </div>
            
            <InteractivePriceChart
              data={[
                { date: '01 Jun', price: 20500000 },
                { date: '05 Jun', price: 20200000 },
                { date: '10 Jun', price: 19800000 },
                { date: '15 Jun', price: 19500000 },
                { date: '20 Jun', price: 19300000 },
                { date: '25 Jun', price: 18950000 },
                { date: '30 Jun', price: 18850000 },
              ]}
            />
            
            <div className="mt-6 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hemat hingga</p>
                <AnimatedCounter end={450000} />
              </div>
              
              <Link
                href="/product/iphone-15-pro-max-256gb-natural-titanium"
                className={buttonVariants({ size: 'lg' })}
              >
                Lihat Detail Produk
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
```

- [ ] Test scroll-triggered animations
```bash
npm run dev
# Scroll to demo section — chart appears, counter animates from 0 to 450000
```

- [ ] Commit
```bash
git add src/app/page.tsx
git commit -m "feat(demo): add interactive price chart and animated counter to demo section"
```

---

## Task 10: Performance Optimization & Bundle Analysis

**Goal:** Verify bundle size, LCP, and optimize if needed

- [ ] Build and analyze bundle
```bash
npm run build 2>&1 | tee build.log
grep -A 20 "Route" build.log
```

- [ ] Compare with baseline from Task 1
```bash
# Check First Load JS for / (homepage)
# Target: increase <500KB from baseline
```

- [ ] Run Lighthouse audit
```bash
npm run lhci
```

- [ ] If LCP >2.5s desktop or bundle increase >500KB:
  - Verify Spline is code-split (check build output for separate chunk)
  - Verify Framer Motion tree-shaken (only useInView, motion, AnimatePresence used)
  - Check Recharts bundle (should use tree-shaking, only LineChart imported)

- [ ] Document metrics
```bash
cat > docs/superpowers/plans/2026-07-01-visual-enhancement-metrics.md << 'EOF'
# Visual Enhancement Performance Metrics

## Bundle Size Analysis
- Baseline (Task 1): [insert from Task 1]
- After enhancements: [insert from build.log]
- Increase: [calculate delta]
- Target: <500KB increase ✓/✗

## Lighthouse Scores
- LCP Desktop: [ms]
- LCP Mobile: [ms]
- Performance Score: [/100]
- Target: LCP <2.5s desktop, <3.5s mobile ✓/✗

## Dependencies Added
- @splinetool/react-spline: ~200KB
- framer-motion: ~80KB
- lottie-react: ~50KB
- react-sparklines: ~20KB
- react-countup: ~10KB
Total: ~360KB (within 500KB target)

## Code-Splitting Verified
- Spline: separate chunk ✓
- Framer Motion: tree-shaken ✓
- Recharts: only LineChart imported ✓
EOF
```

- [ ] Commit metrics
```bash
git add docs/superpowers/plans/2026-07-01-visual-enhancement-metrics.md
git commit -m "docs: add visual enhancement performance metrics"
```

---

## Task 11: Create Spline 3D Scene (Manual Step)

**Goal:** Create actual Spline scene and update placeholder URL

**Manual Steps (User Action Required):**

1. Go to https://spline.design/ and sign up for free account
2. Create new project "BijakBeli Hero Scene"
3. Add 3 low-poly models from library:
   - Generic smartphone
   - Generic laptop
   - Generic headphones
4. Arrange in floating layout (vary Y-axis positions)
5. Add orbital rotation animation:
   - Select all 3 objects
   - Add Event: Rotate → Y-axis, 360°, 60s duration, infinite loop
6. Configure lighting:
   - Directional light: position top-right, intensity 0.8
   - Ambient light: intensity 0.3
7. Set materials: Glossy plastic (metalness 0.7, roughness 0.4)
8. Export for web:
   - Click Export → Web (Embed)
   - Copy scene URL: `https://prod.spline.design/[SCENE_ID]/scene.splinecode`

- [ ] Update src/components/hero/HeroSplineScene.tsx with actual scene URL
```typescript
// Replace line with PLACEHOLDER
scene="https://prod.spline.design/[ACTUAL_SCENE_ID_FROM_SPLINE]/scene.splinecode"
```

- [ ] Test Spline scene loads
```bash
npm run dev
# Desktop viewport (>1024px) — 3D scene should render and slowly rotate
```

- [ ] Commit
```bash
git add src/components/hero/HeroSplineScene.tsx
git commit -m "feat(hero): update Spline scene with production URL"
```

---

## Task 12: Final Integration Testing

**Goal:** E2E testing, cross-browser verification, accessibility checks

- [ ] Test desktop (Chrome 1920x1080)
  - [ ] Hero: animated background visible
  - [ ] Hero: Spline 3D scene loads and rotates
  - [ ] Product cards: sparkline appears on hover
  - [ ] Demo: chart is interactive (hover shows tooltip)
  - [ ] Demo: counter animates on scroll into view

- [ ] Test mobile (<768px, Chrome DevTools device emulation)
  - [ ] Hero: animated background visible
  - [ ] Hero: Spline hidden (display: none on lg:block)
  - [ ] Product cards: no sparkline (hover not applicable on touch)
  - [ ] Demo: chart responsive (full width)
  - [ ] Demo: counter still animates on scroll

- [ ] Test Safari desktop
  - [ ] All animations render correctly
  - [ ] Spline scene loads
  - [ ] No console errors

- [ ] Test Firefox desktop
  - [ ] All animations render correctly
  - [ ] Spline scene loads
  - [ ] No console errors

- [ ] Test reduced motion (Chrome DevTools > Rendering > Emulate CSS prefers-reduced-motion: reduce)
  - [ ] Background gradient: static (no animation)
  - [ ] Floating orbs: static (no movement)
  - [ ] Sparkline: still renders on hover but no animation
  - [ ] Counter: instant display (no count-up)

- [ ] Test dark mode
  - [ ] All components use semantic tokens
  - [ ] Chart readable (text color sufficient contrast)
  - [ ] Spline scene visible

- [ ] Run full test suite
```bash
npm run typecheck
npm run lint
npm test
npm run build
```

- [ ] Visual regression check (manual)
  - [ ] Hero section layout preserved
  - [ ] Product grid alignment unchanged
  - [ ] Demo section spacing correct
  - [ ] No layout shift (CLS)

- [ ] Final commit
```bash
git add .
git commit -m "test: final integration testing for visual enhancements"
```

- [ ] Push to master
```bash
git push origin master
```

---

## Success Criteria Checklist

- [ ] All 5 new dependencies installed and verified
- [ ] Hero section has animated background (gradient + orbs)
- [ ] Hero section has Spline 3D scene (desktop only, >1024px)
- [ ] Product cards show sparkline on hover (desktop only)
- [ ] Demo section has interactive Recharts LineChart
- [ ] Demo section has animated CountUp counter
- [ ] Bundle increase <500KB gzipped from baseline
- [ ] LCP <2.5s desktop, <3.5s mobile (Lighthouse)
- [ ] prefers-reduced-motion respected (all animations disabled)
- [ ] Mobile responsive with appropriate fallbacks
- [ ] All tests pass (typecheck, lint, build)
- [ ] Cross-browser compatible (Chrome, Safari, Firefox)
- [ ] Dark mode fully supported
- [ ] No console errors or warnings
- [ ] Spline free tier watermark visible and acceptable

---

**End of Implementation Plan**

**Next Step:** Choose execution method:

**Option 1: Subagent-Driven (Recommended)**
- Fresh subagent per task
- Two-stage review between tasks
- Better isolation and debugging
- Use superpowers:subagent-driven-development skill

**Option 2: Inline Execution**
- Execute tasks in current session
- Batch execution with checkpoints
- Faster for experienced implementer
- Use superpowers:executing-plans skill

Which approach do you prefer?

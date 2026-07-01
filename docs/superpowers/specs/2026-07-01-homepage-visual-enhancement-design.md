# BijakBeli Homepage Visual Enhancement - Design Spec

**Date:** 2026-07-01  
**Author:** Kiro (Hermes Agent)  
**Status:** Draft → Awaiting User Review

---

## Executive Summary

Transform BijakBeli homepage from functional-but-plain to visually engaging using experimental effects while maintaining free-tier constraints and performance targets.

**Goals:**
- Increase time-on-site via interactive visual elements
- Differentiate from utilitarian competitors (Camel³, Keepa)
- Showcase technical capability (trust signal for data tool)
- Maintain mobile performance (<3s LCP on 4G)

**Non-Goals:**
- Enterprise features (paid Spline pro, custom CDN)
- Desktop-only experiences (all features must work on mobile)
- Generic template aesthetics (avoid stock Three.js demos)

---

## Design Principles

### 1. Modern & Data-Driven Aesthetic
- Dark mode optimized color scheme
- Neon accents (emerald, blue, purple gradients)
- Dashboard/technical vibe
- Real-time data visualization focus

### 2. Hybrid Imagery Strategy
- Minimal illustrations (line art, geometric shapes)
- Data visualization accents (charts, sparklines, animated counters)
- No stock photos or generic mockups
- Every visual element must serve functional purpose

### 3. Experimental Motion Design
- 3D transforms and perspective effects
- Interactive hover states with data reveals
- Scroll-triggered animations (Framer Motion)
- Physics-based interactions where appropriate

### 4. Free-Tier Architecture
- Spline free plan (5 projects, public scenes, ~200KB runtime)
- Lottie files (<50KB each, self-hosted)
- Framer Motion (already in deps)
- Recharts or Visx for data viz (lightweight options)

---

## Section-by-Section Design

### **Section 1: Hero Section** ⭐ Priority 1

**Current State:**
```tsx
// Pure text + SmartSearchBar, no visual interest
<section className="relative overflow-hidden bg-gradient-to-br from-purple-50...">
  <Badge>AI-Powered</Badge>
  <h1>Beli yang Tepat, di Waktu yang Tepat</h1>
  <SmartSearchBar />
</section>
```

**New Design:**

**Visual Elements:**
1. **Background Layer (Canvas/CSS)**
   - Animated mesh gradient (dark purple → blue → teal)
   - Subtle grid pattern overlay (1px lines, 10% opacity)
   - Floating orbs (blur circles, slow drift animation)
   
2. **3D Scene (Spline Embed)**
   - Spline scene: floating product showcase
     - 3 products: phone, laptop, headphones (low-poly models)
     - Orbital rotation (slow, 60s cycle)
     - Floating price tags attached to products (CSS 3D positioned)
   - Scene size: 800x600px desktop, 375x300px mobile
   - Lazy load: below-fold on mobile, immediate on desktop
   
3. **Interactive Price Tags**
   - CSS 3D transforms (`transform: translate3d()`)
   - Animated values: Rp X → Rp Y (count-up on viewport enter)
   - Marketplace icons (Tokopedia, Shopee logos, 16x16px)
   - Hover: slight scale + glow effect

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  [Background: animated mesh]        │
│                                     │
│  ┌──────────┐  ┌─────────────────┐ │
│  │  Spline  │  │  Content Block  │ │
│  │  3D      │  │  • Badge        │ │
│  │  Scene   │  │  • H1           │ │
│  │  (left)  │  │  • SmartSearch  │ │
│  └──────────┘  └─────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Spline Scene Spec:**
- **Objects:** 3 low-poly products (phone, laptop, headphones)
- **Animation:** Orbital rotation (Y-axis, 60s duration, ease-in-out)
- **Lighting:** Single directional light (top-right), ambient light (0.3 intensity)
- **Materials:** Glossy plastic (0.7 metalness, 0.4 roughness)
- **Export:** Embed code via `<Spline scene="https://prod.spline.design/[scene-id]/scene.splinecode" />`

**Framer Motion Orchestration:**
```tsx
// Stagger content reveal on mount
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ staggerChildren: 0.1 }}
>
  <motion.div variants={fadeInUp}>Badge</motion.div>
  <motion.div variants={fadeInUp}>H1</motion.div>
  <motion.div variants={fadeInUp}>SmartSearchBar</motion.div>
</motion.div>
```

**Performance Budget:**
- Spline runtime: ~200KB gzipped
- Spline scene: <500KB (optimized exports)
- CSS animations: GPU-accelerated only (`transform`, `opacity`)
- Target LCP: <2.5s on desktop, <3.5s on mobile 4G

**Fallback Strategy:**
- If Spline load fails (CORS, timeout >5s): show static gradient background
- Mobile <768px: hide Spline embed, show static illustration (SVG line art)

---

### **Section 2: Trending Products Grid** ⭐ Priority 2

**Current State:**
```tsx
// ProductCard with basic hover (scale, shadow)
<ProductCard product={product} />
```

**New Design:**

**Interactive Chart Overlay:**

On hover, ProductCard reveals mini price history chart:

1. **Lottie Animation Trigger**
   - Lottie file: `price-chart-reveal.json` (line chart drawing animation)
   - Duration: 800ms
   - Plays once on first hover per card
   - File size: <30KB

2. **Sparkline Overlay**
   - 30-day price history mini chart
   - Library: `react-sparklines` or custom SVG path
   - Positioned: absolute bottom of image, 100% width, 40px height
   - Colors: gradient (emerald-500 → emerald-700)
   - Animation: stroke-dashoffset path draw (CSS)

3. **Data Tooltip**
   - Appears on hover: lowest price + date
   - Positioning: floating above card (Framer Motion layout animation)
   - Style: dark glass morphism card

**Implementation Pattern:**
```tsx
<Card onHoverStart={() => setIsHovered(true)}>
  <div className="relative">
    <Image src={product.imageUrl} />
    
    {/* Sparkline overlay */}
    <AnimatePresence>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80"
        >
          <Sparklines data={product.priceHistory}>
            <SparklinesLine color="rgb(16 185 129)" />
          </Sparklines>
        </motion.div>
      )}
    </AnimatePresence>
    
    {/* Lottie chart animation */}
    {isHovered && (
      <Lottie animationData={chartRevealLottie} loop={false} />
    )}
  </div>
</Card>
```

**Click Interaction:**
- Click card → navigate to product detail (unchanged)
- Future enhancement: modal with full interactive chart (not in this spec)

**Performance:**
- Lottie: lazy load after first interaction
- Sparkline: render on hover (no upfront cost)
- Max 4 cards visible on desktop, 2 on mobile (limit simultaneous animations)

---

### **Section 3: Demo/Example Section** ⭐ Priority 3

**Current State:**
```tsx
// Static cards showing iPhone price analysis
<Card>
  <div>Beli Sekarang</div>
  <p>Harga 8% di bawah median 30 hari</p>
</Card>
```

**New Design:**

**Interactive Dashboard Visualization:**

1. **Animated Price History Chart**
   - Library: Recharts `<LineChart>` or Visx
   - Data: mock 30-day price history (iPhone 15 Pro Max)
   - Animation: path draws on scroll enter (Framer Motion + Intersection Observer)
   - Interactions:
     - Hover point → tooltip with date + price
     - Vertical line follows cursor
   - Colors: gradient fill (emerald-500 → emerald-700, 20% opacity)

2. **Live Counter Animation**
   - "Hemat Rp 450.000" → animate count from 0 to 450000
   - Library: `react-countup` or custom hook
   - Trigger: scroll into viewport (once per session)
   - Duration: 2s, ease-out

3. **Marketplace Connection Graph**
   - Visual: 6 marketplace logos arranged in circle
   - Center: "BijakBeli" logo
   - Animated lines connecting center to each marketplace
   - Animation: stroke-dashoffset draw (CSS), staggered (100ms delay each)
   - SVG implementation (no library needed)

4. **Deal Score Meter**
   - Visual: radial progress bar (87/100)
   - Animation: fills from 0 to 87 on scroll enter
   - Library: custom SVG `<circle>` with `stroke-dashoffset`
   - Color: gradient (red → yellow → green based on score)

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  iPhone 15 Pro Max 256GB            │
│  Deal Score: 87/100 [radial meter]  │
├─────────────────┬───────────────────┤
│  Price Chart    │  Marketplace      │
│  (LineChart)    │  Connection Graph │
│                 │  (SVG network)    │
├─────────────────┴───────────────────┤
│  💰 Hemat Rp 450.000 [counter]      │
│  🛒 Beli Sekarang [CTA button]      │
└─────────────────────────────────────┘
```

**Scroll Animation Orchestration:**
```tsx
<motion.section
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.3 }}
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  }}
>
  <motion.div variants={fadeInUp}>Chart</motion.div>
  <motion.div variants={fadeInUp}>Connection Graph</motion.div>
  <motion.div variants={fadeInUp}>Counter</motion.div>
</motion.section>
```

**Data Source:**
- Mock data: hardcoded 30-day price array (for demo consistency)
- Future: pull from `product.priceHistory` API (not in this spec)

---

## Technical Architecture

### Component Structure

```
src/
├── components/
│   ├── hero/
│   │   ├── HeroSplineScene.tsx       # Spline embed wrapper
│   │   ├── AnimatedBackground.tsx    # Mesh gradient canvas
│   │   └── FloatingPriceTags.tsx     # CSS 3D price tags
│   ├── product/
│   │   ├── ProductCard.tsx           # Enhanced with sparkline
│   │   ├── PriceSparkline.tsx        # Mini chart component
│   │   └── ChartRevealLottie.tsx     # Lottie animation wrapper
│   ├── demo/
│   │   ├── InteractivePriceChart.tsx # Recharts/Visx chart
│   │   ├── MarketplaceGraph.tsx      # SVG connection network
│   │   ├── DealScoreMeter.tsx        # Radial progress SVG
│   │   └── AnimatedCounter.tsx       # Count-up component
│   └── ui/
│       └── motion-primitives.tsx     # Shared Framer variants
└── lib/
    └── animations.ts                 # Reusable animation configs
```

### Dependencies (New Additions)

```json
{
  "dependencies": {
    "@splinetool/react-spline": "^4.0.0",      // ~200KB
    "lottie-react": "^2.4.0",                  // ~50KB
    "react-sparklines": "^1.7.0",              // ~20KB
    "recharts": "^2.12.0",                     // ~150KB (or visx ~100KB)
    "react-countup": "^6.5.0"                  // ~10KB
  }
}
```

**Total Bundle Increase:** ~430KB gzipped (~800KB uncompressed)

**Mitigation:**
- Code-split Spline: `dynamic(() => import('./HeroSpline'), { ssr: false })`
- Lazy load Lottie: only fetch on first hover interaction
- Tree-shake Recharts: import specific components only
- Mobile: conditionally load smaller subset (no Spline, lighter charts)

### Animation Performance Guardrails

1. **GPU Acceleration Enforcement**
   - Only animate `transform` and `opacity` (never `width`, `height`, `top`, `left`)
   - Use `will-change: transform` sparingly (add on hover, remove after)
   - Prefer CSS transitions over JS animations for simple cases

2. **Intersection Observer Throttling**
   - All scroll-triggered animations use IntersectionObserver
   - `threshold: 0.3` (trigger when 30% visible)
   - `rootMargin: "0px 0px -100px 0px"` (trigger slightly before viewport)

3. **Animation Budget**
   - Max 3 simultaneous complex animations (Spline + 2 charts)
   - Reduce motion: respect `prefers-reduced-motion` media query
   - Mobile: disable Spline, reduce Lottie complexity

4. **Frame Rate Targets**
   - Desktop: 60fps (16.67ms per frame)
   - Mobile: 30fps acceptable for non-critical animations (33.33ms)
   - Monitor via `performance.now()` in dev mode

### Free-Tier Constraints & Solutions

**Spline Free Tier Limits:**
- 5 projects max → OK (use 1 for hero scene)
- Public scenes only → OK (no sensitive data)
- Watermark on free → **Accept for now** (tiny "Made with Spline" badge)
- Export size <10MB → OK (target <500KB optimized)

**Alternatives if watermark unacceptable:**
- Self-host Spline scene (export as `.splinecode`, serve from Vercel)
- Fallback to static SVG illustration (designed in Figma/Illustrator)

**Vercel Free Tier:**
- 100GB bandwidth/month
- Spline runtime (~200KB) + scenes (~500KB) = ~0.7KB per visit
- Est. 140,000 visits/month budget → acceptable for current traffic

**Performance Monitoring:**
- Use Vercel Analytics (free) to track LCP impact
- Lighthouse CI in GitHub Actions (already configured)
- Target: maintain LCP <2.5s desktop, <3.5s mobile

---

## Visual Style Guide

### Color Palette (Dark Mode Optimized)

```css
/* Primary gradients */
--gradient-hero: linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #0891b2 100%);
--gradient-accent: linear-gradient(90deg, #10b981 0%, #059669 100%);

/* Neon accents */
--neon-emerald: #10b981;
--neon-blue: #3b82f6;
--neon-purple: #8b5cf6;

/* Backgrounds */
--bg-mesh-start: #1e1b4b;  /* purple-950 */
--bg-mesh-end: #0c4a6e;    /* sky-950 */

/* Glass morphism */
--glass-bg: rgba(15, 23, 42, 0.6);        /* slate-900 60% */
--glass-border: rgba(148, 163, 184, 0.1); /* slate-400 10% */
--glass-blur: blur(12px);
```

### Typography

```css
/* Already using Plus Jakarta Sans (from taste-skill-bijakbeli) */
--font-sans: var(--font-jakarta);

/* Size scale for data viz */
--text-stat-large: 3rem;    /* 48px for big numbers */
--text-stat-medium: 2rem;   /* 32px for metrics */
--text-stat-small: 1.25rem; /* 20px for labels */
```

### Motion Curves

```typescript
// lib/animations.ts
export const easing = {
  smooth: [0.43, 0.13, 0.23, 0.96],      // ease-in-out custom
  snappy: [0.19, 1.0, 0.22, 1.0],        // snap to position
  bounce: [0.68, -0.55, 0.265, 1.55],    // slight overshoot
};

export const duration = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  verySlow: 1.2,
};
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Install dependencies (`@splinetool/react-spline`, `framer-motion` upgrade, `lottie-react`)
- [ ] Create component structure (folders, empty files)
- [ ] Set up Spline account, create hero scene
- [ ] Configure Framer Motion animation variants library
- [ ] Add Lottie file placeholder (static chart SVG for now)

### Phase 2: Hero Section (Day 2)
- [ ] Build `AnimatedBackground.tsx` (CSS mesh gradient)
- [ ] Integrate Spline scene embed
- [ ] Implement `FloatingPriceTags.tsx` (CSS 3D)
- [ ] Wire up Framer Motion stagger on hero content
- [ ] Mobile responsive: hide Spline, show fallback illustration
- [ ] Test performance: LCP <2.5s desktop, <3.5s mobile

### Phase 3: Trending Products (Day 3)
- [ ] Enhance `ProductCard.tsx` with hover state
- [ ] Build `PriceSparkline.tsx` (react-sparklines)
- [ ] Integrate Lottie chart reveal animation
- [ ] Add data tooltip (Framer Motion layout)
- [ ] Test on 4 cards simultaneously (performance check)

### Phase 4: Demo Section (Day 4)
- [ ] Build `InteractivePriceChart.tsx` (Recharts LineChart)
- [ ] Create `MarketplaceGraph.tsx` (SVG connection animation)
- [ ] Implement `DealScoreMeter.tsx` (radial progress SVG)
- [ ] Build `AnimatedCounter.tsx` (react-countup)
- [ ] Wire up scroll-triggered animations (IntersectionObserver)
- [ ] Test animation orchestration (stagger timing)

### Phase 5: Polish & Optimization (Day 5)
- [ ] Implement `prefers-reduced-motion` fallbacks
- [ ] Code-split heavy components (Spline, Recharts)
- [ ] Optimize Lottie files (reduce complexity, file size <30KB)
- [ ] Add loading states (skeleton for Spline)
- [ ] Run Lighthouse audit (target: Performance >90, LCP <2.5s)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS Safari, Android Chrome)

---

## Success Metrics

### Performance (Hard Requirements)
- ✅ LCP <2.5s desktop (4G), <3.5s mobile
- ✅ FID <100ms (interaction responsiveness)
- ✅ CLS <0.1 (layout stability)
- ✅ Bundle size increase <500KB gzipped

### Engagement (Target Improvements)
- 📈 Time on page: +30% (baseline ~45s → target ~60s)
- 📈 Scroll depth: +20% (baseline ~60% → target ~72%)
- 📈 Interaction rate: +40% (baseline ~15% → target ~21%)
- 📈 Bounce rate: -10% (baseline ~55% → target ~50%)

### Quality (Subjective)
- 🎨 Visual differentiation from competitors (validated via user testing)
- 🎨 Brand perception: "modern, trustworthy, technical" (survey)
- 🎨 Mobile experience: "smooth, not laggy" (manual QA)

---

## Risk Assessment

### High Risk
1. **Spline Performance on Low-End Devices**
   - *Mitigation:* Mobile fallback to static SVG, `prefers-reduced-motion` check
   - *Validation:* Test on real device (Android mid-range, iPhone 12)

2. **Bundle Size Creep**
   - *Mitigation:* Code-split, tree-shake, lazy load on interaction
   - *Validation:* Webpack bundle analyzer, size-limit CI check

### Medium Risk
3. **Spline Free Tier Watermark**
   - *Mitigation:* Self-host scene if needed, or accept small badge
   - *Validation:* User feedback (does watermark reduce trust?)

4. **Animation Jank on Mobile**
   - *Mitigation:* Reduce animation complexity, 30fps acceptable
   - *Validation:* Chrome DevTools Performance tab, real device testing

### Low Risk
5. **Lottie File Licensing**
   - *Mitigation:* Use open-source LottieFiles or create custom in After Effects
   - *Validation:* Check license before commit

---

## Open Questions (To Be Resolved During Implementation)

1. **Spline Scene Content**
   - Which 3 products to showcase? (iPhone, MacBook, AirPods? Or generic phone/laptop/headphones?)
   - **Decision:** Generic low-poly models (avoid brand trademark issues)

2. **Chart Data Source**
   - Use mock data or pull from real `product.priceHistory` API?
   - **Decision:** Mock data for demo consistency (API integration = future scope)

3. **Lottie Animation Style**
   - Line art style or filled shapes? Color or monochrome?
   - **Decision:** Line art, emerald-500 color (matches brand)

4. **Mobile Spline Fallback**
   - Static SVG illustration or just hide entirely?
   - **Decision:** Static SVG (maintain visual interest, designed in Figma)

---

## Appendix: Taste-Skill Compliance

### BijakBeli Taste-Skill Rules (from references/bijakbeli-patterns.md)

✅ **Font:** Plus Jakarta Sans (already configured)  
✅ **Colors:** Semantic tokens (`bg-muted`, `text-muted-foreground`)  
✅ **Loading:** Skeleton shimmer (no spinners)  
✅ **Viewport:** `min-h-dvh` (not `min-h-screen`)  
✅ **Hover:** Subtle transforms (`-translate-y-0.5`, not `-translate-y-2`)  
✅ **Rupiah:** `Rp 1.500.000` format (dot thousands)  
✅ **Em-dash:** Use `-` not `—` in content  

### Additional Constraints

❌ **No `animate-bounce`** (removed in P2 fixes)  
✅ **Use `text-balance`** on long headings  
✅ **Smooth transitions** (`duration-300 ease-in-out`)  
✅ **Dark mode optimized** (all new components support dark mode)

---

## References

- [Spline Documentation](https://docs.spline.design/)
- [Framer Motion Scroll Animations](https://www.framer.com/motion/scroll-animations/)
- [Lottie Files](https://lottiefiles.com/)
- [Recharts Examples](https://recharts.org/en-US/examples)
- [Web.dev Performance Best Practices](https://web.dev/performance/)

---

**End of Design Spec**

*Next Step: User reviews this spec, then invoke `writing-plans` skill to create implementation plan.*

# BijakBeli Homepage Visual Enhancement

**Date:** 2026-07-01  
**Status:** Approved  
**Owner:** AGR  
**Vibe:** Modern & Data-Driven  
**Approach:** Spline 3D Embeds + Framer Motion + Lottie + Visx

---

## Goals

Transform BijakBeli homepage dari functional-first ke engagement-first dengan experimental visual effects yang differentiate dari competitors (Camel³, Keepa = utilitarian/static).

**Success Metrics:**
- Time-on-site increase (target: +30% avg session duration)
- Scroll depth increase (target: 80%+ users reach Trending section)
- Extension CTA click-through increase (target: +20% clicks)

---

## Design Principles

1. **Performance-conscious** — All enhancements must maintain Lighthouse score >90 (mobile)
2. **Progressive enhancement** — Fallback to static images for low-end devices
3. **Free-tier only** — Spline free plan (5 projects, watermark acceptable), self-hosted charts
4. **Taste-skill compliant** — No animate-bounce, use semantic tokens, min-h-dvh, Plus Jakarta Sans

---

## Architecture

### Tech Stack

**Core:**
- `@splinetool/react-spline` (~200KB) — 3D scene embeds
- `framer-motion` (already installed) — layout animations, scroll triggers
- `lottie-react` (~50KB) — micro-animations (price charts)
- `@visx/visx` (~100KB tree-shakeable) — SVG chart primitives

**Bundle Impact:** +350KB gzipped (~1.2MB raw), acceptable for engagement-heavy sections

**Alternatives Considered:**
- Three.js + R3F: Rejected (too heavy, +500KB, complex)
- Canvas API + shaders: Rejected (maintenance burden, no designer workflow)

---

## Section 1: Hero Section Enhancement

### Current State
```tsx
<section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-background to-blue-50">
  <div className="mx-auto max-w-7xl px-4 py-16">
    <Badge>✨ AI-Powered</Badge>
    <h1 className="text-balance text-4xl font-bold">
      Beli yang Tepat, di Waktu yang Tepat
    </h1>
    <p className="text-muted-foreground">...</p>
    <SmartSearchBar />
  </div>
</section>
```

Pure text + search bar. No visual anchor.

### Target State

**Layout:**
```
┌─────────────────────────────────────────┐
│  [3D Spline Scene - 50% width]          │
│  ┌─────────────────────────────┐        │
│  │ Floating products (phone,   │ [Text] │
│  │ laptop, headphones) with    │ Badge  │
│  │ animated price tags         │ H1     │
│  │ Orbit camera auto-rotate    │ P      │
│  │ Dark gradient bg w/ neon    │ Search │
│  └─────────────────────────────┘        │
└─────────────────────────────────────────┘
```

**3D Scene (Spline):**
- 3 floating product models: smartphone, laptop, wireless headphones
- Price tags floating around each product (3D text, rotate on Y-axis)
- Camera: slow auto-orbit (5s per rotation), mouse parallax on desktop
- Background: dark gradient (navy → deep purple) dengan neon accent lines
- Lighting: rim light (cyan/magenta split) untuk cyberpunk aesthetic

**Spline Export:**
- Embed via `<Spline scene="https://prod.spline.design/[project-id]/scene.splinecode" />`
- Fallback: static image (screenshot dari Spline, low-res WebP)
- Loading state: skeleton shimmer box

**Framer Motion Integration:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
>
  <Spline scene="..." fallback={<img src="/hero-fallback.webp" />} />
</motion.div>
```

**Text Side:**
- Scroll-triggered fade-in (stagger children by 100ms)
- Badge: shimmer effect (background-position animation)
- H1: gradient text (primary → cyan, animated on mount)
- SearchBar: scale-in after H1 completes

**Performance:**
- Lazy load Spline runtime (intersection observer)
- Reduce canvas resolution on mobile (devicePixelRatio clamp to 1.5)
- Pause auto-rotate when tab inactive (Page Visibility API)

---

## Section 2: Trending Products Enhancement

### Current State
```tsx
<ProductCard product={...} />
```

Static card: image, title, price, badge. Hover → translate-y + shadow.

### Target State

**Hover Interaction:**
1. **Default state:** ProductCard as-is
2. **Hover → reveal mini price chart overlay:**
   - Lottie animation (sparkline chart, 30-day price history)
   - Overlay position: bottom 40% of card, glass morphism background
   - Chart animates in: slide-up + fade-in (300ms)
   - Data: mock 30-day trend (randomized per product seed)

**Lottie Chart Animation:**
- JSON export dari After Effects (via LottieFiles)
- Frames: 0-60 (1s duration at 60fps)
- Animation: line path draws left-to-right, Y-axis represents price trend
- Colors: gradient stroke (emerald-500 → cyan-400 for uptrend, red-500 → orange-400 for downtrend)

**Implementation:**
```tsx
// ProductCard.tsx
import Lottie from 'lottie-react';
import priceChartAnimation from '@/assets/lottie/price-chart.json';

const [isHovered, setIsHovered] = useState(false);

<Card onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
  {/* existing card content */}
  
  <AnimatePresence>
    {isHovered && (
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[40%] bg-background/80 backdrop-blur-md"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Lottie animationData={priceChartAnimation} loop={false} />
        <p className="text-xs text-center mt-1">Harga 30 hari terakhir</p>
      </motion.div>
    )}
  </AnimatePresence>
</Card>
```

**Data Source:**
- Phase 1: Mock data (seeded random trend dari product.id hash)
- Phase 2: Real historical data dari Supabase `price_history` table

**Performance:**
- Lottie preload (link rel="preload" for JSON)
- Only animate when card in viewport (intersection observer)
- Debounce hover events (300ms delay before triggering)

---

## Section 3: Demo Section Enhancement

### Current State
```tsx
<div className="grid gap-4 md:grid-cols-3">
  <Card>iPhone demo analysis (static text cards)</Card>
  <Card>Buy recommendation</Card>
  <Card>Fake discount check</Card>
</div>
```

Static info cards. No interactivity.

### Target State

**Interactive Spline Infographic:**

Replace 3-card grid dengan single interactive Spline scene:

**Concept:**
- Center: 3D product model (e.g., iPhone)
- Surrounding: 6 floating "data pods" (3D rounded rectangles)
- Each pod represents: Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok Shop
- Animated data flow: lines connecting pods to center product (particle trails)
- Click pod → highlights that marketplace, shows price + stock badge

**Spline Scene Structure:**
```
Product (center, Y-axis rotate)
├─ Tokopedia Pod (top-left, green accent)
│  └─ Price badge "Rp 18.9jt" (3D text)
├─ Shopee Pod (top-right, orange accent)
├─ Bukalapak Pod (mid-left, pink accent)
├─ Lazada Pod (mid-right, blue accent)
├─ Blibli Pod (bottom-left, blue accent)
└─ TikTok Shop Pod (bottom-right, black accent)

Connecting Lines:
- Particle emitters (cyan glow)
- Flow from pods → product (1s loop)
```

**Interaction States:**
1. **Idle:** Auto-rotate product, pods gently float (sin wave Y-axis)
2. **Hover pod:** Scale up 1.1x, glow effect
3. **Click pod:** Zoom camera to pod, reveal detailed price breakdown card (React overlay)

**React Overlay (on click):**
```tsx
<AnimatePresence>
  {selectedMarketplace && (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-card rounded-2xl p-6 max-w-md"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <h3>{selectedMarketplace.name}</h3>
        <p>Harga: {selectedMarketplace.price}</p>
        <p>Stok: {selectedMarketplace.inStock ? "Tersedia" : "Habis"}</p>
        {/* Visx mini bar chart comparing prices */}
        <BarChart data={...} />
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**Visx Chart (price comparison bar):**
- Horizontal bar chart (6 bars for 6 marketplaces)
- X-axis: price range (min to max)
- Color: gradient fill (emerald for lowest, red for highest)
- Animated bar growth on mount (spring transition)

**Spline → React Communication:**
- Spline event listeners via `spline.emitEvent('podClick', { marketplace: 'tokopedia' })`
- React listens via `spline.addEventListener('podClick', handlePodClick)`

**Performance:**
- Single Spline scene (reuse Hero scene runtime, shared loader)
- Pause animations when section out of viewport
- Mobile: Replace Spline dengan static image + basic CSS grid (6 cards), click reveals modal

---

## Component Structure

```
src/
├─ components/
│  ├─ hero/
│  │  ├─ HeroSplineScene.tsx       # Spline embed + fallback
│  │  └─ HeroContent.tsx            # Text side (Badge, H1, Search)
│  ├─ product/
│  │  ├─ ProductCard.tsx            # Enhanced with Lottie overlay
│  │  └─ ProductCardHoverChart.tsx  # Lottie chart component
│  ├─ demo/
│  │  ├─ DemoSplineInfographic.tsx  # Interactive Spline scene
│  │  ├─ MarketplaceModal.tsx       # Click overlay with Visx chart
│  │  └─ PriceComparisonChart.tsx   # Visx horizontal bar
│  └─ ui/
│     └─ SplineFallback.tsx         # Loading/error states
├─ assets/
│  ├─ lottie/
│  │  └─ price-chart.json           # Sparkline animation
│  └─ images/
│     ├─ hero-fallback.webp         # Static Spline screenshot
│     └─ demo-fallback.webp
└─ hooks/
   └─ useSplineLoader.ts            # Shared Spline runtime loader
```

---

## Implementation Phases

### Phase 1: Setup & Dependencies (0.5 day)
- Install deps: `@splinetool/react-spline`, `lottie-react`, `@visx/visx`
- Create Spline account, initialize 2 projects (Hero scene, Demo scene)
- Export Lottie JSON from After Effects template (sparkline)

### Phase 2: Hero Section (1 day)
- Build Spline 3D scene (products, price tags, camera, lighting)
- Implement `HeroSplineScene.tsx` with lazy loading
- Framer Motion text animations (stagger, gradient text)
- Fallback image + loading skeleton

### Phase 3: Trending Products (1 day)
- Create `ProductCardHoverChart.tsx` with Lottie integration
- Mock 30-day price data generator (seeded random)
- Intersection observer for viewport-aware animation
- Test hover performance (debounce, RAF throttle)

### Phase 4: Demo Section (1.5 days)
- Build Spline infographic (6 marketplace pods, particle lines)
- Spline → React event bridge
- `MarketplaceModal.tsx` with Visx price comparison chart
- Mobile fallback (CSS grid + modal, no Spline)

### Phase 5: Polish & Optimization (1 day)
- Lighthouse audit (target: >90 mobile, >95 desktop)
- Lazy load optimizations (intersection observer, code splitting)
- Dark mode polish (neon accents, contrast check)
- A/B test fallback thresholds (GPU detection, connection speed)

**Total Estimate:** 5 days full-time (40 hours)

---

## Fallback Strategy

### Low-end Device Detection
```tsx
// utils/deviceCapabilities.ts
export function canRenderSpline(): boolean {
  // Check GPU support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return false;
  
  // Check connection speed (4G+)
  const connection = (navigator as any).connection;
  if (connection?.effectiveType && !['4g', '5g'].includes(connection.effectiveType)) {
    return false;
  }
  
  // Check device memory (4GB+)
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return false;
  
  return true;
}
```

### Graceful Degradation
- **Hero:** Spline → Static WebP image + CSS gradient background
- **Trending:** Lottie → Static SVG chart (no animation)
- **Demo:** Spline → 6-card CSS grid (no interactivity, click opens modal with static chart)

### User Preference
```tsx
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // Skip all animations, show static content
}
```

---

## Risk Mitigation

### Risk 1: Spline Free Tier Limits
**Issue:** 5 projects max, potential watermark  
**Mitigation:**
- Use only 2 Spline projects (Hero + Demo)
- Watermark acceptable for free tier (small bottom-right)
- If user upgrades in future, swap to paid plan ($9/mo), remove watermark

### Risk 2: Bundle Size Impact
**Issue:** +350KB could hurt mobile LCP  
**Mitigation:**
- Lazy load all animation libraries (intersection observer)
- Code split by route (homepage-only bundle)
- Preconnect to Spline CDN (`<link rel="preconnect" href="https://prod.spline.design" />`)

### Risk 3: Browser Compatibility
**Issue:** Spline requires WebGL, may fail on old Safari  
**Mitigation:**
- Feature detection via `canRenderSpline()`
- Automatic fallback to static images
- Polyfill for IntersectionObserver (already in Next.js)

### Risk 4: Maintenance Burden
**Issue:** Spline scenes need updates when product lineup changes  
**Mitigation:**
- Generic product models (abstract phone/laptop, not branded)
- Price tags use dynamic text (fetch from API, not hardcoded in Spline)
- Document Spline editing workflow in `docs/spline-guide.md`

---

## Accessibility

1. **Keyboard Navigation:**
   - Spline scenes are decorative (aria-hidden)
   - All interactions have button/link fallbacks

2. **Screen Readers:**
   - Alt text for fallback images
   - `aria-label` for interactive Spline elements
   - Skip links: "Skip to product search"

3. **Motion Sensitivity:**
   - Respect `prefers-reduced-motion`
   - Provide toggle: "Disable animations" (localStorage)

4. **Color Contrast:**
   - Neon accents meet WCAG AA (cyan: #06B6D4 = 4.5:1 on dark bg)
   - Test via axe DevTools

---

## Testing Plan

### Unit Tests
- `HeroSplineScene.tsx`: fallback rendering, lazy load timing
- `ProductCardHoverChart.tsx`: hover state, animation trigger
- `useSplineLoader.ts`: shared runtime loading, error handling

### Integration Tests (Playwright)
- Hero section: Spline loads OR fallback shows within 3s
- Trending hover: chart overlay appears on hover, disappears on leave
- Demo click: modal opens, Visx chart renders

### Performance Tests
- Lighthouse CI: mobile >90, desktop >95
- Bundle size: homepage JS <500KB gzipped
- FCP <1.5s, LCP <2.5s (mobile 4G)

### Visual Regression
- Percy snapshots: Hero (Spline loaded), Trending (hover state), Demo (modal open)

---

## Success Criteria

### Must Have (P0)
- ✅ Hero section Spline 3D scene renders on desktop (fallback on mobile)
- ✅ Trending products hover reveals price chart (Lottie animation)
- ✅ Demo section interactive Spline (desktop) OR static grid (mobile)
- ✅ Lighthouse score >90 mobile, >95 desktop
- ✅ Zero a11y violations (axe)

### Nice to Have (P1)
- 🎯 Real price history data (vs mock) in hover charts
- 🎯 Mouse parallax on Hero Spline scene
- 🎯 Sound effects on Demo pod click (optional, muted by default)

### Future Enhancements (P2)
- Extension CTA section: animated browser mockup (Spline or Lottie)
- Trust signals: animated connection graph (marketplace → BijakBeli → user)
- FAQ: animated illustrations per question (Lottie micro-interactions)

---

## Open Questions

1. **Spline watermark acceptance?**  
   → **Decision:** Accept watermark for now, evaluate paid plan ($9/mo) after traffic increase

2. **Lottie chart data source?**  
   → **Decision:** Phase 1 = mock seeded random, Phase 2 = Supabase `price_history` integration

3. **Mobile Spline threshold?**  
   → **Decision:** Disable Spline on mobile (<768px), show static images (performance-first)

4. **Analytics tracking?**  
   → **Decision:** Track Spline load success/failure rate (Mixpanel event), hover chart engagement (time-on-card)

---

## Appendix

### Spline Scene Specifications

**Hero Scene:**
- Products: 3 models (smartphone 12cm height, laptop 18cm width, headphones 10cm width)
- Price tags: 3D text, font "Inter Bold", size 2cm, color #06B6D4 (cyan)
- Camera: Orbit constraint, auto-rotate 72°/s (5s full rotation), FOV 50°
- Lighting: Key light (white, intensity 0.8, position [10, 10, 10]), Rim light cyan (intensity 0.5, position [-5, 0, -10]), Rim light magenta (intensity 0.5, position [5, 0, -10])
- Background: Linear gradient navy (#0F172A) → purple (#4C1D95), 45° angle

**Demo Scene:**
- Product: iPhone model, 15cm height, center origin
- Marketplace pods: 6x rounded cubes (5cm × 3cm × 1cm), logo texture maps
- Particles: Cyan glow (#06B6D4), size 0.1cm, emit rate 10/s, lifetime 1s, velocity toward product
- Camera: Default position [0, 10, 30], click animation: lerp to pod position + [0, 2, 5] over 0.5s

### Color Palette (Dark Mode Optimized)

```css
--neon-cyan: #06B6D4;      /* Primary accent */
--neon-magenta: #EC4899;   /* Secondary accent */
--navy-dark: #0F172A;      /* Background base */
--purple-deep: #4C1D95;    /* Background gradient */
--emerald-bright: #10B981; /* Success (price drop) */
--red-bright: #EF4444;     /* Alert (price spike) */
```

### Typography

- Headings: Plus Jakarta Sans Bold (already installed)
- Body: Plus Jakarta Sans Regular
- Price tags (Spline 3D text): Inter Bold (for better 3D rendering)

### Animation Timing

- Fade-in: 0.8s ease-out
- Hover transforms: 0.3s ease-in-out
- Lottie charts: 1s (60 frames at 60fps)
- Spline auto-rotate: 5s per full rotation
- Modal open: 0.4s spring (damping 20, stiffness 300)

---

**Approved by:** AGR  
**Date:** 2026-07-01  
**Next Step:** Invoke `writing-plans` skill to create implementation plan

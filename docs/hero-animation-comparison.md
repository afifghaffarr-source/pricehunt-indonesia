# Hero Animation Comparison

Tanggal: 2026-07-02  
Status: Ketiga opsi sudah built & tested

## Option 1: Lottie JSON Fetch (5f00ba3)
**File:** `HeroLottieScene.tsx`

### Pros
- Animasi profesional dari LottieFiles (COINS theme cocok untuk price comparison)
- Smooth 60fps animation
- File size kecil (~50KB JSON)
- Banyak pilihan alternatif animasi gratis

### Cons
- Network request saat load (fetch JSON dari CDN)
- Loading skeleton needed (user lihat skeleton 1-2 detik)
- Dependency: lottie-react (~40KB gzipped)
- Hydration delay (client-only component)

### Performance
- First render: skeleton placeholder
- After fetch: smooth animation
- Bundle impact: +40KB (lottie-react)

---

## Option 2: CSS 3D Floating Coins (c0de4c4)
**File:** `HeroCSSScene.tsx`

### Pros
- Zero dependencies (pure CSS)
- Instant render (no fetch, no hydration delay)
- Smooth animations (CSS transforms, GPU accelerated)
- Full control over visual style
- Smallest bundle impact

### Cons
- Inline `<style jsx>` (~2KB)
- Manual keyframe definitions
- Limited animation complexity
- Styling kaku (susah diubah tanpa edit manual)

### Performance
- First render: instant, full animation visible
- No network requests
- Bundle impact: +2KB (inline styles)

---

## Option 3: Framer Motion SVG (b66e79e) ⭐ CURRENTLY ACTIVE
**File:** `HeroMotionScene.tsx`

### Pros
- Framer Motion already in project (InteractivePriceChart, AnimatedCounter, ProductCard sparkline)
- Physics-based smooth animations
- Declarative animation syntax (easy to modify)
- SVG scalable (retina sharp)
- Programmatic control (can add interactions later)

### Cons
- Framer Motion bundle cost (already paid - used elsewhere)
- Slightly more complex code than pure CSS
- Client-only rendering (use client directive)

### Performance
- First render: instant SVG visible, animations start immediately
- No additional network requests
- Bundle impact: ~0KB (Framer Motion already loaded)

---

## Recommendation

**Option 3 (Framer Motion SVG)** - Best balance:
- Zero marginal bundle cost (Framer Motion sudah dipakai di 4 tempat lain)
- Instant render, no loading skeleton
- Easy to modify & extend (declarative animations)
- Konsisten dengan animation approach di codebase (ProductCard hover, AnimatedCounter, InteractivePriceChart)

**Option 2 (CSS)** - Jika ingin zero-dependency dan paling ringan, tapi trade-off: susah maintain & extend.

**Option 1 (Lottie)** - Jika ingin ganti animasi sering (banyak pilihan gratis di LottieFiles), tapi trade-off: loading skeleton & network fetch.

---

## Current State
- `page.tsx` currently uses: **HeroMotionScene** (Option 3)
- All 3 components exist in codebase
- Build passing untuk ketiga opsi
- Commits: 5f00ba3, c0de4c4, b66e79e

## Next Step
Pilih salah satu untuk production:
1. Keep Option 3 (Framer Motion) ✅ RECOMMENDED
2. Switch to Option 2 (Pure CSS) - edit page.tsx import
3. Switch to Option 1 (Lottie fetch) - edit page.tsx import

Setelah pilih, push ke production.

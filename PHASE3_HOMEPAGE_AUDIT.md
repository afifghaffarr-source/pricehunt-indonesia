# Phase 3.2: Homepage Redesign Audit

## Current Homepage Analysis

### ✅ What's Working:
1. Hero section dengan gradient background
2. Search bar sebagai primary CTA
3. Popular search chips
4. Copy yang honest (tidak klaim palsu)
5. Mobile responsive structure
6. Real data dari Supabase (trending products, categories)

### ❌ TasteSkill Violations & Issues:

1. **Generic SaaS Template Feel**
   - Layout terasa seperti template umum
   - Card-grid monoton tanpa hierarki
   - Semua section terasa sama pentingnya

2. **Weak Visual Hierarchy**
   - Hero title terlalu kecil (text-3xl sm:text-5xl)
   - Tidak ada section yang dominan
   - Features section terlalu flat

3. **Lacks Intelligence Dashboard Feel**
   - Tidak show intelligence in action
   - No data visualization
   - No live examples
   - Feels like landing page, not tool

4. **Generic Features Section**
   - 3 cards dengan icon di tengah = very common pattern
   - No visual examples
   - No proof of intelligence

5. **Missing Key Elements (from task):**
   - ❌ Strong trust signals
   - ❌ Fake discount detector preview/demo
   - ❌ Buy now/wait explanation dengan example
   - ❌ Marketplace coverage visualization
   - ❌ Extension CTA section
   - ❌ FAQ section
   - ❌ Visual examples of intelligence

6. **Trending Products Too Simple**
   - Just basic product cards
   - No intelligence context
   - No explanation why they're trending

7. **Categories Section Flat**
   - Grid of text cards
   - No visual interest
   - Feels like placeholder

## Redesign Strategy (TasteSkill-Compliant)

### Core Principle:
**Transform dari "generic SaaS landing page" menjadi "marketplace intelligence dashboard homepage"**

### Design Language:
- Modern marketplace intelligence
- Clean Indonesian fintech/ecommerce style
- Data-rich but not overwhelming
- Confidence, trust, clarity
- Mobile-first
- Visual examples everywhere

### New Structure:

#### 1. Hero Section (Enhanced)
**Goal:** Establish trust & show primary value immediately

**Changes:**
- ✨ Stronger headline (text-4xl sm:text-6xl, font-extrabold)
- ✨ Better trust signals (marketplace logos, active tracking stat)
- ✨ Search as primary focus (unchanged)
- ✨ Mini live example atau quick stats below search
- ✨ Gradient enhancement

**Copy Focus:**
"Asisten belanja pintar untuk menemukan harga terbaik, mendeteksi diskon palsu, dan memberi tahu kapan waktu terbaik membeli."

#### 2. Intelligence Preview Section (NEW)
**Goal:** Show intelligence in action, not just talk about it

**Content:**
- Real example product with intelligence
- Show deal score, fake discount detection, buy/wait
- Interactive or visual demo
- "Lihat PriceHunt bekerja"

**Why:** Makes it feel like real tool, not vaporware

#### 3. Core Value Props (Redesigned)
**Goal:** Replace generic 3-card grid with visual proofs

**Changes:**
- ❌ Remove generic card-grid
- ✨ Use asymmetric layout (2-column, varying sizes)
- ✨ Each feature with visual example/mini-screenshot
- ✨ Gradient accents
- ✨ Premium spacing

**Features to highlight:**
1. Price comparison across marketplaces (show table preview)
2. Fake discount detector (show red flag example)
3. Buy now/wait recommendation (show decision card)
4. Price history (show mini chart)

#### 4. Trending Deals (Enhanced)
**Goal:** Add intelligence context

**Changes:**
- ✨ Add visible deal scores
- ✨ Highlight savings
- ✨ Show why these are good deals
- ✨ Add filter/category tabs if applicable

#### 5. How It Works (NEW)
**Goal:** Clear process explanation

**Content:**
- 3 simple steps visual
- Focus on decision-making
- Illustrations/icons
- Clean layout

**Steps:**
1. Cari atau paste link produk
2. PriceHunt analisis harga & pola
3. Terima rekomendasi kapan beli

#### 6. Marketplace Coverage (NEW)
**Goal:** Build trust dengan coverage transparency

**Content:**
- Visual logos 6 marketplaces
- Coverage stats (if available)
- Trust building copy

#### 7. Extension CTA (NEW)
**Goal:** Promote Chrome extension

**Content:**
- Browser extension screenshot
- Quick benefits
- Download button
- "Perbandingan harga langsung di marketplace"

#### 8. Smart Features Grid (Redesigned)
**Goal:** Replace flat 3-card grid dengan richer layout

**Features:**
- Fake discount detector (expanded explanation)
- Price alert system (dengan preview)
- Total cost calculator (dengan visual)

**Layout:** Not all same size - asymmetric for visual interest

#### 9. FAQ Section (NEW)
**Goal:** Address common questions

**Content:**
- 6 FAQ items
- Expandable/collapsible
- Cover: accuracy, free?, marketplaces, data source, privacy

#### 10. Final CTA (Enhanced)
**Current:** Good, keep but enhance visual

## Implementation Plan

### Phase A: Hero & Trust Enhancement
- Enhance hero typography
- Add trust signals component
- Add live stats (optional)

### Phase B: Intelligence Preview Section
- Create new "IntelligencePreview" component
- Show real example with deal score, fake discount, buy/wait
- Make it visually striking

### Phase C: Features Redesign
- Replace generic 3-card grid
- Create asymmetric feature showcase
- Add visual examples

### Phase D: New Sections
- How It Works component
- Marketplace Coverage component
- Extension CTA component
- FAQ component

### Phase E: Polish & Mobile
- Test mobile responsive
- Visual hierarchy check
- Build test
- Commit & push

## Success Criteria

✅ Feels like intelligence tool, not generic landing page
✅ Shows intelligence in action with examples
✅ Strong visual hierarchy
✅ Asymmetric layouts break monotony
✅ All task requirements covered
✅ Mobile-first responsive
✅ Build passes
✅ No TasteSkill violations

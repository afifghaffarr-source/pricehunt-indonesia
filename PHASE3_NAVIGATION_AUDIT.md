# Phase 3.3: Navigation Redesign Audit

## Current Navigation Analysis

### Desktop Navigation (lines 33-45)
```tsx
navItems = [
  { href: "/search", label: "Cari Produk" },
  { href: "/dashboard", label: "Pantau Harga" },
  { href: "/compare", label: "Bandingkan" },
  { href: "/leaderboard", label: "Promo Pintar" },
  { href: "/dashboard", label: "Insight Saya" }, // ❌ DUPLICATE!
]
```

**Issues:**
1. ❌ **Duplicate /dashboard** - "Pantau Harga" and "Insight Saya" point to same URL
2. ❌ **Missing Wishlist** - Required by task but not present
3. ❌ **No icons** - Desktop nav is text-only, less visual hierarchy
4. ❌ **No admin link** - Admin access should be visible for admin users
5. ❌ **"Cari Harga" button** (line 63-68) duplicates "Cari Produk" nav item

### Mobile Bottom Navigation (lines 71-92)
```tsx
5 items: Cari, Pantau, Bandingkan, Promo, Akun
```

**Issues:**
1. ❌ **Inconsistent with desktop** - Different items, different order
2. ❌ **No Wishlist** - Missing from mobile too
3. ❌ **Generic icons** - Tag icon for "Akun" doesn't make semantic sense
4. ❌ **No active state** - Links don't highlight when active
5. ❌ **"Akun" points to /settings** - Different from desktop nav pattern

### Header Right Section
**Current:**
- AuthButton
- Theme toggle ✅ (good)
- "Cari Harga" button ❌ (redundant with nav)

## Required Navigation (from AGENTS.md BAGIAN 19)

**Main Menu:**
1. Cari Produk
2. Pantau Harga
3. Bandingkan
4. Promo Pintar
5. Wishlist ⚠️ (missing)
6. Insight Saya ⚠️ (duplicate with Pantau Harga)

**Admin:** Only show for admin users

**Mobile:** Bottom nav max 5 items, others in menu/profile

## Redesign Plan

### Desktop Navigation (Simplified)

**Core Items (with icons):**
1. 🔍 **Cari Produk** → /search
2. 🔔 **Pantau Harga** → /dashboard (price alerts & watchlist)
3. ❤️ **Wishlist** → /dashboard#wishlist or separate /wishlist
4. ✨ **Promo Pintar** → /leaderboard (best deals)
5. 🛡️ **Admin** → /admin (conditional, only for admin users)

**Remove:**
- "Insight Saya" (duplicate with Pantau Harga/Dashboard)
- "Cari Harga" button (redundant)
- "Bandingkan" (less priority, can be accessed from product pages)

### Mobile Bottom Nav (5 items max)

1. 🔍 **Cari** → /search
2. 🔔 **Pantau** → /dashboard
3. ❤️ **Wishlist** → /dashboard or /wishlist
4. ✨ **Promo** → /leaderboard
5. 👤 **Akun** → /settings (or user menu dropdown)

**Priority:**
- Search (primary action)
- Monitoring prices (core feature)
- Wishlist (user's saved items)
- Deals (discovery)
- Account/Settings (utility)

### Visual Improvements

**Desktop:**
- ✅ Add icons to nav items (better visual hierarchy)
- ✅ Active state with underline or background highlight
- ✅ Hover effects with color transition
- ✅ Conditional admin link (check user.is_admin)
- ✅ Remove redundant "Cari Harga" button

**Mobile:**
- ✅ Better icon choices (User icon instead of Tag)
- ✅ Active state highlighting
- ✅ Smooth transitions
- ✅ Badge for notifications count (if applicable)

**Logo:**
- ✅ Keep current Tag icon or consider more distinctive icon
- ✅ Keep "PriceHunt" branding with accent color

## Implementation Checklist

- [ ] Remove duplicate /dashboard links
- [ ] Add Wishlist to navigation
- [ ] Add icons to desktop nav
- [ ] Add conditional admin link
- [ ] Remove redundant "Cari Harga" button
- [ ] Implement active state for mobile nav
- [ ] Better icon semantics (User instead of Tag for account)
- [ ] Consistent navigation between desktop/mobile
- [ ] Hover/active states with smooth transitions
- [ ] Test responsive behavior
- [ ] Build and verify no errors

## TasteSkill Principles Applied

1. **Clarity over features** - Removed duplicate/confusing items
2. **Visual hierarchy** - Icons + text for better scannability
3. **Consistency** - Desktop and mobile aligned
4. **Context-aware** - Admin link only for admins
5. **Mobile-first** - Bottom nav with 5 core actions
6. **No generic patterns** - Semantic icon choices
7. **Decision-focused** - Nav guides user to primary actions

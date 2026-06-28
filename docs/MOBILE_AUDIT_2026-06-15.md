# Mobile App Audit (2026-06-15)

## Status: SCAFFOLD ONLY — NOT BUILDABLE

`apps/mobile/` adalah **boilerplate scaffold**, bukan functional app. README ambitious (cari, alert, AI advisor, wishlist, analytics), tapi actual code hanya 3 file screen.

## Structure

```
apps/mobile/
├── app/
│   ├── _layout.tsx              (root: QueryClient + SafeArea)
│   └── (tabs)/
│       ├── _layout.tsx          (4 tabs: index, search, alerts, profile)
│       ├── index.tsx            (Home — has 2 quick actions to non-existent routes)
│       ├── search.tsx
│       └── alerts.tsx
├── package.json                 (Expo SDK 50, React Native 0.73)
└── README.md
```

## Critical Bugs (build-breaking)

### BUG 1: `profile.tsx` missing
- **Location:** `app/(tabs)/_layout.tsx:42-49`
- **Symptom:** `<Tabs.Screen name="profile" />` registered
- **Reality:** `app/(tabs)/profile.tsx` does not exist
- **Impact:** App crashes on tab switch. Build succeeds (Expo lazy-loads tabs) but runtime fails.
- **Fix:** Either create stub `profile.tsx` OR remove from tab layout.

### BUG 2: `product/[id].tsx` missing
- **Location:** `app/_layout.tsx:13-17`
- **Symptom:** `<Stack.Screen name="product/[id]" />` registered with header config
- **Reality:** `app/product/[id].tsx` does not exist
- **Impact:** Tapping any product (line 90, 126 of index.tsx) navigates to broken route.
- **Fix:** Create product detail screen OR remove from stack.

### BUG 3: Quick action routes don't exist
- **Location:** `app/(tabs)/index.tsx:54-58`
- **Symptom:** QuickActions map to `/deals`, `/alerts`, `/recommendations`, `/analytics`
- **Reality:** None of these routes exist (only `/alerts` tab is close but not a route)
- **Impact:** All 4 quick action buttons crash app.
- **Fix:** Either create screens OR remove from quick actions.

## Functional Gaps

### Gap 1: No auth integration
- **Expected:** Supabase auth (per parent project stack)
- **Reality:** No `@supabase/supabase-js` in package.json. No auth context/provider. No sign-in flow.
- **Impact:** Mobile app has zero personalization (no user-specific alerts, no wishlist sync).

### Gap 2: No API client module
- **Expected:** `lib/api.ts` per README line 60-62
- **Reality:** Inline `fetch()` in `index.tsx:6-16` with hardcoded URL `https://www.bijakbeli.web.id/api`
- **Impact:** No env switching (dev/staging/prod), no auth header injection, no error handling, no timeout.

### Gap 3: No env config
- **Expected:** `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` per README line 102-106
- **Reality:** No `.env`, no `app.config.js`/`app.json` env section, no `expo-constants` for runtime env.
- **Impact:** Mobile app cannot point to staging or dev API.

### Gap 4: NativeWind not configured
- **Expected:** Per README line 22 (UI via NativeWind)
- **Reality:** `nativewind@2.0.11` in package.json but no `tailwind.config.js`, no `babel.config.js` plugin, no `global.css` import. Yet `className="..."` is used heavily in components.
- **Impact:** `className` props ignored at runtime. Tailwind classes don't apply. **Mobile app visually broken** even if routes work.

### Gap 5: Heavy `as any` usage
- `index.tsx:63, 66, 86, 122` — `as any` casts on `router.push`, `Ionicons name`, and `deal: any` / `product: any`.
- **Impact:** Type safety lost. Icon names not validated, route params untyped.

## Tech Stack Concerns

| Lib | Version | Concern |
|---|---|---|
| `expo` | 50.0.0 | 2 major versions behind (SDK 52 current) |
| `react-native` | 0.73.2 | 0.73 EOL reached Mar 2025 |
| `react-query` | 3.39.3 | TanStack v3, now v5 |
| `expo-router` | 3.4.0 | Major updates available |
| `victory-native` | 37.0.2 | Updated to v40+ |
| `nativewind` | 2.0.11 | NativeWind v4 is current |

**Upgrade path:** Major version bump (SDK 50 → 52, RN 0.73 → 0.76, etc.). High effort.

## Verdict

**Mobile app is not buildable as-is.** Even if critical bugs fixed, NativeWind not configured means visually broken.

**Realistic options:**

1. **Delete `apps/mobile/`** — focus PWA + responsive web. Less maintenance, faster shipping.
2. **Resurrect PWA-only** — already shipped as Next.js app, no extra work.
3. **Rebuild mobile fresh** — major investment (2-4 weeks for MVP). Defer to post-launch.

## Recommendation

**Delete `apps/mobile/`** post-launch. README and ambition not backed by working code. Focus on PWA/responsive web (which already works).

## No Code Changes Required for Web App

Mobile app is independent of the Next.js web app deployment. No coupling.

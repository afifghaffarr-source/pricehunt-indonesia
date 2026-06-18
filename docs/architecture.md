# Architecture

High-level system design untuk BijakBeli.app. Last updated 2026-06-17.

## Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Backend**: Next.js API routes (Node.js)
- **Database**: Supabase (Postgres + Auth + RLS)
- **Hosting**: Vercel (production)
- **AI**: VexoAPI (product discovery) + OpenAI (advisor)
- **Cron**: Vercel Cron (`alerts`, `prices`, `digest`)

## Layers
```
┌─────────────────────────────────────┐
│  UI (src/app, src/components)       │
├─────────────────────────────────────┤
│  API routes (src/app/api/*)         │
│  + Server Actions (src/app/actions) │
├─────────────────────────────────────┤
│  Domain libs (src/lib/*)            │
│  - admin-auth, api-auth, csrf       │
│  - ingestion, recommendation        │
├─────────────────────────────────────┤
│  Data layer (src/lib/supabase/*)     │
│  - products, prices, offers         │
│  - user data, transforms            │
├─────────────────────────────────────┤
│  Supabase (Postgres + Auth + RLS)   │
└─────────────────────────────────────┘
```

## Key flows
- **Browse**: `/` → `/search` → `/product/[slug]` (read-only, public RLS)
- **Report price**: `/product/[slug]` form → `/api/price-report` (auth required)
- **Wishlist + alerts**: user-authenticated, RLS scopes to `auth.uid()`
- **Admin**: `/admin/*` pages + `/api/admin/*` routes — `requireAdmin()` guard

## See also
- [Database schema](database.md)
- [API surface](api.md)
- [Testing strategy](testing.md)
- [Operations runbook](OPERATIONS.md)
- [Security model](../SECURITY.md)

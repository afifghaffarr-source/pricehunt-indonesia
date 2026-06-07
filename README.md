# PriceHunt Indonesia

Perbandingan harga marketplace Indonesia — bandingkan harga dari Tokopedia, Shopee, Bukalapak, Lazada, Blibli, dan TikTok Shop dalam satu tempat.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-ui)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password)
- **AI:** OpenAI gpt-4o-mini (with fallback)
- **Email:** Resend (price alert notifications)
- **Charts:** Recharts
- **Testing:** Vitest + Testing Library
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1+
- [Supabase](https://supabase.com) project

### Setup

```bash
# Clone
git clone https://github.com/afifghaffarr-source/pricehunt-indonesia.git
cd pricehunt-indonesia

# Install dependencies
bun install

# Environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Database
# 1. Run supabase/migrations/001_initial_schema.sql in Supabase SQL Editor
# 2. Run supabase/seed.sql in Supabase SQL Editor

# Dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run test` | Run tests (Vitest) |

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions (auth, data, admin, settings)
│   ├── admin/            # Admin dashboard
│   ├── api/              # REST API routes
│   ├── auth/             # Login & register
│   ├── dashboard/        # User dashboard
│   ├── product/          # Product detail
│   ├── search/           # Search page
│   └── settings/         # User settings
├── components/
│   ├── ai/               # AI Advisor card
│   ├── common/           # Shared components
│   ├── layout/           # Header, Footer, AuthButton
│   ├── product/          # ProductCard, PriceTable, Chart, Wishlist
│   ├── search/           # SearchBar, Filters, Suggestions
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/
│   ├── supabase/         # Supabase client, auth, data, types
│   ├── email.ts          # Resend email utility
│   ├── mock-data.ts      # Legacy mock data
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Utility functions
└── test/                 # Test files
```

## Features

### Pages
| Route | Description |
|-------|-------------|
| `/` | Homepage with trending deals, categories |
| `/search` | Search with filters, sort, marketplace filter |
| `/product/[slug]` | Product detail, price comparison, history chart |
| `/auth/login` | Login |
| `/auth/register` | Register |
| `/dashboard` | User dashboard (wishlist, alerts) |
| `/settings` | Edit profile, change password |
| `/admin` | Admin CRUD products & prices |
| `/offline` | PWA offline page |

### API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List products (pagination, sort, filter) |
| `/api/products/[id]` | GET | Product detail with prices & history |
| `/api/search?q=` | GET | Search products |
| `/api/ai-advisor` | POST | AI price recommendation |
| `/api/alerts/check` | GET | Trigger price alert emails |
| `/api/health` | GET | Health check |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback if not set) |
| `RESEND_API_KEY` | No | Resend API key for email alerts |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (for OG, sitemap, emails) |

## Deployment

### Vercel

```bash
bunx vercel --prod
```

Or connect GitHub repo at [vercel.com](https://vercel.com).

Set environment variables in Vercel dashboard → Settings → Environment Variables.

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
3. Run `supabase/seed.sql` in SQL Editor
4. Disable "Confirm email" in Authentication → Providers → Email
5. Set admin user: `UPDATE user_profiles SET preferences = '{"is_admin": true}'::jsonb WHERE id = 'USER_ID'`

## License

MIT

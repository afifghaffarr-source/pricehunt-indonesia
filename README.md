# PriceHunt Indonesia

Platform perbandingan harga marketplace Indonesia terlengkap. Bandingkan harga dari **6 marketplace** (Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok Shop) dalam satu tempat dengan AI-powered recommendations.

## ✨ Features

### Core Features
- 🔍 **Smart Search** - Natural language search dengan AI
- 📊 **Price Comparison** - Bandingkan harga real-time dari 6 marketplace
- 📈 **Price History** - Grafik tren harga 30-90 hari
- 🎯 **Price Alerts** - Notifikasi otomatis saat harga turun
- ⭐ **Wishlist** - Simpan produk favorit
- 🤖 **AI Advisor** - Rekomendasi beli/tunggu berbasis AI
- 🔮 **Price Prediction** - Prediksi harga 7-28 hari ke depan
- 📱 **PWA Support** - Install sebagai app di mobile/desktop

### Advanced Features
- 🎮 **Gamification** - Badges, levels, points system
- 🏆 **Leaderboard** - Kompetisi user contributions
- 🌐 **VexoAPI Integration** - Product discovery via web scraping
- 💱 **Multi-Currency** - Support IDR, USD, SGD, MYR, EUR, JPY
- 🔔 **Push Notifications** - Web push untuk price alerts
- 📧 **Email Digest** - Weekly summary otomatis
- 🔗 **Social Sharing** - WhatsApp, Twitter, Telegram
- 📦 **Product Comparison** - Side-by-side comparison 4 products
- 💬 **Reviews System** - Rating dan review produk
- 🔐 **Password Reset** - Forgot password via email
- 📄 **CSV Export** - Export wishlist dan price history
- 🌐 **API Registry** - Kelola API eksternal Indonesia

### Admin Features
- 📊 **Analytics Dashboard** - Deal score, kategori, tren harga
- 👥 **User Management** - CRUD users dan permissions
- 🏪 **Product Management** - CRUD produk dan harga per marketplace
- 🔧 **API Registry Management** - Monitor dan kelola API eksternal
- 📥 **Database Backup** - Export full database

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui (base-ui) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **AI** | OpenAI gpt-4o-mini |
| **External API** | VexoAPI (product discovery) |
| **Email** | Resend |
| **Charts** | Recharts |
| **Testing** | Vitest + Testing Library |
| **Deployment** | Vercel |
| **CI/CD** | GitHub Actions |

## 📋 Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Supabase](https://supabase.com) account
- [OpenAI](https://platform.openai.com) API key (optional)
- [Resend](https://resend.com) API key (optional)
- [VexoAPI](https://vexoapi.azzamcodex.site) VIP key (optional)


## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/afifghaffarr-source/pricehunt-indonesia.git
cd pricehunt-indonesia
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Environment Variables

```bash
cp .env.local.example .env.local
```

Edit .env.local dan isi dengan credentials Anda:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL (Required)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# VexoAPI (Optional - untuk product discovery)
VEXO_API_BASE_URL=https://vexoapi.azzamcodex.site
VEXO_API_KEY=your_vexo_vip_key
VEXO_API_TIMEOUT_MS=10000
VEXO_CACHE_TTL_SECONDS=3600

# OpenAI (Optional - fallback jika tidak ada)
OPENAI_API_KEY=sk-your_openai_key

# Resend (Optional - untuk email alerts)
RESEND_API_KEY=re_your_resend_key
```

### 4. Setup Database

**Di Supabase Dashboard:**

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka SQL Editor
3. Jalankan supabase/migrations/001_initial_schema.sql
4. Jalankan supabase/seed.sql

**Set Admin User:**

```sql
UPDATE user_profiles 
SET preferences = '{"is_admin": true}'::jsonb 
WHERE id = 'USER_ID_ANDA';
```

**Disable Email Confirmation (untuk development):**
- Authentication → Providers → Email
- Matikan "Confirm email"

### 5. Run Development Server

```bash
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 6. Run Tests

```bash
bun run test
```

## 📁 Project Structure

```
pricehunt-indonesia/
├── .github/
│   └── workflows/        # CI/CD workflows
├── extension/            # Chrome browser extension
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── content.js
├── public/
│   ├── icons/           # PWA icons
│   ├── manifest.json    # PWA manifest
│   └── sw.js           # Service worker
├── src/
│   ├── app/
│   │   ├── actions/     # Server actions (auth, data, admin, settings)
│   │   ├── admin/       # Admin dashboard & product management
│   │   ├── api/         # REST API routes (31+ endpoints)
│   │   ├── auth/        # Login, register, forgot password, reset password
│   │   ├── compare/     # Product comparison page
│   │   ├── dashboard/   # User dashboard
│   │   ├── leaderboard/ # Gamification leaderboard
│   │   ├── product/     # Product detail page
│   │   ├── search/      # Search page
│   │   ├── settings/    # User settings
│   │   └── offline/     # PWA offline page
│   ├── components/
│   │   ├── ai/          # AI Advisor, Product Summary, Deal Verdict, Prediction
│   │   ├── common/      # Shared components, PWA, Currency, Export
│   │   ├── layout/      # Header, Footer, AuthButton
│   │   ├── product/     # ProductCard, PriceTable, Chart, Wishlist, Reviews
│   │   ├── search/      # SearchBar, Filters, Suggestions, VexoSearch
│   │   └── ui/          # shadcn/ui components
│   ├── hooks/           # Custom React hooks (useTheme)
│   ├── lib/
│   │   ├── supabase/    # Supabase client, auth, data, types
│   │   ├── vexo/        # VexoAPI integration (client, normalizers, cache)
│   │   ├── marketplace/ # Product matcher, Vexo adapter
│   │   ├── currency/    # Multi-currency support
│   │   ├── gamification/# Badges, levels, points system
│   │   ├── scraper/     # Marketplace scraper framework
│   │   ├── backup.ts    # Database backup utility
│   │   ├── email.ts     # Resend email utility
│   │   └── utils.ts     # Utility functions
│   └── test/            # Vitest test files
├── supabase/
│   ├── migrations/      # Database schema
│   └── seed.sql        # Seed data (6 marketplaces + 8 products)
├── .env.local.example
├── next.config.ts
├── vercel.json         # Vercel config + cron jobs
├── vitest.config.ts
└── README.md
```


## 📡 API Endpoints

### Products & Search
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/products | GET | List products (pagination, filter, sort) |
| /api/products/[id] | GET | Product detail with prices & history |
| /api/products/[id]/reviews | GET/POST | Product reviews |
| /api/search | GET | Search products (DB + VexoAPI augmented) |
| /api/scrape | POST | Scrape marketplace data |

### AI Features
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/ai-advisor | POST | AI price recommendation (beli/tunggu) |
| /api/predict | POST | Price prediction (7-28 hari) |
| /api/vexo/ai | POST | VexoAPI AI insights (5 intents) |
| /api/vexo/search | GET | Product discovery via VexoAPI |
| /api/vexo/images | GET | Image search via VexoAPI |
| /api/vexo/health | GET | VexoAPI connection status |

### User Features
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/alerts/check | GET | Trigger price alert emails (cron) |
| /api/leaderboard | GET | Gamification leaderboard |
| /api/push/subscribe | POST | Subscribe to push notifications |
| /api/user/export | GET | Export all user data (GDPR) |

### Export Features
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/export/price-history | GET | Export price history to CSV |
| /api/export/wishlist | GET | Export wishlist to CSV |

### Admin Features
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/backup | GET | Download database backup (SQL) |
| /api/registry | GET/POST | API registry management |
| /api/registry/[id] | GET/PUT/DELETE | Manage specific API source |
| /api/registry/health | GET | Check all API sources health |

### Reviews System
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/reviews | GET/POST | List/create reviews |
| /api/reviews/[id] | GET/PUT/DELETE | Manage specific review |
| /api/reviews/[id]/helpful | POST | Vote review as helpful |

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/forgot-password | POST | Request password reset |
| /api/auth/reset-password | POST | Reset password with token |

### System
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health | GET | System health check |
| /api/cron/prices | GET | Update all prices (runs setiap 12 jam) |
| /api/cron/digest | GET | Send weekly email digest (Minggu 8am) |

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| un run dev | Start development server (localhost:3000) |
| un run build | Build production bundle |
| un run start | Start production server |
| un run lint | Run ESLint |
| un run test | Run Vitest tests |
| un run test:watch | Run tests in watch mode |

## 🌍 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | https://abc123.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key | eyJhbGci... |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key (server-only) | eyJhbGci... |
| NEXT_PUBLIC_APP_URL | Application URL | http://localhost:3000 (dev) or https://yourdomain.com (prod) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VEXO_API_BASE_URL | VexoAPI base URL | https://vexoapi.azzamcodex.site |
| VEXO_API_KEY | VexoAPI VIP key untuk product discovery | - |
| VEXO_API_TIMEOUT_MS | VexoAPI request timeout | 10000 |
| VEXO_CACHE_TTL_SECONDS | VexoAPI cache TTL | 3600 |
| OPENAI_API_KEY | OpenAI API key untuk AI features | Fallback jika tidak ada |
| RESEND_API_KEY | Resend API key untuk email alerts | Email alerts disabled |

## 🚢 Deployment

### Vercel (Recommended)

1. **Push ke GitHub**
   ```bash
   git push origin master
   ```

2. **Import di Vercel**
   - Buka [vercel.com](https://vercel.com)
   - Import repository GitHub
   - Framework: Next.js (auto-detected)

3. **Set Environment Variables**
   - Vercel Dashboard → Settings → Environment Variables
   - Tambahkan semua variables dari .env.local
   - **Penting**: Set NEXT_PUBLIC_APP_URL dengan URL production Anda

4. **Deploy**
   - Deploy otomatis triggered dari push
   - Atau manual: unx vercel --prod

5. **Setup Cron Jobs**
   Vercel akan otomatis setup cron jobs dari ercel.json:
   - Price update: setiap 12 jam
   - Email digest: setiap Minggu jam 8 pagi
   - Alert check: setiap 6 jam

### Manual Deployment

```bash
# Build
bun run build

# Start production server
bun run start
```


## 📄 Pages & Routes

### Public Pages
| Route | Description |
|-------|-------------|
| / | Homepage dengan trending deals, categories, hero search |
| /search | Search results dengan filters dan sort |
| /product/[slug] | Product detail dengan price comparison, history chart, reviews |
| /compare | Product comparison (side-by-side 4 products) |
| /leaderboard | Gamification leaderboard |
| /auth/login | Login page |
| /auth/register | Register page |
| /auth/forgot-password | Forgot password form |
| /auth/reset-password | Reset password with token |
| /offline | PWA offline fallback page |

### Protected Pages (Require Auth)
| Route | Description |
|-------|-------------|
| /dashboard | User dashboard (wishlist, price alerts, statistics) |
| /settings | User settings (edit profile, change password) |

### Admin Pages (Require Admin Role)
| Route | Description |
|-------|-------------|
| /admin | Admin dashboard (analytics, product management) |
| /admin/products/[id] | Edit product & manage prices per marketplace |
| /admin/registry | API Registry management |

### SEO & Metadata
| Route | Description |
|-------|-------------|
| /sitemap.xml | Dynamic sitemap (includes all products) |
| /robots.txt | Robots.txt for search engines |

## 🔍 Key Features Explained

### VexoAPI Integration

VexoAPI digunakan untuk product discovery dari internet:

- **Search Integration**: Hasil search di-augment dengan data dari VexoAPI (Google + DuckDuckGo)
- **Image Fallback**: Otomatis fetch gambar produk jika belum ada
- **AI Smart Search**: Natural language query diubah jadi structured params
- **Product Matcher**: Cocokan produk dari marketplace berbeda (Jaccard similarity)

**Cara pakai:**
1. Set VEXO_API_KEY di .env.local
2. Search akan otomatis menampilkan hasil dari DB + VexoAPI
3. VexoAPI health status: /api/vexo/health

### Gamification System

**Badges (9 types):**
- First Blood, Early Adopter, Deal Hunter
- Price Alert Master, Wishlist Collector
- Review Master, Social Butterfly
- Streak Master, Power User

**Levels (6 levels):**
- Newbie (0-99), Bronze (100-499), Silver (500-999)
- Gold (1000-2499), Platinum (2500-4999), Diamond (5000+)

**Points diperoleh dari:**
- Membuat wishlist (+10)
- Set price alert (+15)
- Review produk (+25)
- Share produk (+5)
- Login streak (+5-50)

### Price Prediction

Menggunakan AI untuk prediksi harga 7-28 hari ke depan:
- Analisis tren historis
- Faktor seasonal
- Marketplace behavior
- Confidence score
- Volatilitas

### Browser Extension

Chrome extension untuk quick price check:
- Install: Load unpacked dari folder extension/
- Popup: Quick search products
- Content script: Auto-detect product pages

## 🐛 Troubleshooting

### Service Worker Issues
**Problem**: Halaman selalu offline atau terus refresh
**Solution**: 
```bash
# Service worker hanya aktif di production
# Di development, service worker disabled otomatis
# Jika masih ada masalah, unregister manual:
# Browser DevTools → Application → Service Workers → Unregister
```

### Database Connection Error
**Problem**: Error connecting to Supabase
**Solution**:
```bash
# 1. Cek .env.local sudah benar
# 2. Verify Supabase project masih aktif
# 3. Test connection: curl NEXT_PUBLIC_SUPABASE_URL
# 4. Cek Row Level Security (RLS) policies aktif
```

### Build Errors
**Problem**: Build failed dengan TypeScript error
**Solution**:
```bash
# Clear cache dan rebuild
rm -rf .next
bun run build

# Jika masih error, cek:
# 1. Node version >= 18
# 2. Bun version >= 1.0
# 3. Dependencies up to date: bun install
```

### VexoAPI Not Working
**Problem**: VexoAPI search tidak muncul hasil
**Solution**:
```bash
# 1. Cek VEXO_API_KEY sudah benar
# 2. Test health: curl http://localhost:3000/api/vexo/health
# 3. Cek VexoAPI VIP status masih aktif
# 4. Fallback: Aplikasi tetap jalan dengan DB saja
```

### Email Alerts Not Sending
**Problem**: Price alert email tidak terkirim
**Solution**:
```bash
# 1. Set RESEND_API_KEY di .env.local
# 2. Verify domain di Resend dashboard
# 3. Test manual: curl http://localhost:3000/api/alerts/check
# 4. Cek Vercel cron jobs aktif (production only)
```

## 🤝 Contributing

Contributions welcome! Silakan:

1. Fork repository
2. Buat feature branch: git checkout -b feature/AmazingFeature
3. Commit changes: git commit -m 'Add some AmazingFeature'
4. Push ke branch: git push origin feature/AmazingFeature
5. Open Pull Request

**Development Guidelines:**
- Follow existing code style
- Add tests untuk features baru
- Update README jika perlu
- Run un run lint sebelum commit
- Keep commits atomic dan deskriptif

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 👏 Credits

**Built with:**
- [Next.js](https://nextjs.org) - React framework
- [Supabase](https://supabase.com) - Backend & Auth
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [VexoAPI](https://vexoapi.azzamcodex.site) - Product discovery
- [OpenAI](https://openai.com) - AI recommendations
- [Resend](https://resend.com) - Email service

**Marketplaces:**
- Tokopedia, Shopee, Bukalapak, Lazada, Blibli, TikTok Shop

---

**Made with ❤️ for Indonesian shoppers**

⭐ Star this repo if you find it useful!

📧 Questions? Open an issue or contact: [afifghaffarr@gmail.com](mailto:afifghaffarr@gmail.com)

🌐 Live Demo: Coming soon...


# BijakBeli Mobile App

## Overview

React Native mobile app untuk BijakBeli - platform perbandingan harga Indonesia.

## Features

- 📱 **Product Search** - Cari produk dari 6 marketplace
- 💰 **Price Comparison** - Bandingkan harga real-time
- 📊 **Price History** - Lihat grafik harga 30 hari
- 🔔 **Price Alerts** - Notifikasi harga turun
- 🤖 **AI Advisor** - Rekomendasi beli/tunggu
- ❤️ **Wishlist** - Simpan produk favorit
- 📈 **Analytics** - Dashboard harga

## Tech Stack

- **Framework**: React Native + Expo
- **State Management**: Zustand
- **API Client**: React Query
- **UI Components**: NativeWind (Tailwind CSS)
- **Charts**: Victory Native
- **Notifications**: Expo Notifications

## Setup

```bash
# Install dependencies
cd apps/mobile
npm install

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home
│   │   ├── search.tsx     # Search
│   │   ├── alerts.tsx     # Price Alerts
│   │   └── profile.tsx    # Profile
│   ├── product/[id].tsx   # Product Detail
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── product/          # Product-related
│   └── charts/           # Chart components
├── lib/                  # Utilities
│   ├── api.ts            # API client
│   ├── store.ts          # Zustand store
│   └── utils.ts          # Helpers
└── assets/               # Images, fonts
```

## API Integration

```typescript
// lib/api.ts
const API_BASE = 'https://www.bijakbeli.app/api';

export const api = {
  search: (query: string) => 
    fetch(`${API_BASE}/search?q=${query}`).then(r => r.json()),
  
  getProduct: (id: string) => 
    fetch(`${API_BASE}/products/${id}`).then(r => r.json()),
  
  getRecommendations: () => 
    fetch(`${API_BASE}/recommendations`).then(r => r.json()),
};
```

## Build & Deploy

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

## Environment Variables

```env
EXPO_PUBLIC_API_URL=https://www.bijakbeli.app
EXPO_PUBLIC_SUPABASE_URL=xxx
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
```

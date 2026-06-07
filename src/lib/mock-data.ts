import type { Product, Marketplace } from "./types";

const marketplaces: Marketplace[] = [
  "tokopedia",
  "shopee",
  "bukalapak",
  "lazada",
  "blibli",
  "tiktok",
];

function generatePriceHistory(
  basePrice: number,
  variance: number,
  days: number = 30
) {
  const history = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const prices: Record<Marketplace, number | null> = {} as Record<
      Marketplace,
      number | null
    >;
    for (const mp of marketplaces) {
      if (Math.random() > 0.1) {
        const fluctuation =
          basePrice * (1 + (Math.random() - 0.5) * variance);
        const mpVariance = (Math.random() - 0.5) * basePrice * 0.15;
        prices[mp] = Math.round(fluctuation + mpVariance);
      } else {
        prices[mp] = null;
      }
    }
    history.push({ date: dateStr, prices });
  }
  return history;
}

function generatePrices(
  basePrice: number,
  variance: number,
  productSlug: string
) {
  return marketplaces.map((mp) => {
    const price = Math.round(
      basePrice * (1 + (Math.random() - 0.5) * variance)
    );
    const shipping = Math.random() > 0.6 ? 0 : Math.round(Math.random() * 20000);
    return {
      marketplace: mp,
      price,
      url: `https://${mp}.co.id/product/${productSlug}`,
      seller: `${mp.charAt(0).toUpperCase() + mp.slice(1)} Official Store`,
      sellerRating: Math.round((4 + Math.random()) * 10) / 10,
      inStock: Math.random() > 0.1,
      shippingCost: shipping,
      lastUpdated: new Date().toISOString(),
    };
  });
}

const productsData: Omit<Product, "lowestPrice" | "highestPrice" | "averagePrice" | "dealScore">[] = [
  {
    id: "1",
    slug: "samsung-galaxy-s24-ultra",
    name: "Samsung Galaxy S24 Ultra 256GB",
    category: "Smartphone",
    description:
      "Smartphone flagship Samsung dengan S Pen, kamera 200MP, dan chipset Snapdragon 8 Gen 3. Layar Dynamic AMOLED 6.8 inch dengan refresh rate 120Hz.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=Samsung+S24",
    prices: generatePrices(18999000, 0.15, "samsung-galaxy-s24-ultra"),
    priceHistory: generatePriceHistory(18999000, 0.15),
    aiVerdict:
      "Harga terbaik ada di Tokopedia saat ini. Kami prediksi harga akan turun 5-8% dalam 2 minggu ke depan menjelang promo mid-year sale. Beli sekarang jika butuh, tapi bisa tunggu jika tidak mendesak.",
    specs: {
      RAM: "12GB",
      Storage: "256GB",
      Kamera: "200MP + 12MP + 50MP + 10MP",
      Baterai: "5000mAh",
      Chipset: "Snapdragon 8 Gen 3",
      Layar: '6.8" Dynamic AMOLED 2X',
    },
  },
  {
    id: "2",
    slug: "apple-iphone-15-pro-max",
    name: "Apple iPhone 15 Pro Max 256GB",
    category: "Smartphone",
    description:
      "iPhone terbaru dengan chip A17 Pro, kamera 48MP, dan desain titanium. Mendukung USB-C dan Action Button.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=iPhone+15+Pro",
    prices: generatePrices(19999000, 0.12, "apple-iphone-15-pro-max"),
    priceHistory: generatePriceHistory(19999000, 0.12),
    aiVerdict:
      "iPhone 15 Pro Max memiliki harga yang relatif stabil. Harga terbaik saat ini di Shopee dengan promo cashback. Tidak perlu menunggu karena harga iPhone jarang turun signifikan.",
    specs: {
      RAM: "8GB",
      Storage: "256GB",
      Kamera: "48MP + 12MP + 12MP",
      Baterai: "4441mAh",
      Chipset: "A17 Pro",
      Layar: '6.7" Super Retina XDR OLED',
    },
  },
  {
    id: "3",
    slug: "sony-wh-1000xm5",
    name: "Sony WH-1000XM5 Headphone Wireless",
    category: "Audio",
    description:
      "Headphone noise cancelling terbaik dari Sony. Kualitas audio Hi-Res, 30 jam baterai, dan mikrofon 8 untuk panggilan jernih.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=Sony+WH1000XM5",
    prices: generatePrices(4499000, 0.2, "sony-wh-1000xm5"),
    priceHistory: generatePriceHistory(4499000, 0.2),
    aiVerdict:
      "Headphone ini sering diskon di Bukalapak dan Blibli. Tunggu promo weekend atau harbolnas untuk harga terbaik. Harga saat ini termasuk rata-rata.",
    specs: {
      Tipe: "Over-ear",
      "Noise Cancelling": "Ya (Adaptive)",
      Baterai: "30 jam",
      Bluetooth: "5.2",
      Berat: "250g",
      Driver: "30mm",
    },
  },
  {
    id: "4",
    slug: "asus-rog-zephyrus-g14",
    name: "ASUS ROG Zephyrus G14 GA402",
    category: "Laptop",
    description:
      "Laptop gaming tipis dan ringan dengan AMD Ryzen 9 dan RTX 4060. Layar 14 inch QHD+ 165Hz, cocok untuk gaming dan content creation.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=ROG+G14",
    prices: generatePrices(22999000, 0.18, "asus-rog-zephyrus-g14"),
    priceHistory: generatePriceHistory(22999000, 0.18),
    aiVerdict:
      "Laptop gaming premium dengan harga kompetitif. Tokopedia dan Blibli sering memberikan bonus aksesoris. Harga saat ini sudah cukup baik, tidak perlu menunggu.",
    specs: {
      Prosesor: "AMD Ryzen 9 7940HS",
      GPU: "NVIDIA RTX 4060 8GB",
      RAM: "16GB DDR5",
      Storage: "1TB NVMe SSD",
      Layar: '14" QHD+ 165Hz',
      Berat: "1.72kg",
    },
  },
  {
    id: "5",
    slug: "xiaomi-smart-band-8",
    name: "Xiaomi Smart Band 8",
    category: "Wearable",
    description:
      "Smartwatch fitness tracker dengan layar AMOLED 1.62 inch, 150+ mode olahraga, dan baterai tahan 16 hari. Tahan air 5ATM.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=Xiaomi+Band+8",
    prices: generatePrices(499000, 0.25, "xiaomi-smart-band-8"),
    priceHistory: generatePriceHistory(499000, 0.25),
    aiVerdict:
      "Harga sangat bervariasi antar marketplace! Shopee dan TikTok Shop sering menawarkan harga termurah dengan voucher. Ini produk yang worth it untuk dibeli sekarang.",
    specs: {
      Layar: '1.62" AMOLED',
      Baterai: "16 hari",
      "Tahan Air": "5ATM",
      "Mode Olahraga": "150+",
      Berat: "27.5g",
      Konektivitas: "Bluetooth 5.1",
    },
  },
  {
    id: "6",
    slug: "dyson-v15-detect",
    name: "Dyson V15 Detect Absolute",
    category: "Home Appliance",
    description:
      "Vacuum cleaner cordless premium dengan laser detection untuk debu halus. Teknologi piezo sensor dan LCD screen untuk analisis debu real-time.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=Dyson+V15",
    prices: generatePrices(9999000, 0.15, "dyson-v15-detect"),
    priceHistory: generatePriceHistory(9999000, 0.15),
    aiVerdict:
      "Dyson jarang diskon besar. Jika menemukan harga di bawah Rp9.500.000, itu sudah deal bagus. Lazada kadang menawarkan cicilan 0% yang menguntungkan.",
    specs: {
      Daya: "230AW suction",
      Baterai: "60 menit",
      Kapasitas: "0.76L",
      Berat: "3.1kg",
      Filter: "HEPA",
      "Layar": "LCD Piezo",
    },
  },
  {
    id: "7",
    slug: "logitech-mx-master-3s",
    name: "Logitech MX Master 3S Mouse",
    category: "Peripherals",
    description:
      "Mouse wireless premium untuk produktivitas dengan sensor 8000 DPI, scroll wheel MagSpeed, dan konektivitas multi-device via Bluetooth dan Logi Bolt.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=MX+Master+3S",
    prices: generatePrices(1599000, 0.18, "logitech-mx-master-3s"),
    priceHistory: generatePriceHistory(1599000, 0.18),
    aiVerdict:
      "Mouse ini harga stabil dan jarang diskon besar. Beli di marketplace yang menawarkan garansi resmi. Harga saat ini wajar dan tidak perlu menunggu.",
    specs: {
      Sensor: "8000 DPI",
      Konektivitas: "Bluetooth + Logi Bolt",
      Baterai: "70 hari",
      "Quick Charge": "3 menit = 3 jam",
      Berat: "141g",
      Tombol: "7 tombol",
    },
  },
  {
    id: "8",
    slug: "nintendo-switch-oled",
    name: "Nintendo Switch OLED Model",
    category: "Gaming",
    description:
      "Konsol hybrid dengan layar OLED 7 inch, audio enhanced, dan dock dengan LAN port. Cocok untuk gaming di rumah dan on-the-go.",
    imageUrl: "https://placehold.co/400x400/e2e8f0/64748b?text=Switch+OLED",
    prices: generatePrices(5499000, 0.14, "nintendo-switch-oled"),
    priceHistory: generatePriceHistory(5499000, 0.14),
    aiVerdict:
      "Nintendo Switch OLED memiliki harga yang cukup stabil. Tokopedia dan Shopee bersaing ketat. Tunggu bundle deal yang biasanya muncul menjelang liburan.",
    specs: {
      Layar: '7" OLED',
      Storage: "64GB",
      Baterai: "4.5 - 9 jam",
      Resolusi: "1280x720 (handheld)",
      Dock: "HDMI + LAN Port",
      Berat: "420g (dengan Joy-Con)",
    },
  },
];

export const mockProducts: Product[] = productsData.map((product) => {
  const prices = product.prices.filter((p) => p.inStock).map((p) => p.price);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = Math.round(
    prices.reduce((a, b) => a + b, 0) / prices.length
  );
  const dealScore = Math.round(
    100 - ((averagePrice - lowestPrice) / averagePrice) * 100
  );

  return {
    ...product,
    lowestPrice,
    highestPrice,
    averagePrice,
    dealScore,
  };
});

export const categories = [
  "Smartphone",
  "Laptop",
  "Audio",
  "Wearable",
  "Home Appliance",
  "Peripherals",
  "Gaming",
];

export const popularSearches = [
  "Samsung Galaxy S24",
  "iPhone 15 Pro",
  "Laptop Gaming",
  "Headphone Wireless",
  "Smartwatch",
  "Vacuum Cleaner",
  "Nintendo Switch",
  "Mouse Wireless",
];

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );
}

export function getProductBySlug(slug: string): Product | undefined {
  return mockProducts.find((p) => p.slug === slug);
}

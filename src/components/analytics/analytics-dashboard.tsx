'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingDown,
  Package, 
  Store, 
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface AnalyticsData {
  totalProducts: number;
  totalOffers: number;
  avgPrice: number;
  priceChange24h: number;
  topCategories: Array<{ name: string; count: number; avgPrice: number }>;
  topMarketplaces: Array<{ name: string; offers: number; avgPrice: number }>;
  recentPriceDrops: Array<{ 
    id: string; 
    name: string; 
    oldPrice: number; 
    newPrice: number; 
    dropPercent: number;
    marketplace: string;
  }>;
  priceDistribution: Array<{ range: string; count: number }>;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?period=${period}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Periode:</span>
        {(['24h', '7d', '30d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              period === p 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {p === '24h' ? '24 Jam' : p === '7d' ? '7 Hari' : '30 Hari'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalOffers} offers tersedia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Harga</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {data.avgPrice.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center text-xs">
              {data.priceChange24h >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">+{data.priceChange24h.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">{data.priceChange24h.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs kemarin</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marketplace</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topMarketplaces.length}</div>
            <p className="text-xs text-muted-foreground">
              marketplace ter-cover
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kategori</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topCategories.length}</div>
            <p className="text-xs text-muted-foreground">
              kategori produk
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribusi Harga</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.priceDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium">{item.range}</div>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ 
                      width: `${(item.count / Math.max(...data.priceDistribution.map(d => d.count))) * 100}%` 
                    }}
                  />
                </div>
                <div className="w-16 text-sm text-right text-muted-foreground">
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Categories & Marketplaces */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topCategories.slice(0, 5).map((cat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{cat.count} produk</div>
                    <div className="text-xs text-muted-foreground">
                      Avg Rp {cat.avgPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topMarketplaces.map((mp, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium capitalize">{mp.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{mp.offers} offers</div>
                    <div className="text-xs text-muted-foreground">
                      Avg Rp {mp.avgPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Price Drops */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-500" />
            Penurunan Harga Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentPriceDrops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada penurunan harga tercatat
              </p>
            ) : (
              data.recentPriceDrops.map((drop, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{drop.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {drop.marketplace}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm line-through text-muted-foreground">
                        Rp {drop.oldPrice.toLocaleString('id-ID')}
                      </span>
                      <ArrowDownRight className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">
                        Rp {drop.newPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <Badge variant="secondary" className="mt-1">
                      -{drop.dropPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  TrendingUp,
  Package,
  ExternalLink,
  RefreshCw,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface Recommendation {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  reason: string;
  confidence: number;
  category: string;
  avg_price: number;
  price_range: { min: number; max: number };
  marketplaces: string[];
  deal_score: number;
}

export function AIRecommendations({ productId }: { productId?: string }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const url = productId
        ? `/api/recommendations?product_id=${productId}`
        : '/api/recommendations';

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const submitFeedback = async (recId: string, type: 'up' | 'down') => {
    setFeedback(prev => ({ ...prev, [recId]: type }));
    
    try {
      await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation_id: recId, feedback: type }),
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-700';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getDealScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded mb-4" />
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-6 w-48 bg-muted rounded mb-4" />
              <div className="h-4 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Belum ada rekomendasi</h3>
          <p className="text-muted-foreground text-center mb-4">
            Sistem AI sedang menganalisis preferensi Anda
          </p>
          <Button onClick={loadRecommendations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Muat Ulang
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Rekomendasi AI
          </h2>
          <p className="text-muted-foreground">
            Produk serupa berdasarkan preferensi Anda
          </p>
        </div>
        <Button variant="outline" onClick={loadRecommendations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Recommendations Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              {/* Product Image */}
              <div className="relative aspect-square mb-4 bg-muted rounded-lg overflow-hidden">
                {rec.product_image ? (
                  <Image
                    src={rec.product_image}
                    alt={rec.product_name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Deal Score Badge */}
                <div className="absolute top-2 right-2">
                  <Badge className={getDealScoreColor(rec.deal_score)}>
                    {rec.deal_score}/100
                  </Badge>
                </div>
              </div>

              {/* Product Info */}
              <div className="mb-4">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                  {rec.product_name}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {rec.category}
                </Badge>
              </div>

              {/* AI Reason */}
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {rec.reason}
                  </p>
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-1">Rentang Harga</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">
                    Rp {rec.price_range.min.toLocaleString('id-ID')}
                  </span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-lg font-bold">
                    Rp {rec.price_range.max.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Marketplaces */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-2">Tersedia di</div>
                <div className="flex flex-wrap gap-1">
                  {rec.marketplaces.map((mp, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs capitalize">
                      {mp}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Confidence */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Confidence</span>
                <Badge className={getConfidenceColor(rec.confidence)}>
                  {rec.confidence}%
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button className="flex-1" size="sm">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Lihat Produk
                </Button>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => submitFeedback(rec.id, 'up')}
                    className={feedback[rec.id] === 'up' ? 'text-green-600' : ''}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => submitFeedback(rec.id, 'down')}
                    className={feedback[rec.id] === 'down' ? 'text-red-600' : ''}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <TrendingUp className="h-6 w-6 text-primary mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Cara Kerja Rekomendasi AI</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Analisis produk yang Anda lihat dan beli</li>
                <li>• Bandingkan dengan preferensi pengguna serupa</li>
                <li>• Pertimbangkan harga, rating, dan kategori</li>
                <li>• Semakin sering digunakan, semakin akurat</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

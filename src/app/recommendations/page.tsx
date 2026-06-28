import { Metadata } from 'next';
import { AIRecommendations } from '@/components/ai/ai-recommendations';

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'Rekomendasi AI - BijakBeli',
  description: 'Rekomendasi produk berdasarkan preferensi Anda',
  alternates: {
    canonical: '/recommendations',
  },
};

export default function RecommendationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AIRecommendations />
    </div>
  );
}

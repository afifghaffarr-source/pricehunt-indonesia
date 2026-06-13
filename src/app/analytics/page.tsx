import { Metadata } from 'next';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

export const metadata: Metadata = {
  title: 'Analytics - BijakBeli',
  description: 'Dashboard analytics dan visualisasi data harga',
};

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visualisasi data harga dan tren marketplace Indonesia
        </p>
      </div>
      
      <AnalyticsDashboard />
    </div>
  );
}

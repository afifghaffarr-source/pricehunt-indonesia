import { Metadata } from 'next';
import { PriceAlertsManager } from '@/components/alerts/price-alerts-manager';

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'Price Alerts - BijakBeli',
  description: 'Kelola notifikasi harga produk',
  robots: { index: false, follow: false },
  alternates: { canonical: '/alerts' },
};

export default function AlertsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PriceAlertsManager />
    </div>
  );
}

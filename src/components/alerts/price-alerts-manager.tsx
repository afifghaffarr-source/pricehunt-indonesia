'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellRing, 
  Plus, 
  Trash2, 
  TrendingDown,
  Package
} from 'lucide-react';

interface PriceAlert {
  id: string;
  product_id: string;
  product_name: string;
  target_price: number;
  current_price: number;
  is_active: boolean;
  created_at: string;
  triggered_at?: string;
}

export function PriceAlertsManager() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    product_id: '',
    target_price: '',
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/alerts');
      const result = await response.json();
      if (result.success) {
        setAlerts(result.data);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAlert = async () => {
    if (!newAlert.product_id || !newAlert.target_price) return;
    
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: newAlert.product_id,
          target_price: parseInt(newAlert.target_price),
        }),
      });
      
      if (response.ok) {
        setShowAddForm(false);
        setNewAlert({ product_id: '', target_price: '' });
        loadAlerts();
      }
    } catch (error) {
      console.error('Failed to add alert:', error);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadAlerts();
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      
      if (response.ok) {
        loadAlerts();
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 w-32 bg-muted rounded mb-4" />
              <div className="h-6 w-48 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Price Alerts</h2>
          <p className="text-muted-foreground">
            Notifikasi saat harga turun ke target
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Alert
        </Button>
      </div>

      {/* Add Alert Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Alert Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Product ID</label>
                <Input
                  placeholder="UUID produk"
                  value={newAlert.product_id}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, product_id: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Harga (Rp)</label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={newAlert.target_price}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, target_price: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addAlert}>Simpan</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada alert</h3>
            <p className="text-muted-foreground text-center mb-4">
              Buat alert untuk mendapat notifikasi saat harga produk turun
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Alert Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={alert.triggered_at ? 'border-green-200 bg-green-50' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{alert.product_name || 'Produk'}</span>
                      {alert.triggered_at && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Triggered!
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Target Harga</div>
                        <div className="text-lg font-bold text-primary">
                          {formatPrice(alert.target_price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Harga Saat Ini</div>
                        <div className={`text-lg font-bold ${
                          alert.current_price <= alert.target_price 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {formatPrice(alert.current_price)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span>Dibuat: {formatDate(alert.created_at)}</span>
                      {alert.triggered_at && (
                        <span>Triggered: {formatDate(alert.triggered_at)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAlert(alert.id, alert.is_active)}
                    >
                      {alert.is_active ? (
                        <BellRing className="h-4 w-4 text-primary" />
                      ) : (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <TrendingDown className="h-6 w-6 text-green-500 mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Cara Kerja Price Alerts</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sistem cek harga setiap 6 jam</li>
                <li>• Notifikasi dikirim saat harga ≤ target</li>
                <li>• Alert otomatis non-aktif setelah triggered</li>
                <li>• Bisa diaktifkan kembali kapan saja</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  createPriceAlert,
  updatePriceAlert,
  togglePriceAlert,
  deletePriceAlert,
} from '@/app/actions/alerts';
import { Bell, BellOff, Edit2, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PriceAlert {
  id: string;
  target_price: number;
  is_active: boolean;
}

interface PriceAlertFormProps {
  productId: string;
  currentLowestPrice: number;
  initialAlerts: PriceAlert[];
}

export function PriceAlertForm({
  productId,
  currentLowestPrice,
  initialAlerts,
}: PriceAlertFormProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<PriceAlert[]>(initialAlerts);
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Suggested price: 10% below current lowest price
  const suggestedPrice = Math.floor(currentLowestPrice * 0.9);

  const handleCreateAlert = () => {
    const price = parseInt(targetPrice.replace(/\D/g, ''));
    
    if (!price || price <= 0) {
      alert('Masukkan target harga yang valid');
      return;
    }

    if (price >= currentLowestPrice) {
      alert('Target harga harus lebih rendah dari harga saat ini');
      return;
    }

    startTransition(async () => {
      const result = await createPriceAlert(productId, price);
      
      if (result.success && result.data) {
        setAlerts([...alerts, result.data]);
        setTargetPrice('');
        setIsDialogOpen(false);
        router.refresh();
      } else {
        alert(result.error || 'Gagal membuat price alert');
      }
    });
  };

  const handleUpdateAlert = () => {
    if (!editingAlert) return;

    const price = parseInt(editPrice.replace(/\D/g, ''));
    
    if (!price || price <= 0) {
      alert('Masukkan target harga yang valid');
      return;
    }

    if (price >= currentLowestPrice) {
      alert('Target harga harus lebih rendah dari harga saat ini');
      return;
    }

    startTransition(async () => {
      const result = await updatePriceAlert(editingAlert.id, price);
      
      if (result.success && result.data) {
        setAlerts(alerts.map(a => a.id === editingAlert.id ? result.data : a));
        setEditingAlert(null);
        setEditPrice('');
        setIsEditDialogOpen(false);
        router.refresh();
      } else {
        alert(result.error || 'Gagal update price alert');
      }
    });
  };

  const handleToggleAlert = (alertId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await togglePriceAlert(alertId, !currentStatus);
      
      if (result.success && result.data) {
        setAlerts(alerts.map(a => a.id === alertId ? result.data : a));
        router.refresh();
      } else {
        alert(result.error || 'Gagal mengubah status alert');
      }
    });
  };

  const handleDeleteAlert = (alertId: string) => {
    if (!confirm('Yakin ingin menghapus price alert ini?')) return;

    startTransition(async () => {
      const result = await deletePriceAlert(alertId);
      
      if (result.success) {
        setAlerts(alerts.filter(a => a.id !== alertId));
        router.refresh();
      } else {
        alert(result.error || 'Gagal menghapus price alert');
      }
    });
  };

  const openEditDialog = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setEditPrice(alert.target_price.toString());
    setIsEditDialogOpen(true);
  };

  const formatInputPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    return formatRupiah(parseInt(numbers));
  };

  const handlePriceInput = (value: string, setter: (val: string) => void) => {
    const numbers = value.replace(/\D/g, '');
    setter(numbers);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Pantau Harga
            </CardTitle>
            <CardDescription>
              Dapatkan notifikasi saat harga turun ke target Anda
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={isPending}>
                <Plus className="mr-2 h-4 w-4" />
                Buat Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Price Alert</DialogTitle>
                <DialogDescription>
                  Atur target harga dan kami akan memberi tahu Anda ketika harga turun
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="target-price">Target Harga</Label>
                  <Input
                    id="target-price"
                    type="text"
                    placeholder={formatRupiah(suggestedPrice)}
                    value={formatInputPrice(targetPrice)}
                    onChange={(e) => handlePriceInput(e.target.value, setTargetPrice)}
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Harga saat ini: {formatRupiah(currentLowestPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saran: {formatRupiah(suggestedPrice)} (hemat 10%)
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  onClick={handleCreateAlert}
                  disabled={isPending || !targetPrice}
                >
                  {isPending ? 'Membuat...' : 'Buat Alert'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-sm font-semibold">Belum ada price alert</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Buat alert pertama Anda untuk mulai memantau harga produk ini
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {formatRupiah(alert.target_price)}
                    </p>
                    <Badge variant={alert.is_active ? 'default' : 'secondary'}>
                      {alert.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {alert.target_price < currentLowestPrice
                      ? `Hemat ${formatRupiah(currentLowestPrice - alert.target_price)}`
                      : 'Target tercapai - harga sudah turun!'}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                    disabled={isPending}
                    title={alert.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {alert.is_active ? (
                      <BellOff className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(alert)}
                    disabled={isPending}
                    title="Edit target harga"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAlert(alert.id)}
                    disabled={isPending}
                    title="Hapus alert"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Target Harga</DialogTitle>
              <DialogDescription>
                Ubah target harga untuk alert ini
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Target Harga Baru</Label>
                <Input
                  id="edit-price"
                  type="text"
                  placeholder={formatRupiah(suggestedPrice)}
                  value={formatInputPrice(editPrice)}
                  onChange={(e) => handlePriceInput(e.target.value, setEditPrice)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Harga saat ini: {formatRupiah(currentLowestPrice)}
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingAlert(null);
                  setEditPrice('');
                }}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                onClick={handleUpdateAlert}
                disabled={isPending || !editPrice}
              >
                {isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

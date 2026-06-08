"use client";

import { useState, useTransition } from "react";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
import { createPriceAlert, deletePriceAlert } from "@/app/actions/data";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface AlertItem {
  id: string;
  target_price: number;
  is_active: boolean;
}

interface PriceAlertFormProps {
  productId: string;
  currentLowestPrice: number;
  initialAlerts: AlertItem[];
}

export function PriceAlertForm({
  productId,
  currentLowestPrice,
  initialAlerts,
}: PriceAlertFormProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [targetPrice, setTargetPrice] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const handleCreate = () => {
    setError(null);
    setMessage(null);
    const price = parseInt(targetPrice.replace(/\D/g, ""), 10);
    if (!price || price <= 0) {
      setError("Masukkan harga target yang valid.");
      return;
    }

    startTransition(async () => {
      const result = await createPriceAlert(productId, price);
      if (result.error) {
        if (result.error.includes("login")) {
          router.push("/auth/login");
          return;
        }
        setError(result.error);
      } else if (result.success && result.alert) {
        // ✅ Use real database ID from server response
        setAlerts((prev) => [
          ...prev,
          {
            id: result.alert.id,
            target_price: result.alert.target_price,
            is_active: result.alert.is_active,
          },
        ]);
        setTargetPrice("");
        setShowForm(false);
        setMessage("Alert berhasil dibuat. Kami akan memberi tahu saat harga mencapai target.");
      }
    });
  };

  const handleDelete = (alertId: string) => {
    startTransition(async () => {
      const result = await deletePriceAlert(alertId);
      if (result.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setMessage("Alert berhasil dihapus.");
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  const suggestedPrice = Math.round(currentLowestPrice * 0.9);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Price Alert
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Dapat notifikasi saat harga turun di bawah target Anda.
        </p>

        {message && <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}

        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={alert.is_active ? "default" : "secondary"}>
                    {alert.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatRupiah(alert.target_price)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(alert.id)}
                  disabled={isPending}
                  aria-label={`Hapus alert ${formatRupiah(alert.target_price)}`}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Belum ada pantauan harga. Tambahkan target agar PriceHunt memberi tahu saat harga turun.
          </div>
        )}

        {showForm ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={`Contoh: ${suggestedPrice.toLocaleString("id-ID")}`}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className={buttonVariants({ size: "default" })}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Simpan"
                )}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Harga terendah saat ini: {formatRupiah(currentLowestPrice)}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full"
            )}
          >
            <Plus className="mr-2 h-3 w-3" />
            Tambah Alert
          </button>
        )}
      </CardContent>
    </Card>
  );
}

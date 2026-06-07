"use client";

import { useActionState } from "react";
import { upsertPrice, type AdminState } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

interface PriceManagerProps {
  productId: string;
  prices: {
    id: string;
    price: number;
    marketplace_id: string;
    marketplaces: { id: string; display_name: string; name: string } | null;
  }[];
  marketplaces: { id: string; display_name: string; name: string }[];
}

export function PriceManager({ productId, prices, marketplaces }: PriceManagerProps) {
  const [state, action, pending] = useActionState<AdminState, FormData>(upsertPrice, undefined);

  return (
    <div className="space-y-4">
      {prices.length > 0 ? (
        <div className="space-y-2">
          {prices.map((p) => {
            const mp = p.marketplaces;
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{mp?.display_name || "Unknown"}</Badge>
                  <span className="font-semibold">{formatRupiah(p.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada harga. Tambahkan di bawah.</p>
      )}

      <form action={action} className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-medium">Tambah/Update Harga</p>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600">Harga berhasil disimpan!</p>
        )}
        <input type="hidden" name="product_id" value={productId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select name="marketplace_id">
            <SelectTrigger>
              <SelectValue placeholder="Marketplace" />
            </SelectTrigger>
            <SelectContent>
              {marketplaces.map((mp) => (
                <SelectItem key={mp.id} value={mp.id}>{mp.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input name="price" type="number" placeholder="Harga (contoh: 1500000)" />
          <Input name="url" placeholder="URL produk (opsional)" />
        </div>
        <Input name="seller" placeholder="Nama seller (opsional)" />
        <button
          type="submit"
          disabled={pending}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          {pending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
          ) : (
            <><Plus className="mr-2 h-3 w-3" /> Simpan Harga</>
          )}
        </button>
      </form>
    </div>
  );
}

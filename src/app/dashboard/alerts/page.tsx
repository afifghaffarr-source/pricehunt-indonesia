import { requireAuth } from "@/lib/supabase/auth";
import { getUserAlerts } from "@/lib/supabase/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Bell, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";

export const metadata = {
  title: "Pantau Harga - BijakBeli.app",
  description: "Pantau harga produk favorit dan dapatkan notifikasi saat harga turun.",
};

export default async function AlertsPage() {
  const user = await requireAuth();
  
  let alerts: Awaited<ReturnType<typeof getUserAlerts>> = [];

  try {
    alerts = await getUserAlerts(user.id);
  } catch {
    // Tables may not exist yet
  }

  // Sort alerts: active first, then by created date
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1;
    if (!a.is_active && b.is_active) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bell className="h-6 w-6" />
          Pantau Harga
        </h1>
        <p className="text-muted-foreground">
          Kelola price alert dan dapatkan notifikasi saat harga turun sesuai target Anda.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{alerts.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alert Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {alerts.filter((a) => a.is_active).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alert Nonaktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">
              {alerts.filter((a) => !a.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {sortedAlerts.length > 0 ? (
        <div className="space-y-3">
          {sortedAlerts.map((alert) => {
            const product = alert.products as unknown as {
              name: string;
              slug: string;
              lowest_price?: number;
            };
            
            const currentPrice = product?.lowest_price || 0;
            const targetPrice = alert.target_price;
            const priceGap = currentPrice - targetPrice;
            const percentageFromTarget = currentPrice > 0 
              ? ((priceGap / currentPrice) * 100).toFixed(1)
              : 0;

            return (
              <Card key={alert.id} className={alert.is_active ? "" : "opacity-60"}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-semibold">{product?.name || "Produk"}</p>
                        <Badge variant={alert.is_active ? "default" : "secondary"}>
                          {alert.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-medium text-green-600">
                            {formatRupiah(targetPrice)}
                          </span>
                        </div>
                        
                        {currentPrice > 0 && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Harga Sekarang:</span>
                              <span className="font-medium">
                                {formatRupiah(currentPrice)}
                              </span>
                            </div>
                            
                            {priceGap > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="text-sm text-orange-600">
                                  Masih {formatRupiah(priceGap)} di atas target ({percentageFromTarget}%)
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="text-sm font-medium text-green-600">
                                  Target tercapai!
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Dibuat:</span>
                          <span className="text-xs">
                            {new Date(alert.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/product/${product?.slug || ""}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        <ShoppingBag className="mr-1 h-3 w-3" />
                        Lihat Produk
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Belum Ada Price Alert</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Buat price alert di halaman produk untuk mendapat notifikasi saat harga turun
              sesuai target yang Anda inginkan.
            </p>
            <Link
              href="/search"
              className={buttonVariants({ variant: "default" })}
            >
              Cari Produk
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

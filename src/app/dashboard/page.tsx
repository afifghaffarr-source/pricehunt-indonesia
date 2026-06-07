import { requireAuth, getUserProfile } from "@/lib/supabase/auth";
import { getUserWishlist, getUserAlerts } from "@/lib/supabase/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExportWishlistButton } from "@/components/common/ExportButtons";
import {
  Heart,
  Bell,
  ShoppingBag,
  LogOut,
  User,
} from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  const user = await requireAuth();
  const profileData = await getUserProfile();

  let wishlist: Awaited<ReturnType<typeof getUserWishlist>> = [];
  let alerts: Awaited<ReturnType<typeof getUserAlerts>> = [];

  try {
    wishlist = await getUserWishlist(user.id);
    alerts = await getUserAlerts(user.id);
  } catch {
    // Tables may not exist yet
  }

  const displayName =
    profileData?.profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang kembali, {displayName}!
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profil</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{displayName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{wishlist.length}</p>
            <p className="text-sm text-muted-foreground">produk tersimpan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Price Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alerts.length}</p>
            <p className="text-sm text-muted-foreground">alert aktif</p>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Heart className="h-5 w-5" />
              Wishlist Saya
            </h2>
            {wishlist.length > 0 && <ExportWishlistButton />}
          </div>
          {wishlist.length > 0 ? (
            <div className="space-y-3">
              {wishlist.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {(item.products as unknown as { name: string })?.name ||
                          "Produk"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(item.products as unknown as { lowest_price: number })
                          ?.lowest_price
                          ? formatRupiah(
                              (item.products as unknown as { lowest_price: number })
                                .lowest_price
                            )
                          : "Harga tidak tersedia"}
                      </p>
                    </div>
                    <Link
                      href={`/product/${
                        (item.products as unknown as { slug: string })?.slug || ""
                      }`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      <ShoppingBag className="mr-1 h-3 w-3" />
                      Lihat
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Belum ada wishlist. Mulai cari produk dan simpan yang kamu suka!
                </p>
                <Link
                  href="/search"
                  className={
                    buttonVariants({ variant: "default", size: "sm" }) +
                    " mt-4 inline-flex"
                  }
                >
                  Cari Produk
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Bell className="h-5 w-5" />
            Price Alerts
          </h2>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {(alert.products as unknown as { name: string })?.name ||
                          "Produk"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Target: {formatRupiah(alert.target_price)}
                      </p>
                    </div>
                    <Badge
                      variant={alert.is_active ? "default" : "secondary"}
                    >
                      {alert.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Belum ada price alert. Atur alert di halaman produk untuk
                  mendapat notifikasi saat harga turun!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

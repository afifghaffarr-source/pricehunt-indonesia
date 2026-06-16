import { requireAuth, getUserProfile } from "@/lib/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PushNotificationButton } from "@/components/common/PushNotificationButton";
import Link from "next/link";
import { ArrowLeft, Bell, Download, Lock, Mail, Shield, User } from "lucide-react";
import type { Metadata } from "next";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { DataExportSection } from "./DataExportSection";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Kelola profil dan pengaturan akun Anda.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/settings" },
};

export default async function SettingsPage() {
  const user = await requireAuth();
  const profileData = await getUserProfile();

  const displayName =
    profileData?.profile?.display_name ||
    user.user_metadata?.display_name ||
    "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "ghost" }) + " mb-6"}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Dashboard
      </Link>

      <div className="mb-8 rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <h1 className="text-2xl font-bold">Pengaturan akun</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Atur profil, notifikasi harga, digest email, dan data pribadi tanpa menghapus preferensi yang sudah tersimpan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm currentName={displayName} currentEmail={user.email || ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifikasi harga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aktifkan push notification agar alert harga bisa muncul langsung saat target tercapai. Email tetap menjadi fallback bila push gagal.
            </p>
            <PushNotificationButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email digest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Digest mingguan akan merangkum wishlist yang turun harga, alert yang tercapai, dan rekomendasi beli atau tunggu. Kontrol granular preferensi akan ditambahkan saat backend digest preference siap.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Ubah Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Ekspor Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataExportSection />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privasi dan keamanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Data akun hanya digunakan untuk wishlist, alert harga, review, dan rekomendasi belanja. Ekspor data tersedia kapan saja dari kartu Ekspor Data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

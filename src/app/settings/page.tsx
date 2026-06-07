import { requireAuth, getUserProfile } from "@/lib/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, User, Lock, Download } from "lucide-react";
import type { Metadata } from "next";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { DataExportSection } from "./DataExportSection";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Kelola profil dan pengaturan akun Anda.",
};

export default async function SettingsPage() {
  const user = await requireAuth();
  const profileData = await getUserProfile();

  const displayName =
    profileData?.profile?.display_name ||
    user.user_metadata?.display_name ||
    "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "ghost" }) + " mb-6"}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Dashboard
      </Link>

      <h1 className="mb-6 text-2xl font-bold">Pengaturan</h1>

      <div className="space-y-6">
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
      </div>
    </div>
  );
}

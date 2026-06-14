"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PushNotificationButton } from "@/components/common/PushNotificationButton";
import { Bell, Mail, AlertCircle, TrendingUp, Check, X } from "lucide-react";

interface NotificationPreferences {
  push_enabled?: boolean;
  push_subscription?: unknown;
  email_digest_enabled?: boolean;
  email_digest_frequency?: "daily" | "weekly" | "never";
  price_alert_email?: boolean;
  price_alert_push?: boolean;
  deal_alerts_enabled?: boolean;
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_digest_enabled: true,
    email_digest_frequency: "weekly",
    price_alert_email: true,
    price_alert_push: true,
    deal_alerts_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Anda harus login untuk mengatur notifikasi");
        setLoading(false);
        return;
      }

      setUserEmail(user.email || null);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();

      if (profile?.preferences) {
        const prefs = profile.preferences as NotificationPreferences;
        setPreferences({
          push_enabled: prefs.push_enabled || false,
          push_subscription: prefs.push_subscription,
          email_digest_enabled: prefs.email_digest_enabled ?? true,
          email_digest_frequency: prefs.email_digest_frequency || "weekly",
          price_alert_email: prefs.price_alert_email ?? true,
          price_alert_push: prefs.price_alert_push ?? true,
          deal_alerts_enabled: prefs.deal_alerts_enabled ?? true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat preferensi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data fetching on mount is a legitimate use case for setState in effects
     
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      // Merge with existing preferences
      const updatedPrefs = { ...preferences, ...newPrefs };
      
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          preferences: updatedPrefs,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setPreferences(updatedPrefs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan preferensi");
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !userEmail) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pengaturan Notifikasi
          </h1>
          <p className="text-gray-600">
            Atur cara BijakBeli memberi tahu Anda tentang perubahan harga dan promo
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-2">
              Email terdaftar: <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>

        {/* Save Success Message */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <Check className="w-5 h-5" />
              <p className="font-medium">Preferensi berhasil disimpan</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && userEmail && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <X className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Push Notifications Section */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Push Notification
                </h2>
                <p className="text-gray-600 text-sm">
                  Dapatkan notifikasi langsung di browser saat harga turun atau promo menarik tersedia
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <PushNotificationButton />

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    Notifikasi Pantauan Harga
                  </p>
                  <p className="text-sm text-gray-600">
                    Alert saat harga target tercapai
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.price_alert_push ?? true}
                    onChange={(e) =>
                      savePreferences({ price_alert_push: e.target.checked })
                    }
                    disabled={saving || !preferences.push_enabled}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Email Notifications Section */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Email Notification
                </h2>
                <p className="text-gray-600 text-sm">
                  Terima ringkasan dan alert penting via email
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    Email Pantauan Harga
                  </p>
                  <p className="text-sm text-gray-600">
                    Alert via email saat harga target tercapai
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.price_alert_email ?? true}
                    onChange={(e) =>
                      savePreferences({ price_alert_email: e.target.checked })
                    }
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Email Digest
                  </p>
                  <p className="text-sm text-gray-600">
                    Ringkasan wishlist dan promo pilihan
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={preferences.email_digest_frequency || "weekly"}
                    onChange={(e) =>
                      savePreferences({
                        email_digest_frequency: e.target.value as "daily" | "weekly" | "never",
                        email_digest_enabled: e.target.value !== "never",
                      })
                    }
                    disabled={saving}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="never">Tidak aktif</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Deal Alerts Section */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Rekomendasi Promo
                </h2>
                <p className="text-gray-600 text-sm">
                  Dapatkan rekomendasi promo dan deal terbaik
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  Aktifkan Rekomendasi Deal
                </p>
                <p className="text-sm text-gray-600">
                  Kami akan memberi tahu produk dengan harga terbaik sesuai minat Anda
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.deal_alerts_enabled ?? true}
                  onChange={(e) =>
                    savePreferences({ deal_alerts_enabled: e.target.checked })
                  }
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
              </label>
            </div>
          </section>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Tentang Notifikasi</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Push notification membutuhkan izin browser</li>
                  <li>• Email dikirim ke alamat akun Anda</li>
                  <li>• Anda bisa mengubah preferensi kapan saja</li>
                  <li>• Notifikasi hanya untuk produk yang Anda pantau</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

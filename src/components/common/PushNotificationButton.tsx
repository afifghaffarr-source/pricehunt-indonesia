"use client";

import { useState, useCallback, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PushNotificationButtonProps {
  className?: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationButton({ className }: PushNotificationButtonProps) {
  // ✅ HYDRATION FIX (v1.5.10): Initialize with `false` to match SSR.
  // The previous `useState(() => typeof window !== "undefined" && ...)`
  // returned `false` on server (no window) and `true` on client (window
  // exists), causing React #418 hydration mismatch: server rendered
  // `null` (early return), client first render rendered the button.
  // Standard fix: use false initial state + useEffect to detect support.
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setSupported(
      "serviceWorker" in navigator && "PushManager" in window
    );
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!supported || checked) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      setChecked(true);
    } catch {
      setChecked(true);
    }
  }, [supported, checked]);

  if (supported && !checked) {
    checkSubscription();
  }

  const toggleSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
        await fetch("/api/push/subscribe", { method: "DELETE" });
        setSubscribed(false);
      } else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn("VAPID public key not set");
          setLoading(false);
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });

        if (!response.ok) {
          await sub.unsubscribe();
          throw new Error("Gagal menyimpan subscription push");
        }

        setSubscribed(true);
      }
    } catch (err) {
      console.error("Push subscription error:", err);
    }
    setLoading(false);
  }, [subscribed]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggleSubscription}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
        subscribed
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {subscribed ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
    </button>
  );
}

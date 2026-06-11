import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/utils";
import type * as WebPush from "web-push";

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

/**
 * Send push notification to a specific user
 * 
 * @param userId - User ID to send notification to
 * @param payload - Notification content
 * @returns true if sent successfully, false otherwise
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@bijakbeli.id";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log("[Push] VAPID keys not configured, skipping push notification");
      return false;
    }

    // Get user's push subscription from preferences
    const supabase = createAdminClient();
    
    type ProfileData = {
      id: string;
      preferences: Record<string, unknown> | null;
    };
    
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("preferences")
      .eq("id", userId)
      .single();

    if (!profileData) {
      console.log("[Push] User profile not found:", userId);
      return false;
    }

    const profile = profileData as ProfileData;
    const preferences = (profile.preferences as Record<string, unknown>) || {};
    const pushEnabled = preferences.push_enabled === true;
    const pushSubscription = preferences.push_subscription;

    if (!pushEnabled || !pushSubscription) {
      console.log("[Push] User has not enabled push notifications:", userId);
      return false;
    }

    // Dynamically import web-push to avoid bundling it in client code
    const webpush = await import("web-push");

    // Set VAPID details
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Send notification
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192.svg",
      url: payload.url || "/",
    });

    await webpush.sendNotification(
      pushSubscription as WebPush.PushSubscription,
      notificationPayload
    );

    console.log("[Push] Notification sent successfully to user:", userId);
    return true;
  } catch (err) {
    // Handle expired/invalid subscriptions
    if (err && typeof err === "object" && "statusCode" in err) {
      const statusCode = (err as { statusCode: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        console.log("[Push] Subscription expired/invalid for user:", userId);
        // TODO: Could clean up expired subscription from database
        return false;
      }
    }

    console.error("[Push] Failed to send notification:", err);
    return false;
  }
}

/**
 * Send price alert push notification
 * 
 * @param userId - User ID
 * @param productName - Product name
 * @param productSlug - Product slug for URL
 * @param targetPrice - User's target price
 * @param currentPrice - Current product price
 */
export async function sendPriceAlertPush(
  userId: string,
  productName: string,
  productSlug: string,
  targetPrice: number,
  currentPrice: number
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return sendPushNotificationToUser(userId, {
    title: "🎉 Harga Turun!",
    body: `${productName} turun jadi ${formatRupiah(currentPrice)}`,
    icon: "/icons/icon-192.svg",
    url: `${appUrl}/product/${productSlug}`,
  });
}

/**
 * Send price drop notification to user's wishlist
 * 
 * @param userId - User ID
 * @param productName - Product name
 * @param productSlug - Product slug for URL
 * @param oldPrice - Previous price
 * @param newPrice - New lower price
 */
export async function sendPriceDropPush(
  userId: string,
  productName: string,
  productSlug: string,
  oldPrice: number,
  newPrice: number
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const savings = oldPrice - newPrice;

  return sendPushNotificationToUser(userId, {
    title: "💰 Harga Wishlist Turun!",
    body: `${productName} turun ${formatRupiah(savings)} jadi ${formatRupiah(newPrice)}`,
    icon: "/icons/icon-192.svg",
    url: `${appUrl}/product/${productSlug}`,
  });
}

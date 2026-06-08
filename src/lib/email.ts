import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/utils";

interface AlertEmail {
  email: string;
  userName: string;
  productName: string;
  productSlug: string;
  targetPrice: number;
  currentPrice: number;
}

export async function checkAndSendPriceAlerts() {
  // ✅ Use admin client to read alerts and update triggered status
  const supabase = createAdminClient();

  type AlertData = {
    id: string;
    target_price: number;
    user_id: string;
    product_id: string;
    products: { id: string; name: string; slug: string; lowest_price: number } | null;
  };

  const { data: alerts } = await supabase
    .from("price_alerts")
    .select("id, target_price, user_id, product_id, products(id, name, slug, lowest_price)")
    .eq("is_active", true);

  if (!alerts || alerts.length === 0) return { checked: 0, sent: 0 };

  const typedAlerts = alerts as AlertData[];
  const userIds = [...new Set(typedAlerts.map((a) => a.user_id))];
  const userMap = new Map<string, { email: string; displayName: string }>();

  // ✅ Get user data using admin client
  for (const uid of userIds) {
    const { data } = await supabase.auth.admin.getUserById(uid);
    if (data.user?.email) {
      userMap.set(uid, {
        email: data.user.email,
        displayName: (data.user.user_metadata?.display_name as string) || "User",
      });
    }
  }

  let sent = 0;

  for (const alert of typedAlerts) {
    const product = alert.products;
    if (!product) continue;

    if (product.lowest_price && product.lowest_price <= alert.target_price) {
      const userInfo = userMap.get(alert.user_id);
      if (!userInfo) continue;

      const emailSent = await sendPriceAlertEmail({
        email: userInfo.email,
        userName: userInfo.displayName,
        productName: product.name,
        productSlug: product.slug,
        targetPrice: alert.target_price,
        currentPrice: product.lowest_price,
      });

      if (emailSent) {
        // ✅ Update alert status using admin client
        // Admin client doesn't have full type inference, but operation is valid
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore - Admin client type inference limitation
        await supabase
          .from("price_alerts")
          // @ts-ignore
          .update({ triggered_at: new Date().toISOString(), is_active: false })
          .eq("id", alert.id);
        /* eslint-enable @typescript-eslint/ban-ts-comment */
        sent++;
      }
    }
  }

  return { checked: alerts.length, sent };
}

async function sendPriceAlertEmail(data: AlertEmail): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log("[Price Alert] RESEND_API_KEY not set, skipping email to:", data.email);
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    await resend.emails.send({
      from: "PriceHunt <onboarding@resend.dev>",
      to: data.email,
      subject: `Harga ${data.productName} turun! ${formatRupiah(data.currentPrice)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Price Alert!</h2>
          <p>Halo ${data.userName},</p>
          <p>Harga <strong>${data.productName}</strong> sudah turun di bawah target Anda!</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Target Harga</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${formatRupiah(data.targetPrice)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Harga Saat Ini</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; color: #059669;">${formatRupiah(data.currentPrice)}</td>
            </tr>
          </table>
          <a href="${appUrl}/product/${data.productSlug}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Lihat Produk</a>
          <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">Email ini dikirim oleh PriceHunt Indonesia.</p>
        </div>
      `,
    });

    return true;
  } catch (err) {
    console.error("[Price Alert] Failed to send email:", err);
    return false;
  }
}

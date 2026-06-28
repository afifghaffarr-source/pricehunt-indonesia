import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/utils";
import { sendPriceAlertPush } from "@/lib/push-notifications";
import { getAppUrl } from "./app-url";

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

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
  let pushSentCount = 0;

  for (const alert of typedAlerts) {
    const product = alert.products;
    if (!product) continue;

    if (product.lowest_price && product.lowest_price <= alert.target_price) {
      const userInfo = userMap.get(alert.user_id);
      if (!userInfo) continue;

      // ✅ Try push notification first (immediate notification)
      const pushSent = await sendPriceAlertPush(
        alert.user_id,
        product.name,
        product.slug,
        alert.target_price,
        product.lowest_price
      );

      if (pushSent) {
        pushSentCount++;
        console.log(`[Price Alert] Push notification sent to user ${alert.user_id}`);
      }

      // ✅ Always send email as reliable backup/record
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
        await supabase
          .from("price_alerts")
          .update({ triggered_at: new Date().toISOString(), is_active: false })
          .eq("id", alert.id);
        sent++;
      }
    }
  }

  return { checked: alerts.length, sent, pushSent: pushSentCount };
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
    const appUrl = getAppUrl();

    // Escape user-provided data to prevent XSS
    const safeName = escapeHtml(data.userName);
    const safeProductName = escapeHtml(data.productName);
    const safeProductSlug = encodeURIComponent(data.productSlug); // URL encode for href

    await resend.emails.send({
      from: "BijakBeli <onboarding@resend.dev>",
      to: data.email,
      subject: `Harga ${safeProductName} turun! ${formatRupiah(data.currentPrice)}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Harga Turun!</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 14px;">BijakBeli Alert</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px 24px; background: #f9fafb;">
            <div style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #6b7280; margin: 0 0 8px; font-size: 14px;">Halo ${safeName},</p>
              <h2 style="color: #111827; margin: 0 0 20px; font-size: 20px; font-weight: 600;">${safeProductName}</h2>
              
              <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 14px; background: #f3f4f6; border-radius: 8px; color: #6b7280; font-size: 14px;">Target Harga Anda</td>
                  <td style="padding: 14px; background: #f3f4f6; border-radius: 8px; text-align: right; font-weight: 700; color: #111827; font-size: 18px;">${formatRupiah(data.targetPrice)}</td>
                </tr>
                <tr>
                  <td style="padding: 14px; background: #ecfdf5; border-radius: 8px; color: #065f46; font-size: 14px; font-weight: 500;">Harga Sekarang</td>
                  <td style="padding: 14px; background: #ecfdf5; border-radius: 8px; text-align: right; font-weight: 700; color: #059669; font-size: 20px;">${formatRupiah(data.currentPrice)}</td>
                </tr>
              </table>
              
              <div style="text-align: center; margin-top: 24px;">
                <a href="${appUrl}/product/${safeProductSlug}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Beli Sekarang</a>
              </div>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-top: 16px;">
              <p style="color: #92400e; margin: 0; font-size: 13px;">⏰ Harga bisa berubah sewaktu-waktu. Segera cek!</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px 24px; text-align: center; background: #f9fafb; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Email dari <strong style="color: #2563eb;">BijakBeli.app</strong></p>
          </div>
        </div>
      `,
    });

    return true;
  } catch (err) {
    console.error("[Price Alert] Failed to send email:", err);
    return false;
  }
}

/**
 * Send weekly email digest to users with wishlist updates and recommendations
 * Called by cron/digest route
 */
export async function sendEmailDigest() {
  const supabase = createAdminClient();
  const appUrl = getAppUrl();

  // Get users who want email digest (opted in via preferences)
  type ProfileData = {
    id: string;
    display_name: string | null;
    preferences: Record<string, unknown> | null;
  };

  const { data: profilesData } = await supabase
    .from("user_profiles")
    .select("id, display_name, preferences")
    .not("preferences->>email_digest_enabled", "is", null);

  const profiles = profilesData ? (profilesData as ProfileData[]) : [];

  if (profiles.length === 0) {
    return { sent: 0, skipped: 0, failed: 0 };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles) {
    const prefs = (profile.preferences as Record<string, unknown>) || {};
    if (prefs.email_digest_enabled !== true) {
      skipped++;
      continue;
    }

    // Get user email from auth
    const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
    if (!authData?.user?.email) {
      skipped++;
      continue;
    }

    const userEmail = authData.user.email;
    const userName = profile.display_name || "User";

    // Fetch user's wishlist with product details
    type WishlistItem = {
      id: string;
      products: { 
        id: string; 
        name: string; 
        slug: string; 
        lowest_price: number | null;
        category: string;
      } | null;
    };

    const { data: wishlistData } = await supabase
      .from("wishlists")
      .select("id, products(id, name, slug, lowest_price, category)")
      .eq("user_id", profile.id)
      .limit(5);

    const wishlist = (wishlistData as WishlistItem[]) || [];

    // Get top 3 deals from products (high deal_score, active prices)
    type TopDeal = {
      id: string;
      name: string;
      slug: string;
      lowest_price: number | null;
      deal_score: number | null;
    };

    const { data: topDealsData } = await supabase
      .from("products")
      .select("id, name, slug, lowest_price, deal_score")
      .not("lowest_price", "is", null)
      .gte("deal_score", 70)
      .order("deal_score", { ascending: false })
      .limit(3);

    const topDeals = topDealsData ? (topDealsData as TopDeal[]) : [];

    // Build email content
    const emailSent = await sendDigestEmail({
      email: userEmail,
      userName,
      wishlistItems: wishlist
        .filter((w) => w.products)
        .map((w) => ({
          name: w.products!.name,
          slug: w.products!.slug,
          price: w.products!.lowest_price || 0,
        })),
      topDeals: (topDeals || []).map((d) => ({
        name: d.name,
        slug: d.slug,
        price: d.lowest_price || 0,
        score: d.deal_score || 0,
      })),
      appUrl,
    });

    if (emailSent) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, skipped, failed };
}

interface DigestData {
  email: string;
  userName: string;
  wishlistItems: { name: string; slug: string; price: number }[];
  topDeals: { name: string; slug: string; price: number; score: number }[];
  appUrl: string;
}

async function sendDigestEmail(data: DigestData): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log("[Email Digest] RESEND_API_KEY not set, skipping email to:", data.email);
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    // Escape user-provided data
    const safeName = escapeHtml(data.userName);

    // Build wishlist section
    let wishlistHtml = "";
    if (data.wishlistItems.length > 0) {
      wishlistHtml = `
        <div style="margin: 24px 0;">
          <h3 style="color: #1f2937; margin-bottom: 12px;">Produk Wishlist Anda</h3>
          ${data.wishlistItems
            .map(
              (item) => `
            <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px;">
              <p style="margin: 0; font-weight: bold; color: #1f2937;">${escapeHtml(item.name)}</p>
              <p style="margin: 4px 0 0; color: #059669; font-weight: bold;">${formatRupiah(item.price)}</p>
              <a href="${data.appUrl}/product/${encodeURIComponent(item.slug)}" style="color: #2563eb; text-decoration: none; font-size: 14px;">Lihat detail →</a>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    // Build top deals section
    let dealsHtml = "";
    if (data.topDeals.length > 0) {
      dealsHtml = `
        <div style="margin: 24px 0;">
          <h3 style="color: #1f2937; margin-bottom: 12px;">Promo Pintar Minggu Ini</h3>
          ${data.topDeals
            .map(
              (deal) => `
            <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; background: #f9fafb;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <p style="margin: 0; font-weight: bold; color: #1f2937;">${escapeHtml(deal.name)}</p>
                  <p style="margin: 4px 0 0; color: #059669; font-weight: bold;">${formatRupiah(deal.price)}</p>
                </div>
                <div style="background: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${Math.round(deal.score)}
                </div>
              </div>
              <a href="${data.appUrl}/product/${encodeURIComponent(deal.slug)}" style="color: #2563eb; text-decoration: none; font-size: 14px;">Lihat rekomendasi →</a>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 36px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">BijakBeli</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0; font-size: 15px; font-weight: 500;">Ringkasan Belanja Pintar Minggu Ini</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px; background: #f9fafb;">
          <div style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">Halo ${safeName},</p>
            <p style="color: #111827; margin: 0; font-size: 15px;">Berikut update harga dan rekomendasi belanja pintar untuk Anda 🛍️</p>
          </div>

          ${wishlistHtml}
          ${dealsHtml}

          ${
            data.wishlistItems.length === 0 && data.topDeals.length === 0
              ? '<div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; margin: 20px 0;"><p style="color: #9ca3af; margin: 0; font-size: 14px;">Belum ada update untuk minggu ini.</p><p style="color: #6b7280; margin: 8px 0 0; font-size: 13px;">Tambahkan produk ke wishlist untuk mendapat notifikasi harga!</p></div>'
              : ""
          }

          <!-- Tips Section -->
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 18px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #1e40af; margin: 0 0 4px; font-weight: 600; font-size: 14px;">💡 Tips Belanja Pintar</p>
            <p style="color: #1e3a8a; margin: 0; font-size: 13px;">Pantau harga produk favorit Anda dan kami akan memberi tahu kapan waktu terbaik untuk membeli.</p>
          </div>

          <!-- CTA -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="${data.appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Buka Dashboard Saya</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 24px; text-align: center; background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px;">Email digest dikirim mingguan oleh <strong style="color: #2563eb;">BijakBeli.app</strong></p>
          <a href="${data.appUrl}/settings" style="color: #6b7280; text-decoration: underline; font-size: 11px;">Ubah preferensi email</a>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "BijakBeli <onboarding@resend.dev>",
      to: data.email,
      subject: `Ringkasan Belanja Pintar BijakBeli`,
      html,
    });

    return true;
  } catch (err) {
    console.error("[Email Digest] Failed to send email:", err);
    return false;
  }
}

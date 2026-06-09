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

/**
 * Send weekly email digest to users with wishlist updates and recommendations
 * Called by cron/digest route
 */
export async function sendEmailDigest() {
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
              <p style="margin: 0; font-weight: bold; color: #1f2937;">${item.name}</p>
              <p style="margin: 4px 0 0; color: #059669; font-weight: bold;">${formatRupiah(item.price)}</p>
              <a href="${data.appUrl}/product/${item.slug}" style="color: #2563eb; text-decoration: none; font-size: 14px;">Lihat detail →</a>
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
                  <p style="margin: 0; font-weight: bold; color: #1f2937;">${deal.name}</p>
                  <p style="margin: 4px 0 0; color: #059669; font-weight: bold;">${formatRupiah(deal.price)}</p>
                </div>
                <div style="background: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${deal.score}
                </div>
              </div>
              <a href="${data.appUrl}/product/${deal.slug}" style="color: #2563eb; text-decoration: none; font-size: 14px;">Lihat rekomendasi →</a>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; margin: 0;">PriceHunt</h1>
          <p style="color: #6b7280; margin: 8px 0 0;">Ringkasan Belanja Pintar Anda</p>
        </div>

        <p>Halo ${data.userName},</p>
        <p style="color: #6b7280;">Berikut update harga dan rekomendasi belanja pintar minggu ini.</p>

        ${wishlistHtml}
        ${dealsHtml}

        ${
          data.wishlistItems.length === 0 && data.topDeals.length === 0
            ? '<p style="color: #6b7280; text-align: center; padding: 24px;">Belum ada update untuk minggu ini. Tambahkan produk ke wishlist untuk mendapat notifikasi harga!</p>'
            : ""
        }

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            <strong>Tips:</strong> Pantau harga produk favorit Anda dan kami akan memberi tahu kapan waktu terbaik untuk membeli.
          </p>
          <a href="${data.appUrl}/dashboard" style="display: inline-block; margin-top: 16px; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Buka Dashboard</a>
        </div>

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Email digest dikirim mingguan oleh PriceHunt Indonesia.<br/>
            <a href="${data.appUrl}/settings" style="color: #9ca3af;">Ubah preferensi email</a>
          </p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "PriceHunt <onboarding@resend.dev>",
      to: data.email,
      subject: `Ringkasan Belanja Pintar PriceHunt`,
      html,
    });

    return true;
  } catch (err) {
    console.error("[Email Digest] Failed to send email:", err);
    return false;
  }
}

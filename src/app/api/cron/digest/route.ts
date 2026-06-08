import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require cron secret (fail closed)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    // ✅ Use admin client for system operations and user data access
    const supabase = createAdminClient();

    type AlertWithProduct = {
      user_id: string;
      products: { name: string; slug: string; lowest_price: number } | null;
    };

    const { data: alerts } = await supabase
      .from("price_alerts")
      .select("user_id, products(name, slug, lowest_price)")
      .eq("is_active", true);

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ message: "No active alerts", sent: 0 });
    }

    const userGroups = new Map<string, AlertWithProduct[]>();
    for (const alert of alerts as AlertWithProduct[]) {
      const uid = alert.user_id;
      if (!userGroups.has(uid)) userGroups.set(uid, []);
      userGroups.get(uid)!.push(alert);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ message: "RESEND_API_KEY not set", sent: 0 });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let sent = 0;

    for (const [userId, userAlerts] of userGroups) {
      // ✅ Use centralized admin client for user data access
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (!userData.user?.email) continue;

      const userName = (userData.user.user_metadata?.display_name as string) || "User";
      const alertRows = userAlerts
        .map((a) => {
          const p = a.products;
          if (!p) return "";
          return `<tr><td style="padding:8px;border:1px solid #e5e7eb;"><a href="${appUrl}/product/${p.slug}" style="color:#2563eb;text-decoration:none;">${p.name}</a></td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Rp${(p.lowest_price || 0).toLocaleString("id-ID")}</td></tr>`;
        })
        .filter(Boolean)
        .join("");

      if (!alertRows) continue;

      await resend.emails.send({
        from: "PriceHunt <onboarding@resend.dev>",
        to: userData.user.email,
        subject: "PriceHunt — Ringkasan Harga Mingguan",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#2563eb;">Ringkasan Harga Mingguan</h2>
            <p>Halo ${userName},</p>
            <p>Ini ringkasan harga produk yang Anda pantau minggu ini:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr style="background:#f3f4f6;"><th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Produk</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Harga Terendah</th></tr>
              ${alertRows}
            </table>
            <a href="${appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;">Lihat Dashboard</a>
            <p style="margin-top:24px;color:#6b7280;font-size:12px;">Email ini dikirim setiap hari Minggu oleh PriceHunt Indonesia.</p>
          </div>
        `,
      });
      sent++;
    }

    return NextResponse.json({ success: true, usersNotified: sent });
  } catch (err) {
    console.error("Digest error:", err);
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}

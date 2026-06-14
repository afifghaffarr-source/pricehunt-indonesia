import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/utils";
import { getAppUrl } from "@/lib/app-url";

type AlertRow = {
  id: string;
  user_id: string;
  target_price: number;
  triggered_at: string | null;
  products: {
    id: string;
    name: string;
    slug: string;
    lowest_price: number | null;
  } | null;
};

function compactError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 180) : "unknown error";
}

async function sendAlertEmail(input: {
  email: string;
  userName: string;
  productName: string;
  productSlug: string;
  targetPrice: number;
  currentPrice: number;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendApiKey);
  const appUrl = getAppUrl();

  await resend.emails.send({
    from: "BijakBeli <onboarding@resend.dev>",
    to: input.email,
    subject: `Harga ${input.productName} sudah masuk target`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;">
        <h2 style="margin:0 0 12px;color:#0f766e;">Harga sudah masuk target</h2>
        <p>Halo ${input.userName}, harga <strong>${input.productName}</strong> sudah mencapai target pantauan Anda.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:10px;border:1px solid #e5e7eb;">Target Anda</td><td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;">${formatRupiah(input.targetPrice)}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e5e7eb;">Harga saat ini</td><td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;color:#047857;">${formatRupiah(input.currentPrice)}</td></tr>
        </table>
        <a href="${appUrl}/product/${input.productSlug}" style="display:inline-block;background:#0f766e;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">Cek produk sekarang</a>
        <p style="margin-top:24px;color:#6b7280;font-size:12px;">Harga dapat berubah sewaktu-waktu. Pastikan kembali di marketplace sebelum checkout.</p>
      </div>
    `,
  });

  return { sent: true, error: null };
}

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let processed = 0;
  let success = 0;
  let failed = 0;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("price_alerts")
      .select("id, user_id, target_price, triggered_at, products(id, name, slug, lowest_price)")
      .eq("is_active", true)
      .is("triggered_at", null);

    if (error) {
      throw new Error(`Failed to load price alerts: ${error.message}`);
    }

    const alerts = (data || []) as AlertRow[];
    const triggeredAlerts = alerts.filter((alert) => {
      const currentPrice = alert.products?.lowest_price;
      return typeof currentPrice === "number" && currentPrice > 0 && currentPrice <= alert.target_price;
    });

    processed = triggeredAlerts.length;

    const userIds = [...new Set(triggeredAlerts.map((alert) => alert.user_id))];
    const users = new Map<string, { email: string; name: string }>();

    for (const userId of userIds) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData.user?.email) {
        errors.push(`User lookup failed for ${userId}: ${userError?.message || "email missing"}`);
        continue;
      }

      users.set(userId, {
        email: userData.user.email,
        name: (userData.user.user_metadata?.display_name as string) || "Pemburu harga",
      });
    }

    for (const alert of triggeredAlerts) {
      const product = alert.products;
      const currentPrice = product?.lowest_price;
      const user = users.get(alert.user_id);

      if (!product || typeof currentPrice !== "number" || !user) {
        failed++;
        errors.push(`Alert ${alert.id} skipped: incomplete product or user data`);
        continue;
      }

      try {
        const emailResult = await sendAlertEmail({
          email: user.email,
          userName: user.name,
          productName: product.name,
          productSlug: product.slug,
          targetPrice: alert.target_price,
          currentPrice,
        });

        if (!emailResult.sent) {
          failed++;
          errors.push(`Alert ${alert.id}: ${emailResult.error}`);
          continue;
        }

        const alertUpdate = {
          triggered_at: new Date().toISOString(),
          is_active: false,
        } as never;

        const { error: updateError } = await supabase
          .from("price_alerts")
          .update(alertUpdate)
          .eq("id", alert.id);

        if (updateError) {
          failed++;
          errors.push(`Alert ${alert.id} sent but update failed: ${updateError.message}`);
          continue;
        }

        success++;
      } catch (error) {
        failed++;
        errors.push(`Alert ${alert.id}: ${compactError(error)}`);
      }
    }

    return NextResponse.json({
      success: failed === 0,
      job: "price-alerts",
      startedAt,
      finishedAt: new Date().toISOString(),
      totalActiveAlerts: alerts.length,
      processed,
      successCount: success,
      failedCount: failed,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Cron alerts failed:", error);
    return NextResponse.json(
      {
        success: false,
        job: "price-alerts",
        processed,
        successCount: success,
        failedCount: failed + 1,
        errors: [compactError(error)],
      },
      { status: 500 }
    );
  }
}
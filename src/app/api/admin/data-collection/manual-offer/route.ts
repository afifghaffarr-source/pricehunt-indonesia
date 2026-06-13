/**
 * POST /api/admin/data-collection/manual-offer
 *
 * Inserts a manually-collected offer. **Admin only.**
 *
 * Security:
 * - Admin guard runs FIRST. Service-role client is only constructed
 *   after the caller is verified as admin.
 * - No raw DB error details are returned to the client.
 * - Body is whitelisted.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "@/lib/validation";

const manualOfferSchema = z.object({
  product_id: z.optionalUuid(),
  offer_id: z.optionalUuid(),
  marketplace: z.string({ minLength: 1, maxLength: 80 }),
  title: z.string({ minLength: 1, maxLength: 200 }),
  url: z.url(),
  price: z.number({ min: 1, integer: true }),
  currency: z.optionalString({ minLength: 1, maxLength: 8 }),
  source: z.optionalString({ minLength: 1, maxLength: 40 }),
});

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = manualOfferSchema.safeParse(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.message },
      { status: 400 }
    );
  }

  const input = parsed.value as {
    product_id: string | null;
    offer_id: string | null;
    marketplace: string;
    title: string;
    url: string;
    price: number;
    currency: string | null;
    source: string | null;
  };
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  // Use the offer_id if provided, otherwise create a new offer row.
  if (input.offer_id) {
    const { error } = await adminClient
      .from("offers")
      .update({
        price: input.price,
        currency: input.currency ?? "IDR",
        url: input.url,
        title: input.title,
        marketplace: input.marketplace,
        last_checked_at: now,
        source: input.source ?? "manual",
      } as never)
      .eq("id", input.offer_id);

    if (error) {
      console.error("manual-offer update error", error);
      return NextResponse.json({ error: "Failed to update offer" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, offer_id: input.offer_id });
  }

  if (!input.product_id) {
    return NextResponse.json(
      { error: "product_id is required when offer_id is missing" },
      { status: 400 }
    );
  }

  const { data, error } = await adminClient
    .from("offers")
    .insert({
      product_id: input.product_id,
      marketplace: input.marketplace,
      title: input.title,
      url: input.url,
      price: input.price,
      currency: input.currency ?? "IDR",
      in_stock: true,
      source: input.source ?? "manual",
      last_checked_at: now,
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("manual-offer insert error", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, offer_id: (data as { id?: string } | null)?.id });
}

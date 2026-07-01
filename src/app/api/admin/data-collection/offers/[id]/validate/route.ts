/**
 * PATCH /api/admin/data-collection/offers/[id]/validate
 *
 * Approves or rejects an offer (manual review queue). **Admin only.**
 *
 * Accepts:
 *   { status: "valid" | "rejected" | "conflict" | "stale" | "pending",
 *     notes?: string }
 *
 * Sets `offers.validation_status` only. A separate trigger/materialised
 * view is responsible for promoting the offer into aggregated price
 * snapshots once status === "valid".
 *
 * Security:
 * - requireAdmin runs FIRST.
 * - Path id validated as UUID to avoid log-injection via crafted slugs.
 * - Status is restricted to a server-side enum, NOT freeform text.
 * - Audit log row created with actor + status diff metadata.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/auth";
import { z } from "@/lib/validation";
import { logAdminAction } from "@/lib/admin-audit";
import { findBestMatchingProduct } from "@/lib/offer-product-link";

// The status enum stored in offers.validation_status.
// Restricted to these 5 strings — anything else returns 400.
const ALLOWED_STATUSES = ["valid", "rejected", "conflict", "stale", "pending"] as const;
type AllowedStatus = typeof ALLOWED_STATUSES[number];

const offerValidateSchema = z.object({
  status: z.enum(ALLOWED_STATUSES, {
    errorMap: () => `status must be one of ${ALLOWED_STATUSES.join(", ")}`,
  }),
  notes: z.optionalString({ maxLength: 1000 }),
});

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid offer id (must be UUID)" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = offerValidateSchema.safeParse(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: parsed.message },
      { status: 400 }
    );
  }
  const input = parsed.value as { status: AllowedStatus; notes: string | null };

  // Capture the previous status so the audit row can record the diff.
  // Use the admin (service-role) client: migration 124's RLS only grants
  // UPDATE to service_role — authenticated users (cookies) cannot write
  // offers even when requireAdmin() has verified them. Admin is already
  // verified above.
  const supabase = createAdminClient();
  const { data: existing, error: findError } = await supabase
    .from("offers")
    .select("id, validation_status, title, product_id")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    console.error("offer fetch error", findError);
    return NextResponse.json(
      { success: false, error: "Failed to load offer" },
      { status: 500 }
    );
  }
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Offer not found" },
      { status: 404 }
    );
  }
  const previousStatus = existing.validation_status;

  // Auto-link orphan offers (product_id IS NULL) when approving. Many of
  // the scraped offers have NULL product_id because they pre-date catalog
  // seeding; without a link they're invisible in /search. If we find a
  // confident match we link in the same UPDATE so the change is atomic.
  let autoLink: Awaited<ReturnType<typeof findBestMatchingProduct>> | null = null;
  if (
    input.status === "valid" &&
    existing.product_id == null &&
    typeof existing.title === "string" &&
    existing.title.length > 0
  ) {
    autoLink = await findBestMatchingProduct(supabase, existing.title);
  }

  // Update validation_status (and product_id when auto-link succeeded).
  // updated_at auto-bumps via Supabase.
  const updatePayload: Record<string, unknown> = {
    validation_status: input.status,
  };
  if (autoLink) {
    updatePayload.product_id = autoLink.product_id;
  }
  const { error } = await supabase
    .from("offers")
    .update(updatePayload as never)
    .eq("id", id);

  if (error) {
    console.error("offer validation update error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update offer" },
      { status: 500 }
    );
  }

  // Best-effort audit log. NEVER throws to caller. requireAdmin has
  // already verified the caller is admin, so the user is non-null.
  const actor = await getUser();
  await logAdminAction({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "offer_decision",
    targetType: "offer",
    targetId: id,
    metadata: {
      title: existing.title ?? null,
      from_status: previousStatus,
      to_status: input.status,
      has_notes: !!input.notes,
      auto_link: autoLink
        ? {
            product_id: autoLink.product_id,
            product_name: autoLink.product_name,
            product_slug: autoLink.product_slug,
            score: autoLink.score,
            matched_tokens: autoLink.matched_tokens,
          }
        : null,
    },
    request,
  });

  return NextResponse.json({
    success: true,
    data: {
      id,
      validation_status: input.status,
      previous_status: previousStatus,
      auto_link: autoLink
        ? {
            product_id: autoLink.product_id,
            product_slug: autoLink.product_slug,
            product_name: autoLink.product_name,
          }
        : null,
    },
  });
}

/**
 * POST /api/admin/data-collection/resolve-conflict
 *
 * Resolves a price conflict. **Admin only.**
 *
 * Note: schema `price_conflicts` uses `status`, not `conflict_status`.
 * This route now updates the correct column.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { z } from "@/lib/validation";
import { logAdminAction } from "@/lib/admin-audit";

const resolveSchema = z.object({
  conflict_id: z.string({ minLength: 1, maxLength: 64 }),
  resolution_note: z.optionalString({ maxLength: 2000 }),
  keep_offer_id: z.optionalUuid(),
});

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.message }, { status: 400 });
  }
  const input = parsed.value as {
    conflict_id: string;
    resolution_note: string | null;
    keep_offer_id: string | null;
  };

  const supabase = await createClient();
  const update: Record<string, unknown> = {
    status: "resolved",
    resolution_note: input.resolution_note,
    resolved_at: new Date().toISOString(),
  };
  if (input.keep_offer_id) {
    update.keep_offer_id = input.keep_offer_id;
  }

  const { error } = await supabase
    .from("price_conflicts")
    .update(update as never)
    .eq("id", input.conflict_id);

  if (error) {
    console.error("resolve conflict error", error);
    return NextResponse.json({ success: false, error: "Failed to resolve conflict" }, { status: 500 });
  }

  // Best-effort audit log. NEVER throws to caller. requireAdmin has
  // already verified the caller is admin, so the user is non-null.
  const actor = await getUser();
  await logAdminAction({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "resolve_conflict",
    targetType: "price_conflict",
    targetId: input.conflict_id,
    metadata: {
      has_keep_offer: !!input.keep_offer_id,
      has_note: !!input.resolution_note,
    },
    request,
  });

  return NextResponse.json({ success: true, message: "Conflict resolved successfully" });
}

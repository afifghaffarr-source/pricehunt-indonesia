/**
 * PATCH /api/admin/data-collection/rechecks/[id]
 *
 * Updates a recheck request's status. **Admin only.**
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import { z } from "@/lib/validation";
import { logAdminAction } from "@/lib/admin-audit";

const recheckUpdateSchema = z.object({
  request_status: z.string({ minLength: 1, maxLength: 40 }),
  result_message: z.optionalString({ maxLength: 2000 }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!/^[0-9a-fA-F-]{8,64}$/.test(id)) {
    return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = recheckUpdateSchema.safeParse(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.message }, { status: 400 });
  }
  const input = parsed.value as { request_status: string; result_message: string | null };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recheck_requests")
    .update({
      request_status: input.request_status,
      result_message: input.result_message,
      processed_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    console.error("recheck update error", error);
    return NextResponse.json({ success: false, error: "Failed to update recheck" }, { status: 500 });
  }

  // Best-effort audit log. NEVER throws to caller. requireAdmin has
  // already verified the caller is admin, so the user is non-null.
  const actor = await getUser();
  await logAdminAction({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: "recheck_decision",
    targetType: "recheck_request",
    targetId: id,
    metadata: {
      request_status: input.request_status,
      has_message: !!input.result_message,
    },
    request,
  });

  return NextResponse.json({ success: true, message: "Recheck request updated successfully" });
}

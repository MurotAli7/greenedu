import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_ROLES = ["student", "teacher", "admin"];

/**
 * PATCH /api/admin/users/:id — foydalanuvchi rolini yoki ismini o'zgartirish.
 * Body: { role?, fullName? }
 */
export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const body = await request.json();

  const updates = {};
  if (body.role !== undefined) {
    if (!ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Noto'g'ri rol qiymati." }, { status: 400 });
    }
    updates.role = body.role;
  }
  if (body.fullName !== undefined) updates.full_name = body.fullName;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "O'zgartirish uchun maydon berilmadi." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}

/**
 * DELETE /api/admin/users/:id — foydalanuvchini butunlay o'chirish
 * (auth.users dan; profiles CASCADE bo'lsa avtomatik, bo'lmasa qo'lda tozalanadi).
 */
export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { id } = await params;

  // Admin o'zini o'zi o'chirib qo'ymasligi uchun
  if (guard.user.id === id) {
    return NextResponse.json(
      { error: "O'zingizni o'chira olmaysiz." },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  await service.from("enrollments").delete().eq("user_id", id);
  await service.from("notifications").delete().eq("user_id", id);
  await service.from("profiles").delete().eq("id", id);

  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

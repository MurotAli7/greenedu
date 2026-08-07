import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/users — barcha foydalanuvchilar ro'yxati.
 * auth.users (email, created_at, tasdiqlanish holati) + profiles (full_name, role)
 * ma'lumotlari birlashtiriladi.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const service = createServiceClient();

  const { data: authData, error: authError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, full_name, role, created_at");
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  const users = (authData?.users || [])
    .map((u) => {
      const profile = profileById.get(u.id) || {};
      return {
        id: u.id,
        email: u.email,
        fullName: profile.full_name || u.user_metadata?.full_name || "",
        role: profile.role || "student",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        emailConfirmed: Boolean(u.email_confirmed_at),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return NextResponse.json({ users });
}

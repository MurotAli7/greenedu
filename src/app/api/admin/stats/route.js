import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";

/** GET /api/admin/stats — dashboard uchun umumiy statistika */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const service = createServiceClient();

  const [usersRes, activeRes, arvrRes, completedRes] = await Promise.all([
    service.from("profiles").select("*", { count: "exact", head: true }),
    service.from("courses").select("*", { count: "exact", head: true }).eq("status", "active"),
    service.from("courses").select("*", { count: "exact", head: true }).in("content_type", ["ar", "vr"]),
    service.from("lesson_progress").select("*", { count: "exact", head: true }),
  ]);

  // So'nggi foydalanuvchilar
  const { data: authData } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = (authData?.users || []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const recentAuth = authUsers.slice(0, 5);
  const recentIds = recentAuth.map((u) => u.id);
  const { data: recentProfiles } = recentIds.length
    ? await service.from("profiles").select("id, full_name").in("id", recentIds)
    : { data: [] };
  const nameById = new Map((recentProfiles || []).map((p) => [p.id, p.full_name]));

  const recentUsers = recentAuth.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: nameById.get(u.id) || u.user_metadata?.full_name || "",
    createdAt: u.created_at,
    emailConfirmed: Boolean(u.email_confirmed_at),
  }));

  // Eng faol kurslar
  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    service.from("courses").select("id, title, content_type"),
    service.from("enrollments").select("course_id"),
  ]);
  const countByCourse = new Map();
  (enrollments || []).forEach((e) =>
    countByCourse.set(e.course_id, (countByCourse.get(e.course_id) || 0) + 1)
  );
  const topCourses = (courses || [])
    .map((c) => ({
      id: c.id,
      title: c.title,
      contentType: c.content_type,
      students: countByCourse.get(c.id) || 0,
    }))
    .sort((a, b) => b.students - a.students)
    .slice(0, 5);

  return NextResponse.json({
    stats: {
      totalUsers: usersRes.count || 0,
      activeCourses: activeRes.count || 0,
      arvrContent: arvrRes.count || 0,
      completedLessons: completedRes.count || 0,
    },
    recentUsers,
    topCourses,
  });
}

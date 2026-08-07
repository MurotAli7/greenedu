import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { applyStreak } from "@/lib/gamify";
import { today as todayTashkent } from "@/lib/date";
import { logActivity } from "@/lib/api/activity";

/**
 * GET /api/user/dashboard — o'quv sahifasi uchun BARCHA ma'lumot bitta so'rovda.
 *
 * Avval brauzer 9 ta alohida so'rov yuborardi (profil, statistika, kurslar,
 * darslar, yozilishlar, progress, nishonlar, olingan nishonlar, checkin) —
 * bu sahifani sekinlashtirardi. Endi hammasi serverda parallel bajariladi.
 * Kunlik tashrif (streak) ham shu yerda qayd etiladi.
 */
export async function GET() {
  const guard = await requireUser();
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const userId = guard.user.id;
  const service = createServiceClient();

  const [
    { data: profile },
    { data: statsRow },
    { data: courses },
    { data: lessons },
    { data: enrollments },
    { data: progress },
    { data: badges },
    { data: ownedBadges },
  ] = await Promise.all([
    service.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
    service.from("user_stats").select("user_id, level, xp, total_points, completed_lessons, streak_days, last_activity_date").eq("user_id", userId).maybeSingle(),
    service
      .from("courses")
      .select("id, title, description, category, content_type, recommended_for_new_users, is_new")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    service.from("lessons").select("id, course_id"),
    service.from("enrollments").select("course_id").eq("user_id", userId),
    service.from("lesson_progress").select("lesson_id").eq("user_id", userId),
    service.from("badges").select("id, code, name, hint, sort_order").order("sort_order"),
    service.from("user_badges").select("badge_id").eq("user_id", userId),
  ]);

  // --- Kunlik tashrif: seriya shu yerda yangilanadi ---
  let stats = statsRow || {
    user_id: userId,
    level: 1,
    xp: 0,
    total_points: 0,
    completed_lessons: 0,
    streak_days: 0,
    last_activity_date: null,
  };

  const today = todayTashkent();
  const lastDay = stats.last_activity_date
    ? String(stats.last_activity_date).slice(0, 10)
    : null;

  if (lastDay !== today) {
    const streak = applyStreak(stats, today);
    stats = { ...stats, streak_days: streak, last_activity_date: today };
    await service.from("user_stats").upsert(stats);
    await logActivity({ user_id: userId, action: "checkin" });
  }

  // --- Kurslar bo'yicha dars va progress hisobi ---
  const lessonsByCourse = new Map();
  const courseOfLesson = new Map();
  (lessons || []).forEach((l) => {
    lessonsByCourse.set(l.course_id, (lessonsByCourse.get(l.course_id) || 0) + 1);
    courseOfLesson.set(l.id, l.course_id);
  });

  const doneByCourse = new Map();
  (progress || []).forEach((p) => {
    const cid = courseOfLesson.get(p.lesson_id);
    if (cid) doneByCourse.set(cid, (doneByCourse.get(cid) || 0) + 1);
  });

  const enrolledIds = new Set((enrollments || []).map((e) => e.course_id));

  const allCourses = (courses || []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    content_type: c.content_type,
    recommended_for_new_users: c.recommended_for_new_users,
    totalLessons: lessonsByCourse.get(c.id) || 0,
    doneLessons: doneByCourse.get(c.id) || 0,
    isEnrolled: enrolledIds.has(c.id),
  }));

  const enrolled = allCourses.filter((c) => c.isEnrolled);
  const notEnrolled = allCourses.filter((c) => !c.isEnrolled);
  const library = [
    ...notEnrolled.filter((c) => c.recommended_for_new_users),
    ...notEnrolled.filter((c) => !c.recommended_for_new_users),
  ];

  const ownedIds = new Set((ownedBadges || []).map((b) => b.badge_id));
  const badgeList = (badges || []).map((b) => ({ ...b, unlocked: ownedIds.has(b.id) }));

  return NextResponse.json({
    firstName: (profile?.full_name || "").trim().split(/\s+/)[0] || "",
    avatarUrl: profile?.avatar_url || "",
    stats: {
      level: stats.level ?? 1,
      xp: stats.xp ?? 0,
      total_points: stats.total_points ?? 0,
      completed_lessons: stats.completed_lessons ?? 0,
      streak_days: stats.streak_days ?? 0,
    },
    enrolled,
    library,
    badges: badgeList,
  });
}

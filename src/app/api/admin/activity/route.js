import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { localDay, today as todayTashkent, dayOffset } from "@/lib/date";

/**
 * GET /api/admin/activity?days=30 — pedagogik tajriba statistikasi.
 *
 * Barcha sanalar Toshkent vaqtida (UTC+5) guruhlanadi — aks holda
 * kechqurun bo'lgan faollik ertangi kunga tushib qolardi.
 */
export async function GET(request) {
  const guard = await requireAdmin();
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 7), 90);

  const endDay = todayTashkent();
  const startDay = dayOffset(endDay, -(days - 1));

  // Toshkent yarim tunidan boshlab olamiz (UTC+5 → 19:00 oldingi kun UTC)
  const sinceIso = new Date(`${startDay}T00:00:00+05:00`).toISOString();

  const service = createServiceClient();

  const { data: rows, error } = await service
    .from("activity_log")
    .select("id, user_id, action, course_id, lesson_id, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  // Jadval hali yaratilmagan bo'lsa sahifa qulamasin — bo'sh statistika
  // va aniq ogohlantirish qaytaramiz.
  const missingTable =
    error &&
    (error.message?.includes("schema cache") ||
      error.message?.includes("does not exist") ||
      error.code === "PGRST205");

  if (error && !missingTable) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = missingTable ? [] : rows || [];

  // --- Kunlik hisob (barcha kunlar 0 bilan to'ldiriladi) ---
  const daily = new Map();
  for (let i = 0; i < days; i++) {
    daily.set(dayOffset(startDay, i), 0);
  }

  const byAction = {
    checkin: 0,
    enroll: 0,
    lesson_complete: 0,
    arvr_view: 0,
    test_submit: 0,
  };
  const byCourse = new Map();
  const activeUserIds = new Set();
  const activeUserDays = new Map(); // user -> Set(kun)

  all.forEach((r) => {
    const day = localDay(r.created_at);
    if (daily.has(day)) daily.set(day, daily.get(day) + 1);
    if (byAction[r.action] !== undefined) byAction[r.action] += 1;
    if (r.course_id) byCourse.set(r.course_id, (byCourse.get(r.course_id) || 0) + 1);
    activeUserIds.add(r.user_id);
    if (!activeUserDays.has(r.user_id)) activeUserDays.set(r.user_id, new Set());
    activeUserDays.get(r.user_id).add(day);
  });

  // --- Kurs nomlari ---
  const courseIds = Array.from(byCourse.keys());
  const { data: courses } = courseIds.length
    ? await service.from("courses").select("id, title, content_type").in("id", courseIds)
    : { data: [] };
  const courseById = new Map((courses || []).map((c) => [c.id, c]));

  const perCourse = courseIds
    .map((id) => ({
      id,
      title: courseById.get(id)?.title || "O'chirilgan kurs",
      contentType: courseById.get(id)?.content_type || "course",
      events: byCourse.get(id),
    }))
    .sort((a, b) => b.events - a.events);

  // --- So'nggi harakatlar ---
  const recent = all.slice(0, 50);
  const userIds = Array.from(new Set(recent.map((r) => r.user_id)));
  const { data: profiles } = userIds.length
    ? await service.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameById = new Map((profiles || []).map((p) => [p.id, p.full_name]));

  const lessonIds = Array.from(new Set(recent.map((r) => r.lesson_id).filter(Boolean)));
  const { data: lessons } = lessonIds.length
    ? await service.from("lessons").select("id, title").in("id", lessonIds)
    : { data: [] };
  const lessonById = new Map((lessons || []).map((l) => [l.id, l.title]));

  const recentEvents = recent.map((r) => ({
    id: r.id,
    action: r.action,
    userName: nameById.get(r.user_id) || "Foydalanuvchi",
    courseTitle: r.course_id ? courseById.get(r.course_id)?.title || "-" : "-",
    lessonTitle: r.lesson_id ? lessonById.get(r.lesson_id) || "-" : "-",
    createdAt: r.created_at,
  }));

  // --- O'rtacha faol kunlar (izchillik ko'rsatkichi) ---
  const avgActiveDays = activeUserDays.size
    ? Math.round(
        (Array.from(activeUserDays.values()).reduce((sum, set) => sum + set.size, 0) /
          activeUserDays.size) *
          10
      ) / 10
    : 0;

  return NextResponse.json({
    // Jadval yo'q bo'lsa — sahifada ogohlantirish ko'rsatiladi
    setupRequired: Boolean(missingTable),
    days,
    range: { from: startDay, to: endDay },
    summary: {
      totalEvents: all.length,
      activeUsers: activeUserIds.size,
      avgActiveDays,
      byAction,
    },
    daily: Array.from(daily.entries()).map(([date, count]) => ({ date, count })),
    perCourse,
    recentEvents,
  });
}

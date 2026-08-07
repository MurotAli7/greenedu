import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, dbFail } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/results — o'quvchilar natijalari.
 *
 * MUHIM: BARCHA o'quvchilar qaytariladi, hatto test topshirmaganlari ham.
 * (Avval faqat test topshirganlar qaytarilardi va admin panelda jadval
 * umuman ko'rinmasdi — "statistika ishlamayapti" muammosi shundan edi.)
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  const service = createServiceClient();

  const [profilesRes, statsRes, resultsRes, progressRes, lessonsRes] = await Promise.all([
    service.from("profiles").select("id, full_name, role, created_at"),
    service.from("user_stats").select("user_id, level, xp, total_points, completed_lessons, streak_days, last_activity_date"),
    service.from("test_results").select("user_id, lesson_id, percent, created_at"),
    service.from("lesson_progress").select("user_id, lesson_id"),
    service.from("lessons").select("id, title"),
  ]);

  if (profilesRes.error) return dbFail(profilesRes.error, "Foydalanuvchilarni o'qib bo'lmadi.");

  const profiles = profilesRes.data || [];
  const stats = statsRes.data || [];
  const results = resultsRes.data || [];
  const progress = progressRes.data || [];
  const lessons = lessonsRes.data || [];

  const statsByUser = new Map(stats.map((s) => [s.user_id, s]));
  const lessonTitleById = new Map(lessons.map((l) => [l.id, l.title]));

  const resultsByUser = new Map();
  results.forEach((r) => {
    if (!resultsByUser.has(r.user_id)) resultsByUser.set(r.user_id, []);
    resultsByUser.get(r.user_id).push(r);
  });

  const progressByUser = new Map();
  progress.forEach((p) => {
    progressByUser.set(p.user_id, (progressByUser.get(p.user_id) || 0) + 1);
  });

  const average = (numbers) =>
    numbers.length
      ? Math.round((numbers.reduce((sum, n) => sum + Number(n), 0) / numbers.length) * 10) / 10
      : null;

  // --- Har bir o'quvchi (adminlardan tashqari) ---
  const perStudent = profiles
    .filter((p) => p.role !== "admin")
    .map((p) => {
      const s = statsByUser.get(p.id) || {};
      const userResults = resultsByUser.get(p.id) || [];
      const percents = userResults.map((r) => Number(r.percent));

      return {
        id: p.id,
        name: p.full_name?.trim() || "Ismsiz o'quvchi",
        level: s.level ?? 1,
        xp: s.xp ?? 0,
        totalPoints: s.total_points ?? 0,
        completedLessons: progressByUser.get(p.id) ?? s.completed_lessons ?? 0,
        streak: s.streak_days ?? 0,
        lastActive: s.last_activity_date || null,
        tests: userResults.length,
        avgPercent: average(percents),
        bestPercent: percents.length ? Math.max(...percents) : null,
      };
    })
    .sort(
      (a, b) =>
        b.completedLessons - a.completedLessons ||
        b.totalPoints - a.totalPoints ||
        (b.avgPercent ?? -1) - (a.avgPercent ?? -1)
    );

  // --- Darslar kesimi (eng qiyin dars birinchi) ---
  const resultsByLesson = new Map();
  results.forEach((r) => {
    if (!resultsByLesson.has(r.lesson_id)) resultsByLesson.set(r.lesson_id, []);
    resultsByLesson.get(r.lesson_id).push(Number(r.percent));
  });

  const perLesson = Array.from(resultsByLesson.entries())
    .map(([lessonId, percents]) => ({
      id: lessonId,
      title: lessonTitleById.get(lessonId) || "O'chirilgan dars",
      attempts: percents.length,
      avgPercent: average(percents),
    }))
    .sort((a, b) => a.avgPercent - b.avgPercent);

  const allPercents = results.map((r) => Number(r.percent));

  return ok({
    totalStudents: perStudent.length,
    totalResults: results.length,
    overallAvgPercent: average(allPercents),
    perStudent,
    perLesson,
  });
}

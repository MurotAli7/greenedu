import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { applyXp, applyStreak, newlyEarnedBadges } from "@/lib/gamify";
import { today as todayTashkent } from "@/lib/date";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, uuid, ValidationError } from "@/lib/api/validate";
import { rateLimit } from "@/lib/api/rateLimit";
import { logActivity } from "@/lib/api/activity";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/complete-lesson — darsni tugatish va XP berish.
 *
 * Ikki marta hisoblanmasligi lesson_progress jadvalidagi
 * unique (user_id, lesson_id) cheklovi bilan kafolatlanadi:
 * ikkinchi so'rov 23505 xatosi bilan to'xtaydi va XP berilmaydi.
 */
export async function POST(request) {
  const guard = await requireUser();
  if (guard.error) return guardFail(guard);

  const userId = guard.user.id;

  const limit = rateLimit(`complete:${userId}`, { limit: 40, windowMs: 60_000 });
  if (!limit.allowed) {
    return fail("Juda tez-tez so'rov yubordingiz. Biroz kuting.", 429);
  }

  try {
    const body = await readJson(request);
    const lessonId = uuid(body.lessonId, { field: "Dars ID" });

    const service = createServiceClient();

    const { data: lesson } = await service
      .from("lessons")
      .select("id, course_id, lesson_type, xp_reward, title")
      .eq("id", lessonId)
      .single();
    if (!lesson) return fail("Dars topilmadi.", 404);

    // O'quvchi kursga yozilganmi? (yozilmagan kursda XP olib bo'lmasin)
    const { data: enrollment } = await service
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", lesson.course_id)
      .maybeSingle();
    if (!enrollment) {
      return fail("Avval kursga yozilishingiz kerak.", 403);
    }

    // Atomik himoya: takroriy yozuv bo'lsa XP berilmaydi
    const { error: progressError } = await service
      .from("lesson_progress")
      .insert({ user_id: userId, lesson_id: lessonId });

    if (progressError) {
      if (progressError.code === "23505") return ok({ ok: true, already: true });
      return dbFail(progressError, "Darsni belgilay olmadik.");
    }

    const { data: existingStats } = await service
      .from("user_stats").select("user_id, level, xp, total_points, completed_lessons, streak_days, last_activity_date").eq("user_id", userId).maybeSingle();

    const stats = existingStats || {
      user_id: userId,
      level: 1,
      xp: 0,
      total_points: 0,
      completed_lessons: 0,
      streak_days: 0,
      last_activity_date: null,
    };

    const today = todayTashkent();
    const streak = applyStreak(stats, today);
    const { level, xp, leveledUp } = applyXp(stats, lesson.xp_reward);

    const updated = {
      user_id: userId,
      level,
      xp,
      total_points: Number(stats.total_points || 0) + Number(lesson.xp_reward || 0),
      completed_lessons: Number(stats.completed_lessons || 0) + 1,
      streak_days: streak,
      last_activity_date: today,
    };

    const { error: statsError } = await service.from("user_stats").upsert(updated);
    if (statsError) return dbFail(statsError, "Statistikani yangilab bo'lmadi.");

    // --- Nishonlar ---
    const { data: ownedRows } = await service
      .from("user_badges").select("badge_id, badges(code)").eq("user_id", userId);
    const owned = new Set((ownedRows || []).map((row) => row.badges?.code).filter(Boolean));

    const earnedCodes = newlyEarnedBadges(updated, lesson.lesson_type, owned);
    let newBadges = [];

    if (earnedCodes.length > 0) {
      const { data: badgeRows } = await service
        .from("badges").select("id, code, name, hint").in("code", earnedCodes);
      newBadges = badgeRows || [];

      if (newBadges.length > 0) {
        // Ikki so'rov bir vaqtda kelsa takroriy yozuv bo'lmasin
        await service
          .from("user_badges")
          .upsert(
            newBadges.map((badge) => ({ user_id: userId, badge_id: badge.id })),
            { onConflict: "user_id,badge_id", ignoreDuplicates: true }
          );

        await service.from("notifications").insert(
          newBadges.map((badge) => ({
            user_id: userId,
            title: `Yangi nishon: ${badge.name}`,
            body: badge.hint || "Tabriklaymiz! Yangi nishonni qo'lga kiritdingiz.",
            type: "badge",
          }))
        );
      }
    }

    // --- Faollik jurnali ---
    const logs = [
      {
        user_id: userId,
        action: "lesson_complete",
        course_id: lesson.course_id,
        lesson_id: lesson.id,
      },
    ];
    if (lesson.lesson_type === "ar" || lesson.lesson_type === "vr") {
      logs.push({
        user_id: userId,
        action: "arvr_view",
        course_id: lesson.course_id,
        lesson_id: lesson.id,
      });
    }
    // Jurnalga yozish yordamchi amal — xato bo'lsa ham XP berilgan holicha qoladi
    await logActivity(logs);

    return ok({
      ok: true,
      xpEarned: lesson.xp_reward,
      leveledUp,
      newLevel: level,
      newBadges: newBadges.map((badge) => ({ name: badge.name, hint: badge.hint })),
    });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Darsni tugatib bo'lmadi.", 500);
  }
}

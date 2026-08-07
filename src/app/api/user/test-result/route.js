import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, int, uuid, ValidationError } from "@/lib/api/validate";
import { rateLimit } from "@/lib/api/rateLimit";
import { logActivity } from "@/lib/api/activity";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/test-result — test natijasini saqlash.
 *
 * Natija iframe ichidagi HTML testdan postMessage orqali keladi, shuning uchun
 * server tomonda qattiq tekshiriladi: dars mavjudmi, o'quvchi kursga
 * yozilganmi, ball umumiy savollar sonidan oshmayaptimi.
 */
export async function POST(request) {
  const guard = await requireUser();
  if (guard.error) return guardFail(guard);

  const userId = guard.user.id;

  // Spam natijalarni cheklaymiz
  const limit = rateLimit(`test-result:${userId}`, { limit: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return fail("Juda ko'p natija yuborildi. Biroz kuting.", 429);
  }

  try {
    const body = await readJson(request);
    const lessonId = uuid(body.lessonId, { field: "Dars ID" });
    const total = int(body.total, { field: "Savollar soni", min: 1, max: 500 });
    const score = int(body.score, { field: "To'g'ri javoblar", min: 0, max: 500 });

    if (score > total) {
      return fail("Natija noto'g'ri: to'g'ri javoblar savollar sonidan ko'p.", 400);
    }

    const service = createServiceClient();

    const { data: lesson } = await service
      .from("lessons").select("id, course_id").eq("id", lessonId).single();
    if (!lesson) return fail("Dars topilmadi.", 404);

    const { data: enrollment } = await service
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", lesson.course_id)
      .maybeSingle();
    if (!enrollment) return fail("Avval kursga yozilishingiz kerak.", 403);

    const percent = Math.round((score / total) * 10000) / 100;

    const { error } = await service.from("test_results").insert({
      user_id: userId,
      lesson_id: lessonId,
      score,
      total,
      percent,
    });
    if (error) return dbFail(error, "Natijani saqlab bo'lmadi.");

    await logActivity({
      user_id: userId,
      action: "test_submit",
      course_id: lesson.course_id,
      lesson_id: lessonId,
    });

    return ok({ ok: true, percent });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Natijani saqlab bo'lmadi.", 500);
  }
}

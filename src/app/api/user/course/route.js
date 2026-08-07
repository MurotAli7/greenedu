import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail } from "@/lib/api/respond";
import { uuid, ValidationError } from "@/lib/api/validate";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/course?id=... — kurs sahifasi uchun BARCHA ma'lumot bitta so'rovda.
 *
 * Avval brauzer 4 ta alohida Supabase so'rovi yuborardi (kurs, darslar,
 * yozilish, progress) va oldin getUser ham chaqirilardi. Endi hammasi
 * serverda parallel bajariladi — sahifa sezilarli tez ochiladi.
 */
export async function GET(request) {
  const guard = await requireUser();
  if (guard.error) return guardFail(guard);

  try {
    const id = uuid(new URL(request.url).searchParams.get("id"), { field: "Kurs ID" });
    const service = createServiceClient();

    const [courseRes, lessonsRes, enrollRes, progressRes] = await Promise.all([
      service
        .from("courses")
        .select("id, title, description, category, content_type, status")
        .eq("id", id)
        .maybeSingle(),
      service
        .from("lessons")
        .select(
          "id, course_id, title, summary, content, lesson_type, embed_url, model_url, test_url, xp_reward, sort_order"
        )
        .eq("course_id", id)
        .order("sort_order"),
      service
        .from("enrollments")
        .select("id")
        .eq("user_id", guard.user.id)
        .eq("course_id", id)
        .maybeSingle(),
      service
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", guard.user.id),
    ]);

    if (!courseRes.data) return fail("Kurs topilmadi.", 404);

    return ok({
      course: courseRes.data,
      lessons: lessonsRes.data || [],
      enrolled: Boolean(enrollRes.data),
      doneLessonIds: (progressRes.data || []).map((row) => row.lesson_id),
    });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Kursni yuklab bo'lmadi.", 500);
  }
}

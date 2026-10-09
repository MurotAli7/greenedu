import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail } from "@/lib/api/respond";
import { uuid, ValidationError } from "@/lib/api/validate";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/course?id=<courseId>
 * Kurs va unga tegishli darslarni bitta so'rovda qaytaradi.
 * Foydalanuvchi kursga yozilgan bo'lsa, dars materiallari ham qo'shiladi.
 */
export async function GET(request) {
  const guard = await requireUser();

  if (guard.error) {
    return guardFail(guard);
  }

  try {
    const id = uuid(
      new URL(request.url).searchParams.get("id"),
      { field: "Kurs ID" }
    );

    const service = createServiceClient();

    // Kurs va foydalanuvchining yozilish holatini bir vaqtda olamiz.
    const [courseRes, enrollRes] = await Promise.all([
      service
        .from("courses")
        .select("id, title, description, category, content_type, status")
        .eq("id", id)
        .maybeSingle(),

      service
        .from("enrollments")
        .select("id")
        .eq("user_id", guard.user.id)
        .eq("course_id", id)
        .maybeSingle(),
    ]);

    if (courseRes.error) {
      console.error("Course query error:", courseRes.error);
      return fail("Kursni yuklab bo'lmadi.", 500);
    }

    if (enrollRes.error) {
      console.error("Enrollment query error:", enrollRes.error);
      return fail("Kursga yozilish holatini aniqlab bo'lmadi.", 500);
    }

    if (!courseRes.data) {
      return fail("Kurs topilmadi.", 404);
    }

    const enrolled = Boolean(enrollRes.data);

    // Ro'yxatdan o'tmagan foydalanuvchiga faqat darslar ro'yxati ko'rsatiladi.
    // Yozilgan foydalanuvchiga esa barcha material maydonlari ham beriladi.
    const lessonColumns = enrolled
      ? [
          "id",
          "course_id",
          "title",
          "summary",
          "content",
          "lesson_type",
          "embed_url",
          "model_url",
          "test_url",
          "xp_reward",
          "sort_order",
        ].join(", ")
      : [
          "id",
          "course_id",
          "title",
          "summary",
          "lesson_type",
          "xp_reward",
          "sort_order",
        ].join(", ");

    const lessonsRes = await service
      .from("lessons")
      .select(lessonColumns)
      .eq("course_id", id)
      .order("sort_order", { ascending: true });

    if (lessonsRes.error) {
      console.error("Lessons query error:", lessonsRes.error);
      return fail("Darslarni yuklab bo'lmadi.", 500);
    }

    const lessons = lessonsRes.data || [];
    let doneLessonIds = [];

    // Progress faqat shu kursga yozilgan foydalanuvchiga kerak.
    if (enrolled && lessons.length > 0) {
      const progressRes = await service
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", guard.user.id)
        .in("lesson_id", lessons.map((lesson) => lesson.id));

      if (progressRes.error) {
        console.error("Lesson progress query error:", progressRes.error);
        return fail("Darslar jarayonini yuklab bo'lmadi.", 500);
      }

      doneLessonIds = (progressRes.data || []).map(
        (item) => item.lesson_id
      );
    }

    return ok({
      course: courseRes.data,
      lessons,
      enrolled,
      doneLessonIds,
      // Frontend materiallar shu javobda borligini bilishi uchun.
      materialsIncluded: enrolled,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return fail(err.message, 400);
    }

    console.error("GET /api/user/course error:", err);
    return fail("Kursni yuklab bo'lmadi.", 500);
  }
}

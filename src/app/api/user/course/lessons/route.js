
import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ok,
  guardFail,
  fail,
} from "@/lib/api/respond";
import {
  uuid,
  ValidationError,
} from "@/lib/api/validate";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireUser();

  if (guard.error) {
    return guardFail(guard);
  }

  try {
    const { searchParams } = new URL(request.url);

    const courseId = uuid(searchParams.get("id"), {
      field: "Kurs ID",
    });

    const service = createServiceClient();

    // Kurs, yozilish holati va darslar ro'yxatini parallel olamiz.
    const [courseRes, enrollmentRes, lessonsRes] =
      await Promise.all([
        service
          .from("courses")
          .select("id")
          .eq("id", courseId)
          .maybeSingle(),

        service
          .from("enrollments")
          .select("id")
          .eq("user_id", guard.user.id)
          .eq("course_id", courseId)
          .maybeSingle(),

        service
          .from("lessons")
          .select(
            [
              "id",
              "course_id",
              "title",
              "summary",
              "lesson_type",
              "xp_reward",
              "sort_order",
            ].join(", ")
          )
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true }),
      ]);

    if (courseRes.error) {
      console.error("Course lookup error:", courseRes.error);
      return fail("Kursni tekshirib bo'lmadi.", 500);
    }

    if (!courseRes.data) {
      return fail("Kurs topilmadi.", 404);
    }

    if (enrollmentRes.error) {
      console.error(
        "Enrollment lookup error:",
        enrollmentRes.error
      );

      return fail(
        "Kursga yozilish holatini aniqlab bo'lmadi.",
        500
      );
    }

    if (lessonsRes.error) {
      console.error(
        "Lessons query error:",
        lessonsRes.error
      );

      return fail("Darslarni yuklab bo'lmadi.", 500);
    }

    const lessons = lessonsRes.data || [];
    const enrolled = Boolean(enrollmentRes.data);

    // Faqat yozilgan foydalanuvchi uchun progress olamiz.
    let doneLessonIds = [];

    if (enrolled && lessons.length > 0) {
      const lessonIds = lessons.map((lesson) => lesson.id);

      const progressRes = await service
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", guard.user.id)
        .in("lesson_id", lessonIds);

      if (progressRes.error) {
        console.error(
          "Lesson progress query error:",
          progressRes.error
        );

        return fail(
          "Darslar jarayonini yuklab bo'lmadi.",
          500
        );
      }

      doneLessonIds = (progressRes.data || []).map(
        (item) => item.lesson_id
      );
    }

    // Og'ir kontent bu API'dan yuborilmaydi.
    // U faqat dars bosilganda boshqa API orqali olinadi.
    return ok({
      lessons,
      doneLessonIds,
      enrolled,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return fail(err.message, 400);
    }

    console.error(
      "GET /api/user/course/lessons error:",
      err
    );

    return fail("Darslarni yuklab bo'lmadi.", 500);
  }
}

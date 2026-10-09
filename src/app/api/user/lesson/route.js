
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

    const courseId = uuid(
      searchParams.get("courseId"),
      { field: "Kurs ID" }
    );

    const lessonId = uuid(
      searchParams.get("lessonId"),
      { field: "Dars ID" }
    );

    const service = createServiceClient();

    // Foydalanuvchi shu kursga yozilganmi?
    const enrollmentRes = await service
      .from("enrollments")
      .select("id")
      .eq("user_id", guard.user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (enrollmentRes.error) {
      console.error(
        "Lesson enrollment error:",
        enrollmentRes.error
      );

      return fail(
        "Kursga yozilganlik holatini tekshirib bo'lmadi.",
        500
      );
    }

    if (!enrollmentRes.data) {
      return fail(
        "Darsni ochish uchun avval kursga yoziling.",
        403
      );
    }

    // Faqat so'ralgan kursdagi darsni olish.
    const lessonRes = await service
      .from("lessons")
      .select(
        [
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
      )
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (lessonRes.error) {
      console.error(
        "Lesson detail query error:",
        lessonRes.error
      );

      return fail(
        "Dars ma'lumotlarini yuklab bo'lmadi.",
        500
      );
    }

    if (!lessonRes.data) {
      return fail("Dars topilmadi.", 404);
    }

    return ok({
      lesson: lessonRes.data,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return fail(err.message, 400);
    }

    console.error(
      "GET /api/user/course/lesson error:",
      err
    );

    return fail("Darsni yuklab bo'lmadi.", 500);
  }
}

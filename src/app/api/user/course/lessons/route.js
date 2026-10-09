import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail } from "@/lib/api/respond";
import { uuid, ValidationError } from "@/lib/api/validate";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireUser();

  if (guard.error) {
    return guardFail(guard);
  }

  try {
    const courseId = uuid(
      new URL(request.url).searchParams.get("id"),
      {
        field: "Kurs ID",
      }
    );

    const service = createServiceClient();

    const [lessonsRes, progressRes] =
      await Promise.all([
        service
          .from("lessons")
          .select(`
            id,
            course_id,
            title,
            summary,
            lesson_type,
            xp_reward,
            sort_order
          `)
          .eq("course_id", courseId)
          .order("sort_order", {
            ascending: true,
          }),

        service
          .from("lesson_progress")
          .select("lesson_id")
          .eq(
            "user_id",
            guard.user.id
          ),
      ]);

    if (lessonsRes.error) {
      console.error(
        "Lessons query error:",
        lessonsRes.error
      );

      return fail(
        "Darslarni yuklab bo'lmadi.",
        500
      );
    }

    if (progressRes.error) {
      console.error(
        "Progress query error:",
        progressRes.error
      );

      return fail(
        "Darslar jarayonini yuklab bo'lmadi.",
        500
      );
    }

    const lessons =
      lessonsRes.data || [];

    const doneLessonIds =
      (progressRes.data || []).map(
        (row) => row.lesson_id
      );

    return ok({
      lessons,
      doneLessonIds,
    });

  } catch (err) {
    if (err instanceof ValidationError) {
      return fail(
        err.message,
        400
      );
    }

    console.error(
      "GET /api/user/course/lessons error:",
      err
    );

    return fail(
      "Darslarni yuklab bo'lmadi.",
      500
    );
  }
}
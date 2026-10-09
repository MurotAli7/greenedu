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
    const id = uuid(
      new URL(request.url).searchParams.get("id"),
      { field: "Kurs ID" }
    );

    const service = createServiceClient();

    const [courseRes, enrollRes] = await Promise.all([
      service
        .from("courses")
        .select(
          "id, title, description, category, content_type, status"
        )
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

      return fail(
        "Kursni yuklab bo'lmadi.",
        500
      );
    }

    if (enrollRes.error) {
      console.error(
        "Enrollment query error:",
        enrollRes.error
      );

      return fail(
        "Kursga yozilish holatini aniqlab bo'lmadi.",
        500
      );
    }

    if (!courseRes.data) {
      return fail(
        "Kurs topilmadi.",
        404
      );
    }

    return ok({
      course: courseRes.data,
      enrolled: Boolean(enrollRes.data),
    });

  } catch (err) {
    if (err instanceof ValidationError) {
      return fail(
        err.message,
        400
      );
    }

    console.error(
      "GET /api/user/course error:",
      err
    );

    return fail(
      "Kursni yuklab bo'lmadi.",
      500
    );
  }
}
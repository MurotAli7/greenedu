import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, uuid, ValidationError } from "@/lib/api/validate";
import { rateLimit } from "@/lib/api/rateLimit";
import { logActivity } from "@/lib/api/activity";

export const dynamic = "force-dynamic";

/** POST /api/user/enroll — kursga yozilish */
export async function POST(request) {
  const guard = await requireUser();
  if (guard.error) return guardFail(guard);

  const limit = rateLimit(`enroll:${guard.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return fail("Juda tez-tez so'rov yubordingiz. Biroz kuting.", 429);
  }

  try {
    const body = await readJson(request);
    const courseId = uuid(body.courseId, { field: "Kurs ID" });

    const service = createServiceClient();

    const { data: course } = await service
      .from("courses").select("id, status").eq("id", courseId).single();
    if (!course) return fail("Kurs topilmadi.", 404);
    if (course.status !== "active") return fail("Bu kurs hozircha faol emas.", 400);

    const { error } = await service
      .from("enrollments")
      .insert({ course_id: courseId, user_id: guard.user.id });

    if (error) {
      // 23505 — takroriy yozuv: allaqachon yozilgan, bu xato emas
      if (error.code === "23505") return ok({ ok: true, already: true });
      return dbFail(error, "Kursga yozilib bo'lmadi.");
    }

    await logActivity({
      user_id: guard.user.id,
      action: "enroll",
      course_id: courseId,
    });

    return ok({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Kursga yozilib bo'lmadi.", 500);
  }
}

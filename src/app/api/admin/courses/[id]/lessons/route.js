import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, str, int, oneOf, httpsUrl, uuid, ValidationError } from "@/lib/api/validate";
import { LESSON_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** GET /api/admin/courses/:id/lessons */
export async function GET(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const { id } = await params;
    uuid(id, { field: "Kurs ID" });

    const service = createServiceClient();
    const [courseRes, lessonsRes] = await Promise.all([
      service.from("courses").select("id, title, description, category, content_type, status").eq("id", id).eq("content_type", "course").single(),
      service.from("lessons").select("id, course_id, title, summary, content, lesson_type, embed_url, model_url, test_url, xp_reward, sort_order").eq("course_id", id).order("sort_order"),
    ]);

    if (courseRes.error) return fail("Kurs topilmadi.", 404);
    if (lessonsRes.error) return dbFail(lessonsRes.error, "Darslarni o'qib bo'lmadi.");

    return ok({ course: courseRes.data, lessons: lessonsRes.data || [] });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Darslarni yuklab bo'lmadi.", 500);
  }
}

/** POST /api/admin/courses/:id/lessons — yangi dars */
export async function POST(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const { id } = await params;
    uuid(id, { field: "Kurs ID" });

    const body = await readJson(request);
    const service = createServiceClient();

    // Kurs mavjudligini tekshiramiz (begona ID bilan dars yaratilmasin)
    const { data: course } = await service.from("courses").select("id").eq("id", id).eq("content_type", "course").single();
    if (!course) return fail("Kurs topilmadi.", 404);

    // Tartib raqami berilmasa oxiriga qo'shiladi
    let sortOrder = int(body.sortOrder, { field: "Tartib raqami", min: 1, max: 9999 });
    if (sortOrder === null) {
      const { data: last } = await service
        .from("lessons")
        .select("sort_order")
        .eq("course_id", id)
        .order("sort_order", { ascending: false })
        .limit(1);
      sortOrder = (last?.[0]?.sort_order || 0) + 1;
    }

    const payload = {
      course_id: id,
      title: str(body.title, { field: "Dars nomi", required: true, min: 2, max: 200 }),
      summary: str(body.summary, { field: "Qisqacha mazmun", max: 1000 }),
      content: str(body.content, { field: "Ma'ruza matni", max: 50000 }),
      lesson_type: oneOf(body.lessonType, LESSON_TYPES, { field: "Dars turi", fallback: "text" }),
      embed_url: httpsUrl(body.embedUrl, { field: "Embed havola" }),
      model_url: httpsUrl(body.modelUrl, { field: "3D model havolasi" }),
      test_url: httpsUrl(body.testUrl, { field: "Test havolasi" }),
      xp_reward: int(body.xpReward, { field: "XP", min: 1, max: 500, fallback: 10 }),
      sort_order: sortOrder,
    };

    const { data, error } = await service.from("lessons").insert(payload).select().single();
    if (error) return dbFail(error, "Darsni saqlab bo'lmadi.");

    return ok({ lesson: data });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Darsni yaratib bo'lmadi.", 500);
  }
}

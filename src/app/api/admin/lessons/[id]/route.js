import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, str, int, oneOf, httpsUrl, uuid, ValidationError } from "@/lib/api/validate";
import { LESSON_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/lessons/:id */
export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const { id } = await params;
    uuid(id, { field: "Dars ID" });

    const body = await readJson(request);
    const updates = {};

    if (body.title !== undefined)
      updates.title = str(body.title, { field: "Dars nomi", required: true, min: 2, max: 200 });
    if (body.summary !== undefined)
      updates.summary = str(body.summary, { field: "Qisqacha mazmun", max: 1000 });
    if (body.content !== undefined)
      updates.content = str(body.content, { field: "Ma'ruza matni", max: 50000 });
    if (body.lessonType !== undefined)
      updates.lesson_type = oneOf(body.lessonType, LESSON_TYPES, { field: "Dars turi" });
    if (body.embedUrl !== undefined)
      updates.embed_url = httpsUrl(body.embedUrl, { field: "Embed havola" });
    if (body.modelUrl !== undefined)
      updates.model_url = httpsUrl(body.modelUrl, { field: "3D model havolasi" });
    if (body.testUrl !== undefined)
      updates.test_url = httpsUrl(body.testUrl, { field: "Test havolasi" });
    if (body.xpReward !== undefined)
      updates.xp_reward = int(body.xpReward, { field: "XP", min: 1, max: 500, fallback: 10 });
    if (body.sortOrder !== undefined)
      updates.sort_order = int(body.sortOrder, { field: "Tartib raqami", min: 1, max: 9999, fallback: 1 });

    if (Object.keys(updates).length === 0) {
      return fail("O'zgartirish uchun maydon berilmadi.", 400);
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("lessons").update(updates).eq("id", id).select().single();
    if (error) return dbFail(error, "Darsni yangilab bo'lmadi.");

    return ok({ lesson: data });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Darsni yangilab bo'lmadi.", 500);
  }
}

/** DELETE /api/admin/lessons/:id */
export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const { id } = await params;
    uuid(id, { field: "Dars ID" });

    const service = createServiceClient();
    const { error } = await service.from("lessons").delete().eq("id", id);
    if (error) return dbFail(error, "Darsni o'chirib bo'lmadi.");

    return ok({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Darsni o'chirib bo'lmadi.", 500);
  }
}

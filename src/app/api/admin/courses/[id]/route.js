import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, str, oneOf, bool, httpsUrl, uuid, ValidationError } from "@/lib/api/validate";
import { CONTENT_TYPES, COURSE_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/courses/:id */
export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const { id } = await params;
    uuid(id, { field: "Kurs ID" });

    const body = await readJson(request);
    const updates = {};

    if (body.title !== undefined)
      updates.title = str(body.title, { field: "Kurs nomi", required: true, min: 2, max: 200 });
    if (body.description !== undefined)
      updates.description = str(body.description, { field: "Tavsif", max: 2000 });
    if (body.category !== undefined)
      updates.category = str(body.category, { field: "Kategoriya", max: 100 });
    if (body.contentType !== undefined)
      updates.content_type = oneOf(body.contentType, CONTENT_TYPES, { field: "Kontent turi" });
    if (body.status !== undefined)
      updates.status = oneOf(body.status, COURSE_STATUSES, { field: "Holat" });
    if (body.embedUrl !== undefined)
      updates.embed_url = httpsUrl(body.embedUrl, { field: "Embed havola" });
    if (body.recommended !== undefined)
      updates.recommended_for_new_users = bool(body.recommended);

    if (Object.keys(updates).length === 0) {
      return fail("O'zgartirish uchun maydon berilmadi.", 400);
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("courses").update(updates).eq("id", id).select().single();
    if (error) return dbFail(error, "Kursni yangilab bo'lmadi.");

    return ok({ course: data });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Kursni yangilab bo'lmadi.", 500);
  }
}

/** DELETE /api/admin/courses/:id */
export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const { id } = await params;
    uuid(id, { field: "Kurs ID" });

    const service = createServiceClient();
    const { error } = await service.from("courses").delete().eq("id", id);
    if (error) return dbFail(error, "Kursni o'chirib bo'lmadi.");

    return ok({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Kursni o'chirib bo'lmadi.", 500);
  }
}

import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, str, oneOf, bool, httpsUrl, ValidationError } from "@/lib/api/validate";
import { COURSE_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** GET /api/admin/courses?type=course — faqat kurslar ro'yxati. */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  const service = createServiceClient();
  const { data, error } = await service
    .from("courses")
    .select("id, title, description, category, content_type, status, embed_url, is_new, recommended_for_new_users, created_at")
    .eq("content_type", "course")
    .order("created_at", { ascending: false });

  if (error) return dbFail(error, "Kurslarni o'qib bo'lmadi.");

  return ok({ courses: data || [] });
}

/** POST /api/admin/courses — yangi oddiy kurs yaratish. */
export async function POST(request) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const body = await readJson(request);
    const payload = {
      title: str(body.title, { field: "Kurs nomi", required: true, min: 2, max: 200 }),
      description: str(body.description, { field: "Tavsif", max: 2000 }),
      category: str(body.category, { field: "Kategoriya", max: 100 }),
      content_type: "course",
      status: oneOf(body.status, COURSE_STATUSES, { field: "Holat", fallback: "active" }),
      embed_url: httpsUrl(body.embedUrl, { field: "Embed havola" }),
      is_new: true,
      recommended_for_new_users: bool(body.recommended, false),
    };

    const service = createServiceClient();
    const { data, error } = await service
      .from("courses")
      .insert(payload)
      .select("id, title, description, category, content_type, status, embed_url, is_new, recommended_for_new_users, created_at")
      .single();

    if (error) return dbFail(error, "Kursni saqlab bo'lmadi.");
    return ok({ course: data });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    console.error("POST /api/admin/courses error:", err);
    return fail("Kursni yaratib bo'lmadi.", 500);
  }
}

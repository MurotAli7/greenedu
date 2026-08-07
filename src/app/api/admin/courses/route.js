import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail, dbFail } from "@/lib/api/respond";
import { readJson, str, oneOf, bool, httpsUrl, ValidationError } from "@/lib/api/validate";
import { CONTENT_TYPES, COURSE_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Kurslar ro'yxatiga o'quvchilar va darslar sonini qo'shadi */
async function withCounts(service, courses) {
  const [{ data: enrollments }, { data: lessons }] = await Promise.all([
    service.from("enrollments").select("course_id"),
    service.from("lessons").select("course_id"),
  ]);

  const countBy = (rows) => {
    const map = new Map();
    (rows || []).forEach((row) => {
      map.set(row.course_id, (map.get(row.course_id) || 0) + 1);
    });
    return map;
  };

  const students = countBy(enrollments);
  const lessonCounts = countBy(lessons);

  return courses.map((course) => ({
    ...course,
    students: students.get(course.id) || 0,
    lessons_count: lessonCounts.get(course.id) || 0,
  }));
}

/** GET /api/admin/courses?type=course|ar-vr */
export async function GET(request) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  const type = new URL(request.url).searchParams.get("type");
  const service = createServiceClient();

  let query = service
    .from("courses")
    .select("id, title, description, category, content_type, status, embed_url, is_new, recommended_for_new_users, created_at")
    .order("created_at", { ascending: false });
  if (type === "course") query = query.eq("content_type", "course");
  else if (type === "ar-vr") query = query.in("content_type", ["ar", "vr"]);

  const { data, error } = await query;
  if (error) return dbFail(error, "Kurslarni o'qib bo'lmadi.");

  return ok({ courses: await withCounts(service, data || []) });
}

/** POST /api/admin/courses — yangi kurs yaratish */
export async function POST(request) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const body = await readJson(request);

    const payload = {
      title: str(body.title, { field: "Kurs nomi", required: true, min: 2, max: 200 }),
      description: str(body.description, { field: "Tavsif", max: 2000 }),
      category: str(body.category, { field: "Kategoriya", max: 100 }),
      content_type: oneOf(body.contentType, CONTENT_TYPES, {
        field: "Kontent turi",
        fallback: "course",
      }),
      status: oneOf(body.status, COURSE_STATUSES, { field: "Holat", fallback: "active" }),
      embed_url: httpsUrl(body.embedUrl, { field: "Embed havola" }),
      is_new: true,
      recommended_for_new_users: bool(body.recommended, false),
    };

    const service = createServiceClient();
    const { data, error } = await service.from("courses").insert(payload).select().single();
    if (error) return dbFail(error, "Kursni saqlab bo'lmadi.");

    return ok({ course: data });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Kursni yaratib bo'lmadi.", 500);
  }
}

import { requireAdmin } from "@/lib/supabase/adminGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { ok, guardFail, fail } from "@/lib/api/respond";
import { readJson, str, int, oneOf, ValidationError } from "@/lib/api/validate";
import { UPLOAD_RULES, STORAGE_BUCKETS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const BUCKET = STORAGE_BUCKETS.content;

/**
 * POST /api/admin/upload — imzolangan yuklash havolasini beradi.
 *
 * Fayl serverdan O'TMAYDI: brauzer to'g'ridan-to'g'ri Supabase Storage'ga
 * yuklaydi. Shu sababli Vercel'ning 4.5 MB so'rov chegarasi to'sqinlik
 * qilmaydi va katta .glb modellar muammosiz o'tadi.
 */
export async function POST(request) {
  const guard = await requireAdmin();
  if (guard.error) return guardFail(guard);

  try {
    const body = await readJson(request);

    const kind = oneOf(body.kind, Object.keys(UPLOAD_RULES), {
      field: "Fayl turi",
      fallback: null,
    });
    if (!kind) return fail("Fayl turi noto'g'ri.", 400);

    const rule = UPLOAD_RULES[kind];
    const fileName = str(body.fileName, { field: "Fayl nomi", required: true, max: 255 });
    const fileSize = int(body.fileSize, { field: "Fayl hajmi", min: 1, max: rule.maxBytes });

    if (fileSize === null) {
      return fail(
        `Fayl hajmi ${Math.round(rule.maxBytes / 1024 / 1024)} MB dan oshmasligi kerak.`,
        400
      );
    }

    const lower = fileName.toLowerCase();
    if (!rule.extensions.some((ext) => lower.endsWith(ext))) {
      return fail(
        `${rule.label} uchun faqat ${rule.extensions.join(" yoki ")} format qabul qilinadi.`,
        400
      );
    }

    const service = createServiceClient();

    // Bucket yo'q bo'lsa yaratamiz — SQL ishga tushirilmagan bo'lsa ham ishlaydi
    try {
      const { data: buckets } = await service.storage.listBuckets();
      if (!(buckets || []).some((bucket) => bucket.name === BUCKET)) {
        await service.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: UPLOAD_RULES.model.maxBytes,
        });
      }
    } catch {
      // Ruxsat bo'lmasa keyingi bosqichda aniq xato qaytadi
    }

    // Fayl nomini xavfsizlashtiramiz (yo'l bilan o'ynash imkoni bo'lmasin)
    const safeName = lower.replace(/[^a-z0-9._-]/g, "_").slice(-80);
    const path = `${kind}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

    const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path);

    if (error) {
      const message = (error.message || "").toLowerCase();
      if (message.includes("bucket not found")) {
        return fail(
          "Storage sozlanmagan. Supabase → Storage bo'limida 'content' nomli PUBLIC bucket " +
            "yarating yoki supabase/update-v2.3.sql faylini ishga tushiring.",
          500
        );
      }
      return fail("Yuklash havolasini olib bo'lmadi.", 500);
    }

    const { data: publicData } = service.storage.from(BUCKET).getPublicUrl(path);

    return ok({
      bucket: BUCKET,
      path,
      token: data.token,
      publicUrl: publicData.publicUrl,
      contentType: lower.endsWith(".gltf") ? "model/gltf+json" : rule.contentType,
    });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Yuklashni boshlab bo'lmadi.", 500);
  }
}

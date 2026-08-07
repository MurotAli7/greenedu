import { createServiceClient } from "@/lib/supabase/service";

/**
 * Faollik jurnaliga yozadi va HECH QACHON xato tashlamaydi.
 *
 * Sabab: jurnalga yozish — yordamchi amal. Agar `activity_log` jadvali
 * yo'q bo'lsa yoki PostgREST sxema keshi eskirgan bo'lsa, bu asosiy
 * amalni (XP berish, kursga yozilish) to'xtatmasligi kerak.
 * Xato konsolga yoziladi, foydalanuvchi esa ishini davom ettiraveradi.
 *
 * @param {object|object[]} entries — bitta yozuv yoki yozuvlar massivi
 */
export async function logActivity(entries) {
  const rows = Array.isArray(entries) ? entries : [entries];
  if (rows.length === 0) return { ok: true };

  try {
    const service = createServiceClient();
    const { error } = await service.from("activity_log").insert(rows);

    if (error) {
      console.warn(
        "[activity_log] yozib bo'lmadi:",
        error.message,
        "— supabase/update-v2.3.sql ishga tushirilganini tekshiring."
      );
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[activity_log] kutilmagan xato:", err?.message);
    return { ok: false, error: err?.message };
  }
}

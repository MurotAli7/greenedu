import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/respond";
import { readJson, str, ValidationError } from "@/lib/api/validate";
import { rateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin-auth — admin sifatida kirish.
 *
 * Xavfsizlik:
 *  - Tezlik cheklovi: parol tanlash (brute force) hujumini sekinlashtiradi.
 *  - Admin bo'lmagan foydalanuvchi kirsa, sessiya darhol bekor qilinadi.
 *  - Xato xabari email mavjudligini oshkor qilmaydi.
 */
export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = str(body.email, { field: "Email", required: true, max: 254 });
    const password = str(body.password, { field: "Parol", required: true, min: 6, max: 200 });

    // IP bo'yicha cheklov: 10 urinish / 5 daqiqa
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(`admin-login:${ip}`, { limit: 10, windowMs: 5 * 60_000 });
    if (!limit.allowed) {
      return fail(
        `Juda ko'p urinish. ${limit.retryAfter} soniyadan keyin qayta urinib ko'ring.`,
        429
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Email mavjudmi-yo'qmi — oshkor qilmaymiz
      return fail("Email yoki parol noto'g'ri.", 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      return fail("Bu hisobda admin huquqi yo'q.", 403);
    }

    return ok({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Kirishda xatolik yuz berdi.", 500);
  }
}

/** DELETE /api/admin-auth — chiqish */
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return ok({ ok: true });
}

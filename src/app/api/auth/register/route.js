import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/respond";
import { readJson, str, ValidationError } from "@/lib/api/validate";
import { rateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 * Ro'yxatdan o'tishni server orqali xavfsiz va ishonchli amalga oshirish.
 */
export async function POST(request) {
  try {
    const body = await readJson(request);
    const fullName = str(body.fullName, {
      field: "Ism va familiya",
      required: true,
      min: 2,
      max: 100,
    });
    const email = str(body.email, {
      field: "Email",
      required: true,
      max: 254,
    });
    const password = str(body.password, {
      field: "Parol",
      required: true,
      min: 6,
      max: 200,
    });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail("Email manzilini to‘g‘ri kiriting.", 400);
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(`user-reg:${ip}`, { limit: 15, windowMs: 10 * 60_000 });
    if (!limit.allowed) {
      return fail(
        `Juda ko'p urinish. ${limit.retryAfter} soniyadan keyin qayta urinib ko'ring.`,
        429
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already registered")
      ) {
        return fail("Bu email manzili bilan hisob allaqachon mavjud.", 409);
      }
      if (msg.includes("password")) {
        return fail("Parol kamida 6 ta belgidan iborat bo‘lishi kerak.", 400);
      }
      return fail(error.message || "Ro‘yxatdan o‘tishda xatolik yuz berdi.", 400);
    }

    return ok({
      ok: true,
      hasSession: Boolean(data?.session),
      user: data?.user ? { id: data.user.id, email: data.user.email } : null,
      message: data?.session
        ? "Hisob muvaffaqiyatli yaratildi!"
        : "Hisob yaratildi. Email manzilingizni tasdiqlash uchun xatingizni tekshiring.",
    });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Ro‘yxatdan o‘tishda xatolik yuz berdi.", 500);
  }
}

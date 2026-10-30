import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/respond";
import { readJson, str, ValidationError } from "@/lib/api/validate";
import { rateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 * Foydalanuvchi va admin uchun server-side xavfsiz va tezkor kirish.
 * Brauzerdan to'g'ridan-to'g'ri tashqi Supabase API'ga bog'lanish va
 * "Failed to fetch" xatoliklarining oldini oladi.
 */
export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = str(body.email, { field: "Email", required: true, max: 254 });
    const password = str(body.password, { field: "Parol", required: true, min: 1, max: 200 });

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(`user-login:${ip}`, { limit: 25, windowMs: 5 * 60_000 });
    if (!limit.allowed) {
      return fail(
        `Juda ko'p urinish. ${limit.retryAfter} soniyadan keyin qayta urinib ko'ring.`,
        429
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("invalid login credentials") ||
        msg.includes("invalid_credentials") ||
        msg.includes("invalid")
      ) {
        return fail("Email yoki parol noto'g'ri.", 401);
      }
      if (msg.includes("email not confirmed")) {
        return fail(
          "Avval emailingizga yuborilgan havola orqali hisobni tasdiqlang.",
          403
        );
      }
      return fail("Email yoki parol noto'g'ri kiritildi.", 400);
    }

    // Foydalanuvchi roli
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role || "student";
    const redirectTo = role === "admin" ? "/admin" : "/user";

    return ok({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
      redirectTo,
    });
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    return fail("Kirishda xatolik yuz berdi. Qaytadan urinib ko'ring.", 500);
  }
}

import { createClient } from "./server";

/**
 * API route handlerlar ichida chaqiriladi. Joriy sessiyani tekshiradi va
 * foydalanuvchi role='admin' ekanligini tasdiqlaydi.
 *
 * Qaytaradi: { user } — agar admin bo'lsa
 *            { error, status } — aks holda (401 yoki 403)
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tizimga kirilmagan.", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Bu amal uchun admin huquqi kerak.", status: 403 };
  }

  return { user };
}
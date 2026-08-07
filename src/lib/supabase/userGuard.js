import { createClient } from "./server";

/**
 * API route ichida joriy sessiyani tekshiradi.
 * Qaytaradi: { user } yoki { error, status: 401 }
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tizimga kirilmagan.", status: 401 };
  }
  return { user };
}

import { createClient } from "@/lib/supabase/server";
import { ok } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

/**
 * Chiqish (logout) sessiyasini serverda tozalash.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return ok({ ok: true });
}

export async function DELETE() {
  return POST();
}

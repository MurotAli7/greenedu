// scripts/seed-admin.mjs
// .env.local dagi ADMIN_EMAIL va ADMIN_PASSWORD asosida Supabase'da
// admin foydalanuvchi yaratadi (mavjud bo'lsa faqat rolini admin qiladi).
//
// Ishga tushirish:  npm run seed:admin

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// --- .env.local ni qo'lda o'qiymiz (qo'shimcha kutubxona kerak emas) ---
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!url || !serviceKey) {
  console.error("Xato: NEXT_PUBLIC_SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY topilmadi (.env.local ni tekshiring).");
  process.exit(1);
}
if (!adminEmail || !adminPassword) {
  console.error("Xato: ADMIN_EMAIL yoki ADMIN_PASSWORD topilmadi (.env.local ni tekshiring).");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // Foydalanuvchi mavjudmi?
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  let user = list.users.find(
    (u) => (u.email || "").toLowerCase() === adminEmail.toLowerCase()
  );

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Administrator" },
    });
    if (error) throw error;
    user = data.user;
    console.log(`✓ Admin foydalanuvchi yaratildi: ${adminEmail}`);
  } else {
    // Parolni env'dagi qiymatga moslab qo'yamiz va emailni tasdiqlangan qilamiz
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: adminPassword,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`✓ Mavjud foydalanuvchi yangilandi: ${adminEmail}`);
  }

  // Profil: role = admin
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: "Administrator", role: "admin" });
  if (profileError) throw profileError;

  console.log("✓ profiles.role = 'admin' o'rnatildi.");
  console.log("\nEndi /admin-login sahifasidan shu email va parol bilan kirishingiz mumkin.");
}

main().catch((err) => {
  console.error("Seed xatosi:", err.message || err);
  if (String(err.message || "").includes("relation") || String(err.message || "").includes("profiles")) {
    console.error("→ Avval supabase/schema.sql ni Supabase SQL Editor'da ishga tushiring.");
  }
  process.exit(1);
});

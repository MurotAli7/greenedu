import { NextResponse } from "next/server";

/**
 * API javoblari uchun yagona format.
 * Barcha route'lar shu yordamchilardan foydalanadi — takroriy kod yo'q,
 * xato formati bir xil, xavfsizlik sarlavhalari markazlashgan.
 */

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export function ok(data, init = {}) {
  return NextResponse.json(data, { status: 200, headers: NO_STORE, ...init });
}

export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

/** Guard natijasini javobga aylantiradi */
export function guardFail(guard) {
  return fail(guard.error, guard.status);
}

/**
 * Supabase xatosini foydalanuvchi tushunadigan xabarga aylantiradi.
 * Ichki tafsilotlar (jadval nomlari, SQL) faqat sxema muammosida ko'rsatiladi.
 */
export function dbFail(error, fallback = "Amalni bajarib bo'lmadi.") {
  const msg = error?.message || "";
  const schemaIssue =
    msg.includes("violates check constraint") ||
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("schema cache");

  if (schemaIssue) {
    return fail(
      "Baza sxemasi eskirgan: supabase/update-v2.3.sql faylini Supabase SQL Editor'da " +
        `ishga tushiring. (${msg})`,
      500
    );
  }
  return fail(fallback, 500);
}

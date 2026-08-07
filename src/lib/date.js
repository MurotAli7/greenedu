/**
 * Sana yordamchilari — O'zbekiston vaqti (Asia/Tashkent, UTC+5).
 *
 * MUHIM: toISOString() UTC qaytaradi. Toshkentda soat 00:00–05:00 orasida
 * UTC hali "kecha" bo'ladi — shu sababli streak va kunlik statistika
 * bir kunga surilib ketardi. Shuning uchun hamma joyda shu funksiyalar
 * ishlatiladi.
 */

const TZ = "Asia/Tashkent";

/** Berilgan sanani (yoki hozirni) 'YYYY-MM-DD' ko'rinishida, Toshkent vaqtida qaytaradi */
export function localDay(date = new Date()) {
  const d = typeof date === "string" ? new Date(date) : date;
  // en-CA locale 'YYYY-MM-DD' formatini beradi
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Bugungi kun (Toshkent) */
export function today() {
  return localDay();
}

/** Ikki 'YYYY-MM-DD' orasidagi kunlar farqi */
export function daysBetween(fromDay, toDay) {
  const a = new Date(`${fromDay}T00:00:00Z`);
  const b = new Date(`${toDay}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** N kun oldingi kunni qaytaradi ('YYYY-MM-DD') */
export function dayOffset(day, offset) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/**
 * Oddiy tezlik cheklovi (rate limit).
 *
 * Eslatma: serverless muhitda (Vercel) har instansiya o'z xotirasiga ega,
 * shuning uchun bu himoya mutlaq emas — lekin bitta instansiyaga qaratilgan
 * qo'pol hujumlarni (masalan, parol tanlash yoki test natijasini spam qilish)
 * sezilarli sekinlashtiradi. Kuchliroq himoya kerak bo'lsa Upstash Redis
 * yoki Vercel KV ulanadi.
 */

const buckets = new Map();

/** Eskirgan yozuvlarni tozalaydi (xotira o'smasligi uchun) */
function sweep(now) {
  if (buckets.size < 500) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}

/**
 * @param key   noyob kalit (masalan `${userId}:complete-lesson`)
 * @param limit oynadagi maksimal so'rovlar soni
 * @param windowMs oyna davomiyligi
 * @returns {{ allowed: boolean, retryAfter: number }}
 */
export function rateLimit(key, { limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  sweep(now);

  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

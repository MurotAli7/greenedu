/**
 * Kiruvchi ma'lumotlarni tekshirish.
 * Har bir API route bir xil qoidalardan foydalanadi.
 */

export class ValidationError extends Error {}

/** Matn: bo'sh emas, uzunligi cheklangan, chetlari kesiladi */
export function str(value, { field, min = 0, max = 500, required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} kiritilishi shart.`);
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${field} matn bo'lishi kerak.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ValidationError(`${field} kamida ${min} ta belgidan iborat bo'lsin.`);
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${field} ${max} ta belgidan oshmasligi kerak.`);
  }
  return trimmed;
}

/** Butun son: chegaralar bilan */
export function int(value, { field, min = 0, max = 1000000, fallback = null } = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`${field} son bo'lishi kerak.`);
  }
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) {
    throw new ValidationError(`${field} ${min} va ${max} orasida bo'lsin.`);
  }
  return rounded;
}

/** Ro'yxatdagi qiymatlardan biri */
export function oneOf(value, allowed, { field, fallback = null } = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} noto'g'ri qiymat: ${value}`);
  }
  return value;
}

/** Mantiqiy qiymat */
export function bool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/**
 * URL: faqat https (yoki bo'sh).
 * javascript:, data:, http: kabi xavfli sxemalarni bloklaydi —
 * bu havolalar iframe/model sifatida ochilgani uchun muhim.
 */
export function httpsUrl(value, { field, required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} kiritilishi shart.`);
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError(`${field} to'g'ri havola bo'lishi kerak (https://... bilan boshlanadi).`);
  }
  if (parsed.protocol !== "https:") {
    throw new ValidationError(`${field} faqat https:// havola bo'lishi mumkin.`);
  }
  if (trimmed.length > 2000) {
    throw new ValidationError(`${field} juda uzun.`);
  }
  return parsed.toString();
}

/** UUID formatini tekshiradi (yo'l parametrlari uchun) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuid(value, { field = "ID" } = {}) {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new ValidationError(`${field} noto'g'ri.`);
  }
  return value;
}

/**
 * Ichki yo'l: ochiq qayta yo'naltirish (open redirect) hujumidan himoya.
 * Faqat "/" bilan boshlanadigan, "//" bo'lmagan yo'llarga ruxsat.
 */
export function safePath(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** JSON tanasini xavfsiz o'qiydi */
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("So'rov formati noto'g'ri.");
  }
}

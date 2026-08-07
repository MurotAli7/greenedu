/**
 * Gamifikatsiya qoidalari — faqat server tomonda (service client bilan) chaqiriladi.
 */
import { daysBetween } from "./date";

/** Qiymatni butun songa keltiradi (ustun yo'q/null bo'lsa NaN bo'lib qolmasligi uchun) */
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Keyingi darajaga o'tish uchun kerakli XP */
export function xpToNextLevel(level) {
  return Math.max(1, num(level, 1)) * 100;
}

/** XP qo'shib, kerak bo'lsa darajani oshiradi */
export function applyXp(stats, amount) {
  let level = Math.max(1, num(stats?.level, 1));
  let xp = num(stats?.xp, 0);
  xp += num(amount, 0);
  let leveledUp = false;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    leveledUp = true;
  }
  return { level, xp, leveledUp };
}

/** Streak: kecha faol bo'lsa +1, bugun bo'lsa o'zgarmaydi, aks holda 1 dan boshlanadi */
export function applyStreak(stats, today) {
  const last = stats?.last_activity_date; // 'YYYY-MM-DD' yoki null
  const current = num(stats?.streak_days, 0);
  if (!last) return 1;
  const lastDay = String(last).slice(0, 10);
  if (lastDay === today) return Math.max(1, current);
  const diff = daysBetween(lastDay, today);
  if (diff === 1) return current + 1; // kecha faol edi — seriya davom etadi
  if (diff <= 0) return Math.max(1, current); // kelajak sanasi — o'zgartirmaymiz
  return 1; // kun o'tkazib yuborilgan
}

/**
 * Yangi ochilishi kerak bo'lgan badge kodlari.
 * @param stats — yangilangan statistika
 * @param lessonType — hozir tugatilgan dars turi
 * @param owned — Set: allaqachon olingan badge kodlari
 */
export function newlyEarnedBadges(stats, lessonType, owned) {
  const earned = [];
  const check = (code, cond) => {
    if (cond && !owned.has(code)) earned.push(code);
  };
  check("first_lesson", num(stats?.completed_lessons) >= 1);
  check("five_lessons", num(stats?.completed_lessons) >= 5);
  check("first_arvr", lessonType === "ar" || lessonType === "vr");
  check("streak_3", num(stats?.streak_days) >= 3);
  check("level_5", num(stats?.level, 1) >= 5);
  return earned;
}

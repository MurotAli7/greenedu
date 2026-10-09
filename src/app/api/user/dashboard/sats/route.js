import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";
import { applyStreak } from "@/lib/gamify";
import { today as todayTashkent } from "@/lib/date";
import { logActivity } from "@/lib/api/activity";

export async function GET() {
  const guard = await requireUser();

  if (guard.error) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.status }
    );
  }

  const userId = guard.user.id;
  const service = createServiceClient();

  // Profil va statistikani parallel olamiz
  const [{ data: profile }, { data: statsRow }] = await Promise.all([
    service
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", userId)
      .maybeSingle(),

    service
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // Agar statistikasi hali mavjud bo'lmasa,
  // boshlang'ich qiymatlar ishlatiladi.
  let stats = statsRow || {
    user_id: userId,
    level: 1,
    xp: 0,
    total_points: 0,
    completed_lessons: 0,
    streak_days: 0,
    last_activity_date: null,
  };

  // =========================
  // KUNLIK TASHRIF / STREAK
  // =========================

  const today = todayTashkent();

  const lastDay = stats.last_activity_date
    ? String(stats.last_activity_date).slice(0, 10)
    : null;

  if (lastDay !== today) {
    const streak = applyStreak(stats, today);

    stats = {
      ...stats,
      streak_days: streak,
      last_activity_date: today,
    };

    await service.from("user_stats").upsert(stats);

    await logActivity({
      user_id: userId,
      action: "checkin",
    });
  }

  return NextResponse.json({
    firstName:
      (profile?.full_name || "")
        .trim()
        .split(/\s+/)[0] || "",

    avatarUrl: profile?.avatar_url || "",

    stats: {
      level: stats.level ?? 1,
      xp: stats.xp ?? 0,
      total_points: stats.total_points ?? 0,
      completed_lessons: stats.completed_lessons ?? 0,
      streak_days: stats.streak_days ?? 0,
    },
  });
}
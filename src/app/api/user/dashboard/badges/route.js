import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/userGuard";
import { createServiceClient } from "@/lib/supabase/service";

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

  // Barcha badge'lar va foydalanuvchi olgan badge'larni
  // bir vaqtda yuklaymiz.
  const [
    { data: badges, error: badgesError },
    { data: ownedBadges, error: ownedBadgesError },
  ] = await Promise.all([
    service
      .from("badges")
      .select("*")
      .order("sort_order"),

    service
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId),
  ]);

  if (badgesError || ownedBadgesError) {
    console.error("Badges dashboard xatoligi:", {
      badgesError,
      ownedBadgesError,
    });

    return NextResponse.json(
      { error: "Nishonlarni yuklashda xatolik yuz berdi." },
      { status: 500 }
    );
  }

  // Foydalanuvchi olgan badge ID'larini Set qilamiz.
  const ownedIds = new Set(
    (ownedBadges || []).map(
      (badge) => badge.badge_id
    )
  );

  // Har bir badge'ga unlocked qo'shamiz.
  const badgeList = (badges || []).map(
    (badge) => ({
      ...badge,
      unlocked: ownedIds.has(badge.id),
    })
  );

  return NextResponse.json({
    badges: badgeList,
  });
}
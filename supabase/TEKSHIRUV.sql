-- ============================================================
-- GreenEdu — BAZA TEKSHIRUVI
-- Supabase → SQL Editor'da ishga tushiring.
-- Natijada qaysi jadval yo'qligini ko'rasiz.
-- ============================================================

-- 1) Kerakli jadvallar bormi?
select
  t.jadval,
  case when c.table_name is null then '❌ YO''Q' else '✅ bor' end as holat
from (values
  ('profiles'), ('courses'), ('lessons'), ('enrollments'),
  ('lesson_progress'), ('user_stats'), ('badges'), ('user_badges'),
  ('notifications'), ('activity_log'), ('test_results')
) as t(jadval)
left join information_schema.tables c
  on c.table_schema = 'public' and c.table_name = t.jadval
order by holat, t.jadval;

-- 2) user_stats ustunlari to'liqmi? (XP hisoblanishi shunga bog'liq)
select
  t.ustun,
  case when c.column_name is null then '❌ YO''Q' else '✅ bor' end as holat
from (values
  ('user_id'), ('level'), ('xp'), ('total_points'),
  ('completed_lessons'), ('streak_days'), ('last_activity_date')
) as t(ustun)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'user_stats'
 and c.column_name = t.ustun
order by holat, t.ustun;

-- 3) Ma'lumotlar soni
select
  (select count(*) from public.profiles)        as foydalanuvchilar,
  (select count(*) from public.courses)         as kurslar,
  (select count(*) from public.lessons)         as darslar,
  (select count(*) from public.enrollments)     as yozilishlar,
  (select count(*) from public.lesson_progress) as tugatilgan_darslar,
  (select count(*) from public.user_stats)      as statistika_yozuvlari;

-- 4) Kimda XP bor?
select
  p.full_name as ism,
  s.level     as daraja,
  s.xp,
  s.total_points as jami_ball,
  s.completed_lessons as darslar,
  s.streak_days  as seriya,
  s.last_activity_date as oxirgi_faollik
from public.user_stats s
join public.profiles p on p.id = s.user_id
order by s.total_points desc;

-- 5) MUHIM: sxema keshini yangilash
-- Jadval mavjud bo'lsa ham PostgREST uni ko'rmasligi mumkin.
notify pgrst, 'reload schema';

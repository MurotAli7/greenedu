-- ============================================================
-- GreenEdu v2 — Supabase sxemasi
-- Supabase Dashboard → SQL Editor'ga to'liq nusxalab, Run bosing.
-- ============================================================

-- 1) PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) COURSES
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  content_type text not null default 'course' check (content_type in ('course', 'ar', 'vr')),
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  embed_url text,
  is_new boolean not null default false,
  recommended_for_new_users boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3) LESSONS — kurs ichidagi darslar
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  summary text,
  lesson_type text not null default 'text' check (lesson_type in ('text', 'ar', 'vr')),
  content text,
  embed_url text,
  model_url text,
  test_url text,
  xp_reward int not null default 10,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lessons_course_idx on public.lessons (course_id, sort_order);

-- 4) ENROLLMENTS
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, user_id)
);

-- 5) LESSON_PROGRESS — tugatilgan darslar
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- 6) USER_STATS — gamifikatsiya
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  level int not null default 1,
  xp int not null default 0,
  total_points int not null default 0,
  completed_lessons int not null default 0,
  streak_days int not null default 0,
  last_activity_date date
);

-- 7) BADGES
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  hint text,
  sort_order int not null default 0
);

-- 8) USER_BADGES
create table if not exists public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- 9) NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  type text default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 10) ACTIVITY_LOG — pedagogik eksperiment uchun faollik jurnali
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('enroll', 'lesson_complete', 'arvr_view', 'test_submit', 'checkin')),
  course_id uuid references public.courses (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

-- 11) TEST_RESULTS — HTML testlar natijalari
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  score int not null,
  total int not null,
  percent numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists test_results_lesson_idx on public.test_results (lesson_id);
create index if not exists test_results_user_idx on public.test_results (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Yozish amallari (enroll, dars tugatish, XP) server API orqali
-- service_role bilan bajariladi. Bu policylar faqat o'qish uchun.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.user_stats enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;
alter table public.test_results enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "courses_select_auth" on public.courses;
create policy "courses_select_auth" on public.courses
  for select to authenticated using (true);

drop policy if exists "lessons_select_auth" on public.lessons;
create policy "lessons_select_auth" on public.lessons
  for select to authenticated using (true);

drop policy if exists "enrollments_select_own" on public.enrollments;
create policy "enrollments_select_own" on public.enrollments
  for select using (auth.uid() = user_id);

drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own" on public.lesson_progress
  for select using (auth.uid() = user_id);

drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own" on public.user_stats
  for select using (auth.uid() = user_id);

drop policy if exists "badges_select_auth" on public.badges;
create policy "badges_select_auth" on public.badges
  for select to authenticated using (true);

drop policy if exists "user_badges_select_own" on public.user_badges;
create policy "user_badges_select_own" on public.user_badges
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "test_results_select_own" on public.test_results;
create policy "test_results_select_own" on public.test_results
  for select using (auth.uid() = user_id);

drop policy if exists "activity_select_own" on public.activity_log;
create policy "activity_select_own" on public.activity_log
  for select using (auth.uid() = user_id);

-- ============================================================
-- BOSHLANG'ICH MA'LUMOTLAR
-- ============================================================

insert into public.badges (code, name, hint, sort_order) values
  ('first_lesson', 'Birinchi qadam', 'Birinchi darsni yakunlang', 1),
  ('five_lessons', 'Bilim yo''lida', '5 ta darsni tugating', 2),
  ('first_arvr', 'VR kashshofi', 'Birinchi AR yoki VR darsni o''tang', 3),
  ('streak_3', 'Izchillik', '3 kun ketma-ket shug''ullaning', 4),
  ('level_5', 'Yashil bilimdon', '5-darajaga yeting', 5)
on conflict (code) do nothing;

-- Demo kurslar va darslar
insert into public.courses (id, title, description, category, content_type, status, is_new, recommended_for_new_users) values
  ('b1000000-0000-4000-8000-000000000001', 'Ekologiya asoslari', 'Ekotizimlar, biologik xilma-xillik va tabiatni muhofaza qilish asoslari bilan tanishing.', 'Ekologiya', 'course', 'active', true, true),
  ('b1000000-0000-4000-8000-000000000002', 'O''rmon ekotizimi (AR)', 'O''rmon ekotizimini AR texnologiyasi orqali interaktiv o''rganing.', 'Biologiya', 'ar', 'active', true, true),
  ('b1000000-0000-4000-8000-000000000003', 'Suv aylanishi (VR)', 'Tabiatda suv aylanishi jarayonini VR muhitida kuzating.', 'Geografiya', 'vr', 'active', false, false)
on conflict (id) do nothing;

insert into public.lessons (id, course_id, title, summary, lesson_type, xp_reward, sort_order) values
  ('c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Ekotizim nima?', 'Ekotizim tushunchasi, tirik va notirik komponentlar.', 'text', 10, 1),
  ('c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'Oziq zanjirlari', 'Produtsent, konsument va redutsentlar o''rtasidagi bog''liqlik.', 'text', 10, 2),
  ('c1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'Biologik xilma-xillik', 'Tur xilma-xilligi va uni saqlash yo''llari.', 'text', 15, 3),
  ('c1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000002', 'O''rmon qavatlari (AR modul)', 'AR orqali o''rmonning qavatli tuzilishini o''rganing.', 'ar', 25, 1),
  ('c1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000003', 'Suv aylanishi sayohati (VR modul)', 'Bug''lanishdan yog''ingarchilikgacha — VR muhitda.', 'vr', 25, 1)
on conflict (id) do nothing;

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('content', 'content', true) on conflict (id) do nothing;

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

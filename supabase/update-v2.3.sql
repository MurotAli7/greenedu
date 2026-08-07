-- ============================================================
-- GreenEdu v2.2 — TUZATISH VA YANGILANISH SQL
-- Supabase Dashboard → SQL Editor'ga to'liq nusxalab, Run bosing.
-- Bu fayl bir necha marta ishga tushirilsa ham xato bermaydi.
--
-- Nima uchun kerak: agar bazada eski (v1) jadvallar bo'lsa, ularning
-- CHECK cheklovlari yangi qiymatlarni ('ar', 'vr') qabul qilmaydi va
-- admin panelda kurs/dars qo'shilmaydi.
-- ============================================================

-- ------------------------------------------------------------
-- 1) COURSES — yetishmayotgan ustunlar va cheklovlarni tuzatish
-- ------------------------------------------------------------
alter table public.courses add column if not exists description text;
alter table public.courses add column if not exists category text;
alter table public.courses add column if not exists content_type text default 'course';
alter table public.courses add column if not exists status text default 'active';
alter table public.courses add column if not exists embed_url text;
alter table public.courses add column if not exists is_new boolean default false;
alter table public.courses add column if not exists recommended_for_new_users boolean default false;
alter table public.courses add column if not exists created_at timestamptz default now();

-- Eski cheklovlarni olib tashlab, yangisini qo'yamiz
alter table public.courses drop constraint if exists courses_content_type_check;
alter table public.courses
  add constraint courses_content_type_check
  check (content_type in ('course', 'ar', 'vr'));

alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses
  add constraint courses_status_check
  check (status in ('active', 'draft', 'archived'));

-- Bo'sh qiymatlarni to'g'rilash
update public.courses set content_type = 'course' where content_type is null;
update public.courses set status = 'active' where status is null;

-- ------------------------------------------------------------
-- 2) LESSONS — jadval va barcha ustunlar
-- ------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.lessons add column if not exists summary text;
alter table public.lessons add column if not exists content text;
alter table public.lessons add column if not exists lesson_type text default 'text';
alter table public.lessons add column if not exists embed_url text;
alter table public.lessons add column if not exists model_url text;
alter table public.lessons add column if not exists test_url text;
alter table public.lessons add column if not exists xp_reward int default 10;
alter table public.lessons add column if not exists sort_order int default 0;

alter table public.lessons drop constraint if exists lessons_lesson_type_check;
alter table public.lessons
  add constraint lessons_lesson_type_check
  check (lesson_type in ('text', 'ar', 'vr'));

update public.lessons set lesson_type = 'text' where lesson_type is null;
update public.lessons set xp_reward = 10 where xp_reward is null;

create index if not exists lessons_course_idx on public.lessons (course_id, sort_order);

alter table public.lessons enable row level security;
drop policy if exists "lessons_select_auth" on public.lessons;
create policy "lessons_select_auth" on public.lessons
  for select to authenticated using (true);

-- ------------------------------------------------------------
-- 3) LESSON_PROGRESS
-- ------------------------------------------------------------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own" on public.lesson_progress
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4) USER_STATS — ustunlar
-- ------------------------------------------------------------
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.user_stats add column if not exists level int default 1;
alter table public.user_stats add column if not exists xp int default 0;
alter table public.user_stats add column if not exists total_points int default 0;
alter table public.user_stats add column if not exists completed_lessons int default 0;
alter table public.user_stats add column if not exists streak_days int default 0;
alter table public.user_stats add column if not exists last_activity_date date;

-- ------------------------------------------------------------
-- 5) PROFILES — avatar
-- ------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;

-- ------------------------------------------------------------
-- 6) ACTIVITY_LOG — barcha harakat turlari
-- ------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  course_id uuid references public.courses (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.activity_log drop constraint if exists activity_log_action_check;
alter table public.activity_log
  add constraint activity_log_action_check
  check (action in ('enroll', 'lesson_complete', 'arvr_view', 'test_submit', 'checkin'));

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
alter table public.activity_log enable row level security;
drop policy if exists "activity_select_own" on public.activity_log;
create policy "activity_select_own" on public.activity_log
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 7) TEST_RESULTS
-- ------------------------------------------------------------
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  score int not null,
  total int not null,
  percent numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists test_results_user_idx on public.test_results (user_id);
create index if not exists test_results_lesson_idx on public.test_results (lesson_id);

alter table public.test_results enable row level security;
drop policy if exists "test_results_select_own" on public.test_results;
create policy "test_results_select_own" on public.test_results
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8) STORAGE bucketlar va policylar
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do nothing;

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

-- ------------------------------------------------------------
-- 9) Tekshiruv — quyidagi so'rov natijasi bo'sh bo'lmasligi kerak
-- ------------------------------------------------------------
select
  (select count(*) from public.courses) as kurslar,
  (select count(*) from public.lessons) as darslar,
  (select count(*) from public.profiles) as foydalanuvchilar;

-- ------------------------------------------------------------
-- 10) v2.3: 'content' bucket hajm chegarasini oshirish (3D modellar uchun)
--     va HTML/GLB MIME turlariga ruxsat
-- ------------------------------------------------------------
update storage.buckets
set file_size_limit = 125829120   -- 120 MB
where id = 'content';

-- Agar allowed_mime_types cheklangan bo'lsa, olib tashlaymiz
update storage.buckets
set allowed_mime_types = null
where id in ('content', 'avatars');

-- ------------------------------------------------------------
-- 11) MUHIM: PostgREST sxema keshini yangilash
--
-- Jadvallar yaratilgandan keyin API ularni darhol ko'rmasligi mumkin
-- ("Could not find the table 'public.activity_log' in the schema cache").
-- Quyidagi buyruq keshni yangilaydi.
-- ------------------------------------------------------------
notify pgrst, 'reload schema';

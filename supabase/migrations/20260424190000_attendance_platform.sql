create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('admin', 'teacher', 'student');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_audience as enum ('all', 'group', 'user');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_type as enum ('absence', 'schedule', 'system');
exception
  when duplicate_object then null;
end $$;

create schema if not exists app_private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'student',
  group_id uuid,
  position text not null default 'Пользователь',
  phone text,
  avatar_tone text not null default '#124e78',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  course integer not null check (course between 1 and 5),
  specialty text not null,
  curator_id uuid references public.profiles(id) on delete set null,
  color text not null default '#124e78',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.profiles
    add constraint profiles_group_id_fkey
    foreign key (group_id) references public.groups(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  short_title text not null,
  color text not null default '#124e78',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_id uuid references public.profiles(id) on delete set null,
  weekday integer not null check (weekday between 0 and 5),
  starts_at time not null,
  ends_at time not null,
  room text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_time_order check (starts_at < ends_at)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  status public.attendance_status not null,
  note text not null default '',
  marked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_unique_mark unique (lesson_id, student_id, date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience public.notification_audience not null default 'all',
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  type public.notification_type not null default 'system',
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_target_check check (
    (audience = 'all' and group_id is null and user_id is null)
    or (audience = 'group' and group_id is not null and user_id is null)
    or (audience = 'user' and user_id is not null and group_id is null)
  )
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists groups_touch_updated_at on public.groups;
create trigger groups_touch_updated_at
before update on public.groups
for each row execute function public.touch_updated_at();

drop trigger if exists subjects_touch_updated_at on public.subjects;
create trigger subjects_touch_updated_at
before update on public.subjects
for each row execute function public.touch_updated_at();

drop trigger if exists lessons_touch_updated_at on public.lessons;
create trigger lessons_touch_updated_at
before update on public.lessons
for each row execute function public.touch_updated_at();

drop trigger if exists attendance_touch_updated_at on public.attendance_records;
create trigger attendance_touch_updated_at
before update on public.attendance_records
for each row execute function public.touch_updated_at();

drop trigger if exists notifications_touch_updated_at on public.notifications;
create trigger notifications_touch_updated_at
before update on public.notifications
for each row execute function public.touch_updated_at();

create or replace function app_private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function app_private.current_user_group_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select group_id from public.profiles where id = auth.uid()
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_role() to authenticated;
grant execute on function app_private.current_user_group_id() to authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role, position)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'student',
    'Пользователь'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.subjects enable row level security;
alter table public.lessons enable row level security;
alter table public.attendance_records enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists groups_select_authenticated on public.groups;
create policy groups_select_authenticated
on public.groups
for select
to authenticated
using (true);

drop policy if exists groups_mutate_admin on public.groups;
create policy groups_mutate_admin
on public.groups
for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists subjects_select_authenticated on public.subjects;
create policy subjects_select_authenticated
on public.subjects
for select
to authenticated
using (true);

drop policy if exists subjects_mutate_admin on public.subjects;
create policy subjects_mutate_admin
on public.subjects
for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists lessons_select_authenticated on public.lessons;
create policy lessons_select_authenticated
on public.lessons
for select
to authenticated
using (true);

drop policy if exists lessons_mutate_admin on public.lessons;
create policy lessons_mutate_admin
on public.lessons
for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists attendance_select_authenticated on public.attendance_records;
create policy attendance_select_authenticated
on public.attendance_records
for select
to authenticated
using (true);

drop policy if exists attendance_mutate_staff on public.attendance_records;
create policy attendance_mutate_staff
on public.attendance_records
for all
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'))
with check (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists notifications_select_relevant on public.notifications;
create policy notifications_select_relevant
on public.notifications
for select
to authenticated
using (
  audience = 'all'
  or user_id = auth.uid()
  or group_id = app_private.current_user_group_id()
  or app_private.current_user_role() in ('admin', 'teacher')
);

drop policy if exists notifications_mutate_staff on public.notifications;
create policy notifications_mutate_staff
on public.notifications
for all
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'))
with check (app_private.current_user_role() in ('admin', 'teacher'));

insert into public.subjects (title, short_title, color)
values
  ('Веб-программирование', 'Web', '#124e78'),
  ('Базы данных', 'БД', '#2f7d63'),
  ('UI/UX проектирование', 'UI/UX', '#7c3aed'),
  ('Тестирование ПО', 'QA', '#a43e52')
on conflict (title) do update set
  short_title = excluded.short_title,
  color = excluded.color;

insert into public.groups (name, course, specialty, color)
values
  ('ПОВТ-4-1', 4, 'Программное обеспечение вычислительной техники', '#124e78'),
  ('ИС-3-1', 3, 'Информационные системы', '#2f7d63'),
  ('ДИЗ-2-1', 2, 'Цифровой дизайн', '#7c3aed')
on conflict (name) do update set
  course = excluded.course,
  specialty = excluded.specialty,
  color = excluded.color;

create index if not exists attendance_records_date_idx on public.attendance_records(date desc);
create index if not exists attendance_records_student_idx on public.attendance_records(student_id);
create index if not exists lessons_group_weekday_idx on public.lessons(group_id, weekday, starts_at);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

create table if not exists public.subject_teachers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists subject_teachers_unique_scope_idx
on public.subject_teachers (
  subject_id,
  teacher_id,
  coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table if not exists public.grade_categories (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  title text not null,
  coefficient numeric(6, 2) not null default 1 check (coefficient > 0 and coefficient <= 10),
  color text not null default '#2f63d9',
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists grade_categories_unique_scope_title_idx
on public.grade_categories (
  subject_id,
  coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(title)
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  category_id uuid not null references public.grade_categories(id) on delete restrict,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  score numeric(6, 2) not null check (score >= 0),
  max_score numeric(6, 2) not null default 100 check (max_score > 0),
  graded_at date not null default current_date,
  comment text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_score_within_max check (score <= max_score)
);

drop trigger if exists grade_categories_touch_updated_at on public.grade_categories;
create trigger grade_categories_touch_updated_at
before update on public.grade_categories
for each row execute function public.touch_updated_at();

drop trigger if exists grades_touch_updated_at on public.grades;
create trigger grades_touch_updated_at
before update on public.grades
for each row execute function public.touch_updated_at();

alter table public.subject_teachers enable row level security;
alter table public.grade_categories enable row level security;
alter table public.grades enable row level security;

drop policy if exists subject_teachers_select_authenticated on public.subject_teachers;
create policy subject_teachers_select_authenticated
on public.subject_teachers
for select
to authenticated
using (true);

drop policy if exists subject_teachers_mutate_admin on public.subject_teachers;
create policy subject_teachers_mutate_admin
on public.subject_teachers
for all
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists grade_categories_select_authenticated on public.grade_categories;
create policy grade_categories_select_authenticated
on public.grade_categories
for select
to authenticated
using (true);

drop policy if exists grade_categories_mutate_staff on public.grade_categories;
create policy grade_categories_mutate_staff
on public.grade_categories
for all
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'))
with check (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists grades_select_relevant on public.grades;
create policy grades_select_relevant
on public.grades
for select
to authenticated
using (
  student_id = auth.uid()
  or app_private.current_user_role() in ('admin', 'teacher')
);

drop policy if exists grades_mutate_staff on public.grades;
create policy grades_mutate_staff
on public.grades
for all
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'))
with check (app_private.current_user_role() in ('admin', 'teacher'));

insert into public.subject_teachers (subject_id, teacher_id, group_id)
select distinct lesson.subject_id, lesson.teacher_id, null::uuid
from public.lessons as lesson
where lesson.teacher_id is not null
  and not exists (
    select 1
    from public.subject_teachers as existing
    where existing.subject_id = lesson.subject_id
      and existing.teacher_id = lesson.teacher_id
      and existing.group_id is null
  );

with default_categories(title, coefficient, color, sort_order) as (
  values
    ('Текущий контроль', 1.00, '#2f63d9', 10),
    ('Практика', 2.00, '#0f8f7a', 20),
    ('Контрольная', 3.00, '#d92d54', 30)
)
insert into public.grade_categories (subject_id, group_id, title, coefficient, color, sort_order)
select subject.id, null, category.title, category.coefficient, category.color, category.sort_order
from public.subjects as subject
cross join default_categories as category
where not exists (
  select 1
  from public.grade_categories as existing
  where existing.subject_id = subject.id
    and existing.group_id is null
    and lower(existing.title) = lower(category.title)
);

create index if not exists subject_teachers_teacher_idx on public.subject_teachers(teacher_id);
create index if not exists subject_teachers_group_idx on public.subject_teachers(group_id);
create index if not exists grade_categories_subject_idx on public.grade_categories(subject_id);
create index if not exists grade_categories_group_idx on public.grade_categories(group_id);
create index if not exists grades_student_subject_idx on public.grades(student_id, subject_id);
create index if not exists grades_category_idx on public.grades(category_id);
create index if not exists grades_lesson_idx on public.grades(lesson_id);
create index if not exists grades_created_by_idx on public.grades(created_by);

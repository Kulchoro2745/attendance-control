create index if not exists subject_teachers_created_by_idx on public.subject_teachers(created_by);
create index if not exists grade_categories_created_by_idx on public.grade_categories(created_by);
create index if not exists grades_subject_idx on public.grades(subject_id);

drop policy if exists subject_teachers_mutate_admin on public.subject_teachers;
drop policy if exists subject_teachers_insert_admin on public.subject_teachers;
create policy subject_teachers_insert_admin
on public.subject_teachers
for insert
to authenticated
with check (app_private.current_user_role() = 'admin');

drop policy if exists subject_teachers_update_admin on public.subject_teachers;
create policy subject_teachers_update_admin
on public.subject_teachers
for update
to authenticated
using (app_private.current_user_role() = 'admin')
with check (app_private.current_user_role() = 'admin');

drop policy if exists subject_teachers_delete_admin on public.subject_teachers;
create policy subject_teachers_delete_admin
on public.subject_teachers
for delete
to authenticated
using (app_private.current_user_role() = 'admin');

drop policy if exists grade_categories_mutate_staff on public.grade_categories;
drop policy if exists grade_categories_insert_staff on public.grade_categories;
create policy grade_categories_insert_staff
on public.grade_categories
for insert
to authenticated
with check (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists grade_categories_update_staff on public.grade_categories;
create policy grade_categories_update_staff
on public.grade_categories
for update
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'))
with check (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists grade_categories_delete_staff on public.grade_categories;
create policy grade_categories_delete_staff
on public.grade_categories
for delete
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists grades_select_relevant on public.grades;
create policy grades_select_relevant
on public.grades
for select
to authenticated
using (
  student_id = (select auth.uid())
  or app_private.current_user_role() in ('admin', 'teacher')
);

drop policy if exists grades_mutate_staff on public.grades;
drop policy if exists grades_insert_staff on public.grades;
create policy grades_insert_staff
on public.grades
for insert
to authenticated
with check (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists grades_update_staff on public.grades;
create policy grades_update_staff
on public.grades
for update
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'))
with check (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists grades_delete_staff on public.grades;
create policy grades_delete_staff
on public.grades
for delete
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'));

create index if not exists profiles_group_id_idx on public.profiles(group_id);
create index if not exists groups_curator_id_idx on public.groups(curator_id);
create index if not exists lessons_subject_id_idx on public.lessons(subject_id);
create index if not exists lessons_teacher_id_idx on public.lessons(teacher_id);
create index if not exists attendance_records_marked_by_idx on public.attendance_records(marked_by);
create index if not exists notifications_created_by_idx on public.notifications(created_by);
create index if not exists notifications_group_id_idx on public.notifications(group_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists telegram_report_runs_requested_by_idx
  on public.telegram_report_runs(requested_by);
create index if not exists telegram_report_runs_group_id_idx
  on public.telegram_report_runs(group_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists groups_mutate_admin on public.groups;
drop policy if exists groups_insert_admin on public.groups;
drop policy if exists groups_update_admin on public.groups;
drop policy if exists groups_delete_admin on public.groups;
create policy groups_insert_admin
on public.groups
for insert
to authenticated
with check ((select app_private.current_user_role()) = 'admin');
create policy groups_update_admin
on public.groups
for update
to authenticated
using ((select app_private.current_user_role()) = 'admin')
with check ((select app_private.current_user_role()) = 'admin');
create policy groups_delete_admin
on public.groups
for delete
to authenticated
using ((select app_private.current_user_role()) = 'admin');

drop policy if exists subjects_mutate_admin on public.subjects;
drop policy if exists subjects_insert_admin on public.subjects;
drop policy if exists subjects_update_admin on public.subjects;
drop policy if exists subjects_delete_admin on public.subjects;
create policy subjects_insert_admin
on public.subjects
for insert
to authenticated
with check ((select app_private.current_user_role()) = 'admin');
create policy subjects_update_admin
on public.subjects
for update
to authenticated
using ((select app_private.current_user_role()) = 'admin')
with check ((select app_private.current_user_role()) = 'admin');
create policy subjects_delete_admin
on public.subjects
for delete
to authenticated
using ((select app_private.current_user_role()) = 'admin');

drop policy if exists lessons_mutate_admin on public.lessons;
drop policy if exists lessons_insert_admin on public.lessons;
drop policy if exists lessons_update_admin on public.lessons;
drop policy if exists lessons_delete_admin on public.lessons;
create policy lessons_insert_admin
on public.lessons
for insert
to authenticated
with check ((select app_private.current_user_role()) = 'admin');
create policy lessons_update_admin
on public.lessons
for update
to authenticated
using ((select app_private.current_user_role()) = 'admin')
with check ((select app_private.current_user_role()) = 'admin');
create policy lessons_delete_admin
on public.lessons
for delete
to authenticated
using ((select app_private.current_user_role()) = 'admin');

drop policy if exists attendance_mutate_staff on public.attendance_records;
drop policy if exists attendance_insert_staff on public.attendance_records;
drop policy if exists attendance_update_staff on public.attendance_records;
drop policy if exists attendance_delete_staff on public.attendance_records;
create policy attendance_insert_staff
on public.attendance_records
for insert
to authenticated
with check ((select app_private.current_user_role()) in ('admin', 'teacher'));
create policy attendance_update_staff
on public.attendance_records
for update
to authenticated
using ((select app_private.current_user_role()) in ('admin', 'teacher'))
with check ((select app_private.current_user_role()) in ('admin', 'teacher'));
create policy attendance_delete_staff
on public.attendance_records
for delete
to authenticated
using ((select app_private.current_user_role()) in ('admin', 'teacher'));

drop policy if exists notifications_select_relevant on public.notifications;
create policy notifications_select_relevant
on public.notifications
for select
to authenticated
using (
  audience = 'all'
  or user_id = (select auth.uid())
  or group_id = (select app_private.current_user_group_id())
  or (select app_private.current_user_role()) in ('admin', 'teacher')
);

drop policy if exists notifications_mutate_staff on public.notifications;
drop policy if exists notifications_insert_staff on public.notifications;
drop policy if exists notifications_update_staff on public.notifications;
drop policy if exists notifications_delete_staff on public.notifications;
create policy notifications_insert_staff
on public.notifications
for insert
to authenticated
with check ((select app_private.current_user_role()) in ('admin', 'teacher'));
create policy notifications_update_staff
on public.notifications
for update
to authenticated
using ((select app_private.current_user_role()) in ('admin', 'teacher'))
with check ((select app_private.current_user_role()) in ('admin', 'teacher'));
create policy notifications_delete_staff
on public.notifications
for delete
to authenticated
using ((select app_private.current_user_role()) in ('admin', 'teacher'));

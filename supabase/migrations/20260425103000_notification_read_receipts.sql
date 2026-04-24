create or replace function app_private.is_notification_relevant(
  target_audience public.notification_audience,
  target_group_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    target_audience = 'all'
    or target_user_id = (select auth.uid())
    or target_group_id = (select app_private.current_user_group_id())
    or (select app_private.current_user_role()) in ('admin', 'teacher')
$$;

create or replace function app_private.guard_notification_read_receipt()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_profile_id uuid := (select auth.uid());
  expected_read_by uuid[];
begin
  if (select app_private.current_user_role()) in ('admin', 'teacher') then
    return new;
  end if;

  if current_profile_id is null then
    raise exception 'Authentication required';
  end if;

  if new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.audience is distinct from old.audience
    or new.group_id is distinct from old.group_id
    or new.user_id is distinct from old.user_id
    or new.created_by is distinct from old.created_by
    or new.type is distinct from old.type
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only read receipt updates are allowed';
  end if;

  expected_read_by := array(
    select distinct value
    from unnest(coalesce(old.read_by, '{}'::uuid[]) || current_profile_id) as value
  );

  if not (
    coalesce(new.read_by, '{}'::uuid[]) @> expected_read_by
    and expected_read_by @> coalesce(new.read_by, '{}'::uuid[])
  ) then
    raise exception 'Only own read receipt can be added';
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_guard_read_receipt on public.notifications;
create trigger notifications_guard_read_receipt
before update on public.notifications
for each row execute function app_private.guard_notification_read_receipt();

drop policy if exists notifications_mark_read_relevant on public.notifications;
create policy notifications_mark_read_relevant
on public.notifications
for update
to authenticated
using ((select app_private.is_notification_relevant(audience, group_id, user_id)))
with check ((select app_private.is_notification_relevant(audience, group_id, user_id)));

grant execute on function app_private.is_notification_relevant(
  public.notification_audience,
  uuid,
  uuid
) to authenticated;

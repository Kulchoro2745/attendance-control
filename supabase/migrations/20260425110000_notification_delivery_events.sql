do $$
begin
  create type public.notification_delivery_channel as enum ('app', 'telegram');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_delivery_status as enum (
    'pending',
    'sent',
    'delivered',
    'read',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  channel public.notification_delivery_channel not null default 'app',
  status public.notification_delivery_status not null default 'delivered',
  delivered_at timestamptz,
  read_at timestamptz,
  telegram_message_id bigint,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_unique_channel unique (notification_id, profile_id, channel)
);

drop trigger if exists notification_deliveries_touch_updated_at on public.notification_deliveries;
create trigger notification_deliveries_touch_updated_at
before update on public.notification_deliveries
for each row execute function public.touch_updated_at();

create or replace function app_private.is_service_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
$$;

create or replace function app_private.notification_recipient_ids(
  target_audience public.notification_audience,
  target_group_id uuid,
  target_user_id uuid
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.profiles as profile
  where
    target_audience = 'all'
    or (target_audience = 'group' and profile.group_id = target_group_id)
    or (target_audience = 'user' and profile.id = target_user_id)
$$;

create or replace function app_private.is_notification_delivery_relevant(
  target_notification_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.notifications as notification
    left join public.profiles as profile on profile.id = target_profile_id
    where notification.id = target_notification_id
      and (
        notification.audience = 'all'
        or notification.user_id = target_profile_id
        or notification.group_id = profile.group_id
        or (select app_private.current_user_role()) in ('admin', 'teacher')
        or (select app_private.is_service_role())
      )
  )
$$;

create or replace function app_private.guard_notification_delivery_receipt()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_profile_id uuid := (select auth.uid());
begin
  if (select app_private.is_service_role())
    or (select app_private.current_user_role()) in ('admin', 'teacher')
  then
    return new;
  end if;

  if current_profile_id is null then
    raise exception 'Authentication required';
  end if;

  if new.profile_id is distinct from current_profile_id then
    raise exception 'Only own delivery receipt can be changed';
  end if;

  if new.channel <> 'app' then
    raise exception 'Only app delivery receipts can be changed by users';
  end if;

  if not (select app_private.is_notification_delivery_relevant(new.notification_id, new.profile_id)) then
    raise exception 'Notification is not visible for this profile';
  end if;

  if tg_op = 'UPDATE' then
    if new.notification_id is distinct from old.notification_id
      or new.profile_id is distinct from old.profile_id
      or new.channel is distinct from old.channel
      or new.telegram_message_id is distinct from old.telegram_message_id
      or new.error_message is distinct from old.error_message
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Only read state fields can be changed';
    end if;

    if old.status = 'read'::public.notification_delivery_status
      and new.status <> 'read'::public.notification_delivery_status
    then
      raise exception 'Read receipt cannot be reverted';
    end if;
  end if;

  if new.status not in (
    'delivered'::public.notification_delivery_status,
    'read'::public.notification_delivery_status
  ) then
    raise exception 'Invalid app delivery state';
  end if;

  if tg_op = 'INSERT' then
    new.delivered_at = coalesce(new.delivered_at, now());
    if new.status = 'read'::public.notification_delivery_status then
      new.read_at = coalesce(new.read_at, now());
    end if;
  else
    new.delivered_at = coalesce(new.delivered_at, old.delivered_at, now());
    if new.status = 'read'::public.notification_delivery_status then
      new.read_at = coalesce(new.read_at, old.read_at, now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notification_deliveries_guard_receipt on public.notification_deliveries;
create trigger notification_deliveries_guard_receipt
before insert or update on public.notification_deliveries
for each row execute function app_private.guard_notification_delivery_receipt();

create or replace function app_private.sync_notification_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and (
      new.audience is distinct from old.audience
      or new.group_id is distinct from old.group_id
      or new.user_id is distinct from old.user_id
    )
  then
    delete from public.notification_deliveries as delivery
    where delivery.notification_id = new.id
      and delivery.channel = 'app'
      and not exists (
        select 1
        from app_private.notification_recipient_ids(new.audience, new.group_id, new.user_id) as recipient(profile_id)
        where recipient.profile_id = delivery.profile_id
      );
  end if;

  insert into public.notification_deliveries (
    notification_id,
    profile_id,
    channel,
    status,
    delivered_at,
    read_at
  )
  select
    new.id,
    recipient.profile_id,
    'app'::public.notification_delivery_channel,
    case
      when recipient.profile_id = any(coalesce(new.read_by, '{}'::uuid[]))
      then 'read'::public.notification_delivery_status
      else 'delivered'::public.notification_delivery_status
    end,
    now(),
    case when recipient.profile_id = any(coalesce(new.read_by, '{}'::uuid[])) then now() else null end
  from app_private.notification_recipient_ids(new.audience, new.group_id, new.user_id) as recipient(profile_id)
  on conflict (notification_id, profile_id, channel) do update
  set
    status = case
      when excluded.status = 'read'::public.notification_delivery_status
      then 'read'::public.notification_delivery_status
      else public.notification_deliveries.status
    end,
    delivered_at = coalesce(public.notification_deliveries.delivered_at, excluded.delivered_at),
    read_at = coalesce(public.notification_deliveries.read_at, excluded.read_at);

  return new;
end;
$$;

drop trigger if exists notifications_sync_deliveries on public.notifications;
create trigger notifications_sync_deliveries
after insert or update of audience, group_id, user_id, read_by on public.notifications
for each row execute function app_private.sync_notification_deliveries();

create or replace function app_private.sync_notification_read_by_from_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'read'::public.notification_delivery_status
    and (
      tg_op = 'INSERT'
      or old.status is distinct from 'read'::public.notification_delivery_status
    )
  then
    update public.notifications as notification
    set read_by = array(
      select distinct profile_id
      from unnest(coalesce(notification.read_by, '{}'::uuid[]) || new.profile_id) as profile_id
    )
    where notification.id = new.notification_id;
  end if;

  return new;
end;
$$;

drop trigger if exists notification_deliveries_sync_read_by on public.notification_deliveries;
create trigger notification_deliveries_sync_read_by
after insert or update of status, read_at on public.notification_deliveries
for each row execute function app_private.sync_notification_read_by_from_delivery();

create or replace function app_private.guard_notification_read_receipt()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_profile_id uuid := (select auth.uid());
  expected_read_by uuid[];
begin
  if (select app_private.is_service_role())
    or (select app_private.current_user_role()) in ('admin', 'teacher')
  then
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

alter table public.notification_deliveries enable row level security;

drop policy if exists notification_deliveries_select_relevant on public.notification_deliveries;
create policy notification_deliveries_select_relevant
on public.notification_deliveries
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select app_private.current_user_role()) in ('admin', 'teacher')
);

drop policy if exists notification_deliveries_insert_own_app_receipt on public.notification_deliveries;
create policy notification_deliveries_insert_own_app_receipt
on public.notification_deliveries
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and channel = 'app'
  and (select app_private.is_notification_delivery_relevant(notification_id, profile_id))
);

drop policy if exists notification_deliveries_update_own_app_receipt on public.notification_deliveries;
create policy notification_deliveries_update_own_app_receipt
on public.notification_deliveries
for update
to authenticated
using (
  (
    profile_id = (select auth.uid())
    and channel = 'app'
  )
  or (select app_private.current_user_role()) in ('admin', 'teacher')
)
with check (
  (
    profile_id = (select auth.uid())
    and channel = 'app'
    and (select app_private.is_notification_delivery_relevant(notification_id, profile_id))
  )
  or (select app_private.current_user_role()) in ('admin', 'teacher')
);

grant execute on function app_private.is_service_role() to authenticated;
grant execute on function app_private.notification_recipient_ids(
  public.notification_audience,
  uuid,
  uuid
) to authenticated;
grant execute on function app_private.is_notification_delivery_relevant(uuid, uuid) to authenticated;

insert into public.notification_deliveries (
  notification_id,
  profile_id,
  channel,
  status,
  delivered_at,
  read_at
)
select
  notification.id,
  recipient.profile_id,
  'app'::public.notification_delivery_channel,
  case
    when recipient.profile_id = any(coalesce(notification.read_by, '{}'::uuid[]))
    then 'read'::public.notification_delivery_status
    else 'delivered'::public.notification_delivery_status
  end,
  coalesce(notification.created_at, now()),
  case
    when recipient.profile_id = any(coalesce(notification.read_by, '{}'::uuid[]))
    then coalesce(notification.updated_at, notification.created_at, now())
    else null
  end
from public.notifications as notification
cross join lateral app_private.notification_recipient_ids(
  notification.audience,
  notification.group_id,
  notification.user_id
) as recipient(profile_id)
on conflict (notification_id, profile_id, channel) do nothing;

create index if not exists notification_deliveries_notification_idx
  on public.notification_deliveries(notification_id);

create index if not exists notification_deliveries_profile_status_idx
  on public.notification_deliveries(profile_id, status);

create index if not exists notification_deliveries_channel_status_idx
  on public.notification_deliveries(channel, status);

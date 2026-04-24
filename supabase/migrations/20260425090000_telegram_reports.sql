create table if not exists public.telegram_subscriptions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  chat_id bigint not null,
  username text,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.telegram_report_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  date_from date not null,
  date_to date not null,
  sent_count integer not null default 0,
  status text not null default 'sent',
  error_message text,
  created_at timestamptz not null default now()
);

drop trigger if exists telegram_subscriptions_touch_updated_at on public.telegram_subscriptions;
create trigger telegram_subscriptions_touch_updated_at
before update on public.telegram_subscriptions
for each row execute function public.touch_updated_at();

alter table public.telegram_subscriptions enable row level security;
alter table public.telegram_report_runs enable row level security;

drop policy if exists telegram_subscriptions_staff_select on public.telegram_subscriptions;
create policy telegram_subscriptions_staff_select
on public.telegram_subscriptions
for select
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists telegram_report_runs_staff_select on public.telegram_report_runs;
create policy telegram_report_runs_staff_select
on public.telegram_report_runs
for select
to authenticated
using (app_private.current_user_role() in ('admin', 'teacher'));

drop policy if exists telegram_report_runs_staff_insert on public.telegram_report_runs;
create policy telegram_report_runs_staff_insert
on public.telegram_report_runs
for insert
to authenticated
with check (app_private.current_user_role() in ('admin', 'teacher'));

create index if not exists telegram_subscriptions_active_idx
  on public.telegram_subscriptions(is_active, username);

create index if not exists telegram_report_runs_created_at_idx
  on public.telegram_report_runs(created_at desc);

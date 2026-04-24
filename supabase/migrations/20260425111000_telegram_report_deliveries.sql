create table if not exists public.telegram_report_deliveries (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null references public.telegram_report_runs(id) on delete cascade,
  telegram_subscription_id uuid references public.telegram_subscriptions(id) on delete set null,
  telegram_user_id bigint not null,
  chat_id bigint not null,
  username text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'read', 'failed')),
  telegram_message_id bigint,
  sent_at timestamptz,
  read_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists telegram_report_deliveries_touch_updated_at on public.telegram_report_deliveries;
create trigger telegram_report_deliveries_touch_updated_at
before update on public.telegram_report_deliveries
for each row execute function public.touch_updated_at();

alter table public.telegram_report_deliveries enable row level security;

drop policy if exists telegram_report_deliveries_staff_select on public.telegram_report_deliveries;
create policy telegram_report_deliveries_staff_select
on public.telegram_report_deliveries
for select
to authenticated
using ((select app_private.current_user_role()) in ('admin', 'teacher'));

create index if not exists telegram_report_deliveries_run_idx
  on public.telegram_report_deliveries(report_run_id);

create index if not exists telegram_report_deliveries_user_status_idx
  on public.telegram_report_deliveries(telegram_user_id, status);

create index if not exists telegram_report_deliveries_created_at_idx
  on public.telegram_report_deliveries(created_at desc);

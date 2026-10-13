-- ============================================================================
-- AlterSched V8 - Schedule generator settings
-- Safe to run more than once. Does not delete data.
--
-- One row of settings the Super Admin can change in Settings:
--   * which days classes may be scheduled (1 = Monday ... 7 = Sunday)
--   * the earliest start and latest end time of a class day
--   * the start-time step the generator tries (15, 30 or 60 minutes)
-- Defaults match the previous fixed values (Monday-Saturday, 07:00-21:00, 30 minutes).
-- ============================================================================

begin;

create table if not exists public.scheduling_settings (
  id boolean primary key default true,
  teaching_days smallint[] not null default '{1,2,3,4,5,6}',
  day_start time not null default '07:00',
  day_end time not null default '21:00',
  slot_minutes smallint not null default 30,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint scheduling_settings_single_row check (id),
  constraint scheduling_settings_hours check (day_end > day_start),
  constraint scheduling_settings_slot check (slot_minutes in (15, 30, 60)),
  constraint scheduling_settings_days check (
    cardinality(teaching_days) > 0
    and teaching_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  )
);

insert into public.scheduling_settings (id) values (true) on conflict (id) do nothing;

alter table public.scheduling_settings enable row level security;

drop policy if exists scheduling_settings_read on public.scheduling_settings;
create policy scheduling_settings_read on public.scheduling_settings
for select to authenticated
using (true);

drop policy if exists scheduling_settings_super_admin_update on public.scheduling_settings;
create policy scheduling_settings_super_admin_update on public.scheduling_settings
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

grant select, update on public.scheduling_settings to authenticated;

commit;

-- AlterSched BSIT Panel Revision - Batch 1
-- SAFE MIGRATION: run on the existing AlterSched database. Do not reset/drop old tables.

begin;

-- Subject Catalog metadata used directly by the BSIT scheduler.
alter table public.subjects
  add column if not exists default_year_level integer,
  add column if not exists default_room_type_id uuid references public.room_types(id) on delete set null;

do $$ begin
  alter table public.subjects add constraint subjects_default_year_level_check
    check (default_year_level is null or default_year_level between 1 and 4);
exception when duplicate_object then null; end $$;

-- Keep schedule_entries.entry_type for schedule category (regular/makeup/special).
-- Lecture/Lab and delivery mode are separate concepts.
alter table public.schedule_entries
  add column if not exists session_type text not null default 'lecture',
  add column if not exists delivery_mode text not null default 'onsite';

do $$ begin
  alter table public.schedule_entries add constraint schedule_entries_session_type_check
    check (session_type in ('lecture','lab'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.schedule_entries add constraint schedule_entries_delivery_mode_check
    check (delivery_mode in ('onsite','async','online','hybrid'));
exception when duplicate_object then null; end $$;

-- Import audit. Each uploaded workbook receives one batch record.
create table if not exists public.study_load_imports (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  file_name text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  rejected_rows integer not null default 0,
  status text not null default 'completed' check (status in ('completed','completed_with_errors','failed')),
  error_summary jsonb not null default '[]'::jsonb,
  imported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists study_load_imports_semester_idx on public.study_load_imports(semester_id, created_at desc);
create index if not exists subjects_default_year_idx on public.subjects(default_year_level);
create index if not exists class_offerings_semester_section_subject_idx on public.class_offerings(semester_id, section_id, subject_id);

alter table public.study_load_imports enable row level security;

drop policy if exists study_load_imports_super_admin_all on public.study_load_imports;
create policy study_load_imports_super_admin_all on public.study_load_imports
for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin' and p.account_status = 'approved')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin' and p.account_status = 'approved')
);

commit;

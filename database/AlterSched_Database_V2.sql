-- AlterSched Database V2
-- Target: Supabase PostgreSQL
-- Purpose: School-wide academic scheduling, approval, schedule claiming, alteration, versioning, notifications, and auditability.
-- NOTE: Designed for a fresh Supabase project.

begin;

-- =========================================================
-- 0. EXTENSIONS
-- =========================================================
create extension if not exists pgcrypto;

-- =========================================================
-- 1. ENUM TYPES
-- =========================================================
do $$ begin
  create type public.user_role as enum ('super_admin','department_scheduler','faculty','student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('pending','approved','rejected','suspended','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.schedule_status as enum ('draft','submitted','approved','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.availability_type as enum ('available','preferred','unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.room_availability_status as enum ('available','blocked','maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_method as enum ('code','qr','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_result as enum ('success','denied','expired','revoked','invalid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.change_type as enum ('normal_request','emergency','administrative');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_priority as enum ('low','normal','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.validation_severity as enum ('info','warning','error');
exception when duplicate_object then null; end $$;

-- =========================================================
-- 2. COMMON TRIGGER FUNCTION
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 3. INSTITUTION + ACADEMIC STRUCTURE
-- =========================================================
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  logo_url text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_year_valid_dates check (end_date > start_date),
  constraint academic_year_unique_name unique (institution_id, name)
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  name text not null,
  term_order integer not null default 1 check (term_order > 0),
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semester_valid_dates check (end_date > start_date),
  constraint semester_unique_name unique (academic_year_id, name)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_unique_code unique (institution_id, code),
  constraint department_unique_name unique (institution_id, name)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_unique_code unique (department_id, code),
  constraint program_unique_name unique (department_id, name)
);

create table if not exists public.year_levels (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  level_number integer not null check (level_number > 0),
  name text not null,
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint year_level_unique_num unique (program_id, level_number),
  constraint year_level_unique_name unique (program_id, name)
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  year_level_id uuid not null references public.year_levels(id) on delete restrict,
  code text not null,
  name text not null,
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint section_unique_code unique (year_level_id, code),
  constraint section_unique_name unique (year_level_id, name)
);

-- =========================================================
-- 4. USERS + APPROVALS
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text not null default '',
  role public.user_role not null default 'student',
  account_status public.account_status not null default 'pending',
  phone_number text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  student_id text not null unique,
  department_id uuid not null references public.departments(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  year_level_id uuid not null references public.year_levels(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faculty_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_id text not null unique,
  department_id uuid not null references public.departments(id) on delete restrict,
  employment_type text,
  max_teaching_load numeric(6,2) check (max_teaching_load is null or max_teaching_load >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduler_departments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint scheduler_department_unique unique (profile_id, department_id)
);

create table if not exists public.account_approvals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.account_status not null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  remarks text,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requested_department_id uuid references public.departments(id) on delete restrict,
  requested_program_id uuid references public.programs(id) on delete restrict,
  requested_year_level_id uuid references public.year_levels(id) on delete restrict,
  requested_section_id uuid references public.sections(id) on delete restrict,
  reason text not null,
  status public.approval_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 5. SUBJECTS + CURRICULUM
-- =========================================================
create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  code text not null,
  name text not null,
  units numeric(5,2) not null default 0 check (units >= 0),
  lecture_hours numeric(5,2) not null default 0 check (lecture_hours >= 0),
  lab_hours numeric(5,2) not null default 0 check (lab_hours >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_unique_code unique (department_id, code)
);

create table if not exists public.curricula (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  name text not null,
  effective_from_year integer,
  effective_to_year integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_valid_years check (
    effective_to_year is null or effective_from_year is null or effective_to_year >= effective_from_year
  ),
  constraint curriculum_unique_name unique (program_id, name)
);

create table if not exists public.curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  year_level_id uuid not null references public.year_levels(id) on delete restrict,
  term_order integer not null check (term_order > 0),
  required_room_type_id uuid references public.room_types(id) on delete set null,
  weekly_hours numeric(5,2) not null check (weekly_hours > 0),
  created_at timestamptz not null default now(),
  constraint curriculum_subject_unique unique (curriculum_id, subject_id, year_level_id, term_order)
);

create table if not exists public.faculty_subjects (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty_profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint faculty_subject_unique unique (faculty_id, subject_id)
);

-- =========================================================
-- 6. AVAILABILITY + ROOMS
-- =========================================================
create table if not exists public.faculty_availability (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculty_profiles(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  availability_type public.availability_type not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faculty_availability_valid_time check (end_time > start_time)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  room_type_id uuid references public.room_types(id) on delete set null,
  code text not null,
  name text not null,
  building text,
  floor text,
  capacity integer not null check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_unique_code unique (institution_id, code)
);

create table if not exists public.room_availability (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  status public.room_availability_status not null default 'available',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_availability_valid_time check (end_time > start_time)
);

-- =========================================================
-- 7. CLASS OFFERINGS + SCHEDULING
-- =========================================================
create table if not exists public.class_offerings (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  faculty_id uuid references public.faculty_profiles(id) on delete restrict,
  required_weekly_hours numeric(5,2) not null check (required_weekly_hours > 0),
  expected_students integer check (expected_students is null or expected_students > 0),
  status text not null default 'active' check (status in ('active','inactive','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_offering_unique unique (semester_id, section_id, subject_id)
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  year_level_id uuid not null references public.year_levels(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  current_version_id uuid,
  status public.schedule_status not null default 'draft',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_unique_scope unique (semester_id, section_id)
);

create table if not exists public.schedule_versions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status public.schedule_status not null default 'draft',
  created_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  change_reason text,
  created_at timestamptz not null default now(),
  constraint schedule_version_unique unique (schedule_id, version_number)
);

alter table public.schedules
  drop constraint if exists schedules_current_version_id_fkey;
alter table public.schedules
  add constraint schedules_current_version_id_fkey
  foreign key (current_version_id) references public.schedule_versions(id) on delete set null;

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  schedule_version_id uuid not null references public.schedule_versions(id) on delete cascade,
  class_offering_id uuid not null references public.class_offerings(id) on delete restrict,
  faculty_id uuid references public.faculty_profiles(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  entry_type text not null default 'regular' check (entry_type in ('regular','makeup','special')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_entry_valid_time check (end_time > start_time)
);

create table if not exists public.schedule_validation_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_version_id uuid not null references public.schedule_versions(id) on delete cascade,
  schedule_entry_id uuid references public.schedule_entries(id) on delete cascade,
  conflict_type text not null,
  severity public.validation_severity not null default 'error',
  message text not null,
  related_entry_id uuid references public.schedule_entries(id) on delete set null,
  resolved boolean not null default false,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 8. SCHEDULE ACCESS / CLAIMING
-- =========================================================
create table if not exists public.schedule_access_codes (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  schedule_version_id uuid not null references public.schedule_versions(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete restrict,
  code_hash text not null unique,
  qr_token_hash text unique,
  active boolean not null default true,
  expires_at timestamptz,
  generated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.schedule_memberships (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  schedule_version_id uuid not null references public.schedule_versions(id) on delete restrict,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete restrict,
  claimed_via public.claim_method not null,
  claimed_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint schedule_membership_unique unique (schedule_id, student_profile_id)
);

create table if not exists public.schedule_claim_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  schedule_access_code_id uuid references public.schedule_access_codes(id) on delete set null,
  result public.claim_result not null,
  failure_reason text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 9. ALTERATIONS + VERSION HISTORY
-- =========================================================
create table if not exists public.schedule_change_requests (
  id uuid primary key default gen_random_uuid(),
  schedule_entry_id uuid not null references public.schedule_entries(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  proposed_day smallint check (proposed_day is null or proposed_day between 1 and 7),
  proposed_start_time time,
  proposed_end_time time,
  proposed_room_id uuid references public.rooms(id) on delete restrict,
  reason text not null,
  change_type public.change_type not null default 'normal_request',
  status public.approval_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint change_request_valid_time check (
    proposed_start_time is null or proposed_end_time is null or proposed_end_time > proposed_start_time
  )
);

create table if not exists public.schedule_revision_history (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  old_version_id uuid references public.schedule_versions(id) on delete set null,
  new_version_id uuid references public.schedule_versions(id) on delete set null,
  change_request_id uuid references public.schedule_change_requests(id) on delete set null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  change_type public.change_type not null default 'administrative',
  reason text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 10. NOTIFICATIONS + AUDIT
-- =========================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  reference_type text,
  reference_id uuid,
  priority public.notification_priority not null default 'normal',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  constraint notification_ack_unique unique (notification_id, profile_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 11. DATA INTEGRITY HELPER FUNCTIONS
-- =========================================================
create or replace function public.validate_student_academic_chain()
returns trigger
language plpgsql
as $$
declare
  v_program uuid;
  v_year_program uuid;
  v_section_year uuid;
begin
  select department_id into v_program from public.programs where id = new.program_id;
  if v_program is distinct from new.department_id then
    raise exception 'Program does not belong to selected department';
  end if;

  select program_id into v_year_program from public.year_levels where id = new.year_level_id;
  if v_year_program is distinct from new.program_id then
    raise exception 'Year level does not belong to selected program';
  end if;

  select year_level_id into v_section_year from public.sections where id = new.section_id;
  if v_section_year is distinct from new.year_level_id then
    raise exception 'Section does not belong to selected year level';
  end if;

  return new;
end;
$$;

create or replace function public.validate_schedule_scope()
returns trigger
language plpgsql
as $$
declare
  v_program_department uuid;
  v_year_program uuid;
  v_section_year uuid;
begin
  select department_id into v_program_department from public.programs where id = new.program_id;
  if v_program_department is distinct from new.department_id then
    raise exception 'Schedule program does not belong to selected department';
  end if;

  select program_id into v_year_program from public.year_levels where id = new.year_level_id;
  if v_year_program is distinct from new.program_id then
    raise exception 'Schedule year level does not belong to selected program';
  end if;

  select year_level_id into v_section_year from public.sections where id = new.section_id;
  if v_section_year is distinct from new.year_level_id then
    raise exception 'Schedule section does not belong to selected year level';
  end if;

  return new;
end;
$$;

create or replace function public.validate_schedule_entry_alignment()
returns trigger
language plpgsql
as $$
declare
  v_offering_section uuid;
  v_offering_faculty uuid;
  v_expected integer;
  v_capacity integer;
begin
  select section_id, faculty_id, expected_students
  into v_offering_section, v_offering_faculty, v_expected
  from public.class_offerings
  where id = new.class_offering_id;

  if v_offering_section is distinct from new.section_id then
    raise exception 'Schedule entry section does not match class offering section';
  end if;

  if v_offering_faculty is not null and new.faculty_id is distinct from v_offering_faculty then
    raise exception 'Schedule entry faculty does not match class offering faculty';
  end if;

  select capacity into v_capacity from public.rooms where id = new.room_id;
  if v_expected is not null and v_capacity is not null and v_capacity < v_expected then
    raise exception 'Room capacity is smaller than expected class size';
  end if;

  return new;
end;
$$;

-- Basic overlap protection within the SAME schedule version.
create or replace function public.prevent_schedule_entry_overlap()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.schedule_entries e
    where e.schedule_version_id = new.schedule_version_id
      and e.id <> coalesce(new.id, gen_random_uuid())
      and e.day_of_week = new.day_of_week
      and new.start_time < e.end_time
      and new.end_time > e.start_time
      and (
        e.room_id = new.room_id
        or e.section_id = new.section_id
        or (new.faculty_id is not null and e.faculty_id = new.faculty_id)
      )
  ) then
    raise exception 'Schedule conflict detected: overlapping room, section, or faculty in this schedule version';
  end if;

  return new;
end;
$$;

-- =========================================================
-- 12. SCHEDULE CLAIM FUNCTION
-- IMPORTANT: Server should pass the already-resolved access-code row id after hashing supplied code/QR.
-- =========================================================
create or replace function public.claim_schedule(
  p_access_code_id uuid,
  p_claim_method public.claim_method default 'code'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_student public.student_profiles%rowtype;
  v_code public.schedule_access_codes%rowtype;
  v_schedule public.schedules%rowtype;
  v_membership_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or v_profile.role <> 'student' then
    raise exception 'Only student accounts can claim student schedules';
  end if;

  if v_profile.account_status <> 'approved' then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'denied', 'account_not_approved');
    raise exception 'Account must be approved before claiming a schedule';
  end if;

  select * into v_student from public.student_profiles where profile_id = v_user_id;
  if not found then
    raise exception 'Student profile not found';
  end if;

  select * into v_code from public.schedule_access_codes where id = p_access_code_id;
  if not found then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, null, 'invalid', 'access_code_not_found');
    raise exception 'Invalid schedule access code';
  end if;

  if not v_code.active or v_code.revoked_at is not null then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'revoked', 'access_code_revoked');
    raise exception 'Schedule access code is inactive';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'expired', 'access_code_expired');
    raise exception 'Schedule access code has expired';
  end if;

  select * into v_schedule from public.schedules where id = v_code.schedule_id;
  if not found or v_schedule.status <> 'published' then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'denied', 'schedule_not_published');
    raise exception 'Schedule is not currently published';
  end if;

  if v_student.department_id <> v_schedule.department_id then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'denied', 'department_mismatch');
    raise exception 'This schedule is not assigned to your department';
  end if;

  if v_student.program_id <> v_schedule.program_id then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'denied', 'program_mismatch');
    raise exception 'This schedule is not assigned to your program';
  end if;

  if v_student.year_level_id <> v_schedule.year_level_id then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'denied', 'year_level_mismatch');
    raise exception 'This schedule is not assigned to your year level';
  end if;

  if v_student.section_id <> v_schedule.section_id or v_code.section_id <> v_student.section_id then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'denied', 'section_mismatch');
    raise exception 'This schedule is not assigned to your section';
  end if;

  if exists (
    select 1
    from public.schedule_memberships sm
    join public.schedules s on s.id = sm.schedule_id
    where sm.student_profile_id = v_student.id
      and sm.active = true
      and s.semester_id = v_schedule.semester_id
      and sm.schedule_id <> v_schedule.id
  ) then
    insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
    values (v_user_id, p_access_code_id, 'denied', 'existing_active_schedule_for_semester');
    raise exception 'You already have an active schedule for this semester';
  end if;

  insert into public.schedule_memberships(
    schedule_id, schedule_version_id, student_profile_id, section_id, claimed_via, active
  ) values (
    v_schedule.id, v_code.schedule_version_id, v_student.id, v_student.section_id, p_claim_method, true
  )
  on conflict (schedule_id, student_profile_id)
  do update set
    schedule_version_id = excluded.schedule_version_id,
    section_id = excluded.section_id,
    claimed_via = excluded.claimed_via,
    claimed_at = now(),
    active = true
  returning id into v_membership_id;

  insert into public.schedule_claim_attempts(profile_id, schedule_access_code_id, result, failure_reason)
  values (v_user_id, p_access_code_id, 'success', null);

  return v_membership_id;
end;
$$;

-- =========================================================
-- 13. PROFILE CREATION FROM SUPABASE AUTH
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, account_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'role', 'student') in ('student','faculty')
        then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'student'::public.user_role
    end,
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- 14. UPDATED_AT TRIGGERS
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'institutions','academic_years','semesters','departments','programs','year_levels','sections',
    'profiles','student_profiles','faculty_profiles','profile_change_requests','room_types','subjects',
    'curricula','faculty_availability','rooms','room_availability','class_offerings','schedules',
    'schedule_entries','schedule_change_requests'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t, t);
  end loop;
end $$;

-- =========================================================
-- 15. DATA VALIDATION TRIGGERS
-- =========================================================
drop trigger if exists trg_validate_student_academic_chain on public.student_profiles;
create trigger trg_validate_student_academic_chain
before insert or update on public.student_profiles
for each row execute procedure public.validate_student_academic_chain();

drop trigger if exists trg_validate_schedule_scope on public.schedules;
create trigger trg_validate_schedule_scope
before insert or update on public.schedules
for each row execute procedure public.validate_schedule_scope();

drop trigger if exists trg_validate_schedule_entry_alignment on public.schedule_entries;
create trigger trg_validate_schedule_entry_alignment
before insert or update on public.schedule_entries
for each row execute procedure public.validate_schedule_entry_alignment();

drop trigger if exists trg_prevent_schedule_entry_overlap on public.schedule_entries;
create trigger trg_prevent_schedule_entry_overlap
before insert or update on public.schedule_entries
for each row execute procedure public.prevent_schedule_entry_overlap();

-- =========================================================
-- 16. PERFORMANCE INDEXES
-- =========================================================
create index if not exists idx_profiles_role_status on public.profiles(role, account_status);
create index if not exists idx_student_profiles_scope on public.student_profiles(program_id, year_level_id, section_id);
create index if not exists idx_faculty_profiles_department on public.faculty_profiles(department_id);
create index if not exists idx_scheduler_departments_profile on public.scheduler_departments(profile_id, active);
create index if not exists idx_semesters_academic_year on public.semesters(academic_year_id);
create index if not exists idx_sections_year_level on public.sections(year_level_id);
create index if not exists idx_class_offerings_semester_section on public.class_offerings(semester_id, section_id);
create index if not exists idx_schedule_versions_schedule on public.schedule_versions(schedule_id, version_number desc);
create index if not exists idx_schedule_entries_version_day on public.schedule_entries(schedule_version_id, day_of_week, start_time, end_time);
create index if not exists idx_schedule_entries_faculty on public.schedule_entries(faculty_id, day_of_week, start_time, end_time);
create index if not exists idx_schedule_entries_room on public.schedule_entries(room_id, day_of_week, start_time, end_time);
create index if not exists idx_schedule_entries_section on public.schedule_entries(section_id, day_of_week, start_time, end_time);
create index if not exists idx_access_codes_schedule_active on public.schedule_access_codes(schedule_id, active);
create index if not exists idx_memberships_student_active on public.schedule_memberships(student_profile_id, active);
create index if not exists idx_notifications_profile_created on public.notifications(profile_id, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id, created_at desc);

-- =========================================================
-- 17. RLS HELPER FUNCTIONS
-- =========================================================
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and account_status = 'approved'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and account_status = 'approved'
  );
$$;

create or replace function public.can_manage_department(p_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
  or exists(
    select 1
    from public.profiles p
    join public.scheduler_departments sd on sd.profile_id = p.id
    where p.id = auth.uid()
      and p.role = 'department_scheduler'
      and p.account_status = 'approved'
      and sd.department_id = p_department_id
      and sd.active = true
  );
$$;

-- =========================================================
-- 18. ENABLE RLS
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'institutions','academic_years','semesters','departments','programs','year_levels','sections',
    'profiles','student_profiles','faculty_profiles','scheduler_departments','account_approvals',
    'profile_change_requests','room_types','subjects','curricula','curriculum_subjects','faculty_subjects',
    'faculty_availability','rooms','room_availability','class_offerings','schedules','schedule_versions',
    'schedule_entries','schedule_validation_logs','schedule_access_codes','schedule_memberships',
    'schedule_claim_attempts','schedule_change_requests','schedule_revision_history','notifications',
    'notification_acknowledgements','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- =========================================================
-- 19. STARTER RLS POLICIES
-- These are intentionally conservative. Server-side service-role operations can still bypass RLS.
-- =========================================================

-- Profiles: users can read themselves; super admin can read all.
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_super_admin());

-- Users may update only their own non-privileged profile fields via app RPC/server logic.
-- Direct unrestricted update is intentionally NOT granted here.

-- Student profile: student can read own; admins/schedulers can read.
drop policy if exists student_profiles_select on public.student_profiles;
create policy student_profiles_select on public.student_profiles
for select to authenticated
using (
  profile_id = auth.uid()
  or public.is_super_admin()
  or public.can_manage_department(department_id)
);

-- Faculty profile: faculty can read own; admins/schedulers can read department faculty.
drop policy if exists faculty_profiles_select on public.faculty_profiles;
create policy faculty_profiles_select on public.faculty_profiles
for select to authenticated
using (
  profile_id = auth.uid()
  or public.is_super_admin()
  or public.can_manage_department(department_id)
);

-- Readable academic catalog to approved authenticated users.
do $$
declare
  t text;
begin
  foreach t in array array['institutions','academic_years','semesters','departments','programs','year_levels','sections','room_types','subjects','curricula','curriculum_subjects','rooms']
  loop
    execute format('drop policy if exists %I_read_approved on public.%I', t, t);
    execute format('create policy %I_read_approved on public.%I for select to authenticated using (public.is_approved_user())', t, t);
  end loop;
end $$;

-- Faculty availability: own faculty record or department manager/admin.
drop policy if exists faculty_availability_select on public.faculty_availability;
create policy faculty_availability_select on public.faculty_availability
for select to authenticated
using (
  exists (
    select 1 from public.faculty_profiles fp
    where fp.id = faculty_id
      and (fp.profile_id = auth.uid() or public.can_manage_department(fp.department_id))
  )
  or public.is_super_admin()
);

-- Schedules: students only see schedules they have successfully claimed; faculty only see
-- published schedules containing their own teaching assignments; managers/admin see authorized scope.
drop policy if exists schedules_select on public.schedules;
create policy schedules_select on public.schedules
for select to authenticated
using (
  public.is_super_admin()
  or public.can_manage_department(department_id)
  or (
    status = 'published'
    and exists (
      select 1
      from public.schedule_memberships sm
      join public.student_profiles sp on sp.id = sm.student_profile_id
      where sm.schedule_id = schedules.id
        and sm.active = true
        and sp.profile_id = auth.uid()
    )
  )
  or (
    status = 'published'
    and exists (
      select 1
      from public.schedule_versions sv
      join public.schedule_entries se on se.schedule_version_id = sv.id
      join public.faculty_profiles fp on fp.id = se.faculty_id
      where sv.schedule_id = schedules.id
        and sv.id = schedules.current_version_id
        and fp.profile_id = auth.uid()
    )
  )
);

-- Schedule versions follow assignment/membership and management scope.
drop policy if exists schedule_versions_select on public.schedule_versions;
create policy schedule_versions_select on public.schedule_versions
for select to authenticated
using (
  exists (
    select 1
    from public.schedules s
    where s.id = schedule_id
      and (
        public.is_super_admin()
        or public.can_manage_department(s.department_id)
        or (
          s.status = 'published'
          and exists (
            select 1
            from public.schedule_memberships sm
            join public.student_profiles sp on sp.id = sm.student_profile_id
            where sm.schedule_id = s.id
              and sm.active = true
              and sp.profile_id = auth.uid()
          )
        )
        or (
          s.status = 'published'
          and exists (
            select 1
            from public.schedule_entries se
            join public.faculty_profiles fp on fp.id = se.faculty_id
            where se.schedule_version_id = schedule_versions.id
              and fp.profile_id = auth.uid()
          )
        )
      )
  )
);

-- Schedule entries: students see entries from their active claimed schedule version;
-- faculty see their own teaching entries; managers/admin see authorized department entries.
drop policy if exists schedule_entries_select on public.schedule_entries;
create policy schedule_entries_select on public.schedule_entries
for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.schedule_versions sv
    join public.schedules s on s.id = sv.schedule_id
    where sv.id = schedule_version_id
      and public.can_manage_department(s.department_id)
  )
  or exists (
    select 1
    from public.schedule_versions sv
    join public.schedules s on s.id = sv.schedule_id
    join public.schedule_memberships sm
      on sm.schedule_id = s.id
     and sm.schedule_version_id = sv.id
     and sm.active = true
    join public.student_profiles sp on sp.id = sm.student_profile_id
    where sv.id = schedule_version_id
      and s.status = 'published'
      and sp.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.faculty_profiles fp
    where fp.id = schedule_entries.faculty_id
      and fp.profile_id = auth.uid()
      and public.is_approved_user()
  )
);

-- Class offerings: faculty can read their own assignments; managers/admin can read their department offerings.
drop policy if exists class_offerings_select on public.class_offerings;
create policy class_offerings_select on public.class_offerings
for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.faculty_profiles fp
    where fp.id = class_offerings.faculty_id
      and fp.profile_id = auth.uid()
      and public.is_approved_user()
  )
  or exists (
    select 1
    from public.subjects sub
    where sub.id = class_offerings.subject_id
      and public.can_manage_department(sub.department_id)
  )
);

-- Memberships: student sees own; managers/admin see schedule memberships in department.
drop policy if exists schedule_memberships_select on public.schedule_memberships;
create policy schedule_memberships_select on public.schedule_memberships
for select to authenticated
using (
  exists (
    select 1 from public.student_profiles sp
    where sp.id = student_profile_id and sp.profile_id = auth.uid()
  )
  or exists (
    select 1 from public.schedules s
    where s.id = schedule_id and public.can_manage_department(s.department_id)
  )
  or public.is_super_admin()
);

-- Notifications: users only see their own.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select to authenticated
using (profile_id = auth.uid());

-- Notification acknowledgements: users see their own; admin can audit via service role/admin backend.
drop policy if exists notification_ack_select_own on public.notification_acknowledgements;
create policy notification_ack_select_own on public.notification_acknowledgements
for select to authenticated
using (profile_id = auth.uid());

-- Profile change requests: user sees own; department manager/admin can see relevant student request based on current profile.
drop policy if exists profile_change_requests_select on public.profile_change_requests;
create policy profile_change_requests_select on public.profile_change_requests
for select to authenticated
using (
  profile_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.student_profiles sp
    where sp.profile_id = profile_change_requests.profile_id
      and public.can_manage_department(sp.department_id)
  )
);

-- Change requests: requester sees own; manager/admin sees requests for their department.
drop policy if exists schedule_change_requests_select on public.schedule_change_requests;
create policy schedule_change_requests_select on public.schedule_change_requests
for select to authenticated
using (
  requested_by = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1
    from public.schedule_entries se
    join public.schedule_versions sv on sv.id = se.schedule_version_id
    join public.schedules s on s.id = sv.schedule_id
    where se.id = schedule_entry_id
      and public.can_manage_department(s.department_id)
  )
);

-- Claims/audit/access-code tables are intentionally not directly selectable by ordinary students.
-- Use secure RPC/server endpoints for entering a code/QR and resolving its hash.

-- =========================================================
-- 20. GRANTS
-- =========================================================
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant execute on function public.claim_schedule(uuid, public.claim_method) to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_approved_user() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.can_manage_department(uuid) to authenticated;

-- Future tables created in public remain conservative by default.
alter default privileges in schema public grant select on tables to authenticated;

-- =========================================================
-- 21. OPTIONAL STARTER ROOM TYPES
-- =========================================================
insert into public.room_types(name, description)
values
  ('Lecture Room', 'General-purpose lecture classroom'),
  ('Computer Laboratory', 'Computer-equipped laboratory'),
  ('Science Laboratory', 'Laboratory for science courses'),
  ('Workshop', 'Hands-on technical workshop room'),
  ('Auditorium', 'Large-capacity auditorium or hall')
on conflict (name) do nothing;

commit;

-- =========================================================
-- ALTERSched V2 IMPLEMENTATION NOTES
-- =========================================================
-- 1. Schedule code / QR raw values should be generated in the trusted server layer.
--    Store only hashes in schedule_access_codes. Resolve the raw code/QR to the row id on the server,
--    then call claim_schedule(access_code_id, claim_method).
-- 2. The overlap trigger prevents direct conflicts inside the same schedule version.
--    Cross-department/global auto-generation and alternative-slot ranking should be handled in server logic,
--    then validated before publishing.
-- 3. Published schedules should be treated as frozen by application/server permissions.
--    Approved changes should create a new schedule_version and schedule_revision_history entry.
-- 4. RLS starter policies are deliberately restrictive. Insert/update/delete operations for management
--    modules should be performed via protected server actions/RPCs after verifying role + department scope.
-- 5. Do not expose Supabase service_role keys to the browser.

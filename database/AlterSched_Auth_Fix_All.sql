-- AlterSched Phase 2 Auth FIX ALL
-- Run AFTER AlterSched_Database_V2.sql.
-- Safe to run even if the older Phase 2 auth patch was already applied.
-- Purpose:
--   1) Keep public Student/Faculty registration secure.
--   2) Allow manually-created Supabase Auth users (first Super Admin) without academic metadata.
--   3) Recreate the Auth trigger safely.
--   4) Expose only the active academic catalog needed by the registration form.

begin;

-- =========================================================
-- 1. REGISTRATION CATALOG
-- =========================================================
create or replace function public.get_registration_catalog()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'departments', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', d.id, 'code', d.code, 'name', d.name)
        order by d.name
      )
      from public.departments d
      where d.is_active = true
    ), '[]'::jsonb),

    'programs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'department_id', p.department_id,
          'code', p.code,
          'name', p.name
        ) order by p.name
      )
      from public.programs p
      join public.departments d on d.id = p.department_id
      where p.is_active = true
        and d.is_active = true
    ), '[]'::jsonb),

    'year_levels', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', y.id,
          'program_id', y.program_id,
          'level_number', y.level_number,
          'name', y.name
        ) order by y.sort_order, y.level_number
      )
      from public.year_levels y
      join public.programs p on p.id = y.program_id
      join public.departments d on d.id = p.department_id
      where y.is_active = true
        and p.is_active = true
        and d.is_active = true
    ), '[]'::jsonb),

    'sections', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'year_level_id', s.year_level_id,
          'code', s.code,
          'name', s.name
        ) order by s.name
      )
      from public.sections s
      join public.year_levels y on y.id = s.year_level_id
      join public.programs p on p.id = y.program_id
      join public.departments d on d.id = p.department_id
      where s.is_active = true
        and y.is_active = true
        and p.is_active = true
        and d.is_active = true
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_registration_catalog() from public;
grant execute on function public.get_registration_catalog() to anon, authenticated;

-- =========================================================
-- 2. ROBUST AUTH USER TRIGGER
-- =========================================================
-- Rules:
-- * Explicit role=student -> academic metadata is REQUIRED and validated.
-- * Explicit role=faculty -> department + employee ID are REQUIRED.
-- * Any other/no role -> create only a pending base profile.
--   This is what lets Supabase Dashboard create the first trusted admin account.
-- * Privileged roles can NEVER be self-assigned from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_text text := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', '')));
  v_role public.user_role;
  v_department uuid;
  v_program uuid;
  v_year uuid;
  v_section uuid;
  v_student_id text;
  v_employee_id text;
  v_full_name text;
begin
  v_full_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  -- Never accept super_admin/department_scheduler from client metadata.
  if v_role_text = 'faculty' then
    v_role := 'faculty'::public.user_role;
  else
    v_role := 'student'::public.user_role;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    account_status
  )
  values (
    new.id,
    new.email,
    case
      when v_full_name <> '' then v_full_name
      else split_part(coalesce(new.email, ''), '@', 1)
    end,
    v_role,
    'pending'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when excluded.full_name <> '' then excluded.full_name
        else public.profiles.full_name
      end,
      updated_at = now();

  -- Public STUDENT registration only when role is explicitly supplied as student.
  if v_role_text = 'student' then
    begin
      v_department := nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid;
      v_program := nullif(new.raw_user_meta_data ->> 'program_id', '')::uuid;
      v_year := nullif(new.raw_user_meta_data ->> 'year_level_id', '')::uuid;
      v_section := nullif(new.raw_user_meta_data ->> 'section_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid student academic registration metadata';
    end;

    v_student_id := trim(coalesce(new.raw_user_meta_data ->> 'student_id', ''));

    if v_department is null
       or v_program is null
       or v_year is null
       or v_section is null
       or v_student_id = '' then
      raise exception 'Incomplete student registration metadata';
    end if;

    insert into public.student_profiles (
      profile_id,
      student_id,
      department_id,
      program_id,
      year_level_id,
      section_id
    )
    values (
      new.id,
      v_student_id,
      v_department,
      v_program,
      v_year,
      v_section
    )
    on conflict (profile_id) do nothing;

    insert into public.account_approvals(profile_id, status, remarks)
    values (new.id, 'pending', 'Student registration submitted for verification.');

  -- Public FACULTY registration only when role is explicitly supplied as faculty.
  elsif v_role_text = 'faculty' then
    begin
      v_department := nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid faculty department metadata';
    end;

    v_employee_id := trim(coalesce(new.raw_user_meta_data ->> 'employee_id', ''));

    if v_department is null or v_employee_id = '' then
      raise exception 'Incomplete faculty registration metadata';
    end if;

    insert into public.faculty_profiles (
      profile_id,
      employee_id,
      department_id
    )
    values (
      new.id,
      v_employee_id,
      v_department
    )
    on conflict (profile_id) do nothing;

    insert into public.account_approvals(profile_id, status, remarks)
    values (new.id, 'pending', 'Faculty registration submitted for verification.');

  else
    -- Manual Auth user / bootstrap account.
    -- No student/faculty academic row is required here.
    -- The trusted first administrator is promoted explicitly in SQL after creation.
    null;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

-- Reattach trigger to the corrected function.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =========================================================
-- 3. RECONCILE BASE PROFILES FOR ANY EXISTING AUTH USERS
-- =========================================================
-- This does NOT promote anybody and does NOT create academic profiles.
-- It only guarantees each existing auth.users row has a public.profiles row.
insert into public.profiles(id, email, full_name, role, account_status)
select
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  case
    when lower(coalesce(u.raw_user_meta_data ->> 'role', '')) = 'faculty'
      then 'faculty'::public.user_role
    else 'student'::public.user_role
  end,
  'pending'::public.account_status
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

commit;

-- =========================================================
-- FIRST SUPER ADMIN BOOTSTRAP (RUN ONLY AFTER ADD USER SUCCEEDS)
-- =========================================================
-- Replace the UUID below, then run these statements separately:
--
-- update public.profiles
-- set role = 'super_admin',
--     account_status = 'approved',
--     full_name = 'AlterSched Administrator',
--     updated_at = now()
-- where id = 'PASTE_AUTH_USER_UUID_HERE';
--
-- insert into public.account_approvals(profile_id, status, reviewed_by, reviewed_at, remarks)
-- values (
--   'PASTE_AUTH_USER_UUID_HERE',
--   'approved',
--   'PASTE_AUTH_USER_UUID_HERE',
--   now(),
--   'Initial trusted AlterSched Super Admin bootstrap.'
-- );

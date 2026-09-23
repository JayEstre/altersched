-- AlterSched Phase 2 Auth + Registration Patch
-- Run AFTER AlterSched_Database_V2.sql
-- Purpose: secure registration catalog + role-specific profile creation from Supabase Auth metadata.

begin;

-- Public-safe catalog for the registration form. Only active academic hierarchy is returned.
create or replace function public.get_registration_catalog()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'departments', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'code', d.code, 'name', d.name) order by d.name)
      from public.departments d
      where d.is_active = true
    ), '[]'::jsonb),
    'programs', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'department_id', p.department_id, 'code', p.code, 'name', p.name) order by p.name)
      from public.programs p
      join public.departments d on d.id = p.department_id
      where p.is_active = true and d.is_active = true
    ), '[]'::jsonb),
    'year_levels', coalesce((
      select jsonb_agg(jsonb_build_object('id', y.id, 'program_id', y.program_id, 'level_number', y.level_number, 'name', y.name) order by y.sort_order, y.level_number)
      from public.year_levels y
      join public.programs p on p.id = y.program_id
      where y.is_active = true and p.is_active = true
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'year_level_id', s.year_level_id, 'code', s.code, 'name', s.name) order by s.name)
      from public.sections s
      join public.year_levels y on y.id = s.year_level_id
      where s.is_active = true and y.is_active = true
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_registration_catalog() to anon, authenticated;

-- Replace the base trigger with Phase 2 registration behavior.
-- It never accepts privileged self-registration roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_department uuid;
  v_program uuid;
  v_year uuid;
  v_section uuid;
  v_student_id text;
  v_employee_id text;
begin
  v_role := case
    when coalesce(new.raw_user_meta_data ->> 'role', 'student') = 'faculty' then 'faculty'::public.user_role
    else 'student'::public.user_role
  end;

  insert into public.profiles (id, email, full_name, role, account_status)
  values (
    new.id,
    new.email,
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    v_role,
    'pending'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        updated_at = now();

  v_department := nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid;

  if v_role = 'student' then
    v_program := nullif(new.raw_user_meta_data ->> 'program_id', '')::uuid;
    v_year := nullif(new.raw_user_meta_data ->> 'year_level_id', '')::uuid;
    v_section := nullif(new.raw_user_meta_data ->> 'section_id', '')::uuid;
    v_student_id := trim(coalesce(new.raw_user_meta_data ->> 'student_id', ''));

    if v_department is null or v_program is null or v_year is null or v_section is null or v_student_id = '' then
      raise exception 'Incomplete student registration metadata';
    end if;

    insert into public.student_profiles(profile_id, student_id, department_id, program_id, year_level_id, section_id)
    values (new.id, v_student_id, v_department, v_program, v_year, v_section);
  else
    v_employee_id := trim(coalesce(new.raw_user_meta_data ->> 'employee_id', ''));
    if v_department is null or v_employee_id = '' then
      raise exception 'Incomplete faculty registration metadata';
    end if;

    insert into public.faculty_profiles(profile_id, employee_id, department_id)
    values (new.id, v_employee_id, v_department);
  end if;

  insert into public.account_approvals(profile_id, status, remarks)
  values (new.id, 'pending', 'Registration submitted for verification.');

  return new;
end;
$$;

-- Trigger already exists from V2, but recreate to guarantee it points to the updated function.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

commit;

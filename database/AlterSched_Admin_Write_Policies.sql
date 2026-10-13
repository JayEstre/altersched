-- AlterSched admin write-policy patch
-- Run once in Supabase SQL Editor after AlterSched_Database_V2.sql.
-- Keeps reads scoped by existing policies while allowing approved Super Admin writes.

begin;

do $$
declare t text;
begin
  foreach t in array array[
    'academic_years','semesters','departments','programs','year_levels','sections','room_types',
    'subjects','curricula','curriculum_subjects','faculty_profiles','faculty_subjects','faculty_availability',
    'rooms','room_availability','class_offerings','schedules','schedule_versions','schedule_entries',
    'schedule_validation_logs','schedule_access_codes','schedule_change_requests','schedule_revision_history',
    'notifications','notification_acknowledgements'
  ] loop
    execute format('drop policy if exists %I_super_admin_insert on public.%I', t, t);
    execute format('create policy %I_super_admin_insert on public.%I for insert to authenticated with check (public.is_super_admin())', t, t);
    execute format('drop policy if exists %I_super_admin_update on public.%I', t, t);
    execute format('create policy %I_super_admin_update on public.%I for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin())', t, t);
    execute format('drop policy if exists %I_super_admin_delete on public.%I', t, t);
    execute format('create policy %I_super_admin_delete on public.%I for delete to authenticated using (public.is_super_admin())', t, t);
  end loop;
end $$;

commit;

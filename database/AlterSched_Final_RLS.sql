-- Final non-recursive schedule read policies.
-- Run after the base schema and prior policy patches.
begin;
create or replace function public.can_read_schedule(p_schedule_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_super_admin()
 or exists(select 1 from public.schedules s where s.id=p_schedule_id and public.can_manage_department(s.department_id))
 or exists(select 1 from public.schedule_memberships sm join public.student_profiles sp on sp.id=sm.student_profile_id where sm.schedule_id=p_schedule_id and sm.active=true and sp.profile_id=auth.uid())
 or exists(select 1 from public.schedule_versions sv join public.schedule_entries se on se.schedule_version_id=sv.id join public.faculty_profiles fp on fp.id=se.faculty_id where sv.schedule_id=p_schedule_id and fp.profile_id=auth.uid());
$$;
grant execute on function public.can_read_schedule(uuid) to authenticated;
drop policy if exists schedules_select on public.schedules;
create policy schedules_select on public.schedules for select to authenticated using(public.can_read_schedule(id));
drop policy if exists schedule_versions_select on public.schedule_versions;
create policy schedule_versions_select on public.schedule_versions for select to authenticated using(public.can_read_schedule(schedule_id));
drop policy if exists schedule_entries_select on public.schedule_entries;
create policy schedule_entries_select on public.schedule_entries for select to authenticated using(exists(select 1 from public.schedule_versions sv where sv.id=schedule_version_id and public.can_read_schedule(sv.schedule_id)));
commit;

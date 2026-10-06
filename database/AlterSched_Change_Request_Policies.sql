-- Faculty alteration request write policy + manager review policy.
begin;
drop policy if exists schedule_change_requests_faculty_insert on public.schedule_change_requests;
create policy schedule_change_requests_faculty_insert on public.schedule_change_requests for insert to authenticated with check (
 requested_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('faculty','department_scheduler') and p.account_status='approved')
);
drop policy if exists schedule_change_requests_manager_update on public.schedule_change_requests;
create policy schedule_change_requests_manager_update on public.schedule_change_requests for update to authenticated using (
 public.is_super_admin() or exists(select 1 from public.schedule_entries se join public.schedule_versions sv on sv.id=se.schedule_version_id join public.schedules sc on sc.id=sv.schedule_id where se.id=schedule_entry_id and public.can_manage_department(sc.department_id))
) with check (public.is_super_admin() or exists(select 1 from public.schedule_entries se join public.schedule_versions sv on sv.id=se.schedule_version_id join public.schedules sc on sc.id=sv.schedule_id where se.id=schedule_entry_id and public.can_manage_department(sc.department_id)));
commit;

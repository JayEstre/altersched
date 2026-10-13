-- AlterSched V6 fixes
-- Run AFTER all earlier migrations (see SETUP.md for the full order).
-- Safe to run more than once. Does not delete any data.

begin;

-- 1. Subject Catalog "default instructor" (used by /admin/subjects).
--    The page and the save action read/write this column, but no migration created it,
--    so the whole Subject Catalog query failed and the page showed no subjects.
alter table public.subjects
  add column if not exists default_faculty_id uuid
  references public.faculty_profiles(id) on delete set null;

create index if not exists subjects_default_faculty_id_idx
  on public.subjects(default_faculty_id);

-- =====================================================================
-- 2. ROW LEVEL SECURITY: make the policies match what each portal does.
--    Before this, many app actions silently did nothing because no
--    policy allowed them (Supabase returns 0 rows instead of an error):
--      * Admin could not approve/reject/suspend accounts or promote a
--        Scheduler (profiles had no UPDATE policy).
--      * Department Schedulers could not create schedules, versions,
--        entries, class offerings, notifications or revision history.
--      * Nobody could read instructor qualifications (faculty_subjects),
--        room availability, validation/conflict logs or revision history.
--      * Schedulers could not read instructor names (profiles) or their
--        own department assignment (scheduler_departments).
-- =====================================================================

-- Helper: can the current user manage (edit) this schedule?
create or replace function public.can_manage_schedule(p_schedule_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin()
      or exists (select 1 from public.schedules s
                 where s.id = p_schedule_id and public.can_manage_department(s.department_id));
$$;

create or replace function public.can_manage_schedule_version(p_version_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.schedule_versions v
                 where v.id = p_version_id and public.can_manage_schedule(v.schedule_id));
$$;

-- Helper: is the current user an approved department scheduler (any department)?
create or replace function public.is_department_scheduler()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'department_scheduler' and account_status = 'approved');
$$;

grant execute on function public.can_manage_schedule(uuid) to authenticated;
grant execute on function public.can_manage_schedule_version(uuid) to authenticated;
grant execute on function public.is_department_scheduler() to authenticated;

-- profiles ------------------------------------------------------------
drop policy if exists profiles_super_admin_update on public.profiles;
create policy profiles_super_admin_update on public.profiles
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Schedulers may read the account records of instructors in departments they manage.
drop policy if exists profiles_scheduler_read_department_faculty on public.profiles;
create policy profiles_scheduler_read_department_faculty on public.profiles
  for select to authenticated using (
    exists (select 1 from public.faculty_profiles fp
            where fp.profile_id = profiles.id and public.can_manage_department(fp.department_id))
  );

-- account_approvals -----------------------------------------------------
drop policy if exists account_approvals_select on public.account_approvals;
create policy account_approvals_select on public.account_approvals
  for select to authenticated using (profile_id = auth.uid() or public.is_super_admin());
drop policy if exists account_approvals_super_admin_write on public.account_approvals;
create policy account_approvals_super_admin_write on public.account_approvals
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- audit_logs ------------------------------------------------------------
drop policy if exists audit_logs_super_admin_read on public.audit_logs;
create policy audit_logs_super_admin_read on public.audit_logs
  for select to authenticated using (public.is_super_admin());
drop policy if exists audit_logs_actor_insert on public.audit_logs;
create policy audit_logs_actor_insert on public.audit_logs
  for insert to authenticated with check (actor_profile_id = auth.uid() and public.is_approved_user());

-- scheduler_departments -------------------------------------------------
drop policy if exists scheduler_departments_select on public.scheduler_departments;
create policy scheduler_departments_select on public.scheduler_departments
  for select to authenticated using (profile_id = auth.uid() or public.is_super_admin());
drop policy if exists scheduler_departments_super_admin_write on public.scheduler_departments;
create policy scheduler_departments_super_admin_write on public.scheduler_departments
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- faculty_subjects (instructor qualifications) --------------------------
drop policy if exists faculty_subjects_select on public.faculty_subjects;
create policy faculty_subjects_select on public.faculty_subjects
  for select to authenticated using (
    public.is_super_admin()
    or exists (select 1 from public.faculty_profiles fp
               where fp.id = faculty_subjects.faculty_id
                 and (fp.profile_id = auth.uid() or public.can_manage_department(fp.department_id)))
  );

-- room_availability -------------------------------------------------------
drop policy if exists room_availability_read_approved on public.room_availability;
create policy room_availability_read_approved on public.room_availability
  for select to authenticated using (public.is_approved_user());

-- class_offerings: schedulers prepare offerings for their department ------
drop policy if exists class_offerings_scheduler_insert on public.class_offerings;
create policy class_offerings_scheduler_insert on public.class_offerings
  for insert to authenticated with check (
    exists (select 1 from public.subjects sub where sub.id = class_offerings.subject_id and public.can_manage_department(sub.department_id))
  );
drop policy if exists class_offerings_scheduler_update on public.class_offerings;
create policy class_offerings_scheduler_update on public.class_offerings
  for update to authenticated
  using (exists (select 1 from public.subjects sub where sub.id = class_offerings.subject_id and public.can_manage_department(sub.department_id)))
  with check (exists (select 1 from public.subjects sub where sub.id = class_offerings.subject_id and public.can_manage_department(sub.department_id)));

-- schedules / versions / entries: scheduler owns drafts in their department --
drop policy if exists schedules_scheduler_insert on public.schedules;
create policy schedules_scheduler_insert on public.schedules
  for insert to authenticated with check (public.can_manage_department(department_id));
drop policy if exists schedules_scheduler_update on public.schedules;
create policy schedules_scheduler_update on public.schedules
  for update to authenticated using (public.can_manage_department(department_id)) with check (public.can_manage_department(department_id));

-- The existing schedules SELECT policy calls can_read_schedule(id), which looks the
-- row up again by id. A row inserted by the same statement is not visible to that
-- lookup, so `insert ... returning` (supabase .insert().select()) failed with
-- "new row violates row-level security policy" for schedulers. This policy checks
-- the row's own department_id instead.
drop policy if exists schedules_manager_select on public.schedules;
create policy schedules_manager_select on public.schedules
  for select to authenticated using (public.can_manage_department(department_id));

drop policy if exists schedule_versions_scheduler_insert on public.schedule_versions;
create policy schedule_versions_scheduler_insert on public.schedule_versions
  for insert to authenticated with check (public.can_manage_schedule(schedule_id));
drop policy if exists schedule_versions_scheduler_update on public.schedule_versions;
create policy schedule_versions_scheduler_update on public.schedule_versions
  for update to authenticated using (public.can_manage_schedule(schedule_id)) with check (public.can_manage_schedule(schedule_id));
drop policy if exists schedule_versions_scheduler_delete on public.schedule_versions;
create policy schedule_versions_scheduler_delete on public.schedule_versions
  for delete to authenticated using (public.can_manage_schedule(schedule_id) and status = 'draft');

drop policy if exists schedule_entries_scheduler_insert on public.schedule_entries;
create policy schedule_entries_scheduler_insert on public.schedule_entries
  for insert to authenticated with check (public.can_manage_schedule_version(schedule_version_id));
drop policy if exists schedule_entries_scheduler_update on public.schedule_entries;
create policy schedule_entries_scheduler_update on public.schedule_entries
  for update to authenticated using (public.can_manage_schedule_version(schedule_version_id)) with check (public.can_manage_schedule_version(schedule_version_id));
drop policy if exists schedule_entries_scheduler_delete on public.schedule_entries;
create policy schedule_entries_scheduler_delete on public.schedule_entries
  for delete to authenticated using (public.can_manage_schedule_version(schedule_version_id));

-- validation logs (conflict results) ---------------------------------------
drop policy if exists schedule_validation_logs_select on public.schedule_validation_logs;
create policy schedule_validation_logs_select on public.schedule_validation_logs
  for select to authenticated using (
    exists (select 1 from public.schedule_versions v where v.id = schedule_validation_logs.schedule_version_id and public.can_read_schedule(v.schedule_id))
  );
drop policy if exists schedule_validation_logs_scheduler_write on public.schedule_validation_logs;
create policy schedule_validation_logs_scheduler_write on public.schedule_validation_logs
  for all to authenticated
  using (public.can_manage_schedule_version(schedule_version_id))
  with check (public.can_manage_schedule_version(schedule_version_id));

-- revision history -----------------------------------------------------------
drop policy if exists schedule_revision_history_select on public.schedule_revision_history;
create policy schedule_revision_history_select on public.schedule_revision_history
  for select to authenticated using (public.can_read_schedule(schedule_id));
drop policy if exists schedule_revision_history_scheduler_insert on public.schedule_revision_history;
create policy schedule_revision_history_scheduler_insert on public.schedule_revision_history
  for insert to authenticated with check (public.can_manage_schedule(schedule_id) and changed_by = auth.uid());

-- change requests: instructors may cancel/edit their own pending requests ------
drop policy if exists schedule_change_requests_owner_update on public.schedule_change_requests;
create policy schedule_change_requests_owner_update on public.schedule_change_requests
  for update to authenticated
  using (requested_by = auth.uid() and status = 'pending')
  with check (requested_by = auth.uid());

-- notifications: staff notify instructors; users mark their own as read --------
drop policy if exists notifications_scheduler_insert on public.notifications;
create policy notifications_scheduler_insert on public.notifications
  for insert to authenticated with check (public.is_department_scheduler());
drop policy if exists notifications_owner_update on public.notifications;
create policy notifications_owner_update on public.notifications
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- email audit rows written when publishing --------------------------------------
drop policy if exists email_notifications_staff_insert on public.email_notifications;
create policy email_notifications_staff_insert on public.email_notifications
  for insert to authenticated with check (public.is_super_admin() or public.is_department_scheduler());
drop policy if exists email_notifications_staff_update on public.email_notifications;
create policy email_notifications_staff_update on public.email_notifications
  for update to authenticated using (public.is_super_admin() or public.is_department_scheduler())
  with check (public.is_super_admin() or public.is_department_scheduler());

-- schedule_access_codes (admin only) ---------------------------------------------
drop policy if exists schedule_access_codes_super_admin_read on public.schedule_access_codes;
create policy schedule_access_codes_super_admin_read on public.schedule_access_codes
  for select to authenticated using (public.is_super_admin());

-- 3. Existing schedulers promoted before this fix have no department
--    assignment, so can_manage_department() is false for them. Give each one
--    their own faculty department (the promote action now does this too).
insert into public.scheduler_departments (profile_id, department_id, active)
select p.id, fp.department_id, true
from public.profiles p
join public.faculty_profiles fp on fp.profile_id = p.id
where p.role = 'department_scheduler'
  and not exists (select 1 from public.scheduler_departments sd
                  where sd.profile_id = p.id and sd.department_id = fp.department_id);

-- =====================================================================
-- 4. OFFICIAL PUBLISHED VERSION
--    schedules.current_version_id is the *working* version. When a
--    Scheduler approves an alteration, a new draft version becomes current,
--    and every read-only view that relied on current_version_id lost the
--    published timetable until the Admin re-published (instructors saw
--    their classes disappear; the public QR link returned "not found").
--    published_version_id always points to the latest published version.
-- =====================================================================
alter table public.schedules
  add column if not exists published_version_id uuid
  references public.schedule_versions(id) on delete set null;

-- Backfill: latest published version of each schedule.
update public.schedules s
set published_version_id = v.id
from (
  select distinct on (schedule_id) id, schedule_id
  from public.schedule_versions
  where status = 'published'
  order by schedule_id, version_number desc
) v
where v.schedule_id = s.id
  and s.published_version_id is distinct from v.id;

-- Keep it in sync, and archive the previously published version so only one
-- version per schedule is ever "published".
create or replace function public.sync_published_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    update public.schedule_versions
       set status = 'archived'
     where schedule_id = new.schedule_id
       and id <> new.id
       and status = 'published';
    update public.schedules
       set published_version_id = new.id
     where id = new.schedule_id;
  elsif tg_op = 'UPDATE' and old.status = 'published' and new.status <> 'published' then
    -- Publication undone (e.g. publish rollback): fall back to the latest other published version.
    update public.schedules s
       set published_version_id = (
         select v.id from public.schedule_versions v
          where v.schedule_id = new.schedule_id and v.status = 'published' and v.id <> new.id
          order by v.version_number desc limit 1)
     where s.id = new.schedule_id and s.published_version_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_versions_sync_published on public.schedule_versions;
create trigger schedule_versions_sync_published
  after insert or update of status on public.schedule_versions
  for each row execute function public.sync_published_version();

-- Public link: always show the schedule's current official version, so a QR code
-- handed out to students keeps working after an approved alteration is re-published.
create or replace function public.get_public_schedule_by_token(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v_share public.public_schedule_shares%rowtype; v_version uuid; v_result jsonb;
begin
  select * into v_share from public.public_schedule_shares
  where token_hash = encode(digest(trim(p_token), 'sha256'), 'hex')
    and active = true and (expires_at is null or expires_at > now())
  limit 1;
  if v_share.id is null then return null; end if;

  select s.published_version_id into v_version
  from public.schedules s
  where s.id = v_share.schedule_id and s.status <> 'archived';
  if v_version is null then return null; end if;

  select jsonb_build_object(
    'schedule_id', s.id, 'title', s.title, 'status', 'published',
    'semester', sem.name, 'academic_year', ay.name, 'block', sec.code, 'program', prog.code,
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
      'day_of_week', e.day_of_week, 'start_time', e.start_time, 'end_time', e.end_time,
      'room', r.code, 'subject_code', sub.code, 'subject', sub.name,
      'instructor', p.full_name, 'session_type', coalesce(e.session_type, 'lecture')
    ) order by e.day_of_week, e.start_time)
    from public.schedule_entries e
    join public.class_offerings co on co.id = e.class_offering_id
    join public.subjects sub on sub.id = co.subject_id
    left join public.rooms r on r.id = e.room_id
    left join public.faculty_profiles fp on fp.id = e.faculty_id
    left join public.profiles p on p.id = fp.profile_id
    where e.schedule_version_id = v_version), '[]'::jsonb)
  ) into v_result
  from public.schedules s
  left join public.semesters sem on sem.id = s.semester_id
  left join public.academic_years ay on ay.id = sem.academic_year_id
  left join public.sections sec on sec.id = s.section_id
  left join public.programs prog on prog.id = s.program_id
  where s.id = v_share.schedule_id;
  return v_result;
end;
$$;
grant execute on function public.get_public_schedule_by_token(text) to anon, authenticated;

commit;

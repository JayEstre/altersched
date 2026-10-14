-- ============================================================================
-- AlterSched V9 - Instructor self-service
--   1. Instructors can read the classes on their published timetable.
--   2. Instructors can add, change and remove their own availability.
--
-- (1)
-- After a schedule is published, an Admin or Scheduler may hand a class to a
-- different instructor. The published timetable keeps the original instructor
-- until it is republished, but that instructor could no longer read the class
-- record, so their "My Schedule" showed "Class" instead of the subject.
-- Now an instructor can also read any class that appears in one of their own
-- schedule entries. Safe to run more than once.
-- ============================================================================

drop policy if exists class_offerings_select on public.class_offerings;

create policy class_offerings_select on public.class_offerings
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1
      from public.faculty_profiles fp
      where fp.id = class_offerings.faculty_id
        and fp.profile_id = auth.uid()
        and public.is_approved_user()
    )
    or exists (
      select 1
      from public.schedule_entries e
      join public.faculty_profiles fp on fp.id = e.faculty_id
      where e.class_offering_id = class_offerings.id
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

-- (2) Instructors manage their own availability (the Administrator still can too).
drop policy if exists faculty_availability_owner_insert on public.faculty_availability;
drop policy if exists faculty_availability_owner_update on public.faculty_availability;
drop policy if exists faculty_availability_owner_delete on public.faculty_availability;

create policy faculty_availability_owner_insert on public.faculty_availability
  for insert to authenticated
  with check (
    public.is_approved_user()
    and exists (
      select 1 from public.faculty_profiles fp
      where fp.id = faculty_availability.faculty_id and fp.profile_id = auth.uid()
    )
  );

create policy faculty_availability_owner_update on public.faculty_availability
  for update to authenticated
  using (
    public.is_approved_user()
    and exists (
      select 1 from public.faculty_profiles fp
      where fp.id = faculty_availability.faculty_id and fp.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.faculty_profiles fp
      where fp.id = faculty_availability.faculty_id and fp.profile_id = auth.uid()
    )
  );

create policy faculty_availability_owner_delete on public.faculty_availability
  for delete to authenticated
  using (
    public.is_approved_user()
    and exists (
      select 1 from public.faculty_profiles fp
      where fp.id = faculty_availability.faculty_id and fp.profile_id = auth.uid()
    )
  );

grant insert, update, delete on public.faculty_availability to authenticated;

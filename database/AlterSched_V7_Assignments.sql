-- AlterSched V7 — instructor assignment editing
-- Run AFTER AlterSched_V6_Fixes.sql. Safe to run more than once. Does not delete data.
--
-- Background: the instructor of a class is stored on class_offerings.faculty_id, and the
-- validate_schedule_entry_alignment trigger requires every schedule entry (session) to use
-- that same instructor. Editors that changed only the session were therefore rejected, and
-- changing it on the offering left existing draft sessions out of sync.
--
-- This migration adds one way to change an instructor that keeps everything aligned, and
-- makes draft saves all-or-nothing.

begin;

-- 1. Remember whether the current instructor was chosen by the generator or by a person.
alter table public.class_offerings
  add column if not exists assignment_mode text;

do $$ begin
  alter table public.class_offerings
    add constraint class_offerings_assignment_mode_check
    check (assignment_mode is null or assignment_mode in ('auto', 'manual'));
exception when duplicate_object then null; end $$;

-- Existing assignments were made before this column existed; treat them as automatic.
update public.class_offerings
set assignment_mode = 'auto'
where faculty_id is not null and assignment_mode is null;

-- 2. Change the instructor of a class offering (lecture + lab) in one transaction.
--    Updates the offering and every session of it in the schedule's *current draft*.
--    Published/submitted versions are history and are left untouched.
--    SECURITY INVOKER: row level security still decides who may do this.
create or replace function public.assign_offering_instructor(
  p_offering_id uuid,
  p_faculty_id uuid,
  p_mode text default 'manual'
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subject uuid;
  v_updated integer;
begin
  if p_mode not in ('auto', 'manual') then
    raise exception 'Invalid assignment mode %', p_mode;
  end if;

  select subject_id into v_subject from public.class_offerings where id = p_offering_id;
  if v_subject is null then
    raise exception 'Class offering not found or you are not allowed to change it.';
  end if;

  if p_faculty_id is not null and not exists (
    select 1 from public.faculty_subjects fs
    where fs.faculty_id = p_faculty_id and fs.subject_id = v_subject
  ) then
    raise exception 'This instructor is not qualified to teach the subject.';
  end if;

  update public.class_offerings
  set faculty_id = p_faculty_id,
      assignment_mode = case when p_faculty_id is null then null else p_mode end,
      updated_at = now()
  where id = p_offering_id;

  if not found then
    raise exception 'Class offering not found or you are not allowed to change it.';
  end if;

  update public.schedule_entries e
  set faculty_id = p_faculty_id
  from public.schedule_versions v
  join public.schedules s on s.current_version_id = v.id
  where e.schedule_version_id = v.id
    and v.status = 'draft'
    and e.class_offering_id = p_offering_id
    and e.faculty_id is distinct from p_faculty_id;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function public.assign_offering_instructor(uuid, uuid, text) to authenticated;

-- 3. New sessions always follow their class offering's instructor. This keeps copies of
--    older versions (alteration approvals) consistent after an instructor was changed.
--    Updates are still checked strictly: change instructors with assign_offering_instructor.
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
    if tg_op = 'INSERT' then
      new.faculty_id := v_offering_faculty;
    else
      raise exception 'Schedule entry faculty does not match class offering faculty';
    end if;
  end if;

  select capacity into v_capacity from public.rooms where id = new.room_id;
  if v_expected is not null and v_capacity is not null and v_capacity < v_expected then
    raise exception 'Room capacity is smaller than expected class size';
  end if;

  return new;
end;
$$;

-- 4. Check overlaps at the end of the transaction instead of row by row, so a save that
--    swaps two classes' time slots is judged on the final timetable.
drop trigger if exists trg_prevent_schedule_entry_overlap on public.schedule_entries;
create constraint trigger trg_prevent_schedule_entry_overlap
  after insert or update on public.schedule_entries
  deferrable initially deferred
  for each row execute function public.prevent_schedule_entry_overlap();

-- 5. Save every edited row of a draft in one transaction (all-or-nothing).
--    p_entries: [{ "id", "faculty_id", "room_id", "day_of_week", "start_time", "end_time" }]
create or replace function public.save_schedule_draft(p_entries jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row record;
  v_saved integer := 0;
begin
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception 'No schedule changes were provided.';
  end if;

  -- Every session of a class must keep the same instructor.
  if exists (
    select 1
    from jsonb_array_elements(p_entries) x
    join public.schedule_entries e on e.id = (x->>'id')::uuid
    group by e.class_offering_id
    having count(distinct coalesce(x->>'faculty_id', '')) > 1
  ) then
    raise exception 'All sessions of a class (lecture and lab) must have the same instructor.';
  end if;

  -- Instructor changes first (once per class), so the sessions below stay aligned.
  for v_row in
    select distinct e.class_offering_id as offering_id, nullif(x->>'faculty_id', '')::uuid as faculty_id
    from jsonb_array_elements(p_entries) x
    join public.schedule_entries e on e.id = (x->>'id')::uuid
    join public.class_offerings o on o.id = e.class_offering_id
    where o.faculty_id is distinct from nullif(x->>'faculty_id', '')::uuid
  loop
    perform public.assign_offering_instructor(v_row.offering_id, v_row.faculty_id, 'manual');
  end loop;

  for v_row in
    select (x->>'id')::uuid as id,
           (x->>'room_id')::uuid as room_id,
           (x->>'day_of_week')::smallint as day_of_week,
           (x->>'start_time')::time as start_time,
           (x->>'end_time')::time as end_time
    from jsonb_array_elements(p_entries) x
  loop
    update public.schedule_entries
    set room_id = v_row.room_id,
        day_of_week = v_row.day_of_week,
        start_time = v_row.start_time,
        end_time = v_row.end_time
    where id = v_row.id;

    if not found then
      raise exception 'Schedule entry % was not found or cannot be edited.', v_row.id;
    end if;
    v_saved := v_saved + 1;
  end loop;

  return v_saved;
end;
$$;

grant execute on function public.save_schedule_draft(jsonb) to authenticated;

commit;

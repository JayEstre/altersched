-- AlterSched Professional V2
-- Run AFTER the existing AlterSched schema and BSIT Panel Batch 1 migration.
-- This migration intentionally preserves legacy student/curriculum tables for safe rollback,
-- but the V2 application no longer exposes them in the active workflow.

create extension if not exists pgcrypto with schema extensions;

-- Instructor registration now creates both the account profile and faculty profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role public.user_role;
  v_department uuid;
  v_employee text;
begin
  v_role := case
    when coalesce(new.raw_user_meta_data ->> 'role','') = 'faculty' then 'faculty'::public.user_role
    else 'faculty'::public.user_role
  end;

  insert into public.profiles(id,email,full_name,role,account_status)
  values(new.id,new.email,coalesce(new.raw_user_meta_data ->> 'full_name',''),v_role,'pending')
  on conflict(id) do update set email=excluded.email, full_name=excluded.full_name;

  v_department := nullif(new.raw_user_meta_data ->> 'department_id','')::uuid;
  v_employee := nullif(new.raw_user_meta_data ->> 'employee_id','');

  if v_role = 'faculty' and v_department is not null and v_employee is not null then
    insert into public.faculty_profiles(profile_id,employee_id,department_id,employment_type,max_teaching_load)
    values(new.id,v_employee,v_department,'full_time',18)
    on conflict(profile_id) do nothing;
  end if;
  return new;
end;
$$;

-- Email delivery queue. The application can send immediately through a configured provider
-- and retains a durable record for retry/audit.
create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  subject text not null,
  message text not null,
  reference_type text,
  reference_id uuid,
  status text not null default 'pending' check(status in ('pending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Public QR shares replace student accounts/claims in the V2 workflow.
create table if not exists public.public_schedule_shares (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  schedule_version_id uuid not null references public.schedule_versions(id) on delete cascade,
  token_hash text not null unique,
  active boolean not null default true,
  expires_at timestamptz,
  generated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_public_schedule_shares_schedule on public.public_schedule_shares(schedule_id,active);

alter table public.email_notifications enable row level security;
alter table public.public_schedule_shares enable row level security;

drop policy if exists email_notifications_staff_read on public.email_notifications;
create policy email_notifications_staff_read on public.email_notifications for select to authenticated
using (public.current_user_role() in ('super_admin','department_scheduler'));

drop policy if exists public_schedule_shares_staff_all on public.public_schedule_shares;
create policy public_schedule_shares_staff_all on public.public_schedule_shares for all to authenticated
using (public.current_user_role() in ('super_admin','department_scheduler'))
with check (public.current_user_role() in ('super_admin','department_scheduler'));

-- Safe public QR resolver. It exposes only published timetable information.
create or replace function public.get_public_schedule_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_share public.public_schedule_shares%rowtype; v_result jsonb;
begin
  select * into v_share from public.public_schedule_shares
  where token_hash = encode(digest(trim(p_token),'sha256'),'hex')
    and active = true and (expires_at is null or expires_at > now())
  limit 1;
  if v_share.id is null then return null; end if;
  if not exists(select 1 from public.schedules s where s.id=v_share.schedule_id and s.status='published' and s.current_version_id=v_share.schedule_version_id) then return null; end if;

  select jsonb_build_object(
    'schedule_id',s.id,'title',s.title,'status',s.status,
    'semester',sem.name,'academic_year',ay.name,'block',sec.code,'program',prog.code,
    'entries',coalesce((select jsonb_agg(jsonb_build_object(
      'day_of_week',e.day_of_week,'start_time',e.start_time,'end_time',e.end_time,
      'room',r.code,'subject_code',sub.code,'subject',sub.name,
      'instructor',p.full_name,'session_type',coalesce(e.session_type,'lecture')
    ) order by e.day_of_week,e.start_time)
    from public.schedule_entries e
    join public.class_offerings co on co.id=e.class_offering_id
    join public.subjects sub on sub.id=co.subject_id
    left join public.rooms r on r.id=e.room_id
    left join public.faculty_profiles fp on fp.id=e.faculty_id
    left join public.profiles p on p.id=fp.profile_id
    where e.schedule_version_id=v_share.schedule_version_id),'[]'::jsonb)
  ) into v_result
  from public.schedules s
  left join public.semesters sem on sem.id=s.semester_id
  left join public.academic_years ay on ay.id=sem.academic_year_id
  left join public.sections sec on sec.id=s.section_id
  left join public.programs prog on prog.id=s.program_id
  where s.id=v_share.schedule_id;
  return v_result;
end;
$$;
grant execute on function public.get_public_schedule_by_token(text) to anon, authenticated;

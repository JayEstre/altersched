-- AlterSched base academic structure (BSIT)
-- Run ONCE on a fresh database, after all migrations.
-- The Admin UI manages School Years, Semesters, Rooms, Subjects, Instructors and Class Offerings,
-- but it has no screens for Institution / Department / Program / Year Level / Block (Section).
-- Registration also needs at least one Department to exist. This script creates those records.
-- Edit the names below to match your school before running.
-- Keep the department code and program code as BSIT: several screens (Subjects,
-- Instructors, Import, General Schedule) look these records up by that code. Safe to re-run (it skips existing rows).

begin;

insert into public.institutions (name, short_name, is_active)
select 'Consolatrix College', 'CCTC', true
where not exists (select 1 from public.institutions where short_name = 'CCTC');

insert into public.departments (institution_id, code, name, is_active)
select i.id, 'BSIT', 'Information Technology Department', true
from public.institutions i where i.short_name = 'CCTC'
on conflict (institution_id, code) do nothing;

insert into public.programs (department_id, code, name, is_active)
select d.id, 'BSIT', 'Bachelor of Science in Information Technology', true
from public.departments d join public.institutions i on i.id = d.institution_id
where i.short_name = 'CCTC' and d.code = 'BSIT'
on conflict (department_id, code) do nothing;

insert into public.year_levels (program_id, level_number, name, sort_order, is_active)
select p.id, y.n, y.label, y.n, true
from public.programs p
cross join (values (1, '1st Year'), (2, '2nd Year'), (3, '3rd Year'), (4, '4th Year')) as y(n, label)
where p.code = 'BSIT'
on conflict (program_id, level_number) do nothing;

-- Two blocks per year level: code A/B (as in the import templates), name BSIT 1A, BSIT 1B, ...
-- Add more in SQL if needed.
insert into public.sections (year_level_id, code, name, capacity, is_active)
select yl.id, b.letter, 'BSIT ' || yl.level_number || b.letter, 40, true
from public.year_levels yl
join public.programs p on p.id = yl.program_id and p.code = 'BSIT'
cross join (values ('A'), ('B')) as b(letter)
on conflict (year_level_id, code) do nothing;

commit;

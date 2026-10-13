# AlterSched — Setup Guide

Follow these steps in order on a **new Supabase project**. Takes about 15 minutes.

## 1. Create the database

1. Supabase Dashboard → **SQL Editor** → New query.
2. Open `database/AlterSched_SETUP_ALL_IN_ONE.sql`, paste everything, click **Run**.
   (This is all migrations in the correct order. The individual files in `database/` are the same content, split up.)
3. Open `database/AlterSched_Seed_Base.sql`. Edit the school name if needed, then **Run** it.
   It creates the Institution, the BSIT Department and Program, Year Levels 1–4 and Blocks A/B.
   Keep the codes `BSIT`: several screens look the department and program up by that code.

> Already have a database from an earlier version? Do **not** rerun everything. Back it up, then run only
> the migrations you are missing, in order:
>
> - from V5 or older: `AlterSched_V6_Fixes.sql`, then `AlterSched_V7_Assignments.sql`, then
>   `AlterSched_V8_Scheduling_Settings.sql`
> - from V6: `AlterSched_V7_Assignments.sql`, then `AlterSched_V8_Scheduling_Settings.sql`
> - from V7: `AlterSched_V8_Scheduling_Settings.sql`
>
> All are in `database/`, safe to run more than once, and do not delete data. V7 adds the Auto/Manual
> assignment flag, the `assign_offering_instructor` and `save_schedule_draft` functions, and allows
> swapping two classes' times in one save. V8 adds the Schedule Generator settings (Admin → Settings).

## 2. Supabase Auth settings

Authentication → Sign In / Providers → Email:

- **Confirm email ON**: instructors must click the email link *and* be approved by the admin.
- **Confirm email OFF** (easier for a demo/defense): admin approval only.

Either works with the app.

## 3. Create the first Administrator

1. Authentication → Users → **Add user** → enter email and password, tick **Auto Confirm User**.
2. SQL Editor → run (replace the email):

```sql
update public.profiles
set role = 'super_admin', account_status = 'approved',
    full_name = 'AlterSched Administrator', updated_at = now()
where email = 'admin@yourschool.edu';

insert into public.account_approvals (profile_id, status, reviewed_by, reviewed_at, remarks)
select id, 'approved', id, now(), 'Initial Super Admin bootstrap'
from public.profiles where email = 'admin@yourschool.edu';
```

## 4. Run the app

```bash
cp .env.local.example .env.local   # then fill in the 3 values
npm install
npm run dev                        # http://localhost:3000
```

For deployment (e.g. Vercel), set the same 3 variables. `NEXT_PUBLIC_SITE_URL` must be the real
public address, because it is printed inside the public schedule link and QR code.

## 5. First-run walkthrough (also a good defense demo)

| # | Who | Where | What |
|---|-----|-------|------|
| 1 | Admin | School Year & Semester | Create school year + semester, tick **active** |
| 2 | Admin | Rooms & Labs | Add lecture rooms and computer labs (or use **Import Data → Download Excel Template**) |
| 3 | Admin | Subjects | Add subjects with lecture/lab hours, year level, room type |
| 4 | Admin | Curriculum → Open tools | Create an **active** curriculum, map subjects to year level + semester and weekly hours |
| 5 | Instructors | `/register` | Each instructor registers (Employee ID must be unique) |
| 6 | Admin | User & Account Management | **Approve** instructors; click **Make Scheduler** on one of them |
| 7 | Admin | Instructors | Add subject **qualifications** and **availability** for each instructor |
| 8 | Admin | Class Offerings | **Prepare Class Offerings** for the semester (or let the generator do it) |
| 8a | Admin | Settings → Schedule Generator | Optional: choose teaching days, earliest start, latest end and start-time step (default Mon–Sat, 7:00–21:00, 30 min) |
| 9 | Scheduler | Schedule Builder | **Generate Schedule**: instructors are assigned automatically, then the timetable is built |
| 9a | Admin or Scheduler | Class Offerings / Scheduling Inputs | Not happy with an assignment? Pick another instructor → **Save** (applies to lecture + lab) |
| 9b | Scheduler | Schedule Builder | Open the draft → adjust day/time/room/instructor → **Save Changes** |
| 10 | Scheduler | Schedules & Submission | **Submit for Admin Review** (blocked while sessions have no instructor) |
| 11 | Admin | Schedule Review & Publish | Open → **Revalidate** → **Publish & Generate Access** → copy the **public link / QR** |
| 12 | Instructor | My Schedule / Notifications | Sees classes and a "Schedule published" notification |
| 13 | Instructor | Schedule Requests | Requests a change (conflicts are rejected immediately) |
| 14 | Scheduler or Admin | Alteration Requests / Change Requests | **Approve** → creates a revised draft → submit → Admin publishes again (same public link keeps working) |

## Notes

- **Unassigned instructors:** if every qualified instructor is at max teaching load, the generator leaves the
  session as *TBA* and submission is blocked. Add qualifications or raise a max load in **Instructors**, then regenerate.
- **Instructor availability:** if an instructor has declared availability, they are only scheduled inside it.
  An instructor with no availability at all can be scheduled any time.
- **Notifications** are in-app only. There is no email sending code in this version.
- **Changing instructors:** only instructors qualified for the subject are offered. A change is refused when that
  instructor already teaches at the same time in another block. Manual choices are marked *Manually* and are
  kept when the schedule is regenerated; **Clear** returns the class to automatic assignment.
- **Public link:** shown once after publishing (only a hash is stored). Re-publishing keeps the same link;
  **Generate New Code** issues a new link and disables the old one.

## For developers

```bash
npm test             # unit tests (generator, assignment, time helpers, auth redirects)
npm run typecheck
npm run lint
npm run format       # Prettier
```

- **Database types.** `lib/database.types.ts` is generated from the schema. After changing SQL, regenerate it:
  `npx supabase gen types typescript --project-id <your-project-ref> > lib/database.types.ts`
  (or `--db-url "postgresql://…?sslmode=disable"` for a local database).
- **All-in-one SQL.** After adding a migration, list it in `scripts/build-setup-sql.mjs` and run
  `node scripts/build-setup-sql.mjs` to rebuild `database/AlterSched_SETUP_ALL_IN_ONE.sql`.
- **Styles.** `app/globals.css` holds the shared design (tokens in `:root`, layout, tables, badges, alerts).
  Screen-specific styles live next to the page in `page.module.css`. Use the components in
  `components/ui.tsx` (`PageHead`, `Stat`, `Panel`, `Badge`, `Empty`, `Notice`) instead of inline styles.

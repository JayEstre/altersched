# AlterSched

<<<<<<< HEAD
Academic scheduling system for Consolatrix College (BSIT):

- **Automatic instructor assignment.** Every class gets a qualified instructor, within their maximum teaching load.
- **Manual override.** The Administrator or the Department Scheduler can change the instructor of any class.
- **Automatic schedule generator.** Builds conflict-free timetables (no block, room or instructor overlaps).
- **Review and publication** with version history, controlled alterations, and a public read-only link/QR.

**Setup:** see [SETUP.md](SETUP.md). **Changes:** [V7_REFACTOR.md](V7_REFACTOR.md) (V7 and V8) ·
[V6_FIXES.md](V6_FIXES.md) (previous).

## Roles

| Role                 | Database value         | Does                                                                                                      |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Administrator        | `super_admin`          | Approves accounts, maintains master data, changes instructor assignments, reviews and publishes schedules |
| Department Scheduler | `department_scheduler` | Generates and edits schedules, changes instructor assignments, reviews alteration requests                |
| Instructor           | `faculty`              | Registers, views their published schedule and teaching load, requests schedule changes                    |

Students do not have accounts. They use the public schedule link or QR code created when a schedule is published.

## Workflow

Setup data → **Generate** (instructors assigned automatically, timetable conflict-checked) → change instructors or
times if needed → Submit → Admin revalidates and publishes → instructors notified + public link/QR → alteration
request → approve → revised draft → re-publish (same link).

### Changing an assigned instructor

Open **Class Offerings** (Admin) or **Scheduling Inputs** (Scheduler). Each class shows its instructor, the
instructor's current load, and whether it was assigned **Auto** or changed **Manually**. Choose another
qualified instructor and press **Save**:

- the change applies to every session of that class (lecture and lab) in its draft schedule;
- it is refused if the instructor already teaches at that time in another block;
- manual choices are kept when the schedule is generated again.

Instructors can also be changed in **Subjects → View Subjects** (choose a year, then a block), in the Schedule
Builder's draft table and in the Admin schedule editor.

## Project structure

```
app/                     Pages and server actions, one folder per screen (admin/, scheduler/, faculty/, public/)
components/              Shared UI: ui.tsx (PageHead, Stat, Panel, Badge, Empty, Notice, ActionResult),
                         data-table, glass-modal, assignments/instructor-assignment-table
lib/
  scheduling/            The generator: session splitting, availability, scoring, backtracking solver,
                         automatic instructor choice (pure functions, unit tested)
  assignments.ts         Load/assign/clear instructors (used by Admin and Scheduler screens)
  bookings.ts            Room/instructor clash detection across blocks
  auth/                  requireRole(), profile lookup, redirects
  format.ts, time.ts     Day names, time formatting and arithmetic
  form-data.ts           Typed FormData readers
  relations.ts           one() for Supabase embedded relations
  database.types.ts      Generated Supabase types
database/                SQL migrations (+ AlterSched_SETUP_ALL_IN_ONE.sql)
tests/                   Unit tests (node:test)
```

## Development

Next.js 16 (App Router, server actions) · React 19 · TypeScript · Supabase (Postgres + Auth + RLS) · `xlsx` · `qrcode`.

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # unit tests for the generator, time/format helpers and auth redirects
npm run typecheck      # tsc --noEmit
npm run lint
npm run format         # Prettier
npm run build
```

Environment variables: see `.env.local.example`.
=======
AlterSched is the CCTC academic scheduling system for four roles: Administrator, Department Scheduler, Instructor, and Student. Students can claim their published schedule through the generated QR/link and see the schedule in their own portal.

## Workflow
1. Instructor registers and waits for Administrator approval.
2. Administrator maintains Subjects, Rooms/Labs, School Year/Semester, Instructor records and qualifications.
3. Department Scheduler prepares scheduling inputs and runs AI Schedule Automation.
4. The engine assigns subject/block sessions to qualified instructors, compatible rooms, days and times while enforcing hard conflict rules and applying timetable optimization scoring.
5. Scheduler reviews the editable Preview Table or Timetable view, resolves conflicts, and saves only a conflict-free draft.
6. Scheduler publishes the schedule. Affected instructors receive in-app notifications and email when email delivery is configured.
7. Publication generates a revocable public schedule token/QR for students.
8. Students can claim and view their schedule in the student portal.
9. Schedules can be exported to Excel/CSV.

## Roles
- `super_admin` — Administrator
- `department_scheduler` — Department Scheduler
- `faculty` — Instructor
- `student` — Student

## Local setup
```bash
npm install
npm run dev
```

Configure Supabase environment variables before running the app. For email notifications, configure `RESEND_API_KEY` and `ALTERSCHED_EMAIL_FROM`.

## Important
This project includes the active student portal and student schedule workflow. Keep database migrations backed up and verified before altering production data, especially when changing role access or published schedule tables.
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

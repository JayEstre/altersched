# AlterSched V6 — What was fixed

Every item below was found by running the app end to end (Admin → Scheduler → Instructor → public link)
against the project's own SQL migrations, then fixed and re-tested.

## Database (`database/AlterSched_V6_Fixes.sql`)

| Problem | Effect before | Fix |
|---|---|---|
| `profiles` had no UPDATE policy | **Admin could not approve, reject, suspend or promote anyone** (Supabase silently updated 0 rows) | Super-admin update policy |
| Department Schedulers had no write policies at all | Scheduler could not generate, edit or submit schedules, prepare offerings, or send notifications | Department-scoped insert/update/delete policies on schedules, versions, entries, offerings, validation logs, revision history, notifications |
| `schedules` read policy re-queried the row by id | `insert … returning` failed for schedulers with "new row violates row-level security policy" | Extra read policy on the row's own `department_id` |
| No read policy on `faculty_subjects`, `room_availability`, `schedule_validation_logs`, `schedule_revision_history`, `scheduler_departments`, `account_approvals` | Qualifications, conflicts, revision history etc. always looked empty | Role-appropriate read policies |
| Schedulers could not read instructor names | Instructor names blank in Scheduler screens | Scheduler may read profiles of instructors in their department |
| "Make Scheduler" never assigned a department | New schedulers could not manage anything | Promotion now assigns the instructor's department; migration back-fills existing schedulers |
| `subjects.default_faculty_id` missing | **Subject Catalog loaded no subjects**; saving a subject failed | Column added |
| Approving an alteration made the published timetable disappear | Instructors' classes and the public QR link vanished until the admin re-published | New `schedules.published_version_id` kept up to date by a trigger; read-only views and the public link use it; older published versions are archived |
| Public link tied to one version | Re-publishing broke QR codes already handed out | Public link always shows the latest published version |

## Application code

| Area | Problem | Fix |
|---|---|---|
| Registration | Department list read with an anonymous query blocked by RLS → **nobody could register** | Uses the existing `get_registration_catalog()` function |
| Registration | Duplicate Employee ID showed "Database error saving new user" | Clear message |
| 7 queries (Faculty schedule, alterations, Schedule Builder, Schedules) | Ambiguous embed between `schedules` and `schedule_versions` (two foreign keys) → Supabase error, pages empty | Explicit relationship hint |
| Settings, Faculty Alterations | Selected columns that do not exist (`institutions.code`, `rooms.room_type`) | Corrected |
| 12 pages (Scheduler dashboard, conflicts, offerings, availability, faculty, teaching load, revision history, reports…) | Single related records read as arrays (`x.sections?.[0]`) → names/blocks showed "—" | `one()` helper in `lib/relations.ts` |
| Admin schedule page (Revalidate, add/update/remove entry), Study Load import, Import convert/process | `redirect()` inside `try/catch` → every success showed as error `NEXT_REDIRECT` | `unstable_rethrow()` |
| Publish | No public link created (public page could never work), no instructor notifications | `lib/schedule-publication.ts`: creates the public link + QR, notifies instructors |
| Alteration approval | Copied entries without session type → **every lab became a lecture** | Session type and delivery mode copied |
| Alteration approval | Instructor never notified | Approve/reject notifications |
| Alteration request | Conflicting requests accepted, then failed at approval with a raw DB error | Conflict check at submission + readable message at approval |
| Generator | Whole run aborted if any year level had no curriculum subjects | Skips those blocks |
| Generator | Days an instructor did not declare were treated as available (Saturday classes for Mon–Fri staff) | Declared availability is respected |
| Generator | Re-generating a published schedule left its status "published" → new draft could not be submitted | Status set to draft |
| Generator | Subject "default instructor" ignored | Preferred when qualified and within load |
| Import Data | The Excel template could not be imported (converter only reads one sheet; `importMasterData` was never wired) | **Import Template Workbook** button on Import Data |
| Study Load import | Block "2A" / "BSIT 2A" not recognized | Accepts A, Block A, 2A, BSIT 2A |
| Navigation | Scheduler "Change Requests" page had no approve/reject; instructors had two different request forms | Menus point to the working pages; old URLs redirect |
| Dashboard | "Published" count dropped to 0 while a revision was in progress | Counts official published versions |
| Curriculum | Create button hidden in a collapsed panel on first use | Panel opens when no curriculum exists |
| UI | Active menu item and dashboard cards unreadable (white text on light background) | Contrast overrides at the end of `globals.css` |
| Favicon | Pointed to a missing file | Points to `altsched-logo.png` |

## Cleanup

- Removed duplicate code: `app/scheduler/change-requests/actions.ts` (identical to the admin copy, unused) and `app/faculty/change-requests/actions.ts` (second request form).
- Removed `AlterSched_Phase2_Auth_Fix_All.sql` from the project root (identical copy of `database/AlterSched_Auth_Fix_All.sql`).
- Moved 15 outdated status notes to `docs/archive/` and the superseded auth patch to `database/legacy/`.
- Added `.env.local.example`, `SETUP.md`, `database/AlterSched_SETUP_ALL_IN_ONE.sql`, `database/AlterSched_Seed_Base.sql`.

## Verified

- `npx tsc --noEmit` and `npm run build`: no errors. `npm run lint`: 0 errors (existing `any` warnings only).
- All SQL applies cleanly on a fresh database; `AlterSched_V6_Fixes.sql` is safe to re-run.
- Every `supabase.from(...)` query (450+) checked against the real schema: tables, columns, relationships, enum values.
- Full workflow run in a browser for all three roles, including conflict blocking, rejections, re-publication, exports (Excel/CSV), the anonymous public link, role guards and sign-out.

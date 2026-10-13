# AlterSched V7 — Refactor and assignment editing

All existing features work as before. Everything below was checked end to end (Admin → Scheduler → Instructor →
public link): 71 browser scenarios, 18 unit tests, type check, lint and a production build.

Upgrading an existing database: run `database/AlterSched_V7_Assignments.sql` once (safe to re-run).

## Instructor assignment: automatic, then editable

| Before                                                                                                                                       | Now                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Changing an instructor in the draft editor changed only one session, so the lecture and the lab of the same class could get different instructors | A change applies to the whole class (lecture + lab), in every screen                                                                                                                      |
| The Scheduler had no screen to change an assigned instructor; the Admin screen did not show who was auto-assigned                                     | **Class Offerings** (Admin) and **Scheduling Inputs** (Scheduler) list every class with its instructor, load (`13/18 h`) and **Auto / Manually / Unassigned**, with filters                |
| Changing the instructor of an offering left its existing draft sessions on the old instructor                                                         | The draft sessions are updated in the same transaction (`assign_offering_instructor`)                                                                                                    |
| An instructor could be given two classes at the same time in different blocks; the same was true for rooms                                    | Refused, with the clashing class named, both in the editor and on the server                                                                                                               |
| Draft saves wrote row by row; a failure half-way left a half-saved draft, and swapping two classes' times was impossible                       | One transaction (`save_schedule_draft`); the overlap check runs at commit, so swaps work                                                                                                   |
| Regenerating could overwrite a person's choice                                                                                                 | Manual choices are kept; **Clear** hands the class back to automatic assignment                                                                                                            |
| Instructors with a rejected or pending registration appeared in the Instructors list as "Unnamed Faculty"                                       | Only approved accounts are listed                                                                                                                                                         |
| Publication notifications never included the schedule title (the column was not loaded)                                                         | Title included                                                                                                                                                                            |

## Code structure

- **Generator split into `lib/scheduling/`** (sessions, availability, scoring, solver, assignment): pure functions
  with unit tests. `app/scheduler/schedule-builder/actions.ts` now only loads data, calls the generator and saves.
  Offering preparation uses batched inserts/updates instead of one query per class.
- **Shared helpers** replace dozens of local copies: `lib/format.ts` (day names, times, dates, ordinal, status tone),
  `lib/time.ts`, `lib/form-data.ts` (about 50 `String(formData.get(x) ?? '').trim()` calls), `lib/relations.ts`,
  `lib/enums.ts`, `lib/errors.ts`, `lib/bookings.ts`, `lib/assignments.ts`.
- **Typed Supabase client** (`lib/database.types.ts`). Lint warnings for `any` reduced from 134 to 24.
- **`requireRole()`** loads the user once per request (React `cache`) instead of on every call.
- **Reusable components** in `components/ui.tsx`: `PageHead`, `Stat`, `Panel`, `Badge`, `Empty`, `Notice`,
  `ActionResult`. The *My Schedule* page was rebuilt with them and loads its data in two queries instead of nine.
- **Prettier** configuration and `npm run format`, `npm test`, `npm run typecheck` scripts.

## UI / UX

- **Subjects → View Subjects** dialog: pick a block (A, B, C…) first; each subject then shows who teaches it in
  that block (Auto / Manual) and the instructor can be changed right there. Subjects are a one-line list that opens
  into the edit form, with search. After saving, the dialog stays on the same year and block and shows the result.
- Every page now passes an automated **WCAG contrast check** (badges, alerts, generator cards and several labels
  were near-invisible, left over from an old dark theme).
- The draft schedule editor uses the same light theme as the rest of the app; day and time fields are no longer cut off.
- Alerts use one component (`Notice`) with success / warning / danger / info styles.
- Cards and panels that had text touching their border now have consistent padding (automated check on every page).
- Phones: page headers no longer take half the screen, summary cards show two per row, and the
  instructor-assignment table becomes one card per class.
- Minimum text size raised to 9px; the required-field marker showed `\\*` and now shows `*`.
- All inline `style={{…}}` props (about 140) moved into stylesheets; styles specific to one screen live next to it in
  `page.module.css`. `globals.css` reduced from 5,347 to about 3,950 lines by removing overridden and unused rules.

---

# V8 additions

Upgrading an existing database: run `database/AlterSched_V8_Scheduling_Settings.sql` once (safe to re-run).
Checked with 77 browser scenarios, 20 unit tests, type check, lint (0 warnings) and a production build.

| Area | Change |
| ---- | ------ |
| One year level | The Subjects dialog groups subjects by their year in the **active curriculum** (what the generator uses). Subjects whose own year differs show **Year differs**; subjects missing from the curriculum show **Not in curriculum**. Subjects with no year set now appear under their curriculum year instead of nowhere. |
| Preparing classes | Blocks without classes show **Prepare classes now** inside the Subjects dialog; it creates the missing classes from the curriculum and returns to the same block. |
| Readability | Smallest text raised from 9–10px to 10.5–11.5px across the app; checked for overflow and contrast on every page at desktop and phone width. |
| Week view | Instructor *My Teaching Schedule*, Scheduler *My Schedule* and the public QR page have a **Week / List** switch; the Admin schedule page shows a week grid (red = validation issue) above the editable table. |
| Generator settings | **Admin → Settings → Schedule Generator**: teaching days, earliest start, latest end, start-time step. Used by the generator and by the draft editor's day list. |
| Account list | **User & Account Management**: status tabs with counts, search by name or email, 20 accounts per page (paged in the database). |
| Code quality | Lint warnings for `any` reduced from 24 to 0; publication notifications and several pages now fully typed. Class-offering messages shared in `components/assignments/offering-messages.ts`. |
| Fixes | Platform Health "Stable" badge no longer clipped; "invalid semester term" now shows its message; Approve/Reject buttons sit side by side. |

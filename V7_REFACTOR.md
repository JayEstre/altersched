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

- **Subjects → View Subjects** dialog: the year's subjects are listed once (every block shares them). Each subject
  shows who teaches it (e.g. "Art Dakay · all 6 blocks" or "4 of 6 blocks have an instructor"); opening it lists the
  instructor **per block** (A, B, C…) with Auto / Manual and Save / Clear, then the subject's edit form. After
  saving, the dialog reopens on the same subject and shows the result.
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
| Week view | Instructor *My Teaching Schedule* and the public QR page have a **Week / List** switch; the Admin schedule page shows a week grid (red = validation issue) above the editable table. |
| Generator settings | **Admin → Settings → Schedule Generator**: teaching days, earliest start, latest end, start-time step. Used by the generator and by the draft editor's day list. |
| Account list | **User & Account Management**: status tabs with counts, search by name or email, 20 accounts per page (paged in the database). |
| Code quality | Lint warnings for `any` reduced from 24 to 0; publication notifications and several pages now fully typed. Class-offering messages shared in `components/assignments/offering-messages.ts`. |
| Fixes | Platform Health "Stable" badge no longer clipped; "invalid semester term" now shows its message; Approve/Reject buttons sit side by side. |

---

# Cleanup (V8 final)

Pages that repeated another screen or were never part of the workflow were removed. Nothing else changed: no
database changes are needed. Checked with 90+ browser scenarios (every remaining page for every role, plus the
Subjects block dialog, Instructors directory, account paging and the Week/List switch), 20 unit tests, type check,
lint and a production build.

| Removed | Why / where it is now |
| ------- | --------------------- |
| Admin → Revision History | Changes are still recorded (database `schedule_revision_history`, used by alteration approvals); the separate page was not used in the workflow |
| Admin → General Schedule | Same data as **Schedule Review & Publish** |
| Admin `/admin/login` | Everyone signs in at `/login` |
| Instructor → Teaching Load | Load is shown in **Instructors** and in the class-assignment screens |
| Scheduler → My Schedule | Duplicate of the schedule screens |
| Scheduler → Conflict Monitor | Conflicts are shown in **Scheduling Inputs** and in the draft editor (saves with conflicts are refused) |
| Scheduler → Instructors, Rooms (read-only lists) | Same data appears in **Scheduling Inputs** and **Availability** |
| `/scheduler/change-requests`, `/faculty/change-requests` | Old redirects; the menus already point to **Alteration Requests** / **Schedule Requests** |

Kept on purpose: **Import Data** (Admin), **Reports**, and Admin **Change Requests**
(the Super Admin can still decide requests when no scheduler is assigned). Unused helper functions and CSS rules
were deleted as well.

If you copy these files over an older folder, delete these folders by hand:

```
app/admin/revision-history      app/admin/general-schedule      app/admin/login
app/faculty/teaching-load       app/faculty/change-requests
app/scheduler/my-schedule       app/scheduler/conflicts         app/scheduler/faculty
app/scheduler/rooms             app/scheduler/change-requests
```

---

# Generator explains why classes cannot be placed

Before, a failed generation only said "N sessions could not be placed". Now the Schedule Builder shows, right
under **Generate Schedule**, which classes do not fit, **why**, and **how to fix it**. Nothing is saved until
every class fits.

| Reason shown | Example | Suggested fix |
| ------------ | ------- | ------------- |
| Teaching day too short | A 3 h lab is longer than the teaching day (8:00–10:00 AM) | Longer day in Settings → Schedule Generator |
| No room of this type | Needs a Computer Laboratory room, but none is active | Add/activate the room, or change the subject's room type |
| Rooms too small | BSIT 1A has 45 students, the largest Lecture Room holds 40 | Bigger room or lower expected students |
| Instructor not available | Jose Reyes has no free 3 h window (availability: Mon 8:00–9:00 AM) | Widen availability or assign another instructor |
| Rooms blocked | Every suitable room is under maintenance whenever the instructor is free | Check room availability |
| Block fully booked | BSIT 1A needs 19 h per week; the teaching week has 4 h | More teaching days or hours |
| Instructor fully booked | Ana Cruz is assigned 21 h but available 15 h | Assign another instructor or widen availability |
| Rooms fully booked | All 2 Computer Laboratory rooms are in use at every possible time | Another room or more hours |
| No common free time | Block, instructor and a room are never free at the same time | More hours, wider availability or another instructor |

Problems are grouped by cause (one card per block, instructor or room type, listing the affected classes), and
a **Not enough hours in the week** box lists blocks, instructors or room types that need more hours than exist.

How it works (`lib/scheduling/diagnose.ts`, unit tested in `tests/diagnose.test.ts`): when the backtracking
search cannot place everything, the leftover sessions are fitted into the best attempt wherever they still go;
each session that still has no slot is checked against the rules above, in order, and the first rule that fails
is reported. If the leftovers all fit, that attempt is a complete timetable and is saved normally.

---

# Design and usability pass (V8 final)

Upgrading an existing database: run `database/AlterSched_V9_Instructor_Self_Service.sql` once.

## One design system

- **Look:** navy sidebar with the CCTC crest and a gold marker for the current page; Source Serif 4 for page
  titles, Public Sans for everything else (both self-hosted from npm, no Google Fonts request). Colours come
  from the crest (navy, gold, red). Text is at least 12px.
- **One stylesheet foundation** (`app/globals.css`, top part) replaces six layers of overrides ("V4", "final
  compact pass", "renovation", ...): 4,034 → about 2,600 lines; 480+ dead or conflicting rules removed.
- **Shared pieces:** page header, number strip, panel, table, badge (status words are formatted and coloured
  automatically: `pending` → amber "Pending"), buttons (`btn-primary`, `btn-outline`, `btn-danger`,
  `btn-ghost`), notices, empty states. Old button classes (`user-btn`, `sched-primary-btn`, ...) were
  replaced everywhere.
- Removed template decoration: the all-caps labels above every heading, decorative circles on number cards,
  flow-chip rows, and buttons that repeated the sidebar.
- Printing (Reports, public schedule) hides the sidebar and prints only the content.

## Pages

| Page | Change |
| ---- | ------ |
| Home, Sign in, Register, Pending | New split layout: brand panel with a sample weekly timetable, form on the right |
| Public schedule (QR) | School header, Week/List, Print, QR at the bottom |
| Admin dashboard | "Needs your attention" (accounts, submitted schedules, requests, classes without instructor) instead of eight counts and a "health score" |
| Reports | Teaching load with bars against the maximum load; room use (booked hours out of the teaching week); Print |
| Import Data | Two clear options: the AlterSched template, or convert another file |
| Subjects | Catalog first; one card per subject with the instructor of every block inside |
| Instructors (Admin) | Setup section only when someone needs it; developer notes removed |
| Rooms, Settings, Schedules | Cleaner forms and tables; meaningless counts removed |
| Scheduler dashboard | "Next steps" checklist built from the data (classes, availability, drafts, submission, requests) |
| Scheduler availability | Week grid per instructor; who has not entered availability comes first |
| Schedule requests (all roles) | Same name everywhere; side-by-side "published → requested"; decided requests in a table |
| Schedule builder | Generate → pick a draft → edit; Block column removed from the editor (each draft is one block) |
| Instructor dashboard | Today's classes, teaching hours against the maximum, latest notices |
| Instructor availability | **New:** instructors add and remove their own time windows (with a Monday-to-Friday shortcut) |
| Notifications | Unread markers and **Mark all as read** (the unread count used to never go down) |
| Profile | Account card with the details on record |

## Fixes found during the pass

- Instructors saw "Class" instead of the subject on My Schedule when a class had been reassigned after
  publishing (fixed in V9: they can read classes that appear on their own timetable).
- Schedule Requests said "no published classes" while My Schedule showed them; both now use the same rule,
  and classes in a schedule that is being revised are shown as "being revised" instead of hidden.
- Every generated draft was labelled "Revised draft"; only drafts created by an approved request are now.
- The Reports menu item had no icon.

## Study Load Import removed

The Admin **Study Load Import** page (and its sample file) was removed. It did not change the result:
when the scheduler generates, every block's classes are rebuilt from the active curriculum (each block
gets every subject of its year and semester), and classes that are not in the curriculum are switched off.

The workflow is now:

1. **Once:** subjects, curriculum, rooms, blocks and instructors, typed in on their pages or loaded in bulk
   with **Import Data**.
2. **Every semester:** make the semester active, then **Generate** in the Schedule Builder.

The `study_load_imports` table is left in the database, so nothing breaks for existing data.
Note: the generator stops if a program has more than one active curriculum.

## Motion and visual polish

Motion answers what the person did; nothing moves on its own except the timetable settling in.

| Where | What |
|---|---|
| Every page change | Thin crest-gold progress bar at the top; the page content fades in; a loading skeleton appears at once inside the portal while the page is prepared (`app/*/loading.tsx`, `app/*/template.tsx`, `components/nav-progress.tsx`, `components/page-skeleton.tsx`) |
| Forms | The button you pressed shows a spinner until the result arrives |
| Timetables (`components/weekly-timetable.tsx`) | One colour per subject (two subjects in one week never share a colour; red stays for clashes); a "Lab" tag; the week settles into the grid in reading order |
| Schedule Builder | **Draft timetables** draws the chosen block's week inline (year tabs, block chips) instead of a table in a pop-up; the generator shows a progress line while it works; the problem report rises in; the open draft card is marked in navy and gold |
| Results | Success, warning and error messages slide in after an action |
| Dialogs, disclosures, tabs | Dialogs rise over a fading backdrop; "View problems"-style sections open smoothly; tab highlights glide |
| Buttons and fields | Press feedback; focus ring grows in; hover on fields |
| Shell | Sidebar marker slides in on the opened page; the top bar gains a soft edge when the page scrolls |
| Home and Sign in | The sample week fills in class by class |
| Numbers | Stat values use the serif of the page titles |

All animation is switched off when the device asks for reduced motion.

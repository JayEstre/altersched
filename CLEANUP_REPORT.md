# AlterSched cleanup report

## Implemented in this cleaned source
- Locked active roles to Administrator, Department Scheduler, and Instructor.
- Removed the Student portal/routes and Student account workflow from application source.
- Rebuilt Admin Instructor Approvals as an Instructor-only approval queue.
- Removed Curricula actions from Subject management and removed legacy Admin pages that depended on the old curricula/student/admin-scheduling workflow.
- Moved the schedule automation server actions into the Department Scheduler feature area.
- Kept smart schedule candidate scoring for preferred availability, compact block/instructor schedules, room utilization, repeated-day spreading, and late-class penalties.
- Preserved hard conflict checks and the server-side save gate that refuses Preview changes while hard conflicts remain.
- Added Preview Table / Timetable switching to the schedule workspace.
- Preserved qualified-Instructor and compatible-room editing in Schedule Preview.
- Preserved Scheduler publication, website notifications, optional email delivery, and revocable public QR schedule sharing.
- Preserved Excel/CSV export.
- Fixed login/registration autocomplete semantics, including `new-password` for Instructor registration.
- Reworked Admin dashboard around master data and Instructor approvals instead of Admin schedule generation.
- Moved schedule-request review to the Department Scheduler role.
- Removed stale generated TypeScript build metadata and obsolete project-note files.

## Verification performed
All remaining `.ts` and `.tsx` files passed a TypeScript parser/transpile syntax scan after the cleanup.

A full `next build` was not completed in the isolated workspace because dependency installation timed out. Runtime verification against the user's live Supabase project is still required after `npm install` on the target machine.

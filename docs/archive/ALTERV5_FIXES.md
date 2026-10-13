# AlterSched AlterV5 Fixes

This package aligns the active application with the current three-role scope: Super Administrator, Department Scheduler, and Faculty/Instructor.

## Fixed
- Password visibility control: the eye button is anchored at the far right of the password input and only the eye button toggles visibility. The password label no longer wraps the toggle button.
- Removed Student statistics/query from Admin Reports.
- Removed Student wording from the landing page and Admin schedule sharing instructions.
- Reworded class-size/capacity UI so it does not present Student as an application role.
- Expanded Admin navigation to expose implemented scheduling/admin modules: Class Offerings, Schedule Review & Publish, General Schedule, Change Requests, Revision History, Teaching Load, and Reports.
- Kept Department Scheduler publication ownership correct: Scheduler submits; Super Administrator performs final publication.
- Kept Import Data at /admin/import-export.
- Removed the obsolete alterv3.zip archive embedded in the project.

## Intentionally retained
- Database-level legacy student tables/enums/migrations were not destructively removed. Removing them requires a deliberate database migration and data/FK review.
- The auth redirect test for role `student` remains because it verifies that the unsupported role is rejected and redirected to login.
- The database field `expected_students` remains because it is part of the existing schema and is used as a class-size/capacity value; user-facing wording was adjusted.
- Core schedule-generation logic was not refactored merely for file size, to avoid introducing regressions into working scheduling behavior.

## Verification note
A dependency installation attempt in the build environment timed out, so a complete npm lint/build could not be executed here. On the target machine run:

npm install
npm run lint
npm run build

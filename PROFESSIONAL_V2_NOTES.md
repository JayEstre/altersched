# AlterSched Professional V2 — Panel Revision

## Active product roles
1. Administrator (database role: `super_admin`)
2. Department Scheduler (`department_scheduler`)
3. Instructor (database role: `faculty`)

The legacy `student` enum/table structures are intentionally not dropped yet. They are no longer part of the V2 UI workflow and remain only to avoid destructive migration risk while the new public QR flow is validated.

## Implemented in this revision
- One shared login page for all three active roles; legacy `/admin/login` redirects to it.
- Instructor-only self registration and Administrator approval workflow foundation.
- Instructor registration creates a faculty profile through the V2 database trigger.
- Admin navigation reduced to approvals, subjects, rooms/labs, school year/semester, instructors, settings.
- Academic Setup UI reduced to School Year and Semester management.
- Curriculum dependency removed from automatic generation. Generator now consumes active class offerings/scheduling inputs directly.
- Department Scheduler owns AI schedule generation.
- Scheduler builder renamed/reframed as AI Schedule Automation and retains a visible generated-schedule preview table.
- Department Scheduler publication action with blocking-conflict and empty-schedule checks.
- Publish creates website notifications for affected instructors.
- Optional email delivery through Resend when `RESEND_API_KEY` and `ALTERSCHED_EMAIL_FROM` are configured; every delivery attempt is audited in `email_notifications`.
- Publishing creates a revocable public schedule share token for student distribution. Students do not need accounts.
- Public read-only schedule page resolved by a security-definer token function.
- QR code rendering for the public schedule share.
- Excel and CSV schedule export endpoints.
- Existing Batch 1 lecture/lab session type, BSIT scope, room compatibility, teaching-load enforcement, and Study Load tools are preserved.

## Required database migration
Run `database/AlterSched_Professional_V2.sql` after the existing database and `AlterSched_BSIT_Panel_Batch1.sql`.

## Environment for production
- `NEXT_PUBLIC_SITE_URL=https://your-real-domain.example`
- Optional email: `RESEND_API_KEY=...`
- Optional email: `ALTERSCHED_EMAIL_FROM=AlterSched <schedule@your-verified-domain.example>`

## Dependency
`qrcode` and `@types/qrcode` were added to package.json. Run `npm install` before building so package-lock/node_modules are reconciled.

## Safety note
Curriculum/student tables are not dropped in this migration. Remove them only after end-to-end validation and a database backup.

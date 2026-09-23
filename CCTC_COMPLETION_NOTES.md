# AlterSched — CCTC Institutional Pass

This build preserves the existing AlterSched architecture while refocusing the product for Consolatrix College of Toledo City, Inc.

## Completed in this pass
- Added the supplied CCTC institutional logo and final AlterSched logo to the application assets.
- Reworked the public landing page around CCTC institutional identity without replacing AlterSched product identity.
- Added a restrained glass treatment, institutional blue/red accents, responsive polish, subtle entrance transitions, and reduced-motion support.
- Added CCTC identity to the shared Admin, Scheduler, Faculty, and Student portal shell.
- Updated application metadata for the CCTC deployment.
- Updated login and registration branding.
- Replaced the Admin dashboard's hardcoded workflow/step text with live academic context and recent schedule data.
- Expanded previously compressed major layout/page source files so they are no longer presented as two-line placeholders.
- Preserved database-driven departments, programs, rooms, subjects, users, academic years, semesters, schedules, and permissions.

## Important
Environment secrets are intentionally not included. Restore `.env.local` locally before running the app.
Database schema/RLS migrations remain part of the project and should be applied only to the matching Supabase project.

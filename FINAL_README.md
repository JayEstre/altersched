# AlterSched V1 — Reconciled Project Batch

Academic Schedule Management & Revision System.

## Core workflow
CREATE SCHEDULE → DETECT CONFLICTS → PUBLISH → ALTER → APPROVE → UPDATE → NOTIFY → KEEP HISTORY

## Portals
- Super Admin: `/admin/dashboard`
- Department Scheduler: `/scheduler/dashboard`
- Faculty: `/faculty/dashboard`
- Student: `/student/dashboard`

## Setup
1. Copy `.env.local.example` to `.env.local` and use the existing Supabase project values.
2. Apply `database/AlterSched_Database_V2.sql` to a clean database when creating a new environment.
3. Apply `database/AlterSched_Auth_Fix_All.sql` for the reconciled signup trigger/registration behavior.
4. `npm install`
5. `npm run build`
6. `npm run dev`

## Important production note
The database includes `claim_schedule(uuid, claim_method)`. Raw student access codes/QR tokens are intentionally stored only as hashes. A secure server-side resolver for raw code/QR → `schedule_access_codes.id` is still deployment-specific and is not faked in the browser UI.

## Reconciliation decisions
- Custom CSS only; no Tailwind dependency.
- `account_status = approved` is the active approved state. There is no `active` account-status enum.
- Logout route normalized to `/auth/signout`.
- Student registration exposes Program → Year Level → Block; department is derived from the selected program for trigger compatibility.
- Scheduler has a dedicated `/scheduler/schedule-builder`; it no longer points to the Admin builder.
- Admin settings does not query a nonexistent `system_settings` table.
- TypeScript nested Supabase relations are handled as relation arrays where used.

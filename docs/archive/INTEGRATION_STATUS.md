# AlterSched integrated working copy — 2026-10-09

This package is based on the original `alterv6(1).zip`, not the V2 starter. It does not change database schema or existing Supabase records.

## Implemented source changes
- Native top-layer `GlassModal` reusable component: accessible close button, click outside, Esc support, scrolling, responsive sizing, minimal glass styling.
- Admin Curriculum: Create Curriculum form now opens in modal, existing server action preserved; Year Level / Semester curriculum subject browser with modal and real mapped records.
- Admin Subject Catalog: added Year Level subject browser with floating modal; original year-filtered editing table and actions retained.
- Department Scheduler Schedule Builder: added Year Level / Block modal browser for real draft schedule entries, with section year derived from database relationship; original generator, editor, validations and submission actions retained.
- Admin account navigation label clarified.
- Shared glass styling and reduced-motion support.

## Existing code retained, not re-engineered
- Conflict detection engine, Admin approval/publishing, Faculty alteration workflow, import, notifications, reports, exports and other modules are included from the original project without functional rewrites. Do not interpret retained files as newly verified features.

## Validation limitations
- TypeScript TSX syntax transpilation completed on seven modified/new TSX files with no syntax diagnostics.
- Full `npm ci`, `npm run build`, lint, live Supabase connectivity and end-to-end scheduling tests were NOT completed in this environment. Dependency installation timed out; types are incomplete.
- Database relationship `sections -> year_levels` used for the new block browser must be checked against your live schema. If this join is unavailable, the new block browser will have no year mapping; original SchedulePreview still works.

## Safe test procedure
1. Extract into a **new folder**, do not overwrite your only working copy.
2. Copy your own `.env.local` privately from the original local project; never share it.
3. Run `npm ci` then `npm run build` and `npm run dev`.
4. Test `/admin/subjects` year viewer and existing editing; `/admin/curriculum` Create Curriculum modal and year/semester viewer; `/scheduler/schedule-builder` select an existing draft and check block viewer.
5. Then regression-test scheduling generation, conflicts, submit/review/publish, and faculty alterations against a **development/test Supabase** first. Avoid modifying live data during smoke tests.

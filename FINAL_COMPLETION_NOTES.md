# AlterSched completion pass

This pass removes sample-domain dependencies from runtime logic and completes the major V1 workflow surfaces.

## Implemented
- Database-driven academic setup, subjects/curriculum, faculty, rooms/availability, class offerings and faculty assignment.
- Schedule generation, conflict/validation records, schedule version listing, publication/archive and access-code workflow.
- Student secure code claim and published schedule view.
- Faculty published schedule view and alteration-request submission.
- Super Admin alteration approval/rejection. Approval creates a new draft version, copies the prior entries, applies the requested change, records revision history and notifies the requester. The new draft must be validated/published through the normal lifecycle.
- Live reports for operational counts, faculty teaching load and room inventory.
- Settings now reads institution and active academic context from the database instead of presenting deployment placeholder copy.
- Final non-recursive schedule read-policy migration in `database/AlterSched_Final_RLS.sql`.
- Semester-to-curriculum matching uses `semesters.term_order`; it no longer parses the semester name for "1st"/"2nd" text.
- Removed bundled `app/admin.zip` duplicate.
- Genericized example placeholders that looked like fixed institution data.

## SQL migration order for an existing database
Do not rerun the full base schema on an existing populated database. Apply only migrations that have not already been applied, then run `database/AlterSched_Final_RLS.sql` last.

## Next phase
Per project plan, debugging and live Supabase end-to-end testing follows this completion pass. Production readiness still depends on successful migration execution, role/RLS verification, and a clean production build against the target environment.

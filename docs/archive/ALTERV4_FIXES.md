# AlterV4 Alignment Fixes

This revision aligns the application with the current three-role project scope: Super Administrator, Department Scheduler, and Faculty/Instructor.

## Fixed
- Removed the active `app/student` portal and Student navigation.
- Student accounts now resolve as unsupported instead of routing to a Student dashboard.
- Reworked Admin User Management into Instructor Approvals only; Student accounts cannot be approved/managed from this workflow.
- Renamed Department Scheduler `Schedules & Publish` to `Schedules & Submission`.
- Kept final publication under Super Administrator control.
- Removed the duplicate legacy Admin Schedule Builder route; Department Scheduler Schedule Builder remains the scheduling implementation.
- Changed Admin dashboard scheduling CTA from building schedules to reviewing schedules.
- Renamed Admin sidebar `Import / Export` to `Import Data` while preserving `/admin/import-export`.
- Reworded schedule Code/QR UI from Student-specific access to public read-only schedule access.
- Removed Student-route revalidation calls from active admin workflows.

## Deliberately retained
- Legacy Student-related database tables/enums are not dropped by this source cleanup. Destructive database removal requires a separately reviewed migration because existing foreign keys/data may depend on them.
- Public Code/QR schedule distribution remains supported as read-only distribution without a Student account workflow.

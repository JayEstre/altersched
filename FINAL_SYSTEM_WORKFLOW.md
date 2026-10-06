# AlterSched Final Core Workflow

AlterSched is centered on one primary process:

1. Users register and administrators approve accounts.
2. Admin configures academic year/semester, programs, year levels and blocks.
3. Admin maintains subjects and curriculum mappings.
4. Admin maintains faculty qualifications/availability and rooms/availability.
5. **Generate Schedule** automatically prepares missing class offerings from the active curriculum.
6. The generator automatically assigns eligible faculty to unassigned offerings while respecting teaching-load limits.
7. The generator assigns day, time and room while preventing section, faculty and room overlaps and respecting availability.
8. Generated schedules are saved as drafts for review.
9. Admin publishes a validated schedule and receives a distribution access code/token.
10. Students claim the published schedule; the database verifies their academic hierarchy before granting membership.
11. Alterations and revisions remain available after publication without cluttering the normal generation workflow.

## Simplified Admin Navigation

The primary navigation now exposes only the core operational screens. Class Offerings remains available as an advanced/manual override route, while revision history, reports and settings remain implemented but are no longer primary navigation items.

## Generator behavior changed in this revision

- Manual pre-assignment of every class offering is no longer required.
- Missing class offerings are prepared automatically from curriculum mappings.
- Existing manual faculty assignments are preserved.
- Unassigned offerings receive an eligible qualified faculty member automatically.
- Faculty teaching-load limits are considered during automatic assignment.
- If a subject has no qualified faculty, generation stops with a focused setup message rather than asking the admin to manually assign every offering.

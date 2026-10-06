# AlterSched

AlterSched is the CCTC academic scheduling system for four roles: Administrator, Department Scheduler, Instructor, and Student. Students can claim their published schedule through the generated QR/link and see the schedule in their own portal.

## Workflow
1. Instructor registers and waits for Administrator approval.
2. Administrator maintains Subjects, Rooms/Labs, School Year/Semester, Instructor records and qualifications.
3. Department Scheduler prepares scheduling inputs and runs AI Schedule Automation.
4. The engine assigns subject/block sessions to qualified instructors, compatible rooms, days and times while enforcing hard conflict rules and applying timetable optimization scoring.
5. Scheduler reviews the editable Preview Table or Timetable view, resolves conflicts, and saves only a conflict-free draft.
6. Scheduler publishes the schedule. Affected instructors receive in-app notifications and email when email delivery is configured.
7. Publication generates a revocable public schedule token/QR for students.
8. Students can claim and view their schedule in the student portal.
9. Schedules can be exported to Excel/CSV.

## Roles
- `super_admin` — Administrator
- `department_scheduler` — Department Scheduler
- `faculty` — Instructor
- `student` — Student

## Local setup
```bash
npm install
npm run dev
```

Configure Supabase environment variables before running the app. For email notifications, configure `RESEND_API_KEY` and `ALTERSCHED_EMAIL_FROM`.

## Important
This project includes the active student portal and student schedule workflow. Keep database migrations backed up and verified before altering production data, especially when changing role access or published schedule tables.

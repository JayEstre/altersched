# AlterSched V1 Final Test Checklist

## Build
- [ ] npm install
- [ ] npm run build
- [ ] npm run dev

## Authentication
- [ ] Student registration → pending
- [ ] Faculty registration → pending
- [ ] Super Admin login → admin dashboard
- [ ] Pending account cannot enter protected portal
- [ ] Logout returns to login

## Admin
- [ ] Approve/reject/suspend user
- [ ] Promote faculty to scheduler
- [ ] Assign/revoke scheduler department
- [ ] Academic setup data visible
- [ ] Subjects/curriculum visible
- [ ] Faculty and rooms visible
- [ ] Class offerings visible
- [ ] Schedule/version status visible
- [ ] Change requests visible
- [ ] Revision history visible

## Scheduler
- [ ] Only department_scheduler role can enter
- [ ] Assigned department scope visible
- [ ] Class offerings/faculty/rooms load
- [ ] Dedicated schedule-builder route works
- [ ] Schedule/change-request pages load

## Faculty
- [ ] Own published schedule loads
- [ ] Teaching load loads
- [ ] Availability loads
- [ ] Own alteration requests load
- [ ] Notifications load

## Student
- [ ] Academic profile matches program/year/block
- [ ] Claimed schedule membership loads
- [ ] Published schedule entries load
- [ ] Notifications load
- [ ] Raw code/QR resolver tested after server resolver is implemented

## Conflict validation
- [ ] Faculty overlap rejected/logged
- [ ] Room overlap rejected/logged
- [ ] Section overlap rejected/logged
- [ ] Faculty availability checked
- [ ] Room availability checked
- [ ] Published schedule treated as frozen

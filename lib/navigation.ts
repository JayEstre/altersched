export type NavigationItem =
  { type?: 'item'; href: string; label: string; icon?: string } | { type: 'group'; label: string }

export const adminNavigation: NavigationItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { type: 'group', label: 'PEOPLE' },
  { href: '/admin/users', label: 'User & Account Management', icon: 'user-check' },
  { href: '/admin/faculty', label: 'Instructors', icon: 'users' },
  { type: 'group', label: 'ACADEMIC DATA' },
  { href: '/admin/subjects', label: 'Subjects', icon: 'book-open' },
  { href: '/admin/curriculum', label: 'Curriculum', icon: 'library' },
  { href: '/admin/rooms', label: 'Rooms & Labs', icon: 'building-2' },
  { href: '/admin/academic', label: 'School Year & Semester', icon: 'calendar-days' },
  { href: '/admin/class-offerings', label: 'Class Offerings', icon: 'list-checks' },
  { type: 'group', label: 'SCHEDULING' },
  { href: '/admin/schedules', label: 'Schedule Review & Publish', icon: 'calendar-check' },
  { href: '/admin/general-schedule', label: 'General Schedule', icon: 'calendar-range' },
  { href: '/admin/change-requests', label: 'Change Requests', icon: 'git-pull-request' },
  { href: '/admin/revision-history', label: 'Revision History', icon: 'history' },
  { href: '/admin/study-load', label: 'Teaching Load', icon: 'briefcase-business' },
  { href: '/admin/reports', label: 'Reports', icon: 'chart-no-axes-column' },
  { type: 'group', label: 'SYSTEM' },
  { href: '/admin/import-export', label: 'Import Data', icon: 'arrow-up-down' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
]

export const schedulerNavigation: NavigationItem[] = [
  { href: '/scheduler/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { type: 'group', label: 'SCHEDULING' },
  { href: '/scheduler/schedule-builder', label: 'Schedule Builder', icon: 'calendar-range' },
  { href: '/scheduler/conflicts', label: 'Conflict Monitor', icon: 'list-checks' },
  { href: '/scheduler/availability', label: 'Availability', icon: 'clock-3' },
  { href: '/scheduler/schedules', label: 'Schedules & Submission', icon: 'calendar-check' },
  { href: '/scheduler/class-offerings', label: 'Scheduling Inputs', icon: 'list-checks' },
  { href: '/scheduler/alterations', label: 'Alteration Requests', icon: 'git-pull-request' },
  { type: 'group', label: 'RESOURCES' },
  { href: '/scheduler/faculty', label: 'Instructors', icon: 'users' },
  { href: '/scheduler/rooms', label: 'Rooms', icon: 'building-2' },
  { type: 'group', label: 'PERSONAL' },
  { href: '/scheduler/my-schedule', label: 'My Schedule', icon: 'calendar-days' },
  { type: 'group', label: 'ACCOUNT' },
  { href: '/scheduler/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/scheduler/profile', label: 'Profile', icon: 'circle-user-round' },
]

export const facultyNavigation: NavigationItem[] = [
  { href: '/faculty/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { type: 'group', label: 'TEACHING' },
  { href: '/faculty/schedule', label: 'My Schedule', icon: 'calendar-days' },
  { href: '/faculty/teaching-load', label: 'Teaching Load', icon: 'briefcase-business' },
  { href: '/faculty/availability', label: 'Availability', icon: 'clock-3' },
  { href: '/faculty/alterations', label: 'Schedule Requests', icon: 'git-pull-request' },
  { type: 'group', label: 'ACCOUNT' },
  { href: '/faculty/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/faculty/profile', label: 'Profile', icon: 'circle-user-round' },
]

export type NavigationItem =
  { type?: 'item'; href: string; label: string; icon?: string } | { type: 'group'; label: string }

export const adminNavigation: NavigationItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { type: 'group', label: 'People' },
  { href: '/admin/users', label: 'Accounts', icon: 'user-check' },
  { href: '/admin/faculty', label: 'Instructors', icon: 'users' },
  { type: 'group', label: 'Academic data' },
  { href: '/admin/subjects', label: 'Subjects', icon: 'book-open' },
  { href: '/admin/curriculum', label: 'Curriculum', icon: 'library' },
  { href: '/admin/rooms', label: 'Rooms & Labs', icon: 'building-2' },
  { href: '/admin/academic', label: 'School Year & Semester', icon: 'calendar-days' },
  { href: '/admin/class-offerings', label: 'Class Offerings', icon: 'list-checks' },
  { type: 'group', label: 'Scheduling' },
  { href: '/admin/schedules', label: 'Schedule Review & Publish', icon: 'calendar-check' },
  { href: '/admin/change-requests', label: 'Schedule Requests', icon: 'git-pull-request' },
  { href: '/admin/reports', label: 'Reports', icon: 'chart-column' },
  { type: 'group', label: 'System' },
  { href: '/admin/import-export', label: 'Import Data', icon: 'arrow-up-down' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
]

export const schedulerNavigation: NavigationItem[] = [
  { href: '/scheduler/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { type: 'group', label: 'Scheduling' },
  { href: '/scheduler/class-offerings', label: 'Scheduling Inputs', icon: 'list-checks' },
  { href: '/scheduler/availability', label: 'Availability', icon: 'clock-3' },
  { href: '/scheduler/schedule-builder', label: 'Schedule Builder', icon: 'calendar-range' },
  { href: '/scheduler/schedules', label: 'Schedules & Submission', icon: 'calendar-check' },
  { href: '/scheduler/alterations', label: 'Schedule Requests', icon: 'git-pull-request' },
  { type: 'group', label: 'Account' },
  { href: '/scheduler/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/scheduler/profile', label: 'Profile', icon: 'circle-user-round' },
]

export const facultyNavigation: NavigationItem[] = [
  { href: '/faculty/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { type: 'group', label: 'Teaching' },
  { href: '/faculty/schedule', label: 'My Schedule', icon: 'calendar-days' },
  { href: '/faculty/availability', label: 'Availability', icon: 'clock-3' },
  { href: '/faculty/alterations', label: 'Schedule Requests', icon: 'git-pull-request' },
  { type: 'group', label: 'Account' },
  { href: '/faculty/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/faculty/profile', label: 'Profile', icon: 'circle-user-round' },
]

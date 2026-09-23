export type AlterSchedRole = 'super_admin' | 'department_scheduler' | 'faculty' | 'student'
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive'

export function destinationFor(role: AlterSchedRole, status: AccountStatus) {
  if (status !== 'approved') return '/pending-approval'

  switch (role) {
    case 'super_admin':
      return '/admin/dashboard'
    case 'department_scheduler':
      return '/scheduler/dashboard'
    case 'faculty':
      return '/faculty/dashboard'
    default:
      return '/student/dashboard'
  }
}

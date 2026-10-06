// Roles must stay aligned with public.user_role in AlterSched_Database_V2.sql.
export type AlterSchedRole = 'super_admin' | 'department_scheduler' | 'faculty' | 'student'
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive'

export type ProfileRecord = {
  id: string
  full_name: string | null
  role: string | null
  account_status: string | null
}

export function normalizeRole(value: string | null | undefined): AlterSchedRole | 'unknown' {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[-\s]+/g, '_')

  if (normalized === 'super_admin' || normalized === 'department_scheduler' || normalized === 'faculty' || normalized === 'student') {
    return normalized as AlterSchedRole
  }

  return 'unknown'
}

export function normalizeAccountStatus(value: string | null | undefined): AccountStatus | 'unknown' {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (normalized === 'pending' || normalized === 'approved' || normalized === 'rejected' || normalized === 'suspended' || normalized === 'inactive') {
    return normalized as AccountStatus
  }

  return 'unknown'
}

export function isApprovedAccountStatus(value: string | null | undefined) {
  return normalizeAccountStatus(value) === 'approved'
}

export function isApprovedProfile(profile: Pick<ProfileRecord, 'role' | 'account_status'> | null | undefined) {
  return !!profile && isApprovedAccountStatus(profile.account_status) && normalizeRole(profile.role) !== 'unknown'
}

export function isRoleAllowed(allowed: ReadonlyArray<string | AlterSchedRole>, role: string | null | undefined) {
  const normalizedRole = normalizeRole(role)

  return allowed.some((entry) => normalizeRole(entry) === normalizedRole && normalizedRole !== 'unknown')
}

export function destinationFor(role: string, status: AccountStatus | string) {
  const normalizedStatus = normalizeAccountStatus(status)
  const normalizedRole = normalizeRole(role)

  if (normalizedStatus !== 'approved') return '/pending-approval'
  if (normalizedRole === 'super_admin') return '/admin/dashboard'
  if (normalizedRole === 'department_scheduler') return '/scheduler/dashboard'
  if (normalizedRole === 'faculty') return '/faculty/dashboard'
  if (normalizedRole === 'student') return '/student/dashboard'
  return '/login?error=role_not_supported'
}

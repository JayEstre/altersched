// Roles must stay aligned with public.user_role in AlterSched_Database_V2.sql.
<<<<<<< HEAD
export type AlterSchedRole = 'super_admin' | 'department_scheduler' | 'faculty'
=======
export type AlterSchedRole = 'super_admin' | 'department_scheduler' | 'faculty' | 'student'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive'

export type ProfileRecord = {
  id: string
  full_name: string | null
  role: string | null
  account_status: string | null
}

export function normalizeRole(value: string | null | undefined): AlterSchedRole | 'unknown' {
<<<<<<< HEAD
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')

  if (
    normalized === 'super_admin' ||
    normalized === 'department_scheduler' ||
    normalized === 'faculty'
  ) {
=======
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[-\s]+/g, '_')

  if (normalized === 'super_admin' || normalized === 'department_scheduler' || normalized === 'faculty' || normalized === 'student') {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    return normalized as AlterSchedRole
  }

  return 'unknown'
}

<<<<<<< HEAD
export function normalizeAccountStatus(
  value: string | null | undefined
): AccountStatus | 'unknown' {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (
    normalized === 'pending' ||
    normalized === 'approved' ||
    normalized === 'rejected' ||
    normalized === 'suspended' ||
    normalized === 'inactive'
  ) {
=======
export function normalizeAccountStatus(value: string | null | undefined): AccountStatus | 'unknown' {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (normalized === 'pending' || normalized === 'approved' || normalized === 'rejected' || normalized === 'suspended' || normalized === 'inactive') {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    return normalized as AccountStatus
  }

  return 'unknown'
}

export function isApprovedAccountStatus(value: string | null | undefined) {
  return normalizeAccountStatus(value) === 'approved'
}

<<<<<<< HEAD
export function isApprovedProfile(
  profile: Pick<ProfileRecord, 'role' | 'account_status'> | null | undefined
) {
  return (
    !!profile &&
    isApprovedAccountStatus(profile.account_status) &&
    normalizeRole(profile.role) !== 'unknown'
  )
}

export function isRoleAllowed(
  allowed: ReadonlyArray<string | AlterSchedRole>,
  role: string | null | undefined
) {
  const normalizedRole = normalizeRole(role)

  return allowed.some(
    (entry) => normalizeRole(entry) === normalizedRole && normalizedRole !== 'unknown'
  )
=======
export function isApprovedProfile(profile: Pick<ProfileRecord, 'role' | 'account_status'> | null | undefined) {
  return !!profile && isApprovedAccountStatus(profile.account_status) && normalizeRole(profile.role) !== 'unknown'
}

export function isRoleAllowed(allowed: ReadonlyArray<string | AlterSchedRole>, role: string | null | undefined) {
  const normalizedRole = normalizeRole(role)

  return allowed.some((entry) => normalizeRole(entry) === normalizedRole && normalizedRole !== 'unknown')
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

export function destinationFor(role: string, status: AccountStatus | string) {
  const normalizedStatus = normalizeAccountStatus(status)
  const normalizedRole = normalizeRole(role)

  if (normalizedStatus !== 'approved') return '/pending-approval'
  if (normalizedRole === 'super_admin') return '/admin/dashboard'
  if (normalizedRole === 'department_scheduler') return '/scheduler/dashboard'
  if (normalizedRole === 'faculty') return '/faculty/dashboard'
<<<<<<< HEAD
=======
  if (normalizedRole === 'student') return '/student/dashboard'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  return '/login?error=role_not_supported'
}

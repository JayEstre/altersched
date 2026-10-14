import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { ActionResult, Badge, Empty, PageHead, Panel, Stat } from '@/components/ui'
import { approveUser, rejectUser, suspendUser } from './actions'
import { promoteToDepartmentScheduler, demoteSchedulerToFaculty } from './scheduler-actions'
import { isAccountStatus, type AccountStatus } from '@/lib/enums'

const PAGE_SIZE = 20

const STATUS_TABS: { key: AccountStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
]

const SUCCESS_MESSAGES = {
  approved: 'Account approved. The instructor can now sign in.',
  rejected: 'Registration rejected.',
  suspended: 'Account suspended. The user can no longer sign in.',
  scheduler_promoted: 'The instructor is now a Department Scheduler for their department.',
  scheduler_demoted: 'The Department Scheduler is back to a Faculty account.',
}

const ERROR_MESSAGES = {
  missing_profile: 'No account was selected.',
  user_not_found: 'The account could not be found.',
  role_not_managed: 'Only Faculty and Department Scheduler accounts are managed here.',
  faculty_profile_lookup_failed: 'The instructor profile could not be checked.',
  faculty_profile_missing: 'This account has no instructor profile yet.',
  faculty_profile_incomplete: 'The instructor profile is incomplete (Employee ID or department).',
  invalid_faculty_department: 'The instructor belongs to an inactive or unknown department.',
  invalid_scheduler_candidate: 'Only approved Faculty accounts can become Department Schedulers.',
  scheduler_promotion_failed: 'The account could not be promoted.',
  scheduler_assignment_failed: 'The department assignment could not be saved.',
  invalid_scheduler: 'This account is not an active Department Scheduler.',
  scheduler_revoke_failed: 'The scheduler assignment could not be removed.',
  scheduler_demotion_failed: 'The account could not be changed back to Faculty.',
}

type Params = { status?: string; q?: string; page?: string; error?: string; success?: string }

function tone(status: AccountStatus) {
  if (status === 'approved') return 'success' as const
  if (status === 'pending') return 'warning' as const
  if (status === 'rejected' || status === 'suspended') return 'danger' as const
  return 'info' as const
}

/** Characters with a meaning in PostgREST filters are removed from the search text. */
function cleanSearch(value: string | undefined) {
  return (value ?? '')
    .replace(/[%*,()."\\]/g, ' ')
    .trim()
    .slice(0, 60)
}

export default async function AdminUsersPage({ searchParams }: { searchParams?: Promise<Params> }) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const params: Params = searchParams ? await searchParams : {}

  const status = params.status && isAccountStatus(params.status) ? params.status : null
  const search = cleanSearch(params.q)
  const page = Math.max(1, Math.floor(Number(params.page) || 1))
  const from = (page - 1) * PAGE_SIZE

  const managed = () =>
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['faculty', 'department_scheduler'])

  let listQuery = supabase
    .from('profiles')
    .select('id,email,full_name,role,account_status,created_at', { count: 'exact' })
    .in('role', ['faculty', 'department_scheduler'])
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
  if (status) listQuery = listQuery.eq('account_status', status)
  if (search) listQuery = listQuery.or(`full_name.ilike.*${search}*,email.ilike.*${search}*`)

  const [list, all, pending, approved, rejected, suspended, schedulers] = await Promise.all([
    listQuery,
    managed(),
    managed().eq('account_status', 'pending'),
    managed().eq('account_status', 'approved'),
    managed().eq('account_status', 'rejected'),
    managed().eq('account_status', 'suspended'),
    managed().eq('account_status', 'approved').eq('role', 'department_scheduler'),
  ])

  const users = list.data ?? []
  const total = list.count ?? users.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const counts: Record<string, number> = {
    all: all.count ?? 0,
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    rejected: rejected.count ?? 0,
    suspended: suspended.count ?? 0,
  }

  const href = (next: Partial<Params>) => {
    const query = new URLSearchParams()
    const merged = { status: status ?? undefined, q: search || undefined, page: undefined, ...next }
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === 'page' && value === '1')) query.set(key, String(value))
    }
    const text = query.toString()
    return text ? `/admin/users?${text}` : '/admin/users'
  }

  return (
    <div className="page-stack">
      <PageHead
        title="Accounts"
        description="Approve instructor registrations and choose who is Department Scheduler. Students do not need accounts; they use the public schedule link."
      />
      <ActionResult
        params={params}
        successMessages={SUCCESS_MESSAGES}
        errorMessages={ERROR_MESSAGES}
      />
      <div className="stats-grid">
        <Stat label="Pending" value={counts.pending} hint="Awaiting approval" />
        <Stat label="Approved" value={counts.approved} hint="Approved instructor accounts" />
        <Stat
          label="Schedulers"
          value={schedulers.count ?? 0}
          hint="Approved Department Schedulers"
        />
      </div>

      <Panel
        title="Instructor accounts"
        description="Only Faculty/Instructor and Department Scheduler accounts are managed here."
      >
        <div className="users-toolbar">
          <nav className="filter-tabs" aria-label="Filter accounts by status">
            {STATUS_TABS.map((tab) => {
              const active = (status ?? 'all') === tab.key
              return (
                <Link
                  key={tab.key}
                  href={href({ status: tab.key === 'all' ? undefined : tab.key })}
                  className={active ? 'filter-tab filter-tab-active' : 'filter-tab'}
                  aria-current={active ? 'page' : undefined}
                >
                  {tab.label} <span className="filter-tab-count">{counts[tab.key]}</span>
                </Link>
              )
            })}
          </nav>
          <form action="/admin/users" className="users-search" role="search">
            {status && <input type="hidden" name="status" value={status} />}
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search name or email"
              aria-label="Search accounts"
            />
            <button type="submit" className="btn btn-outline btn-sm">
              Search
            </button>
            {search && (
              <Link href={href({ q: undefined })} className="btn btn-outline btn-sm">
                Clear
              </Link>
            )}
          </form>
        </div>

        {list.error ? (
          <Empty title="Could not load accounts" text={list.error.message} />
        ) : users.length === 0 ? (
          <Empty
            title="No accounts found"
            text={search ? `Nothing matches "${search}".` : 'No Instructor accounts in this list.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.full_name || 'Unnamed Instructor'}</strong>
                    </td>
                    <td>{user.email || '—'}</td>
                    <td>
                      {user.role === 'department_scheduler'
                        ? 'Department Scheduler'
                        : 'Faculty / Instructor'}
                    </td>
                    <td>
                      <Badge tone={tone(user.account_status)}>{user.account_status}</Badge>
                    </td>
                    <td>
                      <div className="inline-actions">
                        {user.account_status === 'pending' && (
                          <>
                            <form action={approveUser}>
                              <input type="hidden" name="profile_id" value={user.id} />
                              <button className="btn btn-primary btn-sm" type="submit">
                                Approve
                              </button>
                            </form>
                            <form action={rejectUser}>
                              <input type="hidden" name="profile_id" value={user.id} />
                              <button className="btn btn-outline btn-sm" type="submit">
                                Reject
                              </button>
                            </form>
                          </>
                        )}
                        {user.account_status === 'approved' && (
                          <form action={suspendUser}>
                            <input type="hidden" name="profile_id" value={user.id} />
                            <button className="btn btn-outline btn-sm" type="submit">
                              Suspend
                            </button>
                          </form>
                        )}
                        {user.account_status === 'approved' && user.role === 'faculty' && (
                          <form action={promoteToDepartmentScheduler}>
                            <input type="hidden" name="profile_id" value={user.id} />
                            <button className="btn btn-outline btn-sm" type="submit">
                              Make Scheduler
                            </button>
                          </form>
                        )}
                        {user.account_status === 'approved' &&
                          user.role === 'department_scheduler' && (
                            <form action={demoteSchedulerToFaculty}>
                              <input type="hidden" name="profile_id" value={user.id} />
                              <button className="btn btn-outline btn-sm" type="submit">
                                Make Faculty
                              </button>
                            </form>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav className="pager" aria-label="Pages">
            <span>
              {from + 1}–{Math.min(from + PAGE_SIZE, total)} of {total}
            </span>
            <div>
              {page > 1 ? (
                <Link href={href({ page: String(page - 1) })} className="btn btn-outline btn-sm">
                  ← Previous
                </Link>
              ) : (
                <span className="btn btn-outline btn-sm" aria-disabled="true">
                  ← Previous
                </span>
              )}
              <span className="pager-page">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={href({ page: String(page + 1) })} className="btn btn-outline btn-sm">
                  Next →
                </Link>
              ) : (
                <span className="btn btn-outline btn-sm" aria-disabled="true">
                  Next →
                </span>
              )}
            </div>
          </nav>
        )}
      </Panel>
    </div>
  )
}

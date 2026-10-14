import { redirect } from 'next/navigation'
import { AuthCard, AuthHeading, AuthPage } from '@/components/auth-shell'
import styles from '@/components/auth-shell.module.css'
import { humanize } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { fetchProfileForUser } from '@/lib/auth/profile'
import { destinationFor, type AccountStatus, type AlterSchedRole } from '@/lib/auth/redirect'

export default async function PendingApprovalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await fetchProfileForUser(supabase, user.id)
  if (!profile) redirect('/login')
  if (profile.account_status === 'approved')
    redirect(
      destinationFor(profile.role as AlterSchedRole, profile.account_status as AccountStatus)
    )

  const status = profile.account_status
  const copy =
    status === 'rejected'
      ? 'Your registration was not approved. If your details need correcting, contact the Administrator or the Registrar.'
      : status === 'suspended'
        ? 'Your account is suspended. Contact the Administrator for help.'
        : status === 'inactive'
          ? 'Your account is inactive. Contact the Administrator or the Registrar.'
          : 'Your registration was received. You can use AlterSched as soon as the Administrator approves it.'
  const title =
    status === 'pending'
      ? 'Waiting for approval'
      : status === 'rejected'
        ? 'Registration not approved'
        : status === 'suspended'
          ? 'Account suspended'
          : 'Account inactive'

  return (
    <AuthPage>
      <AuthCard>
        <AuthHeading title={title}>
          Hi {profile.full_name || 'there'}. {copy}
        </AuthHeading>
        <dl className={styles.status}>
          <div>
            <dt>Account</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>
              {profile.role === 'department_scheduler' ? 'Department Scheduler' : 'Instructor'}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{humanize(status)}</dd>
          </div>
        </dl>
        <form action="/auth/signout" method="post">
          <button className="btn btn-outline auth-submit" type="submit">
            Sign out
          </button>
        </form>
      </AuthCard>
    </AuthPage>
  )
}

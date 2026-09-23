import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { destinationFor, type AccountStatus, type AlterSchedRole } from '@/lib/auth/redirect'

export default async function PendingApprovalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role, account_status').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (profile.account_status === 'approved') redirect(destinationFor(profile.role as AlterSchedRole, profile.account_status as AccountStatus))

  const copy = profile.account_status === 'rejected'
    ? 'Your registration was not approved. Contact the authorized department or Registrar if your academic information needs correction.'
    : profile.account_status === 'suspended'
    ? 'Your account is currently suspended. Contact an authorized administrator for assistance.'
    : profile.account_status === 'inactive'
    ? 'Your account is inactive. Contact the Registrar or authorized administrator.'
    : 'Your credentials were received and are waiting for verification. You can access your dashboard after an authorized reviewer approves your account.'

  return <main className="auth-page"><section className="auth-card status-card">
    <div className="status-icon">⌛</div>
    <p className="eyebrow">ACCOUNT STATUS</p>
    <h1>{profile.account_status === 'pending' ? 'Approval pending' : profile.account_status}</h1>
    <p className="muted">Hi {profile.full_name || 'there'}. {copy}</p>
    <div className="status-row"><span>Role</span><strong>{String(profile.role).replace('_', ' ')}</strong></div>
    <div className="status-row"><span>Status</span><strong>{profile.account_status}</strong></div>
    <form action="/auth/signout" method="post"><button className="btn btn-outline" type="submit">Sign out</button></form>
  </section></main>
}

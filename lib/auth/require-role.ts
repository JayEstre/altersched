import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AlterSchedRole } from './redirect'

export async function requireRole(allowed: AlterSchedRole[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, account_status')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.account_status !== 'approved') redirect('/pending-approval')
  if (!allowed.includes(profile.role as AlterSchedRole)) redirect('/login')

  return { user, profile }
}

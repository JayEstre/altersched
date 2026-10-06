import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchProfileForUser } from './profile'
import { isApprovedProfile, isRoleAllowed, type AlterSchedRole, type ProfileRecord } from './redirect'

export async function requireRole(allowed: AlterSchedRole[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await fetchProfileForUser(supabase, user.id)
  const typedProfile = profile as ProfileRecord | null

  if (!typedProfile) redirect('/login')
  if (!isApprovedProfile(typedProfile)) redirect('/pending-approval')
  if (!isRoleAllowed(allowed, typedProfile.role)) redirect('/login')

  return { user, profile: typedProfile }
}

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { fetchProfileForUser } from './profile'
import { isApprovedProfile, isRoleAllowed, type AlterSchedRole } from './redirect'

/**
 * Signed-in user + profile for the current request.
 * Wrapped in React `cache` so the portal layout and the page it renders share one lookup
 * instead of each calling Supabase Auth and loading the profile again.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const profile = await fetchProfileForUser(supabase, user.id)
  return profile ? { user, profile } : null
})

/** Redirects unless the current user is approved and has one of the allowed roles. */
export async function requireRole(allowed: AlterSchedRole[]) {
  const current = await getCurrentUser()

  if (!current) redirect('/login')
  if (!isApprovedProfile(current.profile)) redirect('/pending-approval')
  if (!isRoleAllowed(allowed, current.profile.role)) redirect('/login')

  return current
}

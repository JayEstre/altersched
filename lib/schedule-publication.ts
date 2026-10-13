import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

/*
 * Publication side effects shared by "Publish" and "Regenerate Access".
 *
 * 1. Public read-only link: /public/schedule/<token>
 *    get_public_schedule_by_token() looks the token up in public_schedule_shares
 *    using sha256(trim(token)) in lowercase hex, so the hash here must match exactly.
 *    Only the hash is stored; the raw token is shown to the admin once.
 *
 * 2. In-app notifications for every instructor who teaches in the published version.
 */

type Supabase = SupabaseClient<Database>

function shareHash(token: string) {
  return createHash('sha256').update(token.trim()).digest('hex')
}

export async function createPublicScheduleShare(
  supabase: Supabase,
  scheduleId: string,
  scheduleVersionId: string,
  generatedBy: string,
  options: { rotate?: boolean } = {}
): Promise<{ token: string | null; existing: boolean; error: string | null }> {
  const now = new Date().toISOString()

  // Re-publishing (e.g. after an approved alteration) keeps the link students
  // already have; the public page always shows the latest published version.
  if (!options.rotate) {
    const { data: active } = await supabase
      .from('public_schedule_shares')
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('active', true)
      .limit(1)
    if (active?.length) return { token: null, existing: true, error: null }
  }

  const { error: revokeError } = await supabase
    .from('public_schedule_shares')
    .update({ active: false, revoked_at: now })
    .eq('schedule_id', scheduleId)
    .eq('active', true)

  if (revokeError) {
    console.error('Failed to revoke previous public schedule links:', revokeError)
  }

  const token = randomBytes(18).toString('hex')

  const { error } = await supabase.from('public_schedule_shares').insert({
    schedule_id: scheduleId,
    schedule_version_id: scheduleVersionId,
    token_hash: shareHash(token),
    active: true,
    generated_by: generatedBy,
  })

  if (error) {
    console.error('Failed to create public schedule link:', error)
    return { token: null, existing: false, error: error.message }
  }

  return { token, existing: false, error: null }
}

export async function notifyInstructorsOfPublication(
  supabase: Supabase,
  scheduleId: string,
  scheduleVersionId: string,
  scheduleTitle: string | null
) {
  const { data: entries, error } = await supabase
    .from('schedule_entries')
    .select('faculty_id, faculty_profiles(profile_id)')
    .eq('schedule_version_id', scheduleVersionId)
    .not('faculty_id', 'is', null)

  if (error) {
    console.error('Could not load instructors to notify:', error)
    return 0
  }

  const profileIds = new Set<string>()
  for (const entry of entries ?? []) {
    const fp = Array.isArray(entry.faculty_profiles)
      ? entry.faculty_profiles[0]
      : entry.faculty_profiles
    if (fp?.profile_id) profileIds.add(fp.profile_id)
  }

  if (!profileIds.size) return 0

  let scheduleName = scheduleTitle
  if (!scheduleName) {
    const { data: schedule } = await supabase
      .from('schedules')
      .select('title')
      .eq('id', scheduleId)
      .maybeSingle()
    scheduleName = schedule?.title ?? null
  }

  const title = 'Schedule published'
  const message = `${scheduleName || 'A schedule'} has been published. Open My Schedule to view your classes.`

  const { error: insertError } = await supabase.from('notifications').insert(
    [...profileIds].map((profileId) => ({
      profile_id: profileId,
      type: 'schedule_published',
      title,
      message,
      reference_type: 'schedule',
      reference_id: scheduleId,
      priority: 'normal',
    }))
  )

  if (insertError) {
    console.error('Failed to notify instructors of publication:', insertError)
    return 0
  }

  return profileIds.size
}

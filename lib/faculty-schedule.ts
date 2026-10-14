import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { one } from '@/lib/relations'

/**
 * An instructor's classes from the schedules that are currently published.
 * An entry counts only when its version is the schedule's official published version,
 * so a revision that is still a draft never shows up, and older versions never mix in.
 */
export async function loadPublishedEntries(
  supabase: SupabaseClient<Database>,
  facultyId: string | null | undefined
) {
  if (!facultyId) return { entries: [], error: null }

  const { data, error } = await supabase
    .from('schedule_entries')
    .select(
      `id, schedule_version_id, day_of_week, start_time, end_time, entry_type, session_type,
       room_id, class_offering_id,
       rooms(code, name),
       class_offerings(id, subjects(code, name), sections(code)),
       schedule_versions!inner(id, schedule_id, version_number, status,
         schedules!schedule_versions_schedule_id_fkey!inner(id, title, status, published_version_id, current_version_id))`
    )
    .eq('faculty_id', facultyId)
    .eq('schedule_versions.status', 'published')
    .neq('schedule_versions.schedules.status', 'archived')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  const entries = (data ?? []).filter((entry) => {
    const version = one(entry.schedule_versions)
    const schedule = one(version?.schedules)
    return (
      Boolean(version && schedule) &&
      version!.status === 'published' &&
      schedule!.status !== 'archived' &&
      schedule!.published_version_id === version!.id
    )
  })

  return { entries, error }
}

/** Today's day number (1 = Monday … 7 = Sunday) at the school (Philippines). */
export function schoolToday(now = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Manila',
  }).format(now)
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday) + 1
}

/**
 * True while the schedule has a newer draft (a revision after an approved request).
 * New change requests for its classes wait until that revision is published.
 */
export function isUnderRevision(entry: { schedule_versions: unknown }) {
  const version = one(entry.schedule_versions as { id: string; schedules: unknown } | null)
  const schedule = one(version?.schedules as { current_version_id: string | null } | null)
  return Boolean(version && schedule && schedule.current_version_id !== version.id)
}

import type { SupabaseClient } from '@supabase/supabase-js'

import { dayName, formatTime } from '@/lib/format'
import { one } from '@/lib/relations'
import { overlaps } from '@/lib/time'

/**
 * "Bookings" are the sessions of the *current* version of every non-archived schedule in a
 * semester. They are used to stop a room or an instructor from being in two places at once
 * across blocks. (Clashes inside one schedule version are also enforced by the database.)
 *
 * The loader takes the Supabase client as a parameter and the matcher is pure, so this module
 * is safe to import from client components.
 */
export type Booking = {
  entryId: string
  versionId: string
  offeringId: string
  facultyId: string | null
  roomId: string | null
  day: number
  start: string
  end: string
  label: string
}

export type SessionSlot = {
  id?: string
  class_offering_id?: string
  faculty_id?: string | null
  room_id?: string | null
  day_of_week: number
  start_time: string
  end_time: string
}

export type Clash = { kind: 'room' | 'instructor'; booking: Booking }

export async function loadBookings(
  supabase: SupabaseClient,
  semesterId: string,
  excludeVersionIds: string[] = []
): Promise<Booking[]> {
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('current_version_id')
    .eq('semester_id', semesterId)
    .neq('status', 'archived')
  if (error) throw new Error(error.message)

  const versionIds = (schedules ?? [])
    .map((schedule) => schedule.current_version_id as string | null)
    .filter((id): id is string => Boolean(id) && !excludeVersionIds.includes(id as string))
  if (!versionIds.length) return []

  const { data: entries, error: entriesError } = await supabase
    .from('schedule_entries')
    .select(
      'id, schedule_version_id, class_offering_id, faculty_id, room_id, day_of_week, start_time, end_time, sections(code), class_offerings(subjects(code))'
    )
    .in('schedule_version_id', versionIds)
  if (entriesError) throw new Error(entriesError.message)

  return (entries ?? []).map((entry) => {
    const offering = one<{ subjects: unknown }>(entry.class_offerings)
    const subject = one<{ code: string }>(offering?.subjects as never)
    const block = one<{ code: string }>(entry.sections)
    return {
      entryId: entry.id,
      versionId: entry.schedule_version_id,
      offeringId: entry.class_offering_id,
      facultyId: entry.faculty_id,
      roomId: entry.room_id,
      day: Number(entry.day_of_week),
      start: entry.start_time,
      end: entry.end_time,
      label: `${subject?.code ?? 'Another class'}${block?.code ? ` (Block ${block.code})` : ''}`,
    }
  })
}

/** First booking that the session would clash with (same room or same instructor, overlapping time). */
export function findClash(session: SessionSlot, bookings: Booking[]): Clash | null {
  for (const booking of bookings) {
    if (session.id && booking.entryId === session.id) continue
    if (session.class_offering_id && booking.offeringId === session.class_offering_id) continue
    if (booking.day !== Number(session.day_of_week)) continue
    if (!overlaps(session.start_time, session.end_time, booking.start, booking.end)) continue
    if (session.room_id && booking.roomId === session.room_id) return { kind: 'room', booking }
    if (session.faculty_id && booking.facultyId === session.faculty_id)
      return { kind: 'instructor', booking }
  }
  return null
}

export function describeBooking(booking: Booking) {
  return `${booking.label} on ${dayName(booking.day)} ${formatTime(booking.start)}–${formatTime(booking.end)}`
}

export function describeClash(clash: Clash) {
  return clash.kind === 'room'
    ? `The room is already used by ${describeBooking(clash.booking)}`
    : `The instructor already teaches ${describeBooking(clash.booking)}`
}

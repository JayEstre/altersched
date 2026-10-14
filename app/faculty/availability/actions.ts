'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { getString } from '@/lib/form-data'
import { overlaps, timeToMinutes } from '@/lib/time'

const TYPES = ['available', 'preferred', 'unavailable'] as const
type AvailabilityType = (typeof TYPES)[number]

function back(query: string): never {
  redirect(`/faculty/availability?${query}`)
}

function refresh() {
  revalidatePath('/faculty/availability')
  revalidatePath('/faculty/dashboard')
  revalidatePath('/admin/faculty')
  revalidatePath('/scheduler/availability')
}

async function ownFacultyId() {
  const { profile } = await requireRole(['faculty'])
  const supabase = await createClient()
  const { data } = await supabase
    .from('faculty_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle()
  if (!data) back('error=no_faculty_profile')
  return { supabase, facultyId: data.id }
}

/** Adds one time window, or the same window for Monday to Friday. */
export async function addAvailability(formData: FormData) {
  const { supabase, facultyId } = await ownFacultyId()
  const semesterId = getString(formData, 'semester_id')
  const dayValue = getString(formData, 'day_of_week')
  const start = getString(formData, 'start_time')
  const end = getString(formData, 'end_time')
  const type = getString(formData, 'availability_type') as AvailabilityType

  if (!semesterId || !dayValue || !start || !end) back('error=missing_fields')
  if (!TYPES.includes(type)) back('error=invalid_type')
  const from = timeToMinutes(start)
  const to = timeToMinutes(end)
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) back('error=invalid_time')
  if (to - from < 30) back('error=too_short')

  const days = dayValue === 'weekdays' ? [1, 2, 3, 4, 5] : [Number(dayValue)]
  if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) back('error=invalid_day')

  const { data: existing, error: loadError } = await supabase
    .from('faculty_availability')
    .select('day_of_week, start_time, end_time')
    .eq('faculty_id', facultyId)
    .eq('semester_id', semesterId)
    .in('day_of_week', days)
  if (loadError) back('error=save_failed')

  const clash = (existing ?? []).find((row) => overlaps(start, end, row.start_time, row.end_time))
  if (clash) back(`error=overlap&day=${clash.day_of_week}`)

  const { error } = await supabase.from('faculty_availability').insert(
    days.map((day) => ({
      faculty_id: facultyId,
      semester_id: semesterId,
      day_of_week: day,
      start_time: start,
      end_time: end,
      availability_type: type,
    }))
  )
  if (error) back('error=save_failed')

  refresh()
  back(`success=${days.length > 1 ? 'added_weekdays' : 'added'}`)
}

export async function removeAvailability(formData: FormData) {
  const { supabase, facultyId } = await ownFacultyId()
  const id = getString(formData, 'availability_id')
  if (!id) back('error=missing_fields')

  const { data, error } = await supabase
    .from('faculty_availability')
    .delete()
    .eq('id', id)
    .eq('faculty_id', facultyId)
    .select('id')
  if (error || !data?.length) back('error=remove_failed')

  refresh()
  back('success=removed')
}

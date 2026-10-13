'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireRole } from '@/lib/auth/require-role'
import { SLOT_OPTIONS } from '@/lib/scheduling/settings'
import { createClient } from '@/lib/supabase/server'
import { getString } from '@/lib/form-data'
import { timeToMinutes } from '@/lib/time'

function back(query: string): never {
  redirect(`/admin/settings?${query}#generator`)
}

/** Saves the days and hours the schedule generator may use. */
export async function saveSchedulingSettings(formData: FormData) {
  const { profile } = await requireRole(['super_admin'])
  const supabase = await createClient()

  const days = [...new Set(formData.getAll('teaching_days').map(Number))]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b)
  const dayStart = getString(formData, 'day_start')
  const dayEnd = getString(formData, 'day_end')
  const slot = Number(getString(formData, 'slot_minutes'))

  if (!days.length) back('error=no_teaching_days')
  const start = timeToMinutes(dayStart)
  const end = timeToMinutes(dayEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end)) back('error=invalid_hours')
  if (end - start < 60) back('error=day_too_short')
  if (!SLOT_OPTIONS.includes(slot as (typeof SLOT_OPTIONS)[number])) back('error=invalid_slot')

  // The single settings row is created by the V8 migration; Super Admins may only update it.
  const { data, error } = await supabase
    .from('scheduling_settings')
    .update({
      teaching_days: days,
      day_start: dayStart,
      day_end: dayEnd,
      slot_minutes: slot,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq('id', true)
    .select('id')
  if (error || !data?.length) {
    console.error('Saving scheduling settings failed:', error)
    back(
      `error=save_failed&details=${encodeURIComponent(
        error?.message ?? 'Run database/AlterSched_V8_Scheduling_Settings.sql first.'
      )}`
    )
  }

  revalidatePath('/admin/settings')
  revalidatePath('/scheduler/schedule-builder')
  back('success=generator_saved')
}

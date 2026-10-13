import type { SupabaseClient } from '@supabase/supabase-js'

import { timeToMinutes } from '@/lib/time'

/** Hours and days the schedule generator may use (set by the Super Admin in Settings). */
export type SchedulingSettings = {
  /** 1 = Monday … 7 = Sunday, ascending. */
  days: number[]
  /** "HH:MM" */
  dayStart: string
  /** "HH:MM" */
  dayEnd: string
  /** Start-time step in minutes (15, 30 or 60). */
  slotMinutes: number
}

export const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
  days: [1, 2, 3, 4, 5, 6],
  dayStart: '07:00',
  dayEnd: '21:00',
  slotMinutes: 30,
}

export const SLOT_OPTIONS = [15, 30, 60] as const

/**
 * Reads the settings row. Falls back to the defaults when the table does not exist yet
 * (database without the V8 migration) or the row is missing, so scheduling keeps working.
 */
export async function loadSchedulingSettings(
  supabase: SupabaseClient
): Promise<SchedulingSettings> {
  const { data, error } = await supabase
    .from('scheduling_settings')
    .select('teaching_days, day_start, day_end, slot_minutes')
    .eq('id', true)
    .maybeSingle()
  if (error || !data) return DEFAULT_SCHEDULING_SETTINGS
  const days = (data.teaching_days ?? [])
    .map(Number)
    .filter((day: number) => day >= 1 && day <= 7)
    .sort((a: number, b: number) => a - b)
  return {
    days: days.length ? days : DEFAULT_SCHEDULING_SETTINGS.days,
    dayStart: String(data.day_start ?? DEFAULT_SCHEDULING_SETTINGS.dayStart).slice(0, 5),
    dayEnd: String(data.day_end ?? DEFAULT_SCHEDULING_SETTINGS.dayEnd).slice(0, 5),
    slotMinutes: Number(data.slot_minutes) || DEFAULT_SCHEDULING_SETTINGS.slotMinutes,
  }
}

/** The settings as solver options (minutes after midnight). */
export function toSolverOptions(settings: SchedulingSettings) {
  return {
    days: settings.days,
    dayStart: timeToMinutes(settings.dayStart),
    dayEnd: timeToMinutes(settings.dayEnd),
    interval: settings.slotMinutes,
  }
}

/**
 * Display helpers shared by every portal.
 *
 * Days follow the database convention used by schedule_entries.day_of_week,
 * faculty_availability.day_of_week and room_availability.day_of_week:
 * 1 = Monday … 7 = Sunday.
 */

export const DAY_NAMES: Readonly<Record<number, string>> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

export const DAY_SHORT_NAMES: Readonly<Record<number, string>> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
}

/** Day options for <select> elements (Monday–Sunday). */
export const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((value) => ({
  value,
  label: DAY_NAMES[value],
  short: DAY_SHORT_NAMES[value].toUpperCase(),
}))

/** Days the scheduler may place classes on (Monday–Saturday). */

export function dayName(value: number | string | null | undefined, fallback = '—') {
  const day = Number(value)
  return (
    DAY_NAMES[day] ??
    (value === null || value === undefined || value === '' ? fallback : `Day ${value}`)
  )
}

/** "13:30:00" → "13:30" */
export function formatTime(value: string | null | undefined, fallback = '—') {
  if (!value) return fallback
  return String(value).slice(0, 5)
}

/** "13:30:00" → "1:30 PM" */
export function formatTime12(value: string | null | undefined, fallback = '—') {
  if (!value) return fallback
  const [hourText, minuteText] = String(value).split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText ?? 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(value)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function formatTimeRange(start: string | null | undefined, end: string | null | undefined) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function toDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "Oct 12, 2026" */
export function formatDate(value: string | Date | null | undefined, fallback = '—') {
  const date = toDate(value)
  return date ? DATE_FORMAT.format(date) : fallback
}

/** "Oct 12, 2026, 8:12 PM" */
export function formatDateTime(value: string | Date | null | undefined, fallback = '—') {
  const date = toDate(value)
  return date ? DATE_TIME_FORMAT.format(date) : fallback
}

/** "1st Year", "2nd Year", … */
export function ordinal(value: number) {
  const n = Math.abs(Math.trunc(value))
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th')
  return `${value}${suffix}`
}

/** Maps a request/schedule status to a Badge tone. */
export function statusTone(
  status: string | null | undefined
): 'success' | 'warning' | 'danger' | 'info' | undefined {
  switch (status) {
    case 'approved':
    case 'published':
      return 'success'
    case 'pending':
    case 'submitted':
      return 'warning'
    case 'rejected':
      return 'danger'
    case 'draft':
      return 'info'
    default:
      return undefined
  }
}

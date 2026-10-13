/**
 * Time-of-day helpers. Times are "HH:MM" or "HH:MM:SS" strings as stored by Postgres `time`.
 * Safe to import from both server and client components.
 */

/** "13:30" / "13:30:00" → 810. Returns NaN for anything that is not a valid time. */
export function timeToMinutes(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim())
  if (!match) return Number.NaN
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return Number.NaN
  return hour * 60 + minute
}

/** 810 → "13:30:00" */
export function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

/** "13:30:00" → "13:30"; returns '' for invalid input. */
export function normalizeTime(value: string | null | undefined) {
  const minutes = timeToMinutes(value)
  return Number.isNaN(minutes) ? '' : minutesToTime(minutes).slice(0, 5)
}

/** True when [startA, endA) and [startB, endB) overlap. Invalid times never overlap. */
export function overlaps(startA: string, endA: string, startB: string, endB: string) {
  const aStart = timeToMinutes(startA)
  const aEnd = timeToMinutes(endA)
  const bStart = timeToMinutes(startB)
  const bEnd = timeToMinutes(endB)
  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false
  return aStart < bEnd && bStart < aEnd
}

/** Minutes between two non-overlapping ranges (0 when they overlap or touch). */
export function gapMinutes(startA: string, endA: string, startB: string, endB: string) {
  const aStart = timeToMinutes(startA)
  const aEnd = timeToMinutes(endA)
  const bStart = timeToMinutes(startB)
  const bEnd = timeToMinutes(endB)
  if (aEnd <= bStart) return bStart - aEnd
  if (bEnd <= aStart) return aStart - bEnd
  return 0
}

/** True when [start, end) lies completely inside [outerStart, outerEnd]. */
export function fitsWithin(start: string, end: string, outerStart: string, outerEnd: string) {
  return (
    timeToMinutes(start) >= timeToMinutes(outerStart) &&
    timeToMinutes(end) <= timeToMinutes(outerEnd)
  )
}

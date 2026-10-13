import type { FacultyAvailabilityRecord, GeneratedEntry, Room, SessionRequirement } from './types'
import { gapMinutes, overlaps, timeToMinutes } from '@/lib/time'

/** True when the candidate overlaps an already placed session of the same block, room or instructor. */
export function hasGeneratedConflict(candidate: GeneratedEntry, generated: GeneratedEntry[]) {
  return generated.some((entry) => {
    if (entry.day_of_week !== candidate.day_of_week) {
      return false
    }

    if (!overlaps(candidate.start_time, candidate.end_time, entry.start_time, entry.end_time)) {
      return false
    }

    /*
     * Section conflict
     */

    if (entry.section_id === candidate.section_id) {
      return true
    }

    /*
     * Room conflict
     */

    if (entry.room_id === candidate.room_id) {
      return true
    }

    /*
     * Faculty conflict
     */

    if (candidate.faculty_id && entry.faculty_id === candidate.faculty_id) {
      return true
    }

    return false
  })
}

/*
 * Soft-constraint score: lower is better. Rewards spreading a class over different days,
 * the smallest sufficient room, an instructor's preferred hours, compact days for both the
 * instructor and the block, and daytime slots.
 */

export function alreadyUsedDayForOffering(
  offeringId: string,
  day: number,
  generated: GeneratedEntry[]
) {
  return generated.some(
    (entry) => entry.class_offering_id === offeringId && entry.day_of_week === day
  )
}

export function scoreScheduleCandidate(
  candidate: GeneratedEntry,
  generated: GeneratedEntry[],
  room: Room,
  requirement: SessionRequirement,
  facultyAvailability: FacultyAvailabilityRecord[]
) {
  let score = 0
  const candidateStart = timeToMinutes(candidate.start_time)

  // Spread multiple meetings of the same offering across different days.

  if (alreadyUsedDayForOffering(candidate.class_offering_id, candidate.day_of_week, generated)) {
    score += 500
  }

  // Prefer the smallest sufficient room.

  if (requirement.expectedStudents > 0) {
    score += Math.max(0, Number(room.capacity ?? 0) - requirement.expectedStudents) * 0.5
  }

  // Reward an instructor's explicitly preferred time window.

  if (candidate.faculty_id) {
    const preferred = facultyAvailability.some(
      (item) =>
        item.faculty_id === candidate.faculty_id &&
        Number(item.day_of_week) === candidate.day_of_week &&
        item.availability_type === 'preferred' &&
        timeToMinutes(candidate.start_time) >= timeToMinutes(item.start_time) &&
        timeToMinutes(candidate.end_time) <= timeToMinutes(item.end_time)
    )

    if (preferred) score -= 120
  }

  // Keep an instructor's same-day teaching schedule reasonably compact.

  if (candidate.faculty_id) {
    for (const entry of generated) {
      if (
        entry.day_of_week !== candidate.day_of_week ||
        entry.faculty_id !== candidate.faculty_id
      ) {
        continue
      }

      const gap = gapMinutes(
        candidate.start_time,
        candidate.end_time,
        entry.start_time,
        entry.end_time
      )

      if (gap > 180) score += 60
      else if (gap > 120) score += 35
      else if (gap > 60) score += 15
      else if (gap > 0 && gap <= 30) score -= 15
    }
  }

  // Keep each block's same-day schedule reasonably compact.

  for (const entry of generated) {
    if (entry.day_of_week !== candidate.day_of_week || entry.section_id !== candidate.section_id) {
      continue
    }

    const gap = gapMinutes(
      candidate.start_time,
      candidate.end_time,
      entry.start_time,
      entry.end_time
    )

    if (gap > 180) score += 80
    else if (gap > 120) score += 45
    else if (gap > 60) score += 20
    else if (gap > 0 && gap <= 30) score -= 20
  }

  // Prefer daytime slots while still allowing evening classes when needed.

  if (candidateStart >= 19 * 60) score += 50
  else if (candidateStart >= 18 * 60) score += 25

  return score
}

import type { Offering, SessionRequirement, SubjectSummary } from './types'
import { one } from '@/lib/relations'

/*
 * Lecture strategy:
 *
 * 1 hour  -> 1 x 1 hour
 * 2 hours -> 1 x 2 hours
 * 3 hours -> 2 x 1.5 hours
 * 4 hours -> 2 x 2 hours
 * 5 hours -> 2h + 1.5h + 1.5h
 * 6 hours -> 3 x 2 hours
 *
 * This avoids very long lecture meetings.
 */

export function splitLectureHours(hours: number): number[] {
  if (!hours || hours <= 0) {
    return []
  }

  const totalMinutes = Math.round(hours * 60)

  if (totalMinutes <= 120) {
    return [totalMinutes]
  }

  if (totalMinutes === 180) {
    return [90, 90]
  }

  const sessions: number[] = []
  let remaining = totalMinutes

  while (remaining > 0) {
    if (remaining >= 240) {
      sessions.push(120)
      remaining -= 120

      continue
    }

    if (remaining === 180) {
      sessions.push(90)
      sessions.push(90)
      remaining = 0

      continue
    }

    if (remaining <= 120) {
      sessions.push(remaining)
      remaining = 0

      continue
    }

    sessions.push(90)
    remaining -= 90
  }

  return sessions
}

/*
 * Laboratory sessions are preferably continuous.
 *
 * 3 lab hours -> one 3-hour session.
 *
 * If unusually large, max continuous block is
 * 3 hours before splitting.
 */

export function splitLabHours(hours: number): number[] {
  if (!hours || hours <= 0) {
    return []
  }

  let remaining = Math.round(hours * 60)
  const sessions: number[] = []

  while (remaining > 0) {
    const duration = Math.min(remaining, 180)
    sessions.push(duration)
    remaining -= duration
  }

  return sessions
}

/**
 * Turns class offerings into the individual sessions that must be placed in the timetable,
 * hardest first (labs, then larger classes, then longer sessions).
 */
export function buildSessionRequirements(offerings: Offering[]): SessionRequirement[] {
  const requirements: SessionRequirement[] = []

  for (const offering of offerings) {
    const subject = one<SubjectSummary>(offering.subjects)
    if (!subject) continue

    const lectureSessions = splitLectureHours(Number(subject.lecture_hours ?? 0))
    const labSessions = splitLabHours(Number(subject.lab_hours ?? 0))
    const expectedStudents = Number(offering.expected_students ?? 0)
    const requiredRoomTypeId =
      offering.curriculum_required_room_type_id ?? subject.default_room_type_id ?? null
    const add = (entryType: 'lecture' | 'lab', durationMinutes: number) =>
      requirements.push({
        offering,
        entryType,
        durationMinutes,
        expectedStudents,
        requiredRoomTypeId,
      })

    lectureSessions.forEach((minutes) => add('lecture', minutes))
    labSessions.forEach((minutes) => add('lab', minutes))

    // Subject without lecture/lab hours: fall back to the offering's weekly hours as lectures.
    if (!lectureSessions.length && !labSessions.length) {
      splitLectureHours(Number(offering.required_weekly_hours ?? 0)).forEach((minutes) =>
        add('lecture', minutes)
      )
    }
  }

  return requirements.sort((a, b) => {
    if (a.entryType !== b.entryType) return a.entryType === 'lab' ? -1 : 1
    if (a.expectedStudents !== b.expectedStudents) return b.expectedStudents - a.expectedStudents
    return b.durationMinutes - a.durationMinutes
  })
}

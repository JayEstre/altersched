/**
 * Explains why the generator could not place some sessions (pure logic, no database access).
 *
 * For every stuck session it finds the first rule that makes placement impossible, in this order:
 *   1. the session is longer than the teaching day;
 *   2. no active room of the required type exists, or none is big enough for the block;
 *   3. the instructor has no free window long enough on any teaching day;
 *   4. every suitable room is blocked whenever the instructor is free;
 *   5. every possible time is already taken — by the block's other classes, by the instructor's
 *      other classes, by other classes in the suitable rooms, or by a mix of these.
 * It also reports overall shortages (a block, instructor or room type that needs more hours per
 * week than exist), which explain why no arrangement can ever work.
 */
import { facultyAllowsSlot, roomAllowsSlot } from './availability'
import { buildCandidates, type SolverWindow } from './solver'
import type {
  FacultyAvailabilityRecord,
  GeneratedEntry,
  Room,
  RoomAvailabilityRecord,
  SectionSummary,
  SessionRequirement,
  SubjectSummary,
} from './types'
import { DAY_SHORT_NAMES, formatTime12 } from '@/lib/format'
import { one } from '@/lib/relations'
import { minutesToTime, overlaps } from '@/lib/time'

export type ProblemCode =
  | 'session_too_long'
  | 'no_room_type'
  | 'room_too_small'
  | 'instructor_unavailable'
  | 'rooms_unavailable'
  | 'block_full'
  | 'instructor_busy'
  | 'rooms_busy'
  | 'crowded'

/** Short label for each reason (shown as a badge). */
export const PROBLEM_LABELS: Record<ProblemCode, string> = {
  session_too_long: 'Teaching day too short',
  no_room_type: 'No room of this type',
  room_too_small: 'Rooms too small',
  instructor_unavailable: 'Instructor not available',
  rooms_unavailable: 'Rooms blocked',
  block_full: 'Block fully booked',
  instructor_busy: 'Instructor fully booked',
  rooms_busy: 'Rooms fully booked',
  crowded: 'No common free time',
}

/** One class (or several sessions of it) affected by a problem. */
export type AffectedClass = {
  offeringId: string
  subjectCode: string
  subjectName: string
  block: string
  instructor: string | null
  /** e.g. "Lab · 3 h" or "2 × Lecture · 1.5 h". */
  session: string
}

/** One cause, with every class it blocks (e.g. "BSIT 1A is fully booked" → 6 classes). */
export type PlacementProblem = {
  code: ProblemCode
  /** What the problem is about: a block, an instructor, a room type or one class. */
  title: string
  /** Why the classes cannot be placed, in one or two sentences. */
  reason: string
  /** What to change so they can be placed. */
  fix: string
  classes: AffectedClass[]
  /** Number of sessions affected (a class can have several). */
  sessions: number
}

export type Shortage = {
  kind: 'block' | 'instructor' | 'room_type'
  name: string
  neededMinutes: number
  availableMinutes: number
  text: string
}

export type GenerationReport = {
  totalSessions: number
  placedSessions: number
  /** The teaching window used, e.g. "Mon–Fri, 8:00 AM–5:00 PM". */
  window: string
  problems: PlacementProblem[]
  shortages: Shortage[]
}

export type DiagnosisInput = {
  requirements: SessionRequirement[]
  stuck: SessionRequirement[]
  /** The best attempt (placed sessions) the stuck sessions are checked against. */
  attempt: GeneratedEntry[]
  rooms: Room[]
  facultyAvailability: FacultyAvailabilityRecord[]
  roomAvailability: RoomAvailabilityRecord[]
  window: SolverWindow
  instructorName: (facultyId: string) => string
  roomTypeName: (roomTypeId: string) => string
}

/* ------------------------------------------------------------------ formatting */

export function formatHours(minutes: number) {
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} h`
}

function clock(minutes: number) {
  return formatTime12(minutesToTime(minutes))
}

/** "Mon–Fri", "Mon, Wed, Fri" or "Mon–Wed, Sat". */
export function formatDays(days: number[]) {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length;) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1
    const first = DAY_SHORT_NAMES[sorted[i]]
    const last = DAY_SHORT_NAMES[sorted[j]]
    parts.push(
      j - i >= 2
        ? `${first}–${last}`
        : sorted
            .slice(i, j + 1)
            .map((d) => DAY_SHORT_NAMES[d])
            .join(', ')
    )
    i = j + 1
  }
  return parts.join(', ')
}

export function formatWindow(window: SolverWindow) {
  return `${formatDays(window.days)}, ${clock(window.dayStart)}–${clock(window.dayEnd)}`
}

function sessionLabel(requirement: SessionRequirement, count: number) {
  const type = requirement.entryType === 'lab' ? 'Lab' : 'Lecture'
  return `${count > 1 ? `${count} × ` : ''}${type} · ${formatHours(requirement.durationMinutes)}`
}

/** "Computer Laboratory room(s)" but "Lecture Room(s)" — avoids "Lecture Room room". */
export function roomNoun(typeName: string, count = 1) {
  const plural = count === 1 ? '' : 's'
  return /\broom$/i.test(typeName) ? `${typeName}${plural}` : `${typeName} room${plural}`
}

/* ------------------------------------------------------------------ free time */

const STEP = 5

/** Minutes per week the instructor is free inside the teaching window. */
export function instructorFreeMinutes(
  facultyId: string,
  availability: FacultyAvailabilityRecord[],
  window: SolverWindow
) {
  let total = 0
  for (const day of window.days) {
    for (let t = window.dayStart; t < window.dayEnd; t += STEP) {
      if (
        facultyAllowsSlot(facultyId, day, minutesToTime(t), minutesToTime(t + STEP), availability)
      ) {
        total += STEP
      }
    }
  }
  return total
}

/** Minutes per week the room is usable inside the teaching window. */
export function roomFreeMinutes(
  roomId: string,
  availability: RoomAvailabilityRecord[],
  window: SolverWindow
) {
  let total = 0
  for (const day of window.days) {
    for (let t = window.dayStart; t < window.dayEnd; t += STEP) {
      if (roomAllowsSlot(roomId, day, minutesToTime(t), minutesToTime(t + STEP), availability)) {
        total += STEP
      }
    }
  }
  return total
}

/** "Mon 8:00 AM–12:00 PM, Wed 1:00–5:00 PM" — the instructor's declared free windows. */
function describeAvailability(facultyId: string, availability: FacultyAvailabilityRecord[]) {
  const windows = availability
    .filter(
      (item) =>
        item.faculty_id === facultyId &&
        (item.availability_type === 'available' || item.availability_type === 'preferred')
    )
    .sort(
      (a, b) =>
        Number(a.day_of_week) - Number(b.day_of_week) || a.start_time.localeCompare(b.start_time)
    )
  if (!windows.length) return null
  const text = windows
    .slice(0, 4)
    .map(
      (item) =>
        `${DAY_SHORT_NAMES[Number(item.day_of_week)] ?? item.day_of_week} ${formatTime12(item.start_time)}–${formatTime12(item.end_time)}`
    )
    .join(', ')
  return windows.length > 4 ? `${text} and ${windows.length - 4} more` : text
}

/* ------------------------------------------------------------------ main */

function subjectOf(requirement: SessionRequirement) {
  const subject = one<SubjectSummary>(requirement.offering.subjects)
  return { code: String(subject?.code ?? 'Subject'), name: String(subject?.name ?? '') }
}

function blockOf(requirement: SessionRequirement) {
  const section = one<SectionSummary>(requirement.offering.sections)
  return String(section?.name ?? section?.code ?? 'Block')
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export function diagnoseUnplaced(input: DiagnosisInput): GenerationReport {
  const { requirements, stuck, attempt, rooms, window } = input
  const { facultyAvailability, roomAvailability, instructorName, roomTypeName } = input
  const windowText = formatWindow(window)
  const dayLength = window.dayEnd - window.dayStart
  const weekMinutes = window.days.length * dayLength

  /* ---------- overall shortages ---------- */

  const shortages: Shortage[] = []

  const blockDemand = new Map<string, { name: string; minutes: number }>()
  const instructorDemand = new Map<string, number>()
  const roomTypeDemand = new Map<string, number>()
  for (const requirement of requirements) {
    const sectionId = requirement.offering.section_id
    const block = blockDemand.get(sectionId) ?? { name: blockOf(requirement), minutes: 0 }
    block.minutes += requirement.durationMinutes
    blockDemand.set(sectionId, block)
    const facultyId = requirement.offering.faculty_id
    if (facultyId) {
      instructorDemand.set(
        facultyId,
        (instructorDemand.get(facultyId) ?? 0) + requirement.durationMinutes
      )
    }
    if (requirement.requiredRoomTypeId) {
      roomTypeDemand.set(
        requirement.requiredRoomTypeId,
        (roomTypeDemand.get(requirement.requiredRoomTypeId) ?? 0) + requirement.durationMinutes
      )
    }
  }

  for (const { name, minutes } of blockDemand.values()) {
    if (minutes > weekMinutes) {
      shortages.push({
        kind: 'block',
        name,
        neededMinutes: minutes,
        availableMinutes: weekMinutes,
        text: `${name} has ${formatHours(minutes)} of classes per week, but the teaching week (${windowText}) has only ${formatHours(weekMinutes)}.`,
      })
    }
  }

  const freeByInstructor = new Map<string, number>()
  for (const [facultyId, minutes] of instructorDemand) {
    const free = instructorFreeMinutes(facultyId, facultyAvailability, window)
    freeByInstructor.set(facultyId, free)
    if (minutes > free) {
      shortages.push({
        kind: 'instructor',
        name: instructorName(facultyId),
        neededMinutes: minutes,
        availableMinutes: free,
        text: `${instructorName(facultyId)} is assigned ${formatHours(minutes)} of classes per week but is available only ${formatHours(free)} within the teaching week.`,
      })
    }
  }

  for (const [roomTypeId, minutes] of roomTypeDemand) {
    const typed = rooms.filter((room) => room.room_type_id === roomTypeId)
    if (!typed.length) continue // reported per class as "no room of this type"
    const free = sum(typed.map((room) => roomFreeMinutes(room.id, roomAvailability, window)))
    if (minutes > free) {
      shortages.push({
        kind: 'room_type',
        name: roomTypeName(roomTypeId),
        neededMinutes: minutes,
        availableMinutes: free,
        text: `Classes that need a ${roomNoun(roomTypeName(roomTypeId))} add up to ${formatHours(minutes)} per week, but ${typed.length === 1 ? 'the only one offers' : `the ${typed.length} ${roomNoun(roomTypeName(roomTypeId), typed.length)} offer`} only ${formatHours(free)}.`,
      })
    }
  }

  /* ---------- one cause per stuck session, grouped by cause ---------- */

  type Cause = { code: ProblemCode; key: string; title: string; reason: string; fix: string }
  const groups = new Map<string, PlacementProblem & { counts: Map<string, number> }>()

  for (const requirement of stuck) {
    const offering = requirement.offering
    const facultyId = offering.faculty_id
    const teacher = facultyId ? instructorName(facultyId) : null
    const block = blockOf(requirement)
    const subject = subjectOf(requirement)
    const typeId = requirement.requiredRoomTypeId
    const typeName = typeId ? roomTypeName(typeId) : 'classroom'
    const hours = formatHours(requirement.durationMinutes)
    const kind = requirement.entryType === 'lab' ? 'lab' : 'lecture'

    const typed = rooms.filter((room) => !typeId || room.room_type_id === typeId)
    const fitting = typed.filter(
      (room) => !(requirement.expectedStudents > 0 && room.capacity < requirement.expectedStudents)
    )

    let cause: Cause

    if (requirement.durationMinutes > dayLength) {
      cause = {
        code: 'session_too_long',
        key: `${requirement.durationMinutes}`,
        title: `${hours} ${kind} sessions`,
        reason: `A ${hours} ${kind} is longer than the teaching day (${clock(window.dayStart)}–${clock(window.dayEnd)}).`,
        fix: 'Make the teaching day longer in Admin → Settings → Schedule Generator.',
      }
    } else if (!typed.length) {
      cause = {
        code: 'no_room_type',
        key: `${typeId}`,
        title: typeName,
        reason: `These classes need a ${roomNoun(typeName)}, but there is no active ${roomNoun(typeName)}.`,
        fix: `Add or activate a ${roomNoun(typeName)} in Rooms & Labs, or change the room type of these subjects.`,
      }
    } else if (!fitting.length) {
      const largest = Math.max(...typed.map((room) => room.capacity))
      cause = {
        code: 'room_too_small',
        key: `${typeId}|${offering.section_id}`,
        title: block,
        reason: `${block} has ${requirement.expectedStudents} students, but the largest ${roomNoun(typeName)} holds only ${largest}.`,
        fix: `Add a bigger ${roomNoun(typeName)} or raise a room's capacity in Rooms & Labs, or lower the block's expected students.`,
      }
    } else {
      const candidates = buildCandidates(
        requirement,
        rooms,
        facultyAvailability,
        roomAvailability,
        window
      )
      const instructorCanTeach =
        !facultyId ||
        window.days.some((day) => {
          for (
            let start = window.dayStart;
            start + requirement.durationMinutes <= window.dayEnd;
            start += window.interval
          ) {
            const from = minutesToTime(start)
            const to = minutesToTime(start + requirement.durationMinutes)
            if (facultyAllowsSlot(facultyId, day, from, to, facultyAvailability)) return true
          }
          return false
        })

      if (!instructorCanTeach) {
        const declared = describeAvailability(facultyId!, facultyAvailability)
        cause = {
          code: 'instructor_unavailable',
          key: `${facultyId}|${requirement.durationMinutes}`,
          title: teacher!,
          reason: `${teacher} has no free ${hours} window on a teaching day (${windowText}).${
            declared ? ` Their availability: ${declared}.` : ''
          }`,
          fix: `Widen ${teacher}'s availability, or assign another qualified instructor to these classes (Class Offerings).`,
        }
      } else if (!candidates.length) {
        cause = {
          code: 'rooms_unavailable',
          key: `${typeId}|${facultyId}`,
          title: typeName,
          reason: `Every ${roomNoun(typeName)} big enough for these classes is blocked or under maintenance whenever ${teacher ?? 'the class'} is free.`,
          fix: `Check the availability of the ${roomNoun(typeName, 2)} in Rooms & Labs, or widen ${teacher ?? 'the instructor'}'s availability.`,
        }
      } else {
        // Group the possible placements by start time; each time is unusable for at least one
        // of three reasons: the block, the instructor or every suitable room is already busy.
        const times = new Map<
          string,
          { blockBusy: boolean; teacherBusy: boolean; roomsFree: number }
        >()
        for (const candidate of candidates) {
          const key = `${candidate.day_of_week}|${candidate.start_time}`
          const sameTime = attempt.filter(
            (entry) =>
              entry.day_of_week === candidate.day_of_week &&
              overlaps(candidate.start_time, candidate.end_time, entry.start_time, entry.end_time)
          )
          const slot = times.get(key) ?? {
            blockBusy: sameTime.some((entry) => entry.section_id === candidate.section_id),
            teacherBusy: Boolean(
              candidate.faculty_id &&
              sameTime.some((entry) => entry.faculty_id === candidate.faculty_id)
            ),
            roomsFree: 0,
          }
          if (!sameTime.some((entry) => entry.room_id === candidate.room_id)) slot.roomsFree += 1
          times.set(key, slot)
        }
        const slots = [...times.values()]
        const total = slots.length
        const blockBusy = slots.filter((slot) => slot.blockBusy).length
        const teacherBusy = slots.filter((slot) => slot.teacherBusy).length
        const roomsFull = slots.filter((slot) => slot.roomsFree === 0).length

        if (blockBusy === total) {
          const demand = blockDemand.get(offering.section_id)?.minutes ?? 0
          cause = {
            code: 'block_full',
            key: offering.section_id,
            title: block,
            reason: `${block} already has other classes at every time these could go. Its classes need ${formatHours(demand)} per week; the teaching week (${windowText}) has ${formatHours(weekMinutes)}.`,
            fix: 'Allow more teaching days or longer hours in Admin → Settings → Schedule Generator.',
          }
        } else if (facultyId && teacherBusy === total) {
          cause = {
            code: 'instructor_busy',
            key: facultyId,
            title: teacher!,
            reason: `${teacher} is already teaching other classes at every time they are free. They are assigned ${formatHours(instructorDemand.get(facultyId) ?? 0)} per week and are available ${formatHours(freeByInstructor.get(facultyId) ?? 0)}.`,
            fix: `Assign another qualified instructor to these classes (Class Offerings), or widen ${teacher}'s availability.`,
          }
        } else if (roomsFull === total) {
          cause = {
            code: 'rooms_busy',
            key: `${typeId}`,
            title: typeName,
            reason:
              fitting.length === 1
                ? `The only ${roomNoun(typeName)} is already in use at every time these classes could go.`
                : `All ${fitting.length} ${roomNoun(typeName, fitting.length)} are already in use at every time these classes could go.`,
            fix: `Add another ${roomNoun(typeName)}, or allow more teaching days or hours.`,
          }
        } else {
          const parts = [
            `${block} is busy at ${blockBusy}`,
            teacher ? `${teacher} is teaching at ${teacherBusy}` : null,
            `every ${roomNoun(typeName)} is taken at ${roomsFull}`,
          ].filter(Boolean)
          cause = {
            code: 'crowded',
            key: offering.id,
            title: `${subject.code} · ${block}`,
            reason: `There is no time when ${block}, ${teacher ?? 'the instructor'} and a ${roomNoun(typeName)} are all free together. Of the ${total} possible start times, ${parts.join(', ')}.`,
            fix: "Allow more teaching days or hours, widen the instructor's availability, or assign another instructor.",
          }
        }
      }
    }

    const groupKey = `${cause.code}|${cause.key}`
    const group = groups.get(groupKey) ?? {
      code: cause.code,
      title: cause.title,
      reason: cause.reason,
      fix: cause.fix,
      classes: [],
      sessions: 0,
      counts: new Map<string, number>(),
    }
    groups.set(groupKey, group)
    group.sessions += 1

    const classKey = `${offering.id}|${requirement.entryType}|${requirement.durationMinutes}`
    const count = (group.counts.get(classKey) ?? 0) + 1
    group.counts.set(classKey, count)
    const existing = group.classes.find(
      (item) =>
        item.offeringId === offering.id && item.session === sessionLabel(requirement, count - 1)
    )
    if (existing) {
      existing.session = sessionLabel(requirement, count)
    } else {
      group.classes.push({
        offeringId: offering.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        block,
        instructor: teacher,
        session: sessionLabel(requirement, 1),
      })
    }
  }

  const order = Object.keys(PROBLEM_LABELS) as ProblemCode[]
  const problems: PlacementProblem[] = [...groups.values()]
    .map((group) => ({
      code: group.code,
      title: group.title,
      reason: group.reason,
      fix: group.fix,
      sessions: group.sessions,
      classes: group.classes.sort(
        (a, b) => a.block.localeCompare(b.block) || a.subjectCode.localeCompare(b.subjectCode)
      ),
    }))
    .sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code) || a.title.localeCompare(b.title))

  const kindOrder = ['block', 'instructor', 'room_type']
  shortages.sort(
    (a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || a.name.localeCompare(b.name)
  )

  return {
    totalSessions: requirements.length,
    placedSessions: requirements.length - stuck.length,
    window: windowText,
    problems,
    shortages,
  }
}

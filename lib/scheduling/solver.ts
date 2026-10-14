import { facultyAllowsSlot, roomAllowsSlot } from './availability'
import { hasGeneratedConflict, scoreScheduleCandidate } from './scoring'
import type {
  FacultyAvailabilityRecord,
  GeneratedEntry,
  Room,
  RoomAvailabilityRecord,
  SessionRequirement,
} from './types'
import { minutesToTime, timeToMinutes } from '@/lib/time'

export type SolverOptions = {
  /** Days the generator may use (1 = Monday). Default Monday–Saturday. */
  days?: number[]
  /** First start time in minutes after midnight. Default 07:00. */
  dayStart?: number
  /** Latest end time in minutes after midnight. Default 21:00. */
  dayEnd?: number
  /** Start-time step in minutes. Default 30. */
  interval?: number
  /** Upper bound on search steps before giving up. Default 60,000. */
  maxSearchNodes?: number
}

export type SolverResult = {
  /** True when every session was placed. */
  complete: boolean
  /** Placed sessions (the best partial placement when incomplete). */
  entries: GeneratedEntry[]
  /** Sessions that could not be placed (empty when complete). */
  unplaced: SessionRequirement[]
  /** Sessions with no valid room/time at all (hard constraints). */
  impossible: SessionRequirement[]
  /**
   * When incomplete: the sessions that still have no free slot after the leftover sessions were
   * fitted in wherever possible — these are the ones the report explains.
   */
  stuck: SessionRequirement[]
  /** When incomplete: the best attempt including those leftovers (used to explain `stuck`). */
  attempt: GeneratedEntry[]
  searchNodes: number
}

type CandidateSet = { requirement: SessionRequirement; candidates: GeneratedEntry[] }

/** The teaching window the generator works in, with defaults filled in. */
export type SolverWindow = Required<Omit<SolverOptions, 'maxSearchNodes'>>

export function resolveSolverWindow(options: SolverOptions = {}): SolverWindow {
  return {
    days: options.days ?? [1, 2, 3, 4, 5, 6],
    dayStart: options.dayStart ?? 7 * 60,
    dayEnd: options.dayEnd ?? 21 * 60,
    interval: options.interval ?? 30,
  }
}

/** Every room/day/time that satisfies the hard constraints for one session. */
export function buildCandidates(
  requirement: SessionRequirement,
  rooms: Room[],
  facultyAvailability: FacultyAvailabilityRecord[],
  roomAvailability: RoomAvailabilityRecord[],
  { days, dayStart, dayEnd, interval }: SolverWindow
): GeneratedEntry[] {
  const offering = requirement.offering
  const candidates: GeneratedEntry[] = []

  for (const day of days) {
    for (let start = dayStart; start + requirement.durationMinutes <= dayEnd; start += interval) {
      const startTime = minutesToTime(start)
      const endTime = minutesToTime(start + requirement.durationMinutes)

      if (!facultyAllowsSlot(offering.faculty_id, day, startTime, endTime, facultyAvailability)) {
        continue
      }

      for (const room of rooms) {
        if (
          requirement.requiredRoomTypeId &&
          room.room_type_id !== requirement.requiredRoomTypeId
        ) {
          continue
        }
        if (requirement.expectedStudents > 0 && room.capacity < requirement.expectedStudents) {
          continue
        }
        if (!roomAllowsSlot(room.id, day, startTime, endTime, roomAvailability)) {
          continue
        }

        candidates.push({
          class_offering_id: offering.id,
          faculty_id: offering.faculty_id,
          section_id: offering.section_id,
          room_id: room.id,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          entry_type: requirement.entryType,
        })
      }
    }
  }

  return candidates
}

/**
 * Places every session without block, room or instructor overlaps.
 *
 * Most-constrained sessions are placed first; candidates are tried best-score first, and the
 * search backtracks when a later session has no valid slot left. This avoids the false
 * "cannot be placed" failures of a one-pass greedy placement.
 */
export function solveTimetable(
  requirements: SessionRequirement[],
  rooms: Room[],
  facultyAvailability: FacultyAvailabilityRecord[],
  roomAvailability: RoomAvailabilityRecord[],
  options: SolverOptions = {}
): SolverResult {
  const settings = resolveSolverWindow(options)
  const maxSearchNodes = options.maxSearchNodes ?? 60000
  const roomById = new Map(rooms.map((room) => [room.id, room]))

  const sets: CandidateSet[] = requirements.map((requirement) => ({
    requirement,
    candidates: buildCandidates(
      requirement,
      rooms,
      facultyAvailability,
      roomAvailability,
      settings
    ),
  }))

  // Most constrained sessions first; long lab blocks break ties.
  sets.sort((a, b) => {
    if (a.candidates.length !== b.candidates.length)
      return a.candidates.length - b.candidates.length
    if (a.requirement.entryType !== b.requirement.entryType) {
      return a.requirement.entryType === 'lab' ? -1 : 1
    }
    return b.requirement.durationMinutes - a.requirement.durationMinutes
  })

  const impossible = sets.filter((set) => set.candidates.length === 0).map((set) => set.requirement)
  const placed: GeneratedEntry[] = []
  let searchNodes = 0
  let deepestPlaced = 0
  let bestPartial: GeneratedEntry[] = []

  function place(index: number): boolean {
    if (index > deepestPlaced) {
      deepestPlaced = index
      bestPartial = [...placed]
    }
    if (index >= sets.length) return true
    if (searchNodes >= maxSearchNodes) return false

    const current = sets[index]
    const viable = current.candidates
      .filter((candidate) => !hasGeneratedConflict(candidate, placed))
      .map((candidate) => ({
        entry: candidate,
        score: scoreScheduleCandidate(
          candidate,
          placed,
          roomById.get(candidate.room_id)!,
          current.requirement,
          facultyAvailability
        ),
      }))
      .sort((left, right) => {
        if (left.score !== right.score) return left.score - right.score
        if (left.entry.day_of_week !== right.entry.day_of_week) {
          return left.entry.day_of_week - right.entry.day_of_week
        }
        const timeDifference =
          timeToMinutes(left.entry.start_time) - timeToMinutes(right.entry.start_time)
        if (timeDifference !== 0) return timeDifference
        return left.entry.room_id.localeCompare(right.entry.room_id)
      })

    for (const candidate of viable) {
      if (searchNodes >= maxSearchNodes) break
      searchNodes += 1
      placed.push(candidate.entry)
      if (place(index + 1)) return true
      placed.pop()
    }

    return false
  }

  const best = (
    candidates: GeneratedEntry[],
    requirement: SessionRequirement,
    placedSoFar: GeneratedEntry[]
  ) =>
    candidates
      .filter((candidate) => !hasGeneratedConflict(candidate, placedSoFar))
      .map((candidate) => ({
        entry: candidate,
        score: scoreScheduleCandidate(
          candidate,
          placedSoFar,
          roomById.get(candidate.room_id)!,
          requirement,
          facultyAvailability
        ),
      }))
      .sort((left, right) => left.score - right.score)[0]?.entry

  if (place(0)) {
    return {
      complete: true,
      entries: placed,
      unplaced: [],
      impossible,
      stuck: [],
      attempt: placed,
      searchNodes,
    }
  }

  /*
   * The search could not place everything. Fit the remaining sessions into the best attempt
   * wherever they still go; what is left is genuinely stuck. If everything fits (the search only
   * ran out of steps), that attempt is a complete timetable.
   */
  const attempt = [...bestPartial]
  const stuck: SessionRequirement[] = []
  for (const set of sets.slice(deepestPlaced)) {
    const entry = best(set.candidates, set.requirement, attempt)
    if (entry) attempt.push(entry)
    else stuck.push(set.requirement)
  }

  if (!stuck.length) {
    return {
      complete: true,
      entries: attempt,
      unplaced: [],
      impossible,
      stuck,
      attempt,
      searchNodes,
    }
  }

  const unplaced = sets.slice(deepestPlaced).map((set) => set.requirement)
  for (const requirement of impossible) {
    if (!unplaced.includes(requirement)) unplaced.push(requirement)
  }
  return {
    complete: false,
    entries: bestPartial,
    unplaced,
    impossible,
    stuck,
    attempt,
    searchNodes,
  }
}

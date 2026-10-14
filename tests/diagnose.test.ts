import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { diagnoseUnplaced, formatDays, formatHours } from '@/lib/scheduling/diagnose'
import { buildSessionRequirements } from '@/lib/scheduling/sessions'
import { resolveSolverWindow, solveTimetable, type SolverOptions } from '@/lib/scheduling/solver'
import type { FacultyAvailabilityRecord, Offering, Room } from '@/lib/scheduling/types'

const LAB = 'type-lab'
const LECTURE = 'type-lecture'

function offering(
  id: string,
  code: string,
  hours: { lecture?: number; lab?: number },
  extra: Partial<Offering> = {}
): Offering {
  return {
    id,
    semester_id: 'sem',
    section_id: 'block-a',
    subject_id: `subj-${code}`,
    faculty_id: 'jose',
    required_weekly_hours: (hours.lecture ?? 0) + (hours.lab ?? 0),
    expected_students: 30,
    status: 'active',
    subjects: {
      code,
      name: `${code} subject`,
      lecture_hours: hours.lecture ?? 0,
      lab_hours: hours.lab ?? 0,
      default_room_type_id: hours.lab ? LAB : LECTURE,
    },
    sections: { code: 'A', name: 'BSIT 1A' },
    ...extra,
  }
}

const lectureRoom: Room = {
  id: 'rm1',
  code: 'RM1',
  name: 'Room 1',
  capacity: 40,
  room_type_id: LECTURE,
}
const labRoom: Room = { id: 'cl1', code: 'CL1', name: 'Lab 1', capacity: 40, room_type_id: LAB }
const names = {
  instructorName: (id: string) => ({ jose: 'Jose Reyes', ana: 'Ana Cruz' })[id] ?? id,
  roomTypeName: (id: string) => (id === LAB ? 'Computer Laboratory' : 'Lecture Room'),
}

function run(
  offerings: Offering[],
  rooms: Room[],
  options: SolverOptions,
  availability: FacultyAvailabilityRecord[] = []
) {
  const requirements = buildSessionRequirements(offerings)
  const result = solveTimetable(requirements, rooms, availability, [], options)
  const report = diagnoseUnplaced({
    requirements,
    stuck: result.stuck,
    attempt: result.attempt,
    rooms,
    facultyAvailability: availability,
    roomAvailability: [],
    window: resolveSolverWindow(options),
    ...names,
  })
  return { result, report }
}

describe('generator explanations', () => {
  test('formatting helpers', () => {
    assert.equal(formatDays([1, 2, 3, 4, 5]), 'Mon–Fri')
    assert.equal(formatDays([1, 3, 5]), 'Mon, Wed, Fri')
    assert.equal(formatDays([1, 2, 3, 6]), 'Mon–Wed, Sat')
    assert.equal(formatHours(90), '1.5 h')
    assert.equal(formatHours(180), '3 h')
  })

  test('missing room type is named', () => {
    const { result, report } = run([offering('o1', 'IT101', { lab: 3 })], [lectureRoom], {})
    assert.equal(result.complete, false)
    assert.equal(report.problems.length, 1)
    assert.equal(report.problems[0].code, 'no_room_type')
    assert.match(report.problems[0].reason, /need a Computer Laboratory room/)
    assert.equal(report.problems[0].classes[0].subjectCode, 'IT101')
  })

  test('room wording avoids "Lecture Room room"', () => {
    const { report } = run([offering('o1', 'GE101', { lecture: 2 })], [labRoom], {})
    assert.equal(report.problems[0].code, 'no_room_type')
    assert.match(
      report.problems[0].reason,
      /need a Lecture Room, but there is no active Lecture Room\./
    )
  })

  test('several sessions of one class are counted once per class', () => {
    // 3 lecture hours = two 1.5 h sessions; neither fits a 1-hour day.
    const { report } = run([offering('o1', 'GE101', { lecture: 3 })], [lectureRoom], {
      dayStart: 8 * 60,
      dayEnd: 9 * 60,
    })
    assert.equal(report.problems.length, 1)
    assert.equal(report.problems[0].sessions, 2)
    assert.deepEqual(
      report.problems[0].classes.map((item) => item.session),
      ['2 × Lecture · 1.5 h']
    )
  })

  test('rooms too small for the block', () => {
    const big = offering('o1', 'GE101', { lecture: 2 }, { expected_students: 60 })
    const { report } = run([big], [lectureRoom], {})
    assert.equal(report.problems[0].code, 'room_too_small')
    assert.match(report.problems[0].reason, /60 students.*holds only 40/)
  })

  test('session longer than the teaching day', () => {
    const { report } = run([offering('o1', 'IT101', { lab: 3 })], [labRoom], {
      dayStart: 8 * 60,
      dayEnd: 10 * 60,
    })
    assert.equal(report.problems[0].code, 'session_too_long')
  })

  test('instructor with no long enough free window', () => {
    const availability: FacultyAvailabilityRecord[] = [
      {
        faculty_id: 'jose',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '09:00',
        availability_type: 'available',
      },
    ]
    const { report } = run([offering('o1', 'IT101', { lab: 3 })], [labRoom], {}, availability)
    const problem = report.problems[0]
    assert.equal(problem.code, 'instructor_unavailable')
    assert.match(problem.reason, /Jose Reyes has no free 3 h window/)
    assert.match(problem.reason, /Mon 8:00 AM–9:00 AM/)
    assert.ok(report.shortages.some((item) => item.kind === 'instructor'))
  })

  test('block with more class hours than the week', () => {
    // 4 subjects × 2 h = 8 h for one block, but only Monday 8–12 (4 h) exists.
    const offerings = ['A', 'B', 'C', 'D'].map((code, index) =>
      offering(`o${index}`, code, { lecture: 2 }, { faculty_id: index % 2 ? 'ana' : 'jose' })
    )
    const { result, report } = run(offerings, [lectureRoom, { ...lectureRoom, id: 'rm2' }], {
      days: [1],
      dayStart: 8 * 60,
      dayEnd: 12 * 60,
    })
    assert.equal(result.complete, false)
    assert.equal(result.stuck.length, 2)
    assert.equal(report.placedSessions, 2)
    // Both stuck sessions share one cause, so they are reported together.
    assert.equal(report.problems.length, 1)
    assert.equal(report.problems[0].code, 'block_full')
    assert.equal(report.problems[0].title, 'BSIT 1A')
    assert.equal(report.problems[0].sessions, 2)
    assert.equal(report.problems[0].classes.length, 2)
    assert.ok(report.shortages.some((item) => item.kind === 'block' && item.name === 'BSIT 1A'))
    assert.equal(report.window, 'Mon, 8:00 AM–12:00 PM')
  })

  test('instructor fully booked by classes of other blocks', () => {
    const offerings = ['A', 'B', 'C'].map((code, index) =>
      offering(
        `o${index}`,
        code,
        { lecture: 2 },
        { section_id: `block-${index}`, sections: { name: `Block ${index}` } }
      )
    )
    const { report } = run(offerings, [lectureRoom, { ...lectureRoom, id: 'rm2' }], {
      days: [1],
      dayStart: 8 * 60,
      dayEnd: 12 * 60,
    })
    assert.equal(report.problems.length, 1)
    assert.equal(report.problems[0].code, 'instructor_busy')
    assert.match(report.problems[0].fix, /another qualified instructor/)
  })

  test('the only lab room is fully booked', () => {
    const offerings = [0, 1].map((index) =>
      offering(
        `o${index}`,
        `IT10${index}`,
        { lab: 3 },
        {
          section_id: `block-${index}`,
          faculty_id: index ? 'ana' : 'jose',
          sections: { name: `Block ${index}` },
        }
      )
    )
    const { report } = run(offerings, [labRoom], { days: [1], dayStart: 8 * 60, dayEnd: 12 * 60 })
    assert.equal(report.problems.length, 1)
    assert.equal(report.problems[0].code, 'rooms_busy')
    assert.match(report.problems[0].reason, /The only Computer Laboratory room is already in use/)
  })

  test('a complete timetable has nothing to explain', () => {
    const { result, report } = run([offering('o1', 'GE101', { lecture: 3 })], [lectureRoom], {})
    assert.equal(result.complete, true)
    assert.equal(report.problems.length, 0)
    assert.equal(report.shortages.length, 0)
  })
})

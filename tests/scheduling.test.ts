import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { findClash, type Booking } from '@/lib/bookings'
import { dayName, formatTime12, ordinal } from '@/lib/format'
import { chooseInstructors } from '@/lib/scheduling/assignment'
import { facultyAllowsSlot, roomAllowsSlot } from '@/lib/scheduling/availability'
import {
  buildSessionRequirements,
  splitLabHours,
  splitLectureHours,
} from '@/lib/scheduling/sessions'
import { DEFAULT_SCHEDULING_SETTINGS, toSolverOptions } from '@/lib/scheduling/settings'
import { solveTimetable } from '@/lib/scheduling/solver'
import type { Offering, Room } from '@/lib/scheduling/types'
import { gapMinutes, overlaps, timeToMinutes } from '@/lib/time'

describe('time helpers', () => {
  test('timeToMinutes parses HH:MM and HH:MM:SS, rejects garbage', () => {
    assert.equal(timeToMinutes('07:30'), 450)
    assert.equal(timeToMinutes('13:00:00'), 780)
    assert.ok(Number.isNaN(timeToMinutes('25:00')))
    assert.ok(Number.isNaN(timeToMinutes('')))
  })
  test('overlaps treats touching ranges as free', () => {
    assert.equal(overlaps('08:00', '09:00', '08:30', '10:00'), true)
    assert.equal(overlaps('08:00', '09:00', '09:00', '10:00'), false)
  })
  test('gapMinutes', () => {
    assert.equal(gapMinutes('08:00', '09:00', '10:30', '11:00'), 90)
    assert.equal(gapMinutes('08:00', '09:00', '08:30', '11:00'), 0)
  })
})

describe('format helpers', () => {
  test('days use 1 = Monday … 7 = Sunday', () => {
    assert.equal(dayName(1), 'Monday')
    assert.equal(dayName(7), 'Sunday')
  })
  test('12-hour times and ordinals', () => {
    assert.equal(formatTime12('13:05:00'), '1:05 PM')
    assert.equal(formatTime12('00:30'), '12:30 AM')
    assert.equal(ordinal(1), '1st')
    assert.equal(ordinal(12), '12th')
    assert.equal(ordinal(23), '23rd')
  })
})

describe('session splitting', () => {
  test('lecture hours become sessions of at most 2 hours', () => {
    assert.deepEqual(splitLectureHours(2), [120])
    assert.deepEqual(splitLectureHours(3), [90, 90])
    assert.deepEqual(splitLectureHours(5), [120, 90, 90])
    assert.deepEqual(splitLectureHours(0), [])
  })
  test('lab hours are continuous up to 3 hours', () => {
    assert.deepEqual(splitLabHours(3), [180])
    assert.deepEqual(splitLabHours(4), [180, 60])
  })
})

describe('availability', () => {
  const availability = [
    {
      faculty_id: 'f1',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '12:00',
      availability_type: 'available',
    },
  ]
  test('instructor with no declared availability is free any time', () => {
    assert.equal(facultyAllowsSlot('f2', 6, '18:00', '19:00', availability), true)
  })
  test('declared availability limits days and hours', () => {
    assert.equal(facultyAllowsSlot('f1', 1, '09:00', '10:30', availability), true)
    assert.equal(facultyAllowsSlot('f1', 1, '11:00', '13:00', availability), false)
    assert.equal(facultyAllowsSlot('f1', 2, '09:00', '10:00', availability), false)
  })
  test('rooms under maintenance are excluded', () => {
    const rooms = [
      {
        room_id: 'r1',
        day_of_week: 5,
        start_time: '16:00',
        end_time: '18:00',
        status: 'maintenance',
      },
    ]
    assert.equal(roomAllowsSlot('r1', 5, '15:00', '16:30', rooms), false)
    assert.equal(roomAllowsSlot('r1', 5, '13:00', '16:00', rooms), true)
  })
})

describe('automatic instructor assignment', () => {
  const qualified = new Map([
    [
      'math',
      [
        { id: 'ana', maxLoad: 6 },
        { id: 'jose', maxLoad: 6 },
      ],
    ],
    ['prog', [{ id: 'jose', maxLoad: 6 }]],
  ])
  test('balances load and respects the maximum', () => {
    const result = chooseInstructors(
      [
        { id: 'o1', subject_id: 'math', faculty_id: null, required_weekly_hours: 3 },
        { id: 'o2', subject_id: 'math', faculty_id: null, required_weekly_hours: 3 },
        { id: 'o3', subject_id: 'prog', faculty_id: null, required_weekly_hours: 5 },
      ],
      qualified,
      new Map()
    )
    assert.deepEqual(result, [
      { offeringId: 'o1', facultyId: 'ana' },
      { offeringId: 'o2', facultyId: 'jose' },
    ]) // o3 stays unassigned: jose would exceed 6 hours
  })
  test('keeps existing (manual) assignments and prefers the subject default', () => {
    const result = chooseInstructors(
      [
        { id: 'o1', subject_id: 'math', faculty_id: 'jose', required_weekly_hours: 3 },
        { id: 'o2', subject_id: 'math', faculty_id: null, required_weekly_hours: 3 },
      ],
      qualified,
      new Map([['jose', 3]]),
      new Map([['math', 'jose']])
    )
    assert.deepEqual(result, [{ offeringId: 'o2', facultyId: 'jose' }])
  })
})

describe('timetable solver', () => {
  const rooms: Room[] = [
    { id: 'lec', code: 'RM1', name: 'Room 1', capacity: 40, room_type_id: 'lecture' },
    { id: 'lab', code: 'CL1', name: 'Lab 1', capacity: 40, room_type_id: 'lab' },
  ]
  const offering = (
    id: string,
    section: string,
    faculty: string,
    lecture: number,
    lab: number
  ): Offering => ({
    id,
    semester_id: 's',
    section_id: section,
    subject_id: id,
    faculty_id: faculty,
    required_weekly_hours: lecture + lab,
    expected_students: 30,
    status: 'active',
    curriculum_required_room_type_id: lab ? 'lab' : 'lecture',
    subjects: { lecture_hours: lecture, lab_hours: lab },
  })

  test('places every session without block, room or instructor overlaps', () => {
    const offerings = [
      offering('it101', 'A', 'maria', 2, 3),
      offering('ge101', 'A', 'ana', 3, 0),
      offering('it102', 'B', 'maria', 2, 3),
      offering('ge102', 'B', 'ana', 3, 0),
    ]
    const requirements = buildSessionRequirements(offerings)
    const result = solveTimetable(requirements, rooms, [], [])
    assert.equal(result.complete, true)
    assert.equal(result.entries.length, requirements.length)
    const clash = result.entries.some((a, i) =>
      result.entries.some(
        (b, j) =>
          j > i &&
          a.day_of_week === b.day_of_week &&
          overlaps(a.start_time, a.end_time, b.start_time, b.end_time) &&
          (a.section_id === b.section_id ||
            a.room_id === b.room_id ||
            a.faculty_id === b.faculty_id)
      )
    )
    assert.equal(clash, false)
    assert.ok(
      result.entries.filter((e) => e.entry_type === 'lab').every((e) => e.room_id === 'lab')
    )
  })

  test('keeps every session inside the configured days and hours', () => {
    const offerings = [offering('it101', 'A', 'maria', 2, 3), offering('ge101', 'A', 'ana', 3, 0)]
    const options = toSolverOptions({
      days: [1, 3, 5],
      dayStart: '08:00',
      dayEnd: '13:00',
      slotMinutes: 60,
    })
    const result = solveTimetable(buildSessionRequirements(offerings), rooms, [], [], options)
    assert.equal(result.complete, true)
    for (const entry of result.entries) {
      assert.ok([1, 3, 5].includes(entry.day_of_week), `day ${entry.day_of_week}`)
      assert.ok(timeToMinutes(entry.start_time) >= 8 * 60, entry.start_time)
      assert.ok(timeToMinutes(entry.end_time) <= 13 * 60, entry.end_time)
      assert.equal(timeToMinutes(entry.start_time) % 60, 0, 'starts on the hour')
    }
  })

  test('default settings match the previous fixed generator window', () => {
    assert.deepEqual(toSolverOptions(DEFAULT_SCHEDULING_SETTINGS), {
      days: [1, 2, 3, 4, 5, 6],
      dayStart: 7 * 60,
      dayEnd: 21 * 60,
      interval: 30,
    })
  })

  test('reports sessions that have no valid room', () => {
    const tooBig = { ...offering('big', 'A', 'ana', 2, 0), expected_students: 99 }
    const result = solveTimetable(buildSessionRequirements([tooBig]), rooms, [], [])
    assert.equal(result.complete, false)
    assert.equal(result.impossible.length, 1)
  })
})

describe('cross-block clashes', () => {
  const bookings: Booking[] = [
    {
      entryId: 'e1',
      versionId: 'v1',
      offeringId: 'o9',
      facultyId: 'jose',
      roomId: 'CL1',
      day: 1,
      start: '08:00',
      end: '10:00',
      label: 'IT102 (Block B)',
    },
  ]
  test('same room or instructor at an overlapping time clashes', () => {
    assert.equal(
      findClash(
        { room_id: 'CL1', day_of_week: 1, start_time: '09:00', end_time: '11:00' },
        bookings
      )?.kind,
      'room'
    )
    assert.equal(
      findClash(
        { faculty_id: 'jose', day_of_week: 1, start_time: '07:00', end_time: '08:30' },
        bookings
      )?.kind,
      'instructor'
    )
  })
  test('different day, adjacent time or same class does not clash', () => {
    assert.equal(
      findClash(
        { room_id: 'CL1', day_of_week: 2, start_time: '09:00', end_time: '11:00' },
        bookings
      ),
      null
    )
    assert.equal(
      findClash(
        { room_id: 'CL1', day_of_week: 1, start_time: '10:00', end_time: '11:00' },
        bookings
      ),
      null
    )
    assert.equal(
      findClash(
        {
          class_offering_id: 'o9',
          room_id: 'CL1',
          day_of_week: 1,
          start_time: '08:00',
          end_time: '10:00',
        },
        bookings
      ),
      null
    )
  })
})

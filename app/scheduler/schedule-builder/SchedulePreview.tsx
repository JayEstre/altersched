'use client'

<<<<<<< HEAD
import { useMemo, useState, useTransition } from 'react'
import { saveSchedulePreviewEntries } from './draft-actions'
import { DAY_OPTIONS, formatTime } from '@/lib/format'
import { overlaps, timeToMinutes } from '@/lib/time'
import { describeClash, findClash, type Booking } from '@/lib/bookings'
import styles from './SchedulePreview.module.css'
=======
import {
  useMemo,
  useState,
  useTransition,
} from 'react'

import {
  saveSchedulePreviewEntries,
} from './actions'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

/* =========================================================
   TYPES
   ========================================================= */

type FacultyOption = {
  id: string
  name: string
  subject_ids: string[]
}

type RoomOption = {
  id: string
  code: string
  name: string
  capacity: number
  room_type_id: string | null
}

<<<<<<< HEAD
export type PreviewEntry = {
  id: string
  schedule_version_id: string
  class_offering_id: string
  faculty_id: string | null
  section_id: string
  room_id: string
  day_of_week: number
  start_time: string
  end_time: string
  entry_type: string
  session_type: string
  delivery_mode: string
  subject_id: string
  subject_code: string
  subject_name: string
  section_code: string
  section_name: string
  expected_students: number
  required_room_type_id: string | null
=======
type PreviewEntry = {
  id: string

  schedule_version_id: string
  class_offering_id: string

  faculty_id: string | null
  section_id: string
  room_id: string

  day_of_week: number

  start_time: string
  end_time: string

  entry_type: string
  session_type: string
  delivery_mode: string

  subject_id: string
  subject_code: string
  subject_name: string

  section_code: string
  section_name: string

  expected_students: number
  required_room_type_id: string | null

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  faculty_name: string
  room_code: string
}

type ConflictType =
<<<<<<< HEAD
  'faculty' | 'room' | 'block' | 'qualification' | 'capacity' | 'room_type' | 'invalid_time'
=======
  | 'faculty'
  | 'room'
  | 'block'
  | 'qualification'
  | 'capacity'
  | 'room_type'
  | 'invalid_time'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

type Conflict = {
  type: ConflictType
  message: string
}

type Props = {
  entries: PreviewEntry[]
  faculty: FacultyOption[]
  rooms: RoomOption[]
<<<<<<< HEAD
  /** Sessions of other blocks in the same semester (room / instructor clashes). */
  bookings?: Booking[]
  /** Days classes may be scheduled on (Settings → Schedule Generator); default Monday–Saturday. */
  teachingDays?: number[]
}

/* =========================================================
   HELPERS
   ========================================================= */

/** "07:30:00" → "07:30" for <input type="time">. */
const cleanTime = (value: string) => formatTime(value, '')
=======
}

/* =========================================================
   DAYS
   ========================================================= */

const DAYS = [
  {
    value: 1,
    label: 'Monday',
    short: 'MON',
  },
  {
    value: 2,
    label: 'Tuesday',
    short: 'TUE',
  },
  {
    value: 3,
    label: 'Wednesday',
    short: 'WED',
  },
  {
    value: 4,
    label: 'Thursday',
    short: 'THU',
  },
  {
    value: 5,
    label: 'Friday',
    short: 'FRI',
  },
  {
    value: 6,
    label: 'Saturday',
    short: 'SAT',
  },
]

/* =========================================================
   HELPERS
   ========================================================= */

function cleanTime(value: string) {
  if (!value) {
    return ''
  }

  return value.slice(0, 5)
}

function timeToMinutes(value: string) {
  const clean = cleanTime(value)

  if (!clean) {
    return Number.NaN
  }

  const parts = clean
    .split(':')
    .map(Number)

  if (
    parts.length !== 2 ||
    parts.some(Number.isNaN)
  ) {
    return Number.NaN
  }

  return (
    parts[0] * 60 +
    parts[1]
  )
}

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  const aStart =
    timeToMinutes(startA)

  const aEnd =
    timeToMinutes(endA)

  const bStart =
    timeToMinutes(startB)

  const bEnd =
    timeToMinutes(endB)

  if (
    Number.isNaN(aStart) ||
    Number.isNaN(aEnd) ||
    Number.isNaN(bStart) ||
    Number.isNaN(bEnd)
  ) {
    return false
  }

  return (
    aStart < bEnd &&
    bStart < aEnd
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

/* =========================================================
   LOCAL PREVIEW CONFLICT CHECK
   ========================================================= */

function getEntryConflicts(
  entry: PreviewEntry,
  entries: PreviewEntry[],
  faculty: FacultyOption[],
<<<<<<< HEAD
  rooms: RoomOption[],
  bookings: Booking[]
=======
  rooms: RoomOption[]
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
): Conflict[] {
  const conflicts: Conflict[] = []

  /* -------------------------------------------------------
     TIME
     ------------------------------------------------------- */

<<<<<<< HEAD
  const start = timeToMinutes(entry.start_time)
  const end = timeToMinutes(entry.end_time)

  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    conflicts.push({
      type: 'invalid_time',
      message: 'Invalid class time.',
=======
  const start =
    timeToMinutes(
      entry.start_time
    )

  const end =
    timeToMinutes(
      entry.end_time
    )

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start >= end
  ) {
    conflicts.push({
      type: 'invalid_time',
      message:
        'Invalid class time.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    })

    return conflicts
  }

  /* -------------------------------------------------------
     INSTRUCTOR QUALIFICATION
     ------------------------------------------------------- */

<<<<<<< HEAD
  const selectedFaculty = faculty.find((instructor) => instructor.id === entry.faculty_id)
=======
  const selectedFaculty =
    faculty.find(
      instructor =>
        instructor.id ===
        entry.faculty_id
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!entry.faculty_id) {
    conflicts.push({
      type: 'qualification',
<<<<<<< HEAD
      message: 'Instructor required.',
    })
  } else if (!selectedFaculty || !selectedFaculty.subject_ids.includes(entry.subject_id)) {
    conflicts.push({
      type: 'qualification',
      message: 'Instructor is not qualified for this subject.',
=======
      message:
        'Instructor required.',
    })
  } else if (
    !selectedFaculty ||
    !selectedFaculty.subject_ids.includes(
      entry.subject_id
    )
  ) {
    conflicts.push({
      type: 'qualification',
      message:
        'Instructor is not qualified for this subject.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    })
  }

  /* -------------------------------------------------------
     ROOM
     ------------------------------------------------------- */

<<<<<<< HEAD
  const selectedRoom = rooms.find((room) => room.id === entry.room_id)
=======
  const selectedRoom =
    rooms.find(
      room =>
        room.id ===
        entry.room_id
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!selectedRoom) {
    conflicts.push({
      type: 'room_type',
<<<<<<< HEAD
      message: 'Room required.',
=======
      message:
        'Room required.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    })
  } else {
    /* CAPACITY */

<<<<<<< HEAD
    if (entry.expected_students > 0 && selectedRoom.capacity < entry.expected_students) {
      conflicts.push({
        type: 'capacity',
        message:
          `Room capacity is ${selectedRoom.capacity}, ` +
          `but ${entry.expected_students} learners are expected.`,
=======
    if (
      entry.expected_students > 0 &&
      selectedRoom.capacity <
        entry.expected_students
    ) {
      conflicts.push({
        type: 'capacity',

        message:
          `Room capacity is ${selectedRoom.capacity}, ` +
          `but ${entry.expected_students} students are expected.`,
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      })
    }

    /* ROOM TYPE */

<<<<<<< HEAD
    if (entry.required_room_type_id && selectedRoom.room_type_id !== entry.required_room_type_id) {
      conflicts.push({
        type: 'room_type',
        message: 'Room type is not compatible with this subject.',
=======
    if (
      entry.required_room_type_id &&
      selectedRoom.room_type_id !==
        entry.required_room_type_id
    ) {
      conflicts.push({
        type: 'room_type',

        message:
          'Room type is not compatible with this subject.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      })
    }
  }

  /* -------------------------------------------------------
     OVERLAPPING ENTRIES
     ------------------------------------------------------- */

<<<<<<< HEAD
  const overlappingEntries = entries.filter((other) => {
    if (other.id === entry.id) {
      return false
    }

    if (Number(other.day_of_week) !== Number(entry.day_of_week)) {
      return false
    }

    return overlaps(entry.start_time, entry.end_time, other.start_time, other.end_time)
  })
=======
  const overlappingEntries =
    entries.filter(other => {
      if (
        other.id ===
        entry.id
      ) {
        return false
      }

      if (
        Number(
          other.day_of_week
        ) !==
        Number(
          entry.day_of_week
        )
      ) {
        return false
      }

      return overlaps(
        entry.start_time,
        entry.end_time,
        other.start_time,
        other.end_time
      )
    })
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* FACULTY CONFLICT */

  if (
    entry.faculty_id &&
<<<<<<< HEAD
    overlappingEntries.some((other) => other.faculty_id === entry.faculty_id)
  ) {
    conflicts.push({
      type: 'faculty',
      message: 'Instructor has another class at this time.',
=======
    overlappingEntries.some(
      other =>
        other.faculty_id ===
        entry.faculty_id
    )
  ) {
    conflicts.push({
      type: 'faculty',

      message:
        'Instructor has another class at this time.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    })
  }

  /* ROOM CONFLICT */

<<<<<<< HEAD
  if (entry.room_id && overlappingEntries.some((other) => other.room_id === entry.room_id)) {
    conflicts.push({
      type: 'room',
      message: 'Room is already occupied at this time.',
=======
  if (
    entry.room_id &&
    overlappingEntries.some(
      other =>
        other.room_id ===
        entry.room_id
    )
  ) {
    conflicts.push({
      type: 'room',

      message:
        'Room is already occupied at this time.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    })
  }

  /* BLOCK CONFLICT */

  if (
    entry.section_id &&
<<<<<<< HEAD
    overlappingEntries.some((other) => other.section_id === entry.section_id)
  ) {
    conflicts.push({
      type: 'block',
      message: 'Block has another class at this time.',
    })
  }

  /* OTHER BLOCKS (same room or instructor elsewhere) */

  const clash = findClash(entry, bookings)

  if (clash) {
    conflicts.push({
      type: clash.kind === 'room' ? 'room' : 'faculty',
      message: `${describeClash(clash)}.`,
=======
    overlappingEntries.some(
      other =>
        other.section_id ===
        entry.section_id
    )
  ) {
    conflicts.push({
      type: 'block',

      message:
        'Block has another class at this time.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    })
  }

  return conflicts
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function SchedulePreview({
  entries: initialEntries,
  faculty,
  rooms,
<<<<<<< HEAD
  bookings = [],
  teachingDays = [1, 2, 3, 4, 5, 6],
}: Props) {
  const [entries, setEntries] = useState<PreviewEntry[]>(initialEntries)
  const [savedEntries, setSavedEntries] = useState<PreviewEntry[]>(initialEntries)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'warning' | 'error'>('success')
  const [isPending, startTransition] = useTransition()
=======
}: Props) {
  const [
    entries,
    setEntries,
  ] =
    useState<PreviewEntry[]>(
      initialEntries
    )

  const [
    savedEntries,
    setSavedEntries,
  ] =
    useState<PreviewEntry[]>(
      initialEntries
    )

  const [
    message,
    setMessage,
  ] =
    useState('')

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      'success' |
      'warning' |
      'error'
    >('success')

  const [
    isPending,
    startTransition,
  ] =
    useTransition()
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =======================================================
     CONFLICT MAP
     ======================================================= */

<<<<<<< HEAD
  const conflictsByEntry = useMemo(() => {
    const map = new Map<string, Conflict[]>()

    for (const entry of entries) {
      map.set(entry.id, getEntryConflicts(entry, entries, faculty, rooms, bookings))
    }

    return map
  }, [entries, faculty, rooms, bookings])
=======
  const conflictsByEntry =
    useMemo(() => {
      const map =
        new Map<
          string,
          Conflict[]
        >()

      for (
        const entry of entries
      ) {
        map.set(
          entry.id,

          getEntryConflicts(
            entry,
            entries,
            faculty,
            rooms
          )
        )
      }

      return map
    }, [
      entries,
      faculty,
      rooms,
    ])
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =======================================================
     SUMMARY
     ======================================================= */

<<<<<<< HEAD
  const conflictRows = useMemo(() => {
    let total = 0

    for (const conflicts of conflictsByEntry.values()) {
      if (conflicts.length > 0) {
        total += 1
      }
    }

    return total
  }, [conflictsByEntry])

  const totalIssues = useMemo(() => {
    let total = 0

    for (const conflicts of conflictsByEntry.values()) {
      total += conflicts.length
    }

    return total
  }, [conflictsByEntry])

  const dirty = useMemo(() => {
    return JSON.stringify(entries) !== JSON.stringify(savedEntries)
  }, [entries, savedEntries])
=======
  const conflictRows =
    useMemo(() => {
      let total = 0

      for (
        const conflicts of
          conflictsByEntry.values()
      ) {
        if (
          conflicts.length > 0
        ) {
          total += 1
        }
      }

      return total
    }, [
      conflictsByEntry,
    ])

  const totalIssues =
    useMemo(() => {
      let total = 0

      for (
        const conflicts of
          conflictsByEntry.values()
      ) {
        total +=
          conflicts.length
      }

      return total
    }, [
      conflictsByEntry,
    ])

  const dirty =
    useMemo(() => {
      return (
        JSON.stringify(entries) !==
        JSON.stringify(
          savedEntries
        )
      )
    }, [
      entries,
      savedEntries,
    ])
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =======================================================
     UPDATE ENTRY
     ======================================================= */

<<<<<<< HEAD
  function updateEntry(id: string, field: keyof PreviewEntry, value: string | number | null) {
    setMessage('')

    setEntries((current) => {
      const target = current.find((entry) => entry.id === id)
      // The instructor belongs to the class, so it changes for all of its sessions (lecture + lab).
      const sameClass = (entry: PreviewEntry) =>
        field === 'faculty_id' && target && entry.class_offering_id === target.class_offering_id

      return current.map((entry) => {
        if (entry.id !== id && !sameClass(entry)) {
          return entry
        }

        const instructor = field === 'faculty_id' ? faculty.find((f) => f.id === value) : undefined

        return {
          ...entry,
          [field]: value,
          ...(field === 'faculty_id' ? { faculty_name: instructor?.name ?? '' } : {}),
        }
      })
    })
  }

  const sessionsPerClass = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of entries) {
      counts.set(entry.class_offering_id, (counts.get(entry.class_offering_id) ?? 0) + 1)
    }
    return counts
  }, [entries])

=======
  function updateEntry(
    id: string,
    field: keyof PreviewEntry,
    value:
      | string
      | number
      | null
  ) {
    setMessage('')

    setEntries(current =>
      current.map(entry => {
        if (
          entry.id !== id
        ) {
          return entry
        }

        return {
          ...entry,
          [field]: value,
        }
      })
    )
  }

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  /* =======================================================
     RESET
     ======================================================= */

  function resetChanges() {
    setEntries(
<<<<<<< HEAD
      savedEntries.map((entry) => ({
        ...entry,
      }))
=======
      savedEntries.map(
        entry => ({
          ...entry,
        })
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    )

    setMessage('')
  }

  /* =======================================================
     SAVE
     ======================================================= */

  function saveChanges() {
    setMessage('')

    if (totalIssues > 0) {
      setMessageType('error')
<<<<<<< HEAD
      setMessage('Resolve all highlighted timetable conflicts before saving.')
=======

      setMessage(
        'Resolve all highlighted timetable conflicts before saving.'
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

      return
    }

<<<<<<< HEAD
    startTransition(async () => {
      const payload = entries.map((entry) => ({
        id: entry.id,
        faculty_id: entry.faculty_id,
        room_id: entry.room_id,
        day_of_week: Number(entry.day_of_week),
        start_time: cleanTime(entry.start_time),
        end_time: cleanTime(entry.end_time),
      }))

      try {
        const result = await saveSchedulePreviewEntries(payload)

        if (!result.ok) {
          setMessageType('error')
          setMessage(result.message ?? 'Unable to save schedule changes.')

          return
        }

        setSavedEntries(
          entries.map((entry) => ({
            ...entry,
          }))
        )

        if (result.conflicts > 0) {
          setMessageType('warning')

          setMessage(
            `Changes saved. ${result.conflicts} conflict row${
              result.conflicts === 1 ? '' : 's'
            } still require attention.`
          )
        } else {
          setMessageType('success')
          setMessage('Changes saved successfully. No unresolved conflicts were detected.')
        }
      } catch (error) {
        console.error('Schedule preview save failed:', error)
        setMessageType('error')
        setMessage('AlterSched could not save the schedule changes.')
      }
    })
=======
    startTransition(
      async () => {
        const payload =
          entries.map(
            entry => ({
              id:
                entry.id,

              faculty_id:
                entry.faculty_id,

              room_id:
                entry.room_id,

              day_of_week:
                Number(
                  entry.day_of_week
                ),

              start_time:
                cleanTime(
                  entry.start_time
                ),

              end_time:
                cleanTime(
                  entry.end_time
                ),
            })
          )

        try {
          const result =
            await saveSchedulePreviewEntries(
              payload
            )

          if (!result.ok) {
            setMessageType(
              'error'
            )

            setMessage(
              result.message ??
                'Unable to save schedule changes.'
            )

            return
          }

          setSavedEntries(
            entries.map(
              entry => ({
                ...entry,
              })
            )
          )

          if (
            result.conflicts > 0
          ) {
            setMessageType(
              'warning'
            )

            setMessage(
              `Changes saved. ${result.conflicts} conflict row${
                result.conflicts ===
                1
                  ? ''
                  : 's'
              } still require attention.`
            )
          } else {
            setMessageType(
              'success'
            )

            setMessage(
              'Changes saved successfully. No unresolved conflicts were detected.'
            )
          }
        } catch (error) {
          console.error(
            'Schedule preview save failed:',
            error
          )

          setMessageType(
            'error'
          )

          setMessage(
            'AlterSched could not save the schedule changes.'
          )
        }
      }
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =======================================================
     EMPTY
     ======================================================= */

  if (!entries.length) {
    return null
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
<<<<<<< HEAD
    <div className={styles.scope}>
      <section className="schedule-preview-panel">
        {/* ===================================================
          HEADER
          =================================================== */}
        <div className="preview-toolbar">
          <div className="preview-heading">
            <span className="preview-kicker">SCHEDULE WORKSPACE</span>
            <h2>Draft Schedule Workspace</h2>
            <p>
              Review and edit the generated or revised BSIT timetable before submitting it for Super
              Admin review. Instructors were assigned automatically; change the instructor, room,
              day or time directly in this table. Changes are saved together, or not at all.
            </p>
          </div>
          <div className="preview-summary">
            <div className="preview-summary-card">
              <span>Entries</span>
              <strong>{entries.length}</strong>
            </div>
            <div
              className={
                conflictRows > 0 ? 'preview-summary-card danger' : 'preview-summary-card success'
              }
            >
              <span>Conflict Rows</span>
              <strong>{conflictRows}</strong>
            </div>
            <div className={dirty ? 'preview-summary-card warning' : 'preview-summary-card'}>
              <span>Changes</span>
              <strong>{dirty ? 'Unsaved' : 'Saved'}</strong>
            </div>
          </div>
        </div>
        {/* ===================================================
          LEGEND
          =================================================== */}
        <div className="preview-legend">
          <span>
            <i className="dot-clear" />
            Clear
          </span>
          <span>
            <i className="dot-conflict" />
            Conflict
          </span>
          <span>
            <i className="dot-unsaved" />
            Unsaved changes
          </span>
        </div>
        {/* ===================================================
          MESSAGE
          =================================================== */}
        {message && <div className={`preview-message ${messageType}`}>{message}</div>}
        {/* ===================================================
          TABLE
          =================================================== */}
        <div className="schedule-sheet-wrap">
          <table className="schedule-sheet">
            <thead>
              <tr>
                <th>Status</th>
                <th>Subject</th>
                <th>Block</th>
                <th>Session</th>
                <th>Day</th>
                <th>Start</th>
                <th>End</th>
                <th>Room</th>
                <th>Instructor</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const conflicts = conflictsByEntry.get(entry.id) ?? []
                const hasConflict = conflicts.length > 0
=======
    <section className="schedule-preview-panel">
      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="preview-toolbar">
        <div className="preview-heading">
          <span className="preview-kicker">
            SCHEDULE WORKSPACE
          </span>

          <h2>
            Draft Schedule Workspace
          </h2>

          <p>
            Review and edit the generated or revised BSIT timetable
            before submitting it for Super Admin review.
            Instructor, room, day, and class time can be adjusted
            directly from this table.
          </p>
        </div>

        <div className="preview-summary">
          <div className="preview-summary-card">
            <span>
              Entries
            </span>

            <strong>
              {entries.length}
            </strong>
          </div>

          <div
            className={
              conflictRows > 0
                ? 'preview-summary-card danger'
                : 'preview-summary-card success'
            }
          >
            <span>
              Conflict Rows
            </span>

            <strong>
              {conflictRows}
            </strong>
          </div>

          <div
            className={
              dirty
                ? 'preview-summary-card warning'
                : 'preview-summary-card'
            }
          >
            <span>
              Changes
            </span>

            <strong>
              {dirty
                ? 'Unsaved'
                : 'Saved'}
            </strong>
          </div>
        </div>
      </div>

      {/* ===================================================
          LEGEND
          =================================================== */}

      <div className="preview-legend">
        <span>
          <i className="dot-clear" />
          Clear
        </span>

        <span>
          <i className="dot-conflict" />
          Conflict
        </span>

        <span>
          <i className="dot-unsaved" />
          Unsaved changes
        </span>
      </div>

      {/* ===================================================
          MESSAGE
          =================================================== */}

      {message && (
        <div
          className={`preview-message ${messageType}`}
        >
          {message}
        </div>
      )}

      {/* ===================================================
          TABLE
          =================================================== */}

      <div className="schedule-sheet-wrap">
        <table className="schedule-sheet">
          <thead>
            <tr>
              <th>
                Status
              </th>

              <th>
                Subject
              </th>

              <th>
                Block
              </th>

              <th>
                Session
              </th>

              <th>
                Day
              </th>

              <th>
                Start
              </th>

              <th>
                End
              </th>

              <th>
                Room
              </th>

              <th>
                Instructor
              </th>
            </tr>
          </thead>

          <tbody>
            {entries.map(
              entry => {
                const conflicts =
                  conflictsByEntry.get(
                    entry.id
                  ) ?? []

                const hasConflict =
                  conflicts.length > 0
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

                /* -----------------------------------------
                   QUALIFIED FACULTY
                   ----------------------------------------- */

<<<<<<< HEAD
                const qualifiedFaculty = faculty.filter((instructor) =>
                  instructor.subject_ids.includes(entry.subject_id)
                )
=======
                const qualifiedFaculty =
                  faculty.filter(
                    instructor =>
                      instructor
                        .subject_ids
                        .includes(
                          entry.subject_id
                        )
                  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

                /* -----------------------------------------
                   COMPATIBLE ROOMS
                   ----------------------------------------- */

<<<<<<< HEAD
                const compatibleRooms = rooms.filter((room) => {
                  if (
                    entry.required_room_type_id &&
                    room.room_type_id !== entry.required_room_type_id
                  ) {
                    return false
                  }

                  if (entry.expected_students > 0 && room.capacity < entry.expected_students) {
                    return false
                  }

                  return true
                })

                return (
                  <tr
                    key={entry.id}
                    className={hasConflict ? 'schedule-row-conflict' : 'schedule-row-clear'}
                  >
                    {/* STATUS */}
                    <td className="status-cell">
                      <div className={hasConflict ? 'row-status conflict' : 'row-status clear'}>
                        <i />
                        {hasConflict ? 'Conflict' : 'Clear'}
                      </div>
                      {hasConflict && (
                        <div className="conflict-list">
                          {conflicts.map((conflict, index) => (
                            <span key={`${conflict.type}-${index}`}>{conflict.message}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* SUBJECT */}
                    <td className="subject-cell">
                      <strong>{entry.subject_code}</strong>
                      <span>{entry.subject_name}</span>
                    </td>
                    {/* BLOCK */}
                    <td>
                      <span className="block-chip">{entry.section_code}</span>
                    </td>
                    {/* SESSION */}
                    <td>
                      <span
                        className={
                          entry.session_type === 'lab' ? 'session-chip lab' : 'session-chip lecture'
                        }
                      >
                        {entry.session_type === 'lab' ? 'LAB' : 'LECTURE'}
                      </span>
                    </td>
                    {/* DAY */}
                    <td>
                      <select
                        className="sheet-control day-control"
                        value={entry.day_of_week}
                        onChange={(event) =>
                          updateEntry(entry.id, 'day_of_week', Number(event.target.value))
                        }
                      >
                        {DAY_OPTIONS.filter(
                          (day) =>
                            teachingDays.includes(day.value) || day.value === entry.day_of_week
                        ).map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* START */}
                    <td>
                      <input
                        className="sheet-control time-control"
                        type="time"
                        step="1800"
                        value={cleanTime(entry.start_time)}
                        onChange={(event) =>
                          updateEntry(entry.id, 'start_time', event.target.value)
                        }
                      />
                    </td>
                    {/* END */}
                    <td>
                      <input
                        className="sheet-control time-control"
                        type="time"
                        step="1800"
                        value={cleanTime(entry.end_time)}
                        onChange={(event) => updateEntry(entry.id, 'end_time', event.target.value)}
                      />
                    </td>
                    {/* ROOM */}
                    <td>
                      <select
                        className="sheet-control room-control"
                        value={entry.room_id}
                        onChange={(event) => updateEntry(entry.id, 'room_id', event.target.value)}
                      >
                        {compatibleRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.code || room.name} · Cap. {room.capacity}
                          </option>
                        ))}
                        {!compatibleRooms.some((room) => room.id === entry.room_id) && (
                          <option value={entry.room_id}>{entry.room_code || 'Current room'}</option>
                        )}
                      </select>
                    </td>
                    {/* INSTRUCTOR */}
                    <td>
                      <select
                        className="sheet-control faculty-control"
                        value={entry.faculty_id ?? ''}
                        onChange={(event) =>
                          updateEntry(entry.id, 'faculty_id', event.target.value || null)
                        }
                      >
                        <option value="">Select instructor</option>
                        {qualifiedFaculty.map((instructor) => (
                          <option key={instructor.id} value={instructor.id}>
                            {instructor.name}
                          </option>
                        ))}
                        {entry.faculty_id &&
                          !qualifiedFaculty.some(
                            (instructor) => instructor.id === entry.faculty_id
                          ) && (
                            <option value={entry.faculty_id}>
                              {entry.faculty_name || 'Current instructor'}
                            </option>
                          )}
                      </select>
                      {(sessionsPerClass.get(entry.class_offering_id) ?? 0) > 1 && (
                        <small className="faculty-scope-note">
                          Applies to all sessions of this class
                        </small>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* ===================================================
          FOOTER
          =================================================== */}
        <div className="preview-footer">
          <div className="preview-footer-status">
            {totalIssues === 0 ? (
              <>
                <span className="footer-icon success">✓</span>
                <div>
                  <strong>Schedule ready for validation</strong>
                  <p>No timetable conflicts are currently detected in this preview.</p>
                </div>
              </>
            ) : (
              <>
                <span className="footer-icon danger">!</span>
                <div>
                  <strong>
                    {totalIssues} issue
                    {totalIssues === 1 ? '' : 's'} detected
                  </strong>
                  <p>
                    Resolve the highlighted rows before submitting the schedule for Super Admin
                    review.
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="preview-actions">
            <button
              type="button"
              className="preview-button secondary"
              disabled={!dirty || isPending}
              onClick={resetChanges}
            >
              Reset Changes
            </button>
            <button
              type="button"
              className="preview-button primary"
              disabled={!dirty || isPending || totalIssues > 0}
              onClick={saveChanges}
            >
              {isPending ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
=======
                const compatibleRooms =
                  rooms.filter(
                    room => {
                      if (
                        entry.required_room_type_id &&
                        room.room_type_id !==
                          entry.required_room_type_id
                      ) {
                        return false
                      }

                      if (
                        entry.expected_students >
                          0 &&
                        room.capacity <
                          entry.expected_students
                      ) {
                        return false
                      }

                      return true
                    }
                  )

                return (
                  <tr
                    key={
                      entry.id
                    }
                    className={
                      hasConflict
                        ? 'schedule-row-conflict'
                        : 'schedule-row-clear'
                    }
                  >
                    {/* STATUS */}

                    <td className="status-cell">
                      <div
                        className={
                          hasConflict
                            ? 'row-status conflict'
                            : 'row-status clear'
                        }
                      >
                        <i />

                        {hasConflict
                          ? 'Conflict'
                          : 'Clear'}
                      </div>

                      {hasConflict && (
                        <div className="conflict-list">
                          {conflicts.map(
                            (
                              conflict,
                              index
                            ) => (
                              <span
                                key={`${conflict.type}-${index}`}
                              >
                                {
                                  conflict.message
                                }
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </td>

                    {/* SUBJECT */}

                    <td className="subject-cell">
                      <strong>
                        {
                          entry.subject_code
                        }
                      </strong>

                      <span>
                        {
                          entry.subject_name
                        }
                      </span>
                    </td>

                    {/* BLOCK */}

                    <td>
                      <span className="block-chip">
                        {
                          entry.section_code
                        }
                      </span>
                    </td>

                    {/* SESSION */}

                    <td>
                      <span
                        className={
                          entry.session_type ===
                          'lab'
                            ? 'session-chip lab'
                            : 'session-chip lecture'
                        }
                      >
                        {entry.session_type ===
                        'lab'
                          ? 'LAB'
                          : 'LECTURE'}
                      </span>
                    </td>

                    {/* DAY */}

                    <td>
                      <select
                        className="sheet-control day-control"
                        value={
                          entry.day_of_week
                        }
                        onChange={
                          event =>
                            updateEntry(
                              entry.id,
                              'day_of_week',
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                        }
                      >
                        {DAYS.map(
                          day => (
                            <option
                              key={
                                day.value
                              }
                              value={
                                day.value
                              }
                            >
                              {
                                day.short
                              }
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    {/* START */}

                    <td>
                      <input
                        className="sheet-control time-control"
                        type="time"
                        step="1800"
                        value={cleanTime(
                          entry.start_time
                        )}
                        onChange={
                          event =>
                            updateEntry(
                              entry.id,
                              'start_time',
                              event
                                .target
                                .value
                            )
                        }
                      />
                    </td>

                    {/* END */}

                    <td>
                      <input
                        className="sheet-control time-control"
                        type="time"
                        step="1800"
                        value={cleanTime(
                          entry.end_time
                        )}
                        onChange={
                          event =>
                            updateEntry(
                              entry.id,
                              'end_time',
                              event
                                .target
                                .value
                            )
                        }
                      />
                    </td>

                    {/* ROOM */}

                    <td>
                      <select
                        className="sheet-control room-control"
                        value={
                          entry.room_id
                        }
                        onChange={
                          event =>
                            updateEntry(
                              entry.id,
                              'room_id',
                              event
                                .target
                                .value
                            )
                        }
                      >
                        {compatibleRooms.map(
                          room => (
                            <option
                              key={
                                room.id
                              }
                              value={
                                room.id
                              }
                            >
                              {room.code ||
                                room.name}{' '}
                              · Cap.{' '}
                              {
                                room.capacity
                              }
                            </option>
                          )
                        )}

                        {!compatibleRooms.some(
                          room =>
                            room.id ===
                            entry.room_id
                        ) && (
                          <option
                            value={
                              entry.room_id
                            }
                          >
                            {entry.room_code ||
                              'Current room'}
                          </option>
                        )}
                      </select>
                    </td>

                    {/* INSTRUCTOR */}

                    <td>
                      <select
                        className="sheet-control faculty-control"
                        value={
                          entry.faculty_id ??
                          ''
                        }
                        onChange={
                          event =>
                            updateEntry(
                              entry.id,
                              'faculty_id',
                              event
                                .target
                                .value ||
                                null
                            )
                        }
                      >
                        <option value="">
                          Select instructor
                        </option>

                        {qualifiedFaculty.map(
                          instructor => (
                            <option
                              key={
                                instructor.id
                              }
                              value={
                                instructor.id
                              }
                            >
                              {
                                instructor.name
                              }
                            </option>
                          )
                        )}

                        {entry.faculty_id &&
                          !qualifiedFaculty.some(
                            instructor =>
                              instructor.id ===
                              entry.faculty_id
                          ) && (
                            <option
                              value={
                                entry.faculty_id
                              }
                            >
                              {entry.faculty_name ||
                                'Current instructor'}
                            </option>
                          )}
                      </select>
                    </td>
                  </tr>
                )
              }
            )}
          </tbody>
        </table>
      </div>

      {/* ===================================================
          FOOTER
          =================================================== */}

      <div className="preview-footer">
        <div className="preview-footer-status">
          {totalIssues === 0 ? (
            <>
              <span className="footer-icon success">
                ✓
              </span>

              <div>
                <strong>
                  Schedule ready for validation
                </strong>

                <p>
                  No timetable conflicts are currently detected
                  in this preview.
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="footer-icon danger">
                !
              </span>

              <div>
                <strong>
                  {totalIssues}{' '}
                  issue
                  {totalIssues === 1
                    ? ''
                    : 's'}{' '}
                  detected
                </strong>

                <p>
                  Resolve the highlighted rows before submitting
                  the schedule for Super Admin review.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="preview-actions">
          <button
            type="button"
            className="preview-button secondary"
            disabled={
              !dirty ||
              isPending
            }
            onClick={
              resetChanges
            }
          >
            Reset Changes
          </button>

          <button
            type="button"
            className="preview-button primary"
            disabled={
              !dirty ||
              isPending ||
              totalIssues > 0
            }
            onClick={
              saveChanges
            }
          >
            {isPending
              ? 'Saving...'
              : dirty
                ? 'Save Changes'
                : 'Saved'}
          </button>
        </div>
      </div>

      {/* ===================================================
          STYLE
          =================================================== */}

      <style jsx>{`
        .schedule-preview-panel {
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 12px;
          background: rgba(10, 22, 36, 0.78);
        }

        .preview-toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 18px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
        }

        .preview-heading {
          min-width: 0;
        }

        .preview-kicker {
          color: #60a5fa;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .preview-toolbar h2 {
          margin: 5px 0;
          color: #f8fafc;
          font-size: 19px;
        }

        .preview-toolbar p {
          max-width: 700px;
          margin: 0;
          color: #8da1b7;
          font-size: 12px;
          line-height: 1.55;
        }

        .preview-summary {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .preview-summary-card {
          min-width: 90px;
          padding: 8px 11px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 8px;
          background: rgba(15, 30, 46, 0.75);
        }

        .preview-summary-card span {
          display: block;
          margin-bottom: 2px;
          color: #8296aa;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .preview-summary-card strong {
          color: #f8fafc;
          font-size: 16px;
        }

        .preview-summary-card.success {
          border-color: rgba(34, 197, 94, 0.3);
        }

        .preview-summary-card.success strong {
          color: #86efac;
        }

        .preview-summary-card.danger {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .preview-summary-card.danger strong {
          color: #fca5a5;
        }

        .preview-summary-card.warning {
          border-color: rgba(245, 158, 11, 0.3);
        }

        .preview-summary-card.warning strong {
          color: #fcd34d;
        }

        .preview-legend {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 9px 18px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          color: #8799ac;
          font-size: 10px;
        }

        .preview-legend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .preview-legend i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .dot-clear {
          background: #22c55e;
        }

        .dot-conflict {
          background: #ef4444;
        }

        .dot-unsaved {
          background: #f59e0b;
        }

        .preview-message {
          margin: 12px 18px 0;
          padding: 9px 11px;
          border-radius: 7px;
          font-size: 11px;
        }

        .preview-message.success {
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.08);
          color: #86efac;
        }

        .preview-message.warning {
          border: 1px solid rgba(245, 158, 11, 0.3);
          background: rgba(245, 158, 11, 0.08);
          color: #fcd34d;
        }

        .preview-message.error {
          border: 1px solid rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
        }

        .schedule-sheet-wrap {
          overflow: auto;
          max-height: 650px;
        }

        .schedule-sheet {
          width: 100%;
          min-width: 1180px;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 11px;
        }

        .schedule-sheet th {
          position: sticky;
          top: 0;
          z-index: 3;
          padding: 9px 10px;
          border-right: 1px solid rgba(148, 163, 184, 0.12);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          background: #13263a;
          color: #a9b8c8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-align: left;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .schedule-sheet td {
          padding: 7px 8px;
          border-right: 1px solid rgba(148, 163, 184, 0.08);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          vertical-align: middle;
        }

        .schedule-sheet tbody tr:nth-child(even) {
          background: rgba(148, 163, 184, 0.025);
        }

        .schedule-row-conflict {
          background: rgba(239, 68, 68, 0.045) !important;
        }

        .status-cell {
          min-width: 135px;
        }

        .row-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
        }

        .row-status i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .row-status.clear {
          color: #86efac;
        }

        .row-status.clear i {
          background: #22c55e;
        }

        .row-status.conflict {
          color: #fca5a5;
        }

        .row-status.conflict i {
          background: #ef4444;
        }

        .conflict-list {
          display: flex;
          margin-top: 4px;
          flex-direction: column;
          gap: 2px;
          max-width: 190px;
          color: #fca5a5;
          font-size: 9px;
          line-height: 1.3;
        }

        .subject-cell {
          min-width: 175px;
        }

        .subject-cell strong {
          display: block;
          color: #8fc2ff;
          font-size: 10px;
        }

        .subject-cell span {
          display: block;
          max-width: 210px;
          margin-top: 2px;
          overflow: hidden;
          color: #d6e0ea;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .block-chip,
        .session-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 23px;
          padding: 0 7px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .block-chip {
          border: 1px solid rgba(96, 165, 250, 0.2);
          background: rgba(59, 130, 246, 0.08);
          color: #93c5fd;
        }

        .session-chip.lecture {
          background: rgba(59, 130, 246, 0.1);
          color: #93c5fd;
        }

        .session-chip.lab {
          background: rgba(168, 85, 247, 0.1);
          color: #d8b4fe;
        }

        .sheet-control {
          min-height: 32px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 6px;
          outline: none;
          background: #102235;
          color: #e5edf5;
          font: inherit;
        }

        .sheet-control:focus {
          border-color: rgba(96, 165, 250, 0.7);
          box-shadow:
            0 0 0 2px
            rgba(59, 130, 246, 0.1);
        }

        select.sheet-control {
          padding: 0 26px 0 8px;
        }

        input.sheet-control {
          padding: 0 7px;
        }

        .day-control {
          width: 78px;
        }

        .time-control {
          width: 100px;
        }

        .room-control {
          width: 155px;
        }

        .faculty-control {
          width: 195px;
        }

        .preview-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          border-top: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(8, 18, 30, 0.65);
        }

        .preview-footer-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .preview-footer-status strong {
          display: block;
          color: #e7eef6;
          font-size: 11px;
        }

        .preview-footer-status p {
          margin: 2px 0 0;
          color: #8295a9;
          font-size: 10px;
        }

        .footer-icon {
          display: inline-flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          flex: 0 0 28px;
          border-radius: 50%;
          font-weight: 900;
        }

        .footer-icon.success {
          background: rgba(34, 197, 94, 0.1);
          color: #86efac;
        }

        .footer-icon.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }

        .preview-actions {
          display: flex;
          gap: 8px;
        }

        .preview-button {
          min-height: 35px;
          padding: 0 13px;
          border: 0;
          border-radius: 7px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .preview-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .preview-button.secondary {
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(148, 163, 184, 0.07);
          color: #c8d4df;
        }

        .preview-button.primary {
          background: #2563eb;
          color: #ffffff;
        }

        @media (max-width: 1000px) {
          .preview-toolbar {
            flex-direction: column;
          }

          .preview-summary {
            width: 100%;
          }

          .preview-summary-card {
            flex: 1;
          }
        }

        @media (max-width: 760px) {
          .preview-summary {
            flex-direction: column;
          }

          .preview-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .preview-actions {
            width: 100%;
          }

          .preview-button {
            flex: 1;
          }
        }
      `}</style>
    </section>
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

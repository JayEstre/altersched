'use client'

import { useMemo, useState, useTransition } from 'react'
import { saveSchedulePreviewEntries } from './draft-actions'
import { DAY_OPTIONS, formatTime } from '@/lib/format'
import { overlaps, timeToMinutes } from '@/lib/time'
import { describeClash, findClash, type Booking } from '@/lib/bookings'
import styles from './SchedulePreview.module.css'

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
  faculty_name: string
  room_code: string
}

type ConflictType =
  'faculty' | 'room' | 'block' | 'qualification' | 'capacity' | 'room_type' | 'invalid_time'

type Conflict = {
  type: ConflictType
  message: string
}

type Props = {
  entries: PreviewEntry[]
  faculty: FacultyOption[]
  rooms: RoomOption[]
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

/* =========================================================
   LOCAL PREVIEW CONFLICT CHECK
   ========================================================= */

function getEntryConflicts(
  entry: PreviewEntry,
  entries: PreviewEntry[],
  faculty: FacultyOption[],
  rooms: RoomOption[],
  bookings: Booking[]
): Conflict[] {
  const conflicts: Conflict[] = []

  /* -------------------------------------------------------
     TIME
     ------------------------------------------------------- */

  const start = timeToMinutes(entry.start_time)
  const end = timeToMinutes(entry.end_time)

  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    conflicts.push({
      type: 'invalid_time',
      message: 'Invalid class time.',
    })

    return conflicts
  }

  /* -------------------------------------------------------
     INSTRUCTOR QUALIFICATION
     ------------------------------------------------------- */

  const selectedFaculty = faculty.find((instructor) => instructor.id === entry.faculty_id)

  if (!entry.faculty_id) {
    conflicts.push({
      type: 'qualification',
      message: 'Instructor required.',
    })
  } else if (!selectedFaculty || !selectedFaculty.subject_ids.includes(entry.subject_id)) {
    conflicts.push({
      type: 'qualification',
      message: 'Instructor is not qualified for this subject.',
    })
  }

  /* -------------------------------------------------------
     ROOM
     ------------------------------------------------------- */

  const selectedRoom = rooms.find((room) => room.id === entry.room_id)

  if (!selectedRoom) {
    conflicts.push({
      type: 'room_type',
      message: 'Room required.',
    })
  } else {
    /* CAPACITY */

    if (entry.expected_students > 0 && selectedRoom.capacity < entry.expected_students) {
      conflicts.push({
        type: 'capacity',
        message:
          `Room capacity is ${selectedRoom.capacity}, ` +
          `but ${entry.expected_students} learners are expected.`,
      })
    }

    /* ROOM TYPE */

    if (entry.required_room_type_id && selectedRoom.room_type_id !== entry.required_room_type_id) {
      conflicts.push({
        type: 'room_type',
        message: 'Room type is not compatible with this subject.',
      })
    }
  }

  /* -------------------------------------------------------
     OVERLAPPING ENTRIES
     ------------------------------------------------------- */

  const overlappingEntries = entries.filter((other) => {
    if (other.id === entry.id) {
      return false
    }

    if (Number(other.day_of_week) !== Number(entry.day_of_week)) {
      return false
    }

    return overlaps(entry.start_time, entry.end_time, other.start_time, other.end_time)
  })

  /* FACULTY CONFLICT */

  if (
    entry.faculty_id &&
    overlappingEntries.some((other) => other.faculty_id === entry.faculty_id)
  ) {
    conflicts.push({
      type: 'faculty',
      message: 'Instructor has another class at this time.',
    })
  }

  /* ROOM CONFLICT */

  if (entry.room_id && overlappingEntries.some((other) => other.room_id === entry.room_id)) {
    conflicts.push({
      type: 'room',
      message: 'Room is already occupied at this time.',
    })
  }

  /* BLOCK CONFLICT */

  if (
    entry.section_id &&
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
  bookings = [],
  teachingDays = [1, 2, 3, 4, 5, 6],
}: Props) {
  const [entries, setEntries] = useState<PreviewEntry[]>(initialEntries)
  const [savedEntries, setSavedEntries] = useState<PreviewEntry[]>(initialEntries)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'warning' | 'error'>('success')
  const [isPending, startTransition] = useTransition()

  /* =======================================================
     CONFLICT MAP
     ======================================================= */

  const conflictsByEntry = useMemo(() => {
    const map = new Map<string, Conflict[]>()

    for (const entry of entries) {
      map.set(entry.id, getEntryConflicts(entry, entries, faculty, rooms, bookings))
    }

    return map
  }, [entries, faculty, rooms, bookings])

  /* =======================================================
     SUMMARY
     ======================================================= */

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

  /* =======================================================
     UPDATE ENTRY
     ======================================================= */

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

  /* =======================================================
     RESET
     ======================================================= */

  function resetChanges() {
    setEntries(
      savedEntries.map((entry) => ({
        ...entry,
      }))
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
      setMessage('Resolve all highlighted timetable conflicts before saving.')

      return
    }

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
    <div className={styles.scope}>
      <section className="schedule-preview-panel">
        {/* ===================================================
          HEADER
          =================================================== */}
        <div className="preview-toolbar">
          <div className="preview-heading">
            <h2>Edit this draft</h2>
            <p>
              Change the day, time, room or instructor of any class. Rows with a clash turn red and
              must be fixed before saving; all changes are saved together.
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

                /* -----------------------------------------
                   QUALIFIED FACULTY
                   ----------------------------------------- */

                const qualifiedFaculty = faculty.filter((instructor) =>
                  instructor.subject_ids.includes(entry.subject_id)
                )

                /* -----------------------------------------
                   COMPATIBLE ROOMS
                   ----------------------------------------- */

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
                      <strong>
                        {entry.subject_code}{' '}
                        <span
                          className={
                            entry.session_type === 'lab'
                              ? 'session-chip lab'
                              : 'session-chip lecture'
                          }
                        >
                          {entry.session_type === 'lab' ? 'Lab' : 'Lecture'}
                        </span>
                      </strong>
                      <span>{entry.subject_name}</span>
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

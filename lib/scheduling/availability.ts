import type { FacultyAvailabilityRecord, RoomAvailabilityRecord } from './types'
import { timeToMinutes, overlaps } from '@/lib/time'

/*
 * Availability rules
 * - Instructor with no availability records at all: available any time.
 * - Instructor with records: only on declared days, inside an "available"/"preferred" window,
 *   and never during an "unavailable" window.
 * - Room: blocked/maintenance windows are excluded; if "available" windows exist the session
 *   must fit inside one.
 */

export function facultyAllowsSlot(
  facultyId: string | null,
  day: number,
  startTime: string,
  endTime: string,
  availability: FacultyAvailabilityRecord[]
) {
  if (!facultyId) {
    return true
  }

  const facultyRecords = availability.filter(
    (item: FacultyAvailabilityRecord) => item.faculty_id === facultyId
  )

  /*
   * Instructor has not declared any availability at all:
   * treat as generally available.
   */
  if (!facultyRecords.length) {
    return true
  }

  const records = facultyRecords.filter(
    (item: FacultyAvailabilityRecord) => Number(item.day_of_week) === day
  )

  /*
   * Instructor declared availability, but not for this day
   * (e.g. Mon-Fri only, slot is on Saturday): not available.
   * Explicit "unavailable" records still block below.
   */
  if (!records.length) {
    return false
  }

  const unavailable = records.some(
    (item: FacultyAvailabilityRecord) =>
      item.availability_type === 'unavailable' &&
      overlaps(startTime, endTime, item.start_time, item.end_time)
  )

  if (unavailable) {
    return false
  }

  const positive = records.filter(
    (item: FacultyAvailabilityRecord) =>
      item.availability_type === 'available' || item.availability_type === 'preferred'
  )

  if (!positive.length) {
    return true
  }

  /*
   * If explicit available/preferred ranges exist,
   * the whole class must fit inside one.
   */

  return positive.some(
    (item: FacultyAvailabilityRecord) =>
      timeToMinutes(startTime) >= timeToMinutes(item.start_time) &&
      timeToMinutes(endTime) <= timeToMinutes(item.end_time)
  )
}

export function roomAllowsSlot(
  roomId: string,
  day: number,
  startTime: string,
  endTime: string,
  availability: RoomAvailabilityRecord[]
) {
  const records = availability.filter(
    (item: RoomAvailabilityRecord) => item.room_id === roomId && Number(item.day_of_week) === day
  )

  if (!records.length) {
    return true
  }

  /*
   * blocked / maintenance overlap means
   * the room cannot be used.
   */

  const blocked = records.some(
    (item: RoomAvailabilityRecord) =>
      (item.status === 'blocked' || item.status === 'maintenance') &&
      overlaps(startTime, endTime, item.start_time, item.end_time)
  )

  if (blocked) {
    return false
  }

  const available = records.filter((item: RoomAvailabilityRecord) => item.status === 'available')

  if (!available.length) {
    return true
  }

  return available.some(
    (item: RoomAvailabilityRecord) =>
      timeToMinutes(startTime) >= timeToMinutes(item.start_time) &&
      timeToMinutes(endTime) <= timeToMinutes(item.end_time)
  )
}

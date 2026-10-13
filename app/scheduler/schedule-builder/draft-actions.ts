'use server'

import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/auth/require-role'
import { describeClash, findClash, loadBookings } from '@/lib/bookings'
import { facultyAllowsSlot, roomAllowsSlot } from '@/lib/scheduling/availability'
import { loadSchedulingSettings } from '@/lib/scheduling/settings'
import type { FacultyAvailabilityRecord, RoomAvailabilityRecord } from '@/lib/scheduling/types'
import { one } from '@/lib/relations'
import { createClient } from '@/lib/supabase/server'
import { overlaps, timeToMinutes } from '@/lib/time'

/* =========================================================
   SCHEDULE PREVIEW EDITOR
   ========================================================= */

type SchedulePreviewUpdate = {
  id: string
  faculty_id: string | null
  room_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

function normalizePreviewTime(value: string) {
  const clean = String(value ?? '')
    .trim()
    .slice(0, 5)

  return clean ? `${clean}:00` : '00:00:00'
}

export async function saveSchedulePreviewEntries(updates: SchedulePreviewUpdate[]): Promise<{
  ok: boolean
  conflicts: number
  message?: string
}> {
  await requireRole(['department_scheduler'])
  const supabase = await createClient()

  if (!Array.isArray(updates) || updates.length === 0) {
    return {
      ok: false,
      conflicts: 0,
      message: 'No schedule changes were provided.',
    }
  }

  /* =======================================================
     BASIC INPUT VALIDATION
     ======================================================= */

  const { days: teachingDays } = await loadSchedulingSettings(supabase)

  for (const update of updates) {
    if (!update.id) {
      return {
        ok: false,
        conflicts: 0,
        message: 'A schedule entry is missing its ID.',
      }
    }

    if (!update.room_id) {
      return {
        ok: false,
        conflicts: 0,
        message: 'Every schedule entry requires a room.',
      }
    }

    const day = Number(update.day_of_week)
    const start = timeToMinutes(update.start_time)
    const end = timeToMinutes(update.end_time)

    if (!Number.isInteger(day) || !teachingDays.includes(day)) {
      return {
        ok: false,
        conflicts: 0,
        message: 'A class is on a day that is not a teaching day (Settings → Schedule Generator).',
      }
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return {
        ok: false,
        conflicts: 0,
        message: 'Every class must have a valid start and end time.',
      }
    }
  }

  /* =======================================================
     LOAD ORIGINAL ENTRIES
     ======================================================= */

  const entryIds = updates.map((item) => item.id)

  const { data: originalEntries, error: originalError } = await supabase
    .from('schedule_entries')
    .select(
      `
      id,
      schedule_version_id,
      class_offering_id,
      faculty_id,
      section_id,
      room_id,
      day_of_week,
      start_time,
      end_time
    `
    )
    .in('id', entryIds)

  if (originalError) {
    console.error('Schedule preview entry lookup failed:', originalError)

    return {
      ok: false,
      conflicts: 0,
      message: 'AlterSched could not load the schedule entries.',
    }
  }

  if ((originalEntries ?? []).length !== updates.length) {
    return {
      ok: false,
      conflicts: 0,
      message: 'One or more schedule entries could not be found.',
    }
  }

  const originalMap = new Map((originalEntries ?? []).map((entry) => [entry.id, entry]))

  const workingEntries = updates.map((update) => {
    // Present for every update: the lengths were compared above.
    const original = originalMap.get(update.id)!

    return {
      ...original,
      faculty_id: update.faculty_id || null,
      room_id: update.room_id,
      day_of_week: Number(update.day_of_week),
      start_time: normalizePreviewTime(update.start_time),
      end_time: normalizePreviewTime(update.end_time),
    }
  })

  /* =======================================================
     VERIFY DRAFT VERSIONS
     ======================================================= */

  const versionIds = [
    ...new Set(workingEntries.map((entry) => entry.schedule_version_id).filter(Boolean)),
  ] as string[]

  const { data: versions, error: versionError } = await supabase
    .from('schedule_versions')
    .select('id,status')
    .in('id', versionIds)

  if (versionError) {
    console.error('Schedule version verification failed:', versionError)

    return {
      ok: false,
      conflicts: 0,
      message: 'AlterSched could not verify the Draft schedule.',
    }
  }

  if ((versions ?? []).some((version) => version.status !== 'draft')) {
    return {
      ok: false,
      conflicts: 0,
      message: 'Only Draft schedules can be edited.',
    }
  }

  /* =======================================================
     CLASS OFFERINGS
     ======================================================= */

  const offeringIds = [
    ...new Set(workingEntries.map((entry) => entry.class_offering_id).filter(Boolean)),
  ] as string[]

  const { data: offerings, error: offeringError } = await supabase
    .from('class_offerings')
    .select(
      `
      id,
      semester_id,
      subject_id,
      section_id,
      expected_students,
      subjects (
        id,
        default_room_type_id
      )
    `
    )
    .in('id', offeringIds)

  if (offeringError) {
    console.error('Schedule preview offering lookup failed:', offeringError)

    return {
      ok: false,
      conflicts: 0,
      message: 'AlterSched could not verify the Class Offerings.',
    }
  }

  const offeringMap = new Map((offerings ?? []).map((offering) => [offering.id, offering]))

  /* =======================================================
     ROOMS
     ======================================================= */

  const roomIds = [
    ...new Set(workingEntries.map((entry) => entry.room_id).filter(Boolean)),
  ] as string[]

  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select(
      `
      id,
      capacity,
      room_type_id,
      is_active
    `
    )
    .in('id', roomIds)

  if (roomError) {
    console.error('Schedule preview room lookup failed:', roomError)

    return {
      ok: false,
      conflicts: 0,
      message: 'AlterSched could not verify the selected rooms.',
    }
  }

  const roomMap = new Map((rooms ?? []).map((room) => [room.id, room]))

  /* =======================================================
     FACULTY QUALIFICATIONS
     ======================================================= */

  const facultyIds = [
    ...new Set(workingEntries.map((entry) => entry.faculty_id).filter(Boolean)),
  ] as string[]

  const subjectIds = [
    ...new Set((offerings ?? []).map((offering) => offering.subject_id).filter(Boolean)),
  ] as string[]

  let qualifications: { faculty_id: string; subject_id: string }[] = []

  if (facultyIds.length && subjectIds.length) {
    const { data, error } = await supabase
      .from('faculty_subjects')
      .select('faculty_id,subject_id')
      .in('faculty_id', facultyIds)
      .in('subject_id', subjectIds)

    if (error) {
      console.error('Instructor qualification lookup failed:', error)

      return {
        ok: false,
        conflicts: 0,
        message: 'AlterSched could not verify Instructor qualifications.',
      }
    }

    qualifications = data ?? []
  }

  const qualificationSet = new Set(
    qualifications.map((item) => `${item.faculty_id}:${item.subject_id}`)
  )

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const semesterIds = [
    ...new Set((offerings ?? []).map((offering) => offering.semester_id).filter(Boolean)),
  ] as string[]

  let facultyAvailability: FacultyAvailabilityRecord[] = []
  let roomAvailability: RoomAvailabilityRecord[] = []

  if (semesterIds.length === 1) {
    const semesterId = semesterIds[0]

    const [facultyResult, roomResult] = await Promise.all([
      facultyIds.length
        ? supabase
            .from('faculty_availability')
            .select(
              `
              faculty_id,
              day_of_week,
              start_time,
              end_time,
              availability_type
            `
            )
            .eq('semester_id', semesterId)
            .in('faculty_id', facultyIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
      roomIds.length
        ? supabase
            .from('room_availability')
            .select(
              `
              room_id,
              day_of_week,
              start_time,
              end_time,
              status
            `
            )
            .eq('semester_id', semesterId)
            .in('room_id', roomIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ])

    if (facultyResult.error || roomResult.error) {
      console.error(
        'Schedule preview availability lookup failed:',
        facultyResult.error ?? roomResult.error
      )

      return {
        ok: false,
        conflicts: 0,
        message: 'AlterSched could not verify schedule availability.',
      }
    }

    facultyAvailability = facultyResult.data ?? []
    roomAvailability = roomResult.data ?? []
  }

  /* =======================================================
     CONFLICT VALIDATION
     ======================================================= */

  let conflictRows = 0

  for (const entry of workingEntries) {
    let rowHasConflict = false
    const offering = offeringMap.get(entry.class_offering_id)
    const room = roomMap.get(entry.room_id)
    const subject = one(offering?.subjects)

    /* An unassigned instructor is allowed in a Draft.
  A selected instructor must still be qualified. */
    if (
      entry.faculty_id &&
      offering?.subject_id &&
      !qualificationSet.has(`${entry.faculty_id}:${offering.subject_id}`)
    ) {
      rowHasConflict = true
    }

    /* Room active */

    if (!room || room.is_active === false) {
      rowHasConflict = true
    }

    /* Capacity */

    if (
      room &&
      Number(offering?.expected_students ?? 0) > 0 &&
      Number(room.capacity ?? 0) < Number(offering?.expected_students ?? 0)
    ) {
      rowHasConflict = true
    }

    /* Room type */

    if (
      room &&
      subject?.default_room_type_id &&
      room.room_type_id !== subject.default_room_type_id
    ) {
      rowHasConflict = true
    }

    /* Instructor availability */

    if (
      entry.faculty_id &&
      !facultyAllowsSlot(
        entry.faculty_id,
        Number(entry.day_of_week),
        entry.start_time,
        entry.end_time,
        facultyAvailability
      )
    ) {
      rowHasConflict = true
    }

    /* Room availability */

    if (
      entry.room_id &&
      !roomAllowsSlot(
        entry.room_id,
        Number(entry.day_of_week),
        entry.start_time,
        entry.end_time,
        roomAvailability
      )
    ) {
      rowHasConflict = true
    }

    /* Preview overlap */

    const overlapFound = workingEntries.some((other) => {
      if (other.id === entry.id) {
        return false
      }

      if (Number(other.day_of_week) !== Number(entry.day_of_week)) {
        return false
      }

      if (!overlaps(entry.start_time, entry.end_time, other.start_time, other.end_time)) {
        return false
      }

      const sectionConflict = other.section_id === entry.section_id
      const roomConflict = other.room_id === entry.room_id
      const facultyConflict = Boolean(entry.faculty_id) && other.faculty_id === entry.faculty_id

      return sectionConflict || roomConflict || facultyConflict
    })

    if (overlapFound) {
      rowHasConflict = true
    }

    if (rowHasConflict) {
      conflictRows += 1
    }
  }

  /* =======================================================
     ONE INSTRUCTOR PER CLASS
     ======================================================= */

  const facultyByOffering = new Map<string, Set<string>>()
  for (const entry of workingEntries) {
    const set = facultyByOffering.get(entry.class_offering_id) ?? new Set<string>()
    set.add(entry.faculty_id ?? '')
    facultyByOffering.set(entry.class_offering_id, set)
  }
  if ([...facultyByOffering.values()].some((set) => set.size > 1)) {
    return {
      ok: false,
      conflicts: 0,
      message: 'All sessions of a class (lecture and lab) must have the same instructor.',
    }
  }

  /* =======================================================
     ROOM / INSTRUCTOR CLASHES WITH OTHER BLOCKS
     ======================================================= */

  if (semesterIds.length === 1) {
    const bookings = await loadBookings(supabase, semesterIds[0], versionIds)
    for (const entry of workingEntries) {
      const clash = findClash(entry, bookings)
      if (clash) {
        return { ok: false, conflicts: 1, message: `Nothing was saved. ${describeClash(clash)}.` }
      }
    }
  }

  /* =======================================================
     HARD CONFLICT GATE
     ======================================================= */

  /*
   * Preview edits are never persisted while a hard conflict remains.
   * Client-side validation is for instant feedback; this server gate
   * is the final authority before database updates.
   */

  if (conflictRows > 0) {
    return {
      ok: false,
      conflicts: conflictRows,
      message: `Cannot save this Draft. Resolve ${conflictRows} conflicting schedule row${conflictRows === 1 ? '' : 's'} first.`,
    }
  }

  /* =======================================================
     SAVE (one transaction: instructor changes + all rows)
     ======================================================= */

  const { error: saveError } = await supabase.rpc('save_schedule_draft', {
    p_entries: workingEntries.map((entry) => ({
      id: entry.id,
      faculty_id: entry.faculty_id,
      room_id: entry.room_id,
      day_of_week: Number(entry.day_of_week),
      start_time: entry.start_time,
      end_time: entry.end_time,
    })),
  })

  if (saveError) {
    console.error('Schedule draft save failed:', saveError)

    return {
      ok: false,
      conflicts: 0,
      message: /conflict/i.test(saveError.message)
        ? 'Nothing was saved: two classes would overlap (same block, room or instructor).'
        : `Nothing was saved: ${saveError.message}`,
    }
  }

  /* =======================================================
     REFRESH PAGES
     ======================================================= */

  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/schedules')
  revalidatePath('/scheduler/my-schedule')
  revalidatePath('/faculty/schedule')
  revalidatePath('/scheduler/class-offerings')
  revalidatePath('/admin/class-offerings')

  return {
    ok: true,
    conflicts: conflictRows,
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

/* =========================================================
   TYPES
   ========================================================= */

type Offering = {
  id: string
  semester_id: string
  section_id: string
  subject_id: string
  faculty_id: string | null
  required_weekly_hours: number | string
  expected_students: number | null
  status: string

  subjects?: any
  sections?: any
}

type Room = {
  id: string
  code: string
  name: string
  capacity: number
  room_type_id: string | null
}

type GeneratedEntry = {
  class_offering_id: string
  faculty_id: string | null
  section_id: string
  room_id: string
  day_of_week: number
  start_time: string
  end_time: string
  entry_type: 'lecture' | 'lab'
}

type SessionRequirement = {
  offering: Offering
  entryType: 'lecture' | 'lab'
  durationMinutes: number
  expectedStudents: number
}

/* =========================================================
   TIME HELPERS
   ========================================================= */

function timeToMinutes(time: string) {
  const [hour, minute] = time
    .slice(0, 5)
    .split(':')
    .map(Number)

  return hour * 60 + minute
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60

  return `${String(hour).padStart(
    2,
    '0'
  )}:${String(minute).padStart(2, '0')}:00`
}

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  const aStart = timeToMinutes(startA)
  const aEnd = timeToMinutes(endA)
  const bStart = timeToMinutes(startB)
  const bEnd = timeToMinutes(endB)

  return aStart < bEnd && bStart < aEnd
}

/* =========================================================
   SESSION SPLITTING
   ========================================================= */

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
function splitLectureHours(
  hours: number
): number[] {
  if (!hours || hours <= 0) {
    return []
  }

  const totalMinutes =
    Math.round(hours * 60)

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
function splitLabHours(
  hours: number
): number[] {
  if (!hours || hours <= 0) {
    return []
  }

  let remaining =
    Math.round(hours * 60)

  const sessions: number[] = []

  while (remaining > 0) {
    const duration =
      Math.min(remaining, 180)

    sessions.push(duration)

    remaining -= duration
  }

  return sessions
}

/* =========================================================
   AVAILABILITY HELPERS
   ========================================================= */

function facultyAllowsSlot(
  facultyId: string | null,
  day: number,
  startTime: string,
  endTime: string,
  availability: any[]
) {
  if (!facultyId) {
    return false
  }

  const records = availability.filter(
    (item: any) =>
      item.faculty_id === facultyId &&
      Number(item.day_of_week) === day
  )

  /*
   * No availability record:
   * treat as generally available.
   *
   * Explicit "unavailable" records still block.
   */
  if (!records.length) {
    return true
  }

  const unavailable =
    records.some(
      (item: any) =>
        item.availability_type ===
          'unavailable' &&
        overlaps(
          startTime,
          endTime,
          item.start_time,
          item.end_time
        )
    )

  if (unavailable) {
    return false
  }

  const positive =
    records.filter(
      (item: any) =>
        item.availability_type ===
          'available' ||
        item.availability_type ===
          'preferred'
    )

  if (!positive.length) {
    return true
  }

  /*
   * If explicit available/preferred ranges exist,
   * the whole class must fit inside one.
   */
  return positive.some(
    (item: any) =>
      timeToMinutes(startTime) >=
        timeToMinutes(item.start_time) &&
      timeToMinutes(endTime) <=
        timeToMinutes(item.end_time)
  )
}

function roomAllowsSlot(
  roomId: string,
  day: number,
  startTime: string,
  endTime: string,
  availability: any[]
) {
  const records = availability.filter(
    (item: any) =>
      item.room_id === roomId &&
      Number(item.day_of_week) === day
  )

  if (!records.length) {
    return true
  }

  /*
   * blocked / maintenance overlap means
   * the room cannot be used.
   */
  const blocked =
    records.some(
      (item: any) =>
        (item.status === 'blocked' ||
          item.status ===
            'maintenance') &&
        overlaps(
          startTime,
          endTime,
          item.start_time,
          item.end_time
        )
    )

  if (blocked) {
    return false
  }

  const available =
    records.filter(
      (item: any) =>
        item.status === 'available'
    )

  if (!available.length) {
    return true
  }

  return available.some(
    (item: any) =>
      timeToMinutes(startTime) >=
        timeToMinutes(item.start_time) &&
      timeToMinutes(endTime) <=
        timeToMinutes(item.end_time)
  )
}

/* =========================================================
   CONFLICT CHECK
   ========================================================= */

function hasGeneratedConflict(
  candidate: GeneratedEntry,
  generated: GeneratedEntry[]
) {
  return generated.some(entry => {
    if (
      entry.day_of_week !==
      candidate.day_of_week
    ) {
      return false
    }

    if (
      !overlaps(
        candidate.start_time,
        candidate.end_time,
        entry.start_time,
        entry.end_time
      )
    ) {
      return false
    }

    /*
     * Section conflict
     */
    if (
      entry.section_id ===
      candidate.section_id
    ) {
      return true
    }

    /*
     * Room conflict
     */
    if (
      entry.room_id ===
      candidate.room_id
    ) {
      return true
    }

    /*
     * Faculty conflict
     */
    if (
      candidate.faculty_id &&
      entry.faculty_id ===
        candidate.faculty_id
    ) {
      return true
    }

    return false
  })
}

/* =========================================================
   SAME SUBJECT SESSION DISTRIBUTION
   ========================================================= */

function alreadyUsedDayForOffering(
  offeringId: string,
  day: number,
  generated: GeneratedEntry[]
) {
  return generated.some(
    entry =>
      entry.class_offering_id ===
        offeringId &&
      entry.day_of_week === day
  )
}

/* =========================================================
   AUTOMATIC PREPARATION + FACULTY ASSIGNMENT
   ========================================================= */

async function ensureClassOfferings(
  supabase: any,
  semesterId: string,
  programIds: string[],
  sectionIds: string[]
) {
  const { data: semester, error: semesterError } = await supabase
    .from('semesters')
    .select('id, term_order')
    .eq('id', semesterId)
    .single()

  if (semesterError || !semester) {
    throw new Error('semester_not_found')
  }

  const termOrder = Number(semester.term_order)
  if (!Number.isInteger(termOrder) || termOrder < 1) {
    throw new Error('invalid_semester_term')
  }

  const { data: curricula, error: curriculaError } = await supabase
    .from('curricula')
    .select('id, program_id')
    .in('program_id', programIds)
    .eq('is_active', true)

  if (curriculaError) throw curriculaError
  if (!curricula?.length) throw new Error('no_active_curricula')

  const curriculumIds = curricula.map((item: any) => item.id)
  const { data: mappings, error: mappingsError } = await supabase
    .from('curriculum_subjects')
    .select('id, curriculum_id, subject_id, year_level_id, weekly_hours')
    .in('curriculum_id', curriculumIds)
    .eq('term_order', termOrder)

  if (mappingsError) throw mappingsError
  if (!mappings?.length) throw new Error('no_curriculum_subjects')

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, year_level_id, capacity')
    .in('id', sectionIds)
    .eq('is_active', true)

  if (sectionsError) throw sectionsError

  const required: any[] = []
  for (const mapping of mappings) {
    const weeklyHours = Number(mapping.weekly_hours)
    if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) continue

    for (const section of sections ?? []) {
      if (section.year_level_id !== mapping.year_level_id) continue
      required.push({
        semester_id: semesterId,
        section_id: section.id,
        subject_id: mapping.subject_id,
        faculty_id: null,
        required_weekly_hours: weeklyHours,
        expected_students: section.capacity || null,
        status: 'active',
      })
    }
  }

  if (!required.length) throw new Error('no_class_offerings')

  const { data: existing, error: existingError } = await supabase
    .from('class_offerings')
    .select('semester_id, section_id, subject_id')
    .eq('semester_id', semesterId)
    .in('section_id', sectionIds)

  if (existingError) throw existingError

  const existingKeys = new Set(
    (existing ?? []).map((item: any) =>
      `${item.semester_id}:${item.section_id}:${item.subject_id}`
    )
  )

  const toInsert = required.filter(item =>
    !existingKeys.has(`${item.semester_id}:${item.section_id}:${item.subject_id}`)
  )

  if (toInsert.length) {
    const { error: insertError } = await supabase
      .from('class_offerings')
      .insert(toInsert)
    if (insertError) throw insertError
  }
}

async function autoAssignFaculty(
  supabase: any,
  semesterId: string,
  offerings: Offering[]
) {
  const unassigned = offerings.filter(item => !item.faculty_id)
  if (!unassigned.length) return offerings

  const subjectIds = [...new Set(unassigned.map(item => item.subject_id))]

  const { data: qualifications, error: qualificationError } = await supabase
    .from('faculty_subjects')
    .select(`
      faculty_id,
      subject_id,
      faculty_profiles (
        id,
        max_teaching_load,
        profiles (id, full_name, account_status)
      )
    `)
    .in('subject_id', subjectIds)

  if (qualificationError) throw qualificationError

  const { data: currentAssignments, error: currentError } = await supabase
    .from('class_offerings')
    .select('faculty_id, required_weekly_hours')
    .eq('semester_id', semesterId)
    .not('faculty_id', 'is', null)

  if (currentError) throw currentError

  const load = new Map<string, number>()
  for (const item of currentAssignments ?? []) {
    if (!item.faculty_id) continue
    load.set(
      item.faculty_id,
      (load.get(item.faculty_id) ?? 0) + Number(item.required_weekly_hours ?? 0)
    )
  }

  const candidatesBySubject = new Map<string, Array<{ id: string; max: number }>>()
  for (const row of qualifications ?? []) {
    const relation = Array.isArray(row.faculty_profiles)
      ? row.faculty_profiles[0]
      : row.faculty_profiles
    if (!relation) continue

    const profileRelation = Array.isArray(relation.profiles)
      ? relation.profiles[0]
      : relation.profiles
    if (profileRelation?.account_status && profileRelation.account_status !== 'approved') continue

    const list = candidatesBySubject.get(row.subject_id) ?? []
    list.push({
      id: row.faculty_id,
      max: Number(relation.max_teaching_load ?? 0),
    })
    candidatesBySubject.set(row.subject_id, list)
  }

  const assignments: Array<{ id: string; faculty_id: string }> = []
  for (const offering of unassigned) {
    const hours = Number(offering.required_weekly_hours ?? 0)
    const qualifiedCandidates = [
      ...(candidatesBySubject.get(offering.subject_id) ?? []),
    ]

    if (!qualifiedCandidates.length) {
      throw new Error(
        `no_qualified_faculty:${offering.subject_id}`
      )
    }

    const withinLoad = qualifiedCandidates
      .filter(candidate => {
        const currentLoad =
          load.get(candidate.id) ?? 0

        return (
          candidate.max <= 0 ||
          currentLoad + hours <= candidate.max
        )
      })
      .sort(
        (a, b) =>
          (load.get(a.id) ?? 0) -
          (load.get(b.id) ?? 0)
      )

    const fallbackQualified =
      [...qualifiedCandidates].sort(
        (a, b) =>
          (load.get(a.id) ?? 0) -
          (load.get(b.id) ?? 0)
      )

    const chosen =
      withinLoad[0] ??
      fallbackQualified[0]

    assignments.push({ id: offering.id, faculty_id: chosen.id })
    offering.faculty_id = chosen.id
    load.set(chosen.id, (load.get(chosen.id) ?? 0) + hours)
  }

  for (const assignment of assignments) {
    const { error } = await supabase
      .from('class_offerings')
      .update({ faculty_id: assignment.faculty_id })
      .eq('id', assignment.id)
    if (error) throw error
  }

  return offerings
}

/* =========================================================
   MAIN MASTER GENERATOR
   ========================================================= */

export async function generateMasterSchedule(
  formData: FormData
) {
  const auth =
    await requireRole(['super_admin'])

  const semesterId = String(
    formData.get('semester_id') ?? ''
  ).trim()

  /*
   * Empty / "all" means ALL programs.
   */
  const selectedProgramId = String(
    formData.get('program_id') ?? 'all'
  ).trim()

  const customTitle = String(
    formData.get('title') ?? ''
  ).trim()

  if (!semesterId) {
    redirect(
      '/admin/schedule-builder?error=semester_required'
    )
  }

  const supabase =
    await createClient()

  /* =======================================================
     SEMESTER
     ======================================================= */

  const {
    data: semester,
    error: semesterError,
  } = await supabase
    .from('semesters')
    .select(`
      id,
      name,
      academic_year_id,
      is_active,
      academic_years (
        id,
        name
      )
    `)
    .eq('id', semesterId)
    .maybeSingle()

  if (
    semesterError ||
    !semester
  ) {
    console.error(
      'Semester lookup failed:',
      semesterError
    )

    redirect(
      '/admin/schedule-builder?error=semester_not_found'
    )
  }

  /* =======================================================
     PROGRAM SCOPE
     ======================================================= */

  let programScope: any[] = []

  if (
    selectedProgramId &&
    selectedProgramId !== 'all'
  ) {
    const {
      data: program,
      error,
    } = await supabase
      .from('programs')
      .select(`
        id,
        code,
        name,
        department_id,
        is_active
      `)
      .eq('id', selectedProgramId)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !program) {
      console.error(
        'Program lookup failed:',
        error
      )

      redirect(
        '/admin/schedule-builder?error=program_not_found'
      )
    }

    programScope = [program]
  } else {
    const {
      data,
      error,
    } = await supabase
      .from('programs')
      .select(`
        id,
        code,
        name,
        department_id,
        is_active
      `)
      .eq('is_active', true)

    if (error) {
      console.error(
        'Programs lookup failed:',
        error
      )

      redirect(
        '/admin/schedule-builder?error=program_load_failed'
      )
    }

    programScope = data ?? []
  }

  if (!programScope.length) {
    redirect(
      '/admin/schedule-builder?error=no_programs'
    )
  }

  const programIds =
    programScope.map(
      program => program.id
    )

  /* =======================================================
     YEAR LEVELS
     ======================================================= */

  const {
    data: yearLevels,
    error: yearError,
  } = await supabase
    .from('year_levels')
    .select(`
      id,
      program_id,
      name
    `)
    .in('program_id', programIds)

  if (yearError) {
    console.error(
      'Year level lookup failed:',
      yearError
    )

    redirect(
      '/admin/schedule-builder?error=structure_load_failed'
    )
  }

  const yearLevelIds =
    (yearLevels ?? []).map(
      year => year.id
    )

  if (!yearLevelIds.length) {
    redirect(
      '/admin/schedule-builder?error=no_year_levels'
    )
  }

  /* =======================================================
     SECTIONS / BLOCKS
     ======================================================= */

  const {
    data: sections,
    error: sectionError,
  } = await supabase
    .from('sections')
    .select(`
      id,
      year_level_id,
      code,
      name,
      capacity,
      is_active
    `)
    .in(
      'year_level_id',
      yearLevelIds
    )
    .eq('is_active', true)

  if (sectionError) {
    console.error(
      'Sections lookup failed:',
      sectionError
    )

    redirect(
      '/admin/schedule-builder?error=section_load_failed'
    )
  }

  const sectionIds =
    (sections ?? []).map(
      section => section.id
    )

  if (!sectionIds.length) {
    redirect(
      '/admin/schedule-builder?error=no_sections'
    )
  }

  /* =======================================================
     AUTO-PREPARE CLASS OFFERINGS
     ======================================================= */

  try {
    await ensureClassOfferings(
      supabase,
      semesterId,
      programIds,
      sectionIds
    )
  } catch (error: any) {
    console.error('Automatic offering preparation failed:', error)
    const code = String(error?.message ?? '')
    if (code === 'no_active_curricula' || code === 'no_curriculum_subjects' || code === 'invalid_semester_term') {
      redirect(`/admin/schedule-builder?error=${code}`)
    }
    redirect('/admin/schedule-builder?error=offering_prepare_failed')
  }

  /* =======================================================
     CLASS OFFERINGS
     ======================================================= */

  const {
    data: offeringData,
    error: offeringError,
  } = await supabase
    .from('class_offerings')
    .select(`
      id,
      semester_id,
      section_id,
      subject_id,
      faculty_id,
      required_weekly_hours,
      expected_students,
      status,

      subjects (
        id,
        code,
        name,
        units,
        lecture_hours,
        lab_hours,
        department_id,
        is_active
      ),

      sections (
        id,
        year_level_id,
        code,
        name,
        capacity
      )
    `)
    .eq('semester_id', semesterId)
    .in('section_id', sectionIds)

  if (offeringError) {
    console.error(
      'Class offerings lookup failed:',
      offeringError
    )

    redirect(
      '/admin/schedule-builder?error=offerings_load_failed'
    )
  }

  const offerings =
    (offeringData ?? []) as Offering[]

  if (!offerings.length) {
    redirect(
      '/admin/schedule-builder?error=no_class_offerings'
    )
  }

  /*
   * Faculty assignment is automatic. Existing manual assignments
   * are respected; only unassigned offerings are filled here.
   */
  try {
    await autoAssignFaculty(supabase, semesterId, offerings)
  } catch (error: any) {
    console.error('Automatic faculty assignment failed:', error)
    const message = String(error?.message ?? '')
    if (message.startsWith('no_qualified_faculty:')) {
      redirect('/admin/schedule-builder?error=no_qualified_faculty')
    }
    redirect('/admin/schedule-builder?error=faculty_assignment_failed')
  }

  /* =======================================================
     ROOMS
     ======================================================= */

  const {
    data: roomData,
    error: roomError,
  } = await supabase
    .from('rooms')
    .select(`
      id,
      code,
      name,
      capacity,
      room_type_id
    `)
    .eq('is_active', true)
    .order('capacity', {
      ascending: true,
    })

  if (
    roomError ||
    !roomData?.length
  ) {
    console.error(
      'Rooms lookup failed:',
      roomError
    )

    redirect(
      '/admin/schedule-builder?error=no_rooms'
    )
  }

  const rooms =
    roomData as Room[]

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const facultyIds = [
    ...new Set(
      offerings
        .map(
          offering =>
            offering.faculty_id
        )
        .filter(Boolean)
    ),
  ] as string[]

  const roomIds =
    rooms.map(room => room.id)

  const [
    facultyAvailabilityResult,
    roomAvailabilityResult,
  ] = await Promise.all([
    facultyIds.length
      ? supabase
          .from(
            'faculty_availability'
          )
          .select(`
            faculty_id,
            day_of_week,
            start_time,
            end_time,
            availability_type
          `)
          .eq(
            'semester_id',
            semesterId
          )
          .in(
            'faculty_id',
            facultyIds
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    roomIds.length
      ? supabase
          .from('room_availability')
          .select(`
            room_id,
            day_of_week,
            start_time,
            end_time,
            status
          `)
          .eq(
            'semester_id',
            semesterId
          )
          .in('room_id', roomIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ])

  if (
    facultyAvailabilityResult.error
  ) {
    console.error(
      'Faculty availability failed:',
      facultyAvailabilityResult.error
    )

    redirect(
      '/admin/schedule-builder?error=faculty_availability_failed'
    )
  }

  if (
    roomAvailabilityResult.error
  ) {
    console.error(
      'Room availability failed:',
      roomAvailabilityResult.error
    )

    redirect(
      '/admin/schedule-builder?error=room_availability_failed'
    )
  }

  const facultyAvailability =
    facultyAvailabilityResult.data ??
    []

  const roomAvailability =
    roomAvailabilityResult.data ??
    []

  /* =======================================================
     BUILD SESSION REQUIREMENTS
     ======================================================= */

  const requirements:
    SessionRequirement[] = []

  for (const offering of offerings) {
    const subjectRelation =
      offering.subjects

    const subject =
      Array.isArray(
        subjectRelation
      )
        ? subjectRelation[0]
        : subjectRelation

    if (!subject) {
      continue
    }

    const lectureHours =
      Number(
        subject.lecture_hours ?? 0
      )

    const labHours =
      Number(
        subject.lab_hours ?? 0
      )

    const expectedStudents =
      Number(
        offering.expected_students ??
          0
      )

    const lectureSessions =
      splitLectureHours(
        lectureHours
      )

    const labSessions =
      splitLabHours(labHours)

    for (
      const durationMinutes
      of lectureSessions
    ) {
      requirements.push({
        offering,
        entryType: 'lecture',
        durationMinutes,
        expectedStudents,
      })
    }

    for (
      const durationMinutes
      of labSessions
    ) {
      requirements.push({
        offering,
        entryType: 'lab',
        durationMinutes,
        expectedStudents,
      })
    }

    /*
     * Fallback:
     * If subject has no lecture/lab hours,
     * use class_offerings.required_weekly_hours.
     */
    if (
      !lectureSessions.length &&
      !labSessions.length
    ) {
      const fallbackHours =
        Number(
          offering.required_weekly_hours ??
            0
        )

      for (
        const durationMinutes
        of splitLectureHours(
          fallbackHours
        )
      ) {
        requirements.push({
          offering,
          entryType: 'lecture',
          durationMinutes,
          expectedStudents,
        })
      }
    }
  }

  if (!requirements.length) {
    redirect(
      '/admin/schedule-builder?error=no_schedulable_hours'
    )
  }

  /*
   * Harder classes first:
   *
   * 1. Labs
   * 2. Larger classes
   * 3. Longer sessions
   *
   * This reduces the chance that difficult
   * requirements are left until the end.
   */
  requirements.sort(
    (a, b) => {
      if (
        a.entryType !==
        b.entryType
      ) {
        return a.entryType ===
          'lab'
          ? -1
          : 1
      }

      if (
        a.expectedStudents !==
        b.expectedStudents
      ) {
        return (
          b.expectedStudents -
          a.expectedStudents
        )
      }

      return (
        b.durationMinutes -
        a.durationMinutes
      )
    }
  )

  /* =======================================================
     GENERATION
     ======================================================= */

  const generated:
    GeneratedEntry[] = []

  const failed:
    SessionRequirement[] = []

  /*
   * Monday -> Saturday
   *
   * day_of_week:
   * 1 = Monday
   * 2 = Tuesday
   * ...
   * 6 = Saturday
   */
  const days = [1, 2, 3, 4, 5, 6]

  /*
   * Classes may start every 30 minutes.
   *
   * Earliest: 7:00 AM
   * Latest ending: 7:00 PM
   */
  const dayStart = 7 * 60
  const dayEnd = 19 * 60
  const interval = 30

  for (
    const requirement
    of requirements
  ) {
    let placed = false

    const offering =
      requirement.offering

    /*
     * Try unused days first for split
     * meetings of the same subject.
     */
    const orderedDays = [
      ...days.filter(
        day =>
          !alreadyUsedDayForOffering(
            offering.id,
            day,
            generated
          )
      ),

      ...days.filter(
        day =>
          alreadyUsedDayForOffering(
            offering.id,
            day,
            generated
          )
      ),
    ]

    for (
      const day of orderedDays
    ) {
      if (placed) {
        break
      }

      for (
        let start = dayStart;
        start +
          requirement.durationMinutes <=
        dayEnd;
        start += interval
      ) {
        if (placed) {
          break
        }

        const end =
          start +
          requirement.durationMinutes

        const startTime =
          minutesToTime(start)

        const endTime =
          minutesToTime(end)

        /*
         * Faculty availability first.
         */
        if (
          !facultyAllowsSlot(
            offering.faculty_id,
            day,
            startTime,
            endTime,
            facultyAvailability
          )
        ) {
          continue
        }

        /*
         * Find suitable rooms.
         *
         * Smallest sufficient room first
         * because rooms are sorted by capacity.
         */
        const candidateRooms =
          rooms.filter(room => {
            if (
              requirement.expectedStudents >
                0 &&
              room.capacity <
                requirement.expectedStudents
            ) {
              return false
            }

            return roomAllowsSlot(
              room.id,
              day,
              startTime,
              endTime,
              roomAvailability
            )
          })

        for (
          const room
          of candidateRooms
        ) {
          const candidate:
            GeneratedEntry = {
              class_offering_id:
                offering.id,

              faculty_id:
                offering.faculty_id,

              section_id:
                offering.section_id,

              room_id: room.id,

              day_of_week: day,

              start_time: startTime,

              end_time: endTime,

              entry_type:
                requirement.entryType,
            }

          if (
            hasGeneratedConflict(
              candidate,
              generated
            )
          ) {
            continue
          }

          generated.push(
            candidate
          )

          placed = true

          break
        }
      }
    }

    if (!placed) {
      failed.push(requirement)
    }
  }

  /*
   * We do NOT create a partial schedule.
   *
   * If even one required session cannot
   * be placed safely, report it first.
   */
  if (failed.length) {
    console.error(
      'Unplaced sessions:',
      failed.map(item => ({
        offering:
          item.offering.id,
        type: item.entryType,
        minutes:
          item.durationMinutes,
      }))
    )

    redirect(
      `/admin/schedule-builder?error=unplaced_sessions&count=${failed.length}`
    )
  }

  /* =======================================================
     CREATE SCHEDULE RECORDS
     ======================================================= */

  const academicYearRelation =
    (semester as any)
      .academic_years

  const academicYear =
    Array.isArray(
      academicYearRelation
    )
      ? academicYearRelation[0]
      : academicYearRelation

  const scopeTitle =
    selectedProgramId !== 'all'
      ? programScope[0]?.code ??
        'Program'
      : 'All Programs'

  const title =
    customTitle ||
    `${scopeTitle} Master Schedule - ${semester.name}${
      academicYear?.name
        ? ` ${academicYear.name}`
        : ''
    }`

  /*
   * schedules currently requires:
   *
   * department_id
   * program_id
   * year_level_id
   * section_id
   *
   * Because this schema was originally designed
   * for one-block schedules, a true All-Programs
   * master schedule cannot honestly be represented
   * by ONE schedules row.
   *
   * Therefore:
   * create one schedule/version per section,
   * all in ONE automatic generation run.
   *
   * This gives us a school-wide MASTER generation
   * while keeping the current database schema valid.
   */

  const sectionMap =
    new Map(
      (sections ?? []).map(
        section => [
          section.id,
          section,
        ]
      )
    )

  const yearMap =
    new Map(
      (yearLevels ?? []).map(
        year => [
          year.id,
          year,
        ]
      )
    )

  const programMap =
    new Map(
      programScope.map(
        program => [
          program.id,
          program,
        ]
      )
    )

  let schedulesCreated = 0
  let entriesCreated = 0

  /*
   * Only sections with generated entries need
   * schedule/version records.
   */
  const generatedSectionIds = [
    ...new Set(
      generated.map(
        entry =>
          entry.section_id
      )
    ),
  ]

  for (
    const sectionId
    of generatedSectionIds
  ) {
    const section =
      sectionMap.get(sectionId)

    if (!section) {
      continue
    }

    const year =
      yearMap.get(
        section.year_level_id
      )

    if (!year) {
      continue
    }

    const program =
      programMap.get(
        year.program_id
      )

    if (!program) {
      continue
    }

    const sectionEntries =
      generated.filter(
        entry =>
          entry.section_id ===
          sectionId
      )

    const scheduleTitle =
      `${program.code} ${year.name} - Block ${section.code} | ${semester.name}`

    /* -----------------------------------------------------
       SCHEDULE
       ----------------------------------------------------- */

    /*
     * Reuse the schedule row for the same semester/program/year/section
     * when a previous generation attempt already created it.
     * This prevents schedule_unique_scope failures after a partial run.
     */
    const {
      data: existingSchedule,
      error: existingScheduleError,
    } = await supabase
      .from('schedules')
      .select('id')
      .eq('semester_id', semesterId)
      .eq('department_id', program.department_id)
      .eq('program_id', program.id)
      .eq('year_level_id', year.id)
      .eq('section_id', section.id)
      .maybeSingle()

    if (existingScheduleError) {
      console.error(
        'Existing schedule lookup failed:',
        existingScheduleError
      )

      redirect(
        '/admin/schedule-builder?error=schedule_lookup_failed'
      )
    }

    let schedule = existingSchedule

    if (!schedule) {
      const {
        data: createdSchedule,
        error: scheduleError,
      } = await supabase
        .from('schedules')
        .insert({
          semester_id:
            semesterId,

          department_id:
            program.department_id,

          program_id:
            program.id,

          year_level_id:
            year.id,

          section_id:
            section.id,

          created_by:
            auth.profile.id,

          status: 'draft',

          title:
            scheduleTitle ||
            title,
        })
        .select('id')
        .single()

      if (
        scheduleError ||
        !createdSchedule
      ) {
        console.error(
          'Schedule insert failed:',
          scheduleError
        )

        redirect(
          '/admin/schedule-builder?error=schedule_create_failed'
        )
      }

      schedule = createdSchedule
    }

    /* -----------------------------------------------------
       VERSION
       ----------------------------------------------------- */

    const {
      data: latestVersion,
      error: latestVersionError,
    } = await supabase
      .from('schedule_versions')
      .select('version_number')
      .eq('schedule_id', schedule.id)
      .order('version_number', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (latestVersionError) {
      console.error(
        'Latest schedule version lookup failed:',
        latestVersionError
      )

      redirect(
        '/admin/schedule-builder?error=version_lookup_failed'
      )
    }

    const nextVersionNumber =
      Number(latestVersion?.version_number ?? 0) + 1

    const {
      data: version,
      error: versionError,
    } = await supabase
      .from('schedule_versions')
      .insert({
        schedule_id:
          schedule.id,

        version_number:
          nextVersionNumber,

        status: 'draft',

        created_by:
          auth.profile.id,

        change_reason:
          'Automatically generated by AlterSched Master Schedule Generator',
      })
      .select('id')
      .single()

    if (
      versionError ||
      !version
    ) {
      console.error(
        'Schedule version insert failed:',
        versionError
      )

      redirect(
        '/admin/schedule-builder?error=version_create_failed'
      )
    }

    /* -----------------------------------------------------
       ENTRIES
       ----------------------------------------------------- */

    const rows =
      sectionEntries.map(
        entry => ({
          schedule_version_id:
            version.id,

          class_offering_id:
            entry.class_offering_id,

          faculty_id:
            entry.faculty_id,

          section_id:
            entry.section_id,

          room_id:
            entry.room_id,

          day_of_week:
            entry.day_of_week,

          start_time:
            entry.start_time,

          end_time:
            entry.end_time,

          entry_type:
            'regular',
        })
      )

    const {
      error: entryError,
    } = await supabase
      .from('schedule_entries')
      .insert(rows)

    if (entryError) {
      console.error(
        'Schedule entries insert failed:',
        entryError
      )

      redirect(
        '/admin/schedule-builder?error=entries_create_failed'
      )
    }

    /* -----------------------------------------------------
       CURRENT VERSION
       ----------------------------------------------------- */

    const {
      error: currentVersionError,
    } = await supabase
      .from('schedules')
      .update({
        current_version_id:
          version.id,
      })
      .eq(
        'id',
        schedule.id
      )

    if (currentVersionError) {
      console.error(
        'Current version update failed:',
        currentVersionError
      )

      redirect(
        '/admin/schedule-builder?error=current_version_failed'
      )
    }

    schedulesCreated += 1
    entriesCreated +=
      rows.length
  }

  /* =======================================================
     FINISH
     ======================================================= */

  revalidatePath(
    '/admin/schedule-builder'
  )

  revalidatePath(
    '/admin/schedules'
  )

  redirect(
    `/admin/schedule-builder?success=master_generated&schedules=${schedulesCreated}&entries=${entriesCreated}`
  )
}
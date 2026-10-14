'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { one } from '@/lib/relations'
import { chooseInstructors, type QualifiedInstructor } from '@/lib/scheduling/assignment'
import { buildSessionRequirements } from '@/lib/scheduling/sessions'
import { loadSchedulingSettings, toSolverOptions } from '@/lib/scheduling/settings'
import { diagnoseUnplaced, type GenerationReport } from '@/lib/scheduling/diagnose'
import { resolveSolverWindow, solveTimetable } from '@/lib/scheduling/solver'
import type { Offering, Room } from '@/lib/scheduling/types'
import { getString } from '@/lib/form-data'
import { GENERATED_VERSION_NOTE } from '@/lib/format'

/* =========================================================
   AUTOMATIC PREPARATION + FACULTY ASSIGNMENT
   ========================================================= */

type Client = SupabaseClient<Database>
type BlockRow = { id: string; year_level_id: string; capacity: number | null }
type YearLevelRow = { id: string; program_id: string }
type ExpectedOffering = {
  semester_id: string
  section_id: string
  subject_id: string
  faculty_id: null
  required_weekly_hours: number
  expected_students: number | null
  status: 'active'
}

async function ensureClassOfferings(
  supabase: Client,
  semesterId: string,
  programIds: string[],
  sections: BlockRow[],
  yearLevels: YearLevelRow[],
  semesterTermOrder: number
) {
  if (!Number.isInteger(semesterTermOrder) || semesterTermOrder <= 0) {
    throw new Error('invalid_semester_term')
  }

  const sectionIds = sections.map((section) => section.id)

  if (!sectionIds.length) {
    throw new Error('no_sections')
  }

  const yearMap = new Map(yearLevels.map((year) => [year.id, year]))

  // Generation must be deterministic: exactly one active curriculum per program.
  const { data: activeCurricula, error: curriculumError } = await supabase
    .from('curricula')
    .select('id,program_id,name,is_active,created_at')
    .in('program_id', programIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (curriculumError) throw curriculumError

  const curriculaByProgram = new Map<string, NonNullable<typeof activeCurricula>>()

  for (const curriculum of activeCurricula ?? []) {
    const list = curriculaByProgram.get(curriculum.program_id) ?? []
    list.push(curriculum)
    curriculaByProgram.set(curriculum.program_id, list)
  }

  for (const programId of programIds) {
    const list = curriculaByProgram.get(programId) ?? []

    if (!list.length) {
      throw new Error(`no_active_curriculum:${programId}`)
    }

    if (list.length > 1) {
      throw new Error(`multiple_active_curricula:${programId}`)
    }
  }

  const curriculumIds = (activeCurricula ?? []).map((item) => item.id)

  const { data: curriculumRows, error: curriculumSubjectError } = await supabase
    .from('curriculum_subjects')
    .select(
      `
        id,
        curriculum_id,
        subject_id,
        year_level_id,
        term_order,
        required_room_type_id,
        weekly_hours
      `
    )
    .in('curriculum_id', curriculumIds)
    .eq('term_order', semesterTermOrder)

  if (curriculumSubjectError) throw curriculumSubjectError

  const curriculumIdByProgram = new Map<string, string>()

  for (const curriculum of activeCurricula ?? []) {
    curriculumIdByProgram.set(curriculum.program_id, curriculum.id)
  }

  const validCurriculumRows = (curriculumRows ?? []).filter((row) => {
    const year = yearMap.get(row.year_level_id)
    if (!year) return false

    return curriculumIdByProgram.get(year.program_id) === row.curriculum_id
  })

  if (!validCurriculumRows.length) {
    throw new Error('no_curriculum_subjects')
  }

  const rowsByYear = new Map<string, typeof validCurriculumRows>()

  for (const row of validCurriculumRows) {
    const list = rowsByYear.get(row.year_level_id) ?? []
    list.push(row)
    rowsByYear.set(row.year_level_id, list)
  }

  // Every active block gets every required subject for its year + semester.
  const expected: ExpectedOffering[] = []

  for (const section of sections) {
    const rows = rowsByYear.get(section.year_level_id) ?? []

    // A year level with no curriculum subjects for this term (e.g. only
    // 1st Year has been encoded so far) is skipped instead of aborting the
    // whole department run. Generation still fails below if *no* block has
    // any subject.
    if (!rows.length) {
      continue
    }

    for (const row of rows) {
      expected.push({
        semester_id: semesterId,
        section_id: section.id,
        subject_id: row.subject_id,
        faculty_id: null,
        required_weekly_hours: Number(row.weekly_hours),
        expected_students: Number(section.capacity ?? 0) > 0 ? Number(section.capacity) : null,
        status: 'active',
      })
    }
  }

  if (!expected.length) {
    throw new Error('no_curriculum_subjects')
  }

  const { data: existing, error: existingError } = await supabase
    .from('class_offerings')
    .select(
      `
      id,
      semester_id,
      section_id,
      subject_id,
      faculty_id,
      required_weekly_hours,
      expected_students,
      status
    `
    )
    .eq('semester_id', semesterId)
    .in('section_id', sectionIds)

  if (existingError) throw existingError

  const existingMap = new Map(
    (existing ?? []).map((item) => [`${item.section_id}:${item.subject_id}`, item])
  )

  const expectedKeys = new Set(expected.map((item) => `${item.section_id}:${item.subject_id}`))

  // New offerings in one insert; existing ones are only updated when their hours/size changed,
  // so instructor assignments are never touched here.
  const toInsert = expected.filter((row) => !existingMap.has(`${row.section_id}:${row.subject_id}`))
  if (toInsert.length) {
    const { error } = await supabase.from('class_offerings').insert(toInsert)
    if (error) throw error
  }

  for (const row of expected) {
    const current = existingMap.get(`${row.section_id}:${row.subject_id}`)
    if (
      !current ||
      (Number(current.required_weekly_hours) === row.required_weekly_hours &&
        (current.expected_students ?? null) === row.expected_students &&
        current.status === 'active')
    ) {
      continue
    }
    const { error } = await supabase
      .from('class_offerings')
      .update({
        required_weekly_hours: row.required_weekly_hours,
        expected_students: row.expected_students,
        status: 'active',
      })
      .eq('id', current.id)
    if (error) throw error
  }

  // Preserve history: obsolete offerings are inactivated, never deleted.
  const obsoleteIds = (existing ?? [])
    .filter(
      (current) =>
        current.status === 'active' &&
        !expectedKeys.has(`${current.section_id}:${current.subject_id}`)
    )
    .map((current) => current.id)
  if (obsoleteIds.length) {
    const { error } = await supabase
      .from('class_offerings')
      .update({ status: 'inactive' })
      .in('id', obsoleteIds)
    if (error) throw error
  }

  // class_offerings has no room-type column, so carry this in memory.
  const roomTypeBySectionSubject = new Map<string, string | null>()

  for (const section of sections) {
    const rows = rowsByYear.get(section.year_level_id) ?? []

    for (const row of rows) {
      roomTypeBySectionSubject.set(
        `${section.id}:${row.subject_id}`,
        row.required_room_type_id ?? null
      )
    }
  }

  return roomTypeBySectionSubject
}

async function autoAssignFaculty(supabase: Client, semesterId: string, offerings: Offering[]) {
  const unassigned = offerings.filter((item) => !item.faculty_id)
  if (!unassigned.length) return offerings

  const subjectIds = [...new Set(unassigned.map((item) => item.subject_id))]

  const [qualificationsResult, subjectsResult, assignedResult] = await Promise.all([
    supabase
      .from('faculty_subjects')
      .select(
        'faculty_id, subject_id, faculty_profiles(id, max_teaching_load, profiles(account_status))'
      )
      .in('subject_id', subjectIds),
    // Admin can pick a default instructor per subject (Subject Catalog); it is preferred.
    supabase.from('subjects').select('id, default_faculty_id').in('id', subjectIds),
    supabase
      .from('class_offerings')
      .select('faculty_id, required_weekly_hours')
      .eq('semester_id', semesterId)
      .not('faculty_id', 'is', null),
  ])
  for (const result of [qualificationsResult, subjectsResult, assignedResult]) {
    if (result.error) throw result.error
  }

  const currentLoad = new Map<string, number>()
  for (const item of assignedResult.data ?? []) {
    if (!item.faculty_id) continue
    currentLoad.set(
      item.faculty_id,
      (currentLoad.get(item.faculty_id) ?? 0) + Number(item.required_weekly_hours ?? 0)
    )
  }

  const qualifiedBySubject = new Map<string, QualifiedInstructor[]>()
  for (const row of qualificationsResult.data ?? []) {
    const faculty = one(row.faculty_profiles)
    const profile = one(faculty?.profiles)
    if (!faculty || (profile?.account_status && profile.account_status !== 'approved')) continue
    const list = qualifiedBySubject.get(row.subject_id) ?? []
    list.push({ id: row.faculty_id, maxLoad: Number(faculty.max_teaching_load ?? 0) })
    qualifiedBySubject.set(row.subject_id, list)
  }

  const defaults = new Map<string, string>()
  for (const subject of subjectsResult.data ?? []) {
    if (subject.default_faculty_id) defaults.set(subject.id, subject.default_faculty_id)
  }

  const assignments = chooseInstructors(unassigned, qualifiedBySubject, currentLoad, defaults)

  // One update per instructor instead of one per class offering.
  const offeringsByFaculty = new Map<string, string[]>()
  for (const { offeringId, facultyId } of assignments) {
    offeringsByFaculty.set(facultyId, [...(offeringsByFaculty.get(facultyId) ?? []), offeringId])
  }
  for (const [facultyId, offeringIds] of offeringsByFaculty) {
    const { error } = await supabase
      .from('class_offerings')
      .update({ faculty_id: facultyId, assignment_mode: 'auto' })
      .in('id', offeringIds)
      .is('faculty_id', null)
    if (error) throw error
  }

  const chosen = new Map(assignments.map((item) => [item.offeringId, item.facultyId]))
  for (const offering of offerings) {
    if (!offering.faculty_id && chosen.has(offering.id))
      offering.faculty_id = chosen.get(offering.id)!
  }
  return offerings
}

/* =========================================================
   MAIN MASTER GENERATOR
   ========================================================= */

/** Returned to the form when some classes cannot be placed (nothing is saved). */
export type GenerateState = { report: GenerationReport; createdAt: number } | null

/** Names used in the explanation of classes that could not be placed. */
async function loadReportNames(supabase: Client, facultyIds: string[]) {
  const [faculty, roomTypes] = await Promise.all([
    facultyIds.length
      ? supabase.from('faculty_profiles').select('id, profiles(full_name)').in('id', facultyIds)
      : Promise.resolve({ data: [] as { id: string; profiles: unknown }[] }),
    supabase.from('room_types').select('id, name'),
  ])
  const instructors = new Map<string, string>()
  for (const row of faculty.data ?? []) {
    const profile = one(row.profiles as { full_name: string | null } | null)
    instructors.set(row.id, profile?.full_name || 'Unnamed instructor')
  }
  const types = new Map((roomTypes.data ?? []).map((row) => [row.id, row.name]))
  return {
    instructorName: (id: string) => instructors.get(id) ?? 'Unnamed instructor',
    roomTypeName: (id: string) => types.get(id) ?? 'required',
  }
}

export async function generateMasterSchedule(
  _previous: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const auth = await requireRole(['department_scheduler'])
  const semesterId = getString(formData, 'semester_id')

  /*
   * Empty / "all" means ALL programs.
   */

  const selectedProgramId = String(formData.get('program_id') ?? 'all').trim()
  const customTitle = getString(formData, 'title')

  if (!semesterId) {
    redirect('/scheduler/schedule-builder?error=semester_required')
  }

  const supabase = await createClient()

  /* =======================================================
     SEMESTER
     ======================================================= */

  const { data: semester, error: semesterError } = await supabase
    .from('semesters')
    .select(
      `
      id,
      name,
      academic_year_id,
      term_order,
      is_active,
      academic_years (
        id,
        name
      )
    `
    )
    .eq('id', semesterId)
    .maybeSingle()

  if (semesterError || !semester) {
    console.error('Semester lookup failed:', semesterError)
    redirect('/scheduler/schedule-builder?error=semester_not_found')
  }

  /* =======================================================
     PROGRAM SCOPE
     ======================================================= */

  let programScope: Pick<
    Tables<'programs'>,
    'id' | 'code' | 'name' | 'department_id' | 'is_active'
  >[] = []

  if (selectedProgramId && selectedProgramId !== 'all') {
    const { data: program, error } = await supabase
      .from('programs')
      .select(
        `
        id,
        code,
        name,
        department_id,
        is_active
      `
      )
      .eq('id', selectedProgramId)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !program) {
      console.error('Program lookup failed:', error)
      redirect('/scheduler/schedule-builder?error=program_not_found')
    }

    programScope = [program]
  } else {
    const { data, error } = await supabase
      .from('programs')
      .select(
        `
        id,
        code,
        name,
        department_id,
        is_active
      `
      )
      .eq('is_active', true)

    if (error) {
      console.error('Programs lookup failed:', error)
      redirect('/scheduler/schedule-builder?error=program_load_failed')
    }

    programScope = (data ?? []).filter(
      (program) => String(program.code ?? '').toUpperCase() === 'BSIT'
    )
  }

  // Panel scope: AlterSched now generates the College of Computer Studies / BSIT schedule only.

  programScope = programScope.filter(
    (program) => String(program.code ?? '').toUpperCase() === 'BSIT'
  )

  if (!programScope.length) {
    redirect('/scheduler/schedule-builder?error=no_programs')
  }

  const programIds = programScope.map((program) => program.id)

  /* =======================================================
     YEAR LEVELS
     ======================================================= */

  const { data: yearLevels, error: yearError } = await supabase
    .from('year_levels')
    .select(
      `
      id,
      program_id,
      name
    `
    )
    .in('program_id', programIds)

  if (yearError) {
    console.error('Year level lookup failed:', yearError)
    redirect('/scheduler/schedule-builder?error=structure_load_failed')
  }

  const yearLevelIds = (yearLevels ?? []).map((year) => year.id)

  if (!yearLevelIds.length) {
    redirect('/scheduler/schedule-builder?error=no_year_levels')
  }

  /* =======================================================
     SECTIONS / BLOCKS
     ======================================================= */

  const { data: sections, error: sectionError } = await supabase
    .from('sections')
    .select(
      `
      id,
      year_level_id,
      code,
      name,
      capacity,
      is_active
    `
    )
    .in('year_level_id', yearLevelIds)
    .eq('is_active', true)

  if (sectionError) {
    console.error('Sections lookup failed:', sectionError)
    redirect('/scheduler/schedule-builder?error=section_load_failed')
  }

  const sectionIds = (sections ?? []).map((section) => section.id)

  if (!sectionIds.length) {
    redirect('/scheduler/schedule-builder?error=no_sections')
  }

  /* =======================================================
     AUTO-PREPARE CLASS OFFERINGS
     ======================================================= */

  let curriculumRoomTypeMap = new Map<string, string | null>()

  try {
    curriculumRoomTypeMap = await ensureClassOfferings(
      supabase,
      semesterId,
      programIds,
      sections ?? [],
      yearLevels ?? [],
      Number(semester.term_order)
    )
  } catch (error) {
    console.error('Automatic offering preparation failed:', error)
    const code = error instanceof Error ? error.message : ''

    if (code === 'invalid_semester_term') {
      redirect('/scheduler/schedule-builder?error=invalid_semester_term')
    }

    if (code.startsWith('no_active_curriculum:')) {
      redirect('/scheduler/schedule-builder?error=no_active_curriculum')
    }

    if (code.startsWith('multiple_active_curricula:')) {
      redirect('/scheduler/schedule-builder?error=multiple_active_curricula')
    }

    if (code === 'no_curriculum_subjects' || code.startsWith('no_curriculum_subjects_for_year:')) {
      redirect('/scheduler/schedule-builder?error=no_curriculum_subjects')
    }

    redirect('/scheduler/schedule-builder?error=offering_prepare_failed')
  }

  /* =======================================================
     CLASS OFFERINGS
     ======================================================= */

  const { data: offeringData, error: offeringError } = await supabase
    .from('class_offerings')
    .select(
      `
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
        is_active,
        default_room_type_id
      ),
      sections (
        id,
        year_level_id,
        code,
        name,
        capacity
      )
    `
    )
    .eq('semester_id', semesterId)
    .in('section_id', sectionIds)
    .eq('status', 'active')

  if (offeringError) {
    console.error('Class offerings lookup failed:', offeringError)
    redirect('/scheduler/schedule-builder?error=offerings_load_failed')
  }

  const offerings = ((offeringData ?? []) as Offering[]).map((offering) => ({
    ...offering,
    curriculum_required_room_type_id:
      curriculumRoomTypeMap.get(`${offering.section_id}:${offering.subject_id}`) ?? null,
  }))

  if (!offerings.length) {
    redirect('/scheduler/schedule-builder?error=no_class_offerings')
  }

  /*
   * Faculty assignment is automatic. Existing manual assignments
   * are respected; only unassigned offerings are filled here.
   */

  try {
    await autoAssignFaculty(supabase, semesterId, offerings)
  } catch (error) {
    console.error('Automatic faculty assignment failed:', error)
    redirect('/scheduler/schedule-builder?error=faculty_assignment_failed')
  }

  /* =======================================================
     ROOMS
     ======================================================= */

  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select(
      `
      id,
      code,
      name,
      capacity,
      room_type_id
    `
    )
    .eq('is_active', true)
    .order('capacity', {
      ascending: true,
    })

  if (roomError || !roomData?.length) {
    console.error('Rooms lookup failed:', roomError)
    redirect('/scheduler/schedule-builder?error=no_rooms')
  }

  const rooms = roomData as Room[]

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const facultyIds = [
    ...new Set(offerings.map((offering) => offering.faculty_id).filter(Boolean)),
  ] as string[]

  const roomIds = rooms.map((room) => room.id)

  const [facultyAvailabilityResult, roomAvailabilityResult] = await Promise.all([
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

  if (facultyAvailabilityResult.error) {
    console.error('Faculty availability failed:', facultyAvailabilityResult.error)
    redirect('/scheduler/schedule-builder?error=faculty_availability_failed')
  }

  if (roomAvailabilityResult.error) {
    console.error('Room availability failed:', roomAvailabilityResult.error)
    redirect('/scheduler/schedule-builder?error=room_availability_failed')
  }

  const facultyAvailability = facultyAvailabilityResult.data ?? []
  const roomAvailability = roomAvailabilityResult.data ?? []

  /* =======================================================
     PLACE SESSIONS (lib/scheduling)
     ======================================================= */

  const requirements = buildSessionRequirements(offerings)

  if (!requirements.length) {
    redirect('/scheduler/schedule-builder?error=no_schedulable_hours')
  }

  const schedulingSettings = await loadSchedulingSettings(supabase)
  const solution = solveTimetable(
    requirements,
    rooms,
    facultyAvailability,
    roomAvailability,
    toSolverOptions(schedulingSettings)
  )
  const generated = solution.entries

  if (!solution.complete) {
    // Nothing is saved; explain which classes do not fit and why.
    const facultyIdsInScope = [
      ...new Set(requirements.map((item) => item.offering.faculty_id).filter(Boolean)),
    ] as string[]
    const report = diagnoseUnplaced({
      requirements,
      stuck: solution.stuck,
      attempt: solution.attempt,
      rooms,
      facultyAvailability,
      roomAvailability,
      window: resolveSolverWindow(toSolverOptions(schedulingSettings)),
      ...(await loadReportNames(supabase, facultyIdsInScope)),
    })
    return { report, createdAt: Date.now() }
  }

  /* =======================================================
      CREATE SCHEDULE RECORDS
      ======================================================= */

  const academicYear = one(semester.academic_years)

  const scopeTitle =
    selectedProgramId !== 'all' ? (programScope[0]?.code ?? 'Program') : 'All Programs'

  const title =
    customTitle ||
    `${scopeTitle} Master Schedule - ${semester.name}${
      academicYear?.name ? ` ${academicYear.name}` : ''
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

  const sectionMap = new Map((sections ?? []).map((section) => [section.id, section]))
  const yearMap = new Map((yearLevels ?? []).map((year) => [year.id, year]))
  const programMap = new Map(programScope.map((program) => [program.id, program]))
  let schedulesCreated = 0
  let entriesCreated = 0

  /*
   * Only sections with generated entries need
   * schedule/version records.
   */

  const generatedSectionIds = [...new Set(generated.map((entry) => entry.section_id))]

  for (const sectionId of generatedSectionIds) {
    const section = sectionMap.get(sectionId)

    if (!section) {
      continue
    }

    const year = yearMap.get(section.year_level_id)

    if (!year) {
      continue
    }

    const program = programMap.get(year.program_id)

    if (!program) {
      continue
    }

    const sectionEntries = generated.filter((entry) => entry.section_id === sectionId)
    const scheduleTitle = `${program.code} ${year.name} - Block ${section.code} | ${semester.name}`

    /* -----------------------------------------------------
       SCHEDULE
       ----------------------------------------------------- */

    /*
     * Reuse the schedule row for the same semester/program/year/section
     * when a previous generation attempt already created it.
     * This prevents schedule_unique_scope failures after a partial run.
     */

    const { data: existingSchedule, error: existingScheduleError } = await supabase
      .from('schedules')
      .select('id')
      .eq('semester_id', semesterId)
      .eq('department_id', program.department_id)
      .eq('program_id', program.id)
      .eq('year_level_id', year.id)
      .eq('section_id', section.id)
      .maybeSingle()

    if (existingScheduleError) {
      console.error('Existing schedule lookup failed:', existingScheduleError)
      redirect('/scheduler/schedule-builder?error=schedule_lookup_failed')
    }

    let schedule = existingSchedule

    if (!schedule) {
      const { data: createdSchedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          semester_id: semesterId,
          department_id: program.department_id,
          program_id: program.id,
          year_level_id: year.id,
          section_id: section.id,
          created_by: auth.profile.id,
          status: 'draft',
          title: scheduleTitle || title,
        })
        .select('id')
        .single()

      if (scheduleError || !createdSchedule) {
        console.error('Schedule insert failed:', scheduleError)
        redirect('/scheduler/schedule-builder?error=schedule_create_failed')
      }

      schedule = createdSchedule
    }

    /* -----------------------------------------------------
       VERSION
       ----------------------------------------------------- */

    const { data: latestVersion, error: latestVersionError } = await supabase
      .from('schedule_versions')
      .select('version_number')
      .eq('schedule_id', schedule.id)
      .order('version_number', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (latestVersionError) {
      console.error('Latest schedule version lookup failed:', latestVersionError)
      redirect('/scheduler/schedule-builder?error=version_lookup_failed')
    }

    const nextVersionNumber = Number(latestVersion?.version_number ?? 0) + 1

    const { data: version, error: versionError } = await supabase
      .from('schedule_versions')
      .insert({
        schedule_id: schedule.id,
        version_number: nextVersionNumber,
        status: 'draft',
        created_by: auth.profile.id,
        change_reason: GENERATED_VERSION_NOTE,
      })
      .select('id')
      .single()

    if (versionError || !version) {
      console.error('Schedule version insert failed:', versionError)
      redirect('/scheduler/schedule-builder?error=version_create_failed')
    }

    /* -----------------------------------------------------
       ENTRIES
       ----------------------------------------------------- */

    const rows = sectionEntries.map((entry) => ({
      schedule_version_id: version.id,
      class_offering_id: entry.class_offering_id,
      faculty_id: entry.faculty_id,
      section_id: entry.section_id,
      room_id: entry.room_id,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      entry_type: 'regular',
      session_type: entry.entry_type,
      delivery_mode: 'onsite',
    }))

    const { error: entryError } = await supabase.from('schedule_entries').insert(rows)

    if (entryError) {
      console.error('Schedule entries insert failed:', entryError)
      redirect('/scheduler/schedule-builder?error=entries_create_failed')
    }

    /* -----------------------------------------------------
       CURRENT VERSION
       ----------------------------------------------------- */

    const { error: currentVersionError } = await supabase
      .from('schedules')
      .update({
        current_version_id: version.id,
        // A newly generated version is a working draft. Without this, regenerating a
        // published schedule left status='published', so the new draft had no
        // Review/Submit actions. The official timetable stays visible through
        // published_version_id until the new version is published.
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id)

    if (currentVersionError) {
      console.error('Current version update failed:', currentVersionError)
      redirect('/scheduler/schedule-builder?error=current_version_failed')
    }

    schedulesCreated += 1
    entriesCreated += rows.length
  }

  /* =======================================================
     FINISH
     ======================================================= */

  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/schedules')

  redirect(
    `/scheduler/schedule-builder?success=master_generated&schedules=${schedulesCreated}&entries=${entriesCreated}`
  )
}

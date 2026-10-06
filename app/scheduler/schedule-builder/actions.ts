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
  curriculum_required_room_type_id?: string | null
  subjects?: SubjectSummary | SubjectSummary[] | null
  sections?: SectionSummary | SectionSummary[] | null
}

type SubjectSummary = {
  id?: string
  code?: string
  name?: string
  units?: number | string | null
  lecture_hours?: number | string | null
  lab_hours?: number | string | null
  default_room_type_id?: string | null
  [key: string]: unknown
}

type SectionSummary = {
  id?: string
  code?: string
  name?: string
  [key: string]: unknown
}

type FacultyAvailabilityRecord = {
  faculty_id: string
  day_of_week: number | string
  availability_type?: string
  start_time: string
  end_time: string
}

type RoomAvailabilityRecord = {
  room_id: string
  day_of_week: number | string
  status?: string
  start_time: string
  end_time: string
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



  requiredRoomTypeId: string | null



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



  availability: FacultyAvailabilityRecord[]



) {



  if (!facultyId) {



    return false



  }







  const records = availability.filter(



    (item: FacultyAvailabilityRecord) =>



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



      (item: FacultyAvailabilityRecord) =>



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



      (item: FacultyAvailabilityRecord) =>



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



    (item: FacultyAvailabilityRecord) =>



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



  availability: RoomAvailabilityRecord[]



) {



  const records = availability.filter(



    (item: RoomAvailabilityRecord) =>



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



      (item: RoomAvailabilityRecord) =>



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



      (item: RoomAvailabilityRecord) =>



        item.status === 'available'



    )







  if (!available.length) {



    return true



  }







  return available.some(



    (item: RoomAvailabilityRecord) =>



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

   SMART SCHEDULING HELPERS

   ========================================================= */



function alreadyUsedDayForOffering(

  offeringId: string,

  day: number,

  generated: GeneratedEntry[]

) {

  return generated.some(

    entry =>

      entry.class_offering_id === offeringId &&

      entry.day_of_week === day

  )

}



function scheduleGapMinutes(

  startA: string,

  endA: string,

  startB: string,

  endB: string

) {

  const aStart = timeToMinutes(startA)

  const aEnd = timeToMinutes(endA)

  const bStart = timeToMinutes(startB)

  const bEnd = timeToMinutes(endB)



  if (aEnd <= bStart) return bStart - aEnd

  if (bEnd <= aStart) return aStart - bEnd

  return 0

}



type ScoredCandidate = {

  entry: GeneratedEntry

  score: number

}



function scoreScheduleCandidate(

  candidate: GeneratedEntry,

  generated: GeneratedEntry[],

  room: Room,

  requirement: SessionRequirement,

  facultyAvailability: any[]

) {

  let score = 0

  const candidateStart = timeToMinutes(candidate.start_time)



  // Spread multiple meetings of the same offering across different days.

  if (

    alreadyUsedDayForOffering(

      candidate.class_offering_id,

      candidate.day_of_week,

      generated

    )

  ) {

    score += 500

  }



  // Prefer the smallest sufficient room.

  if (requirement.expectedStudents > 0) {

    score +=

      Math.max(

        0,

        Number(room.capacity ?? 0) - requirement.expectedStudents

      ) * 0.5

  }



  // Reward an instructor's explicitly preferred time window.

  if (candidate.faculty_id) {

    const preferred = facultyAvailability.some(

      (item: any) =>

        item.faculty_id === candidate.faculty_id &&

        Number(item.day_of_week) === candidate.day_of_week &&

        item.availability_type === 'preferred' &&

        timeToMinutes(candidate.start_time) >=

          timeToMinutes(item.start_time) &&

        timeToMinutes(candidate.end_time) <=

          timeToMinutes(item.end_time)

    )



    if (preferred) score -= 120

  }



  // Keep an instructor's same-day teaching schedule reasonably compact.

  if (candidate.faculty_id) {

    for (const entry of generated) {

      if (

        entry.day_of_week !== candidate.day_of_week ||

        entry.faculty_id !== candidate.faculty_id

      ) {

        continue

      }



      const gap = scheduleGapMinutes(

        candidate.start_time,

        candidate.end_time,

        entry.start_time,

        entry.end_time

      )



      if (gap > 180) score += 60

      else if (gap > 120) score += 35

      else if (gap > 60) score += 15

      else if (gap > 0 && gap <= 30) score -= 15

    }

  }



  // Keep each block's same-day schedule reasonably compact.

  for (const entry of generated) {

    if (

      entry.day_of_week !== candidate.day_of_week ||

      entry.section_id !== candidate.section_id

    ) {

      continue

    }



    const gap = scheduleGapMinutes(

      candidate.start_time,

      candidate.end_time,

      entry.start_time,

      entry.end_time

    )



    if (gap > 180) score += 80

    else if (gap > 120) score += 45

    else if (gap > 60) score += 20

    else if (gap > 0 && gap <= 30) score -= 20

  }



  // Prefer daytime slots while still allowing evening classes when needed.

  if (candidateStart >= 19 * 60) score += 50

  else if (candidateStart >= 18 * 60) score += 25



  return score

}



/* =========================================================



   AUTOMATIC PREPARATION + FACULTY ASSIGNMENT



   ========================================================= */







async function ensureClassOfferings(
  supabase: any,
  semesterId: string,
  programIds: string[],
  sections: any[],
  yearLevels: any[],
  semesterTermOrder: number
) {
  if (!Number.isInteger(semesterTermOrder) || semesterTermOrder <= 0) {
    throw new Error('invalid_semester_term')
  }

  const sectionIds = sections.map((section: any) => section.id)

  if (!sectionIds.length) {
    throw new Error('no_sections')
  }

  const yearMap = new Map(
    yearLevels.map((year: any) => [year.id, year])
  )

  // Generation must be deterministic: exactly one active curriculum per program.
  const { data: activeCurricula, error: curriculumError } = await supabase
    .from('curricula')
    .select('id,program_id,name,is_active,created_at')
    .in('program_id', programIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (curriculumError) throw curriculumError

  const curriculaByProgram = new Map<string, any[]>()

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

  const curriculumIds = (activeCurricula ?? []).map(
    (item: any) => item.id
  )

  const { data: curriculumRows, error: curriculumSubjectError } =
    await supabase
      .from('curriculum_subjects')
      .select(`
        id,
        curriculum_id,
        subject_id,
        year_level_id,
        term_order,
        required_room_type_id,
        weekly_hours
      `)
      .in('curriculum_id', curriculumIds)
      .eq('term_order', semesterTermOrder)

  if (curriculumSubjectError) throw curriculumSubjectError

  const curriculumIdByProgram = new Map<string, string>()

  for (const curriculum of activeCurricula ?? []) {
    curriculumIdByProgram.set(curriculum.program_id, curriculum.id)
  }

  const validCurriculumRows = (curriculumRows ?? []).filter((row: any) => {
    const year: any = yearMap.get(row.year_level_id)
    if (!year) return false

    return (
      curriculumIdByProgram.get(year.program_id) === row.curriculum_id
    )
  })

  if (!validCurriculumRows.length) {
    throw new Error('no_curriculum_subjects')
  }

  const rowsByYear = new Map<string, any[]>()

  for (const row of validCurriculumRows) {
    const list = rowsByYear.get(row.year_level_id) ?? []
    list.push(row)
    rowsByYear.set(row.year_level_id, list)
  }

  // Every active block gets every required subject for its year + semester.
  const expected: any[] = []

  for (const section of sections) {
    const rows = rowsByYear.get(section.year_level_id) ?? []

    if (!rows.length) {
      throw new Error(
        `no_curriculum_subjects_for_year:${section.year_level_id}`
      )
    }

    for (const row of rows) {
      expected.push({
        semester_id: semesterId,
        section_id: section.id,
        subject_id: row.subject_id,
        faculty_id: null,
        required_weekly_hours: Number(row.weekly_hours),
        expected_students:
          Number(section.capacity ?? 0) > 0
            ? Number(section.capacity)
            : null,
        status: 'active',
      })
    }
  }

  if (!expected.length) {
    throw new Error('no_curriculum_subjects')
  }

  const { data: existing, error: existingError } = await supabase
    .from('class_offerings')
    .select(`
      id,
      semester_id,
      section_id,
      subject_id,
      faculty_id,
      required_weekly_hours,
      expected_students,
      status
    `)
    .eq('semester_id', semesterId)
    .in('section_id', sectionIds)

  if (existingError) throw existingError

  const existingMap = new Map(
    (existing ?? []).map((item: any) => [
      `${item.section_id}:${item.subject_id}`,
      item,
    ])
  )

  const expectedKeys = new Set(
    expected.map(
      (item: any) => `${item.section_id}:${item.subject_id}`
    )
  )

  // Upsert without destroying an existing faculty assignment.
  for (const row of expected) {
    const key = `${row.section_id}:${row.subject_id}`
    const current: any = existingMap.get(key)

    if (current) {
      const { error } = await supabase
        .from('class_offerings')
        .update({
          required_weekly_hours: row.required_weekly_hours,
          expected_students: row.expected_students,
          status: 'active',
        })
        .eq('id', current.id)

      if (error) throw error
      continue
    }

    const { error } = await supabase
      .from('class_offerings')
      .insert(row)

    if (error) throw error
  }

  // Preserve history: obsolete offerings are inactivated, never deleted.
  for (const current of existing ?? []) {
    const key = `${current.section_id}:${current.subject_id}`

    if (!expectedKeys.has(key) && current.status === 'active') {
      const { error } = await supabase
        .from('class_offerings')
        .update({ status: 'inactive' })
        .eq('id', current.id)

      if (error) throw error
    }
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







    if (!withinLoad.length) {



      throw new Error(`faculty_load_exceeded:${offering.subject_id}`)



    }







    const chosen = withinLoad[0]







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



    await requireRole(['department_scheduler'])







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



      '/scheduler/schedule-builder?error=semester_required'



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

      term_order,



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



      '/scheduler/schedule-builder?error=semester_not_found'



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



        '/scheduler/schedule-builder?error=program_not_found'



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



        '/scheduler/schedule-builder?error=program_load_failed'



      )



    }







    programScope = (data ?? []).filter(program =>



      String(program.code ?? '').toUpperCase() === 'BSIT'



    )



  }







  // Panel scope: AlterSched now generates the College of Computer Studies / BSIT schedule only.



  programScope = programScope.filter(program =>



    String(program.code ?? '').toUpperCase() === 'BSIT'



  )







  if (!programScope.length) {



    redirect(



      '/scheduler/schedule-builder?error=no_programs'



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



      '/scheduler/schedule-builder?error=structure_load_failed'



    )



  }







  const yearLevelIds =



    (yearLevels ?? []).map(



      year => year.id



    )







  if (!yearLevelIds.length) {



    redirect(



      '/scheduler/schedule-builder?error=no_year_levels'



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



      '/scheduler/schedule-builder?error=section_load_failed'



    )



  }







  const sectionIds =



    (sections ?? []).map(



      section => section.id



    )







  if (!sectionIds.length) {



    redirect(



      '/scheduler/schedule-builder?error=no_sections'



    )



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
      Number((semester as any).term_order)
    )
  } catch (error: any) {
    console.error('Automatic offering preparation failed:', error)

    const code = String(error?.message ?? '')

    if (code === 'invalid_semester_term') {
      redirect('/scheduler/schedule-builder?error=invalid_semester_term')
    }

    if (code.startsWith('no_active_curriculum:')) {
      redirect('/scheduler/schedule-builder?error=no_active_curriculum')
    }

    if (code.startsWith('multiple_active_curricula:')) {
      redirect('/scheduler/schedule-builder?error=multiple_active_curricula')
    }

    if (
      code === 'no_curriculum_subjects' ||
      code.startsWith('no_curriculum_subjects_for_year:')
    ) {
      redirect('/scheduler/schedule-builder?error=no_curriculum_subjects')
    }

    redirect('/scheduler/schedule-builder?error=offering_prepare_failed')
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



    `)



    .eq('semester_id', semesterId)



    .in('section_id', sectionIds)

    .eq('status', 'active')







  if (offeringError) {



    console.error(



      'Class offerings lookup failed:',



      offeringError



    )







    redirect(



      '/scheduler/schedule-builder?error=offerings_load_failed'



    )



  }







  const offerings =
    ((offeringData ?? []) as Offering[]).map(offering => ({
      ...offering,
      curriculum_required_room_type_id:
        curriculumRoomTypeMap.get(
          `${offering.section_id}:${offering.subject_id}`
        ) ?? null,
    }))







  if (!offerings.length) {



    redirect(



      '/scheduler/schedule-builder?error=no_class_offerings'



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



      redirect('/scheduler/schedule-builder?error=no_qualified_faculty')



    }



    if (message.startsWith('faculty_load_exceeded:')) {



      redirect('/scheduler/schedule-builder?error=faculty_load_exceeded')



    }



    redirect('/scheduler/schedule-builder?error=faculty_assignment_failed')



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



      '/scheduler/schedule-builder?error=no_rooms'



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



      '/scheduler/schedule-builder?error=faculty_availability_failed'



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



      '/scheduler/schedule-builder?error=room_availability_failed'



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



        requiredRoomTypeId: offering.curriculum_required_room_type_id ?? subject.default_room_type_id ?? null,



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



        requiredRoomTypeId: offering.curriculum_required_room_type_id ?? subject.default_room_type_id ?? null,



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



          requiredRoomTypeId: offering.curriculum_required_room_type_id ?? subject.default_room_type_id ?? null,



        })



      }



    }



  }







  if (!requirements.length) {



    redirect(



      '/scheduler/schedule-builder?error=no_schedulable_hours'



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

     SMART CONSTRAINT-BASED GENERATION

     ======================================================= */



  const generated: GeneratedEntry[] = []

  const failed: SessionRequirement[] = []



  // Monday through Saturday.

  const days = [1, 2, 3, 4, 5, 6]



  // Classes may start every 30 minutes from 7:00 AM.

  // A class may end no later than 9:00 PM.

  const dayStart = 7 * 60

  const dayEnd = 21 * 60

  const interval = 30



  for (const requirement of requirements) {

    const offering = requirement.offering

    const validCandidates: ScoredCandidate[] = []



    /*

     * Generate every valid Day + Time + Room combination first.

     * Hard constraints reject candidates immediately.

     * Soft constraints are scored after the candidate is known to be safe.

     */

    for (const day of days) {

      for (

        let start = dayStart;

        start + requirement.durationMinutes <= dayEnd;

        start += interval

      ) {

        const end = start + requirement.durationMinutes

        const startTime = minutesToTime(start)

        const endTime = minutesToTime(end)



        // HARD: instructor must be available for the whole meeting.

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



        const candidateRooms = rooms.filter(room => {

          // HARD: required room/lab type.

          if (

            requirement.requiredRoomTypeId &&

            room.room_type_id !== requirement.requiredRoomTypeId

          ) {

            return false

          }



          // HARD: room capacity.

          if (

            requirement.expectedStudents > 0 &&

            room.capacity < requirement.expectedStudents

          ) {

            return false

          }



          // HARD: room availability / maintenance / blocked periods.

          return roomAllowsSlot(

            room.id,

            day,

            startTime,

            endTime,

            roomAvailability

          )

        })



        for (const room of candidateRooms) {

          const candidate: GeneratedEntry = {

            class_offering_id: offering.id,

            faculty_id: offering.faculty_id,

            section_id: offering.section_id,

            room_id: room.id,

            day_of_week: day,

            start_time: startTime,

            end_time: endTime,

            entry_type: requirement.entryType,

          }



          // HARD: no Block, Room, or Instructor overlap.

          if (hasGeneratedConflict(candidate, generated)) {

            continue

          }



          validCandidates.push({

            entry: candidate,

            score: scoreScheduleCandidate(

              candidate,

              generated,

              room,

              requirement,

              facultyAvailability

            ),

          })

        }

      }

    }



    if (!validCandidates.length) {

      failed.push(requirement)

      continue

    }



    /*

     * Lowest score wins.

     * Deterministic tie breakers make repeated runs predictable:

     * earlier day -> earlier time -> room id.

     */

    validCandidates.sort((a, b) => {

      if (a.score !== b.score) return a.score - b.score



      if (a.entry.day_of_week !== b.entry.day_of_week) {

        return a.entry.day_of_week - b.entry.day_of_week

      }



      const startDifference =

        timeToMinutes(a.entry.start_time) -

        timeToMinutes(b.entry.start_time)



      if (startDifference !== 0) return startDifference



      return a.entry.room_id.localeCompare(b.entry.room_id)

    })



    generated.push(validCandidates[0].entry)

  }



  /*

   * Never create a partial timetable.

   * If one required session cannot satisfy all hard constraints,

   * the generator stops before creating schedule/version records.

   */

  if (failed.length) {

    console.error(

      'Unplaced sessions:',

      failed.map(item => ({

        offering: item.offering.id,

        type: item.entryType,

        minutes: item.durationMinutes,

      }))

    )



    redirect(

      `/scheduler/schedule-builder?error=unplaced_sessions&count=${failed.length}`

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



        '/scheduler/schedule-builder?error=schedule_lookup_failed'



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



          '/scheduler/schedule-builder?error=schedule_create_failed'



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



        '/scheduler/schedule-builder?error=version_lookup_failed'



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



        '/scheduler/schedule-builder?error=version_create_failed'



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







          session_type:



            entry.entry_type,







          delivery_mode:



            'onsite',



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



        '/scheduler/schedule-builder?error=entries_create_failed'



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



        '/scheduler/schedule-builder?error=current_version_failed'



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



    '/scheduler/schedule-builder'



  )







  revalidatePath(



    '/scheduler/schedules'



  )







  redirect(



    `/scheduler/schedule-builder?success=master_generated&schedules=${schedulesCreated}&entries=${entriesCreated}`



  )



}



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



  const clean = String(value ?? '').trim().slice(0, 5)



  return clean ? `${clean}:00` : '00:00:00'



}







export async function saveSchedulePreviewEntries(



  updates: SchedulePreviewUpdate[]



): Promise<{



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







    if (!Number.isInteger(day) || day < 1 || day > 6) {



      return {



        ok: false,



        conflicts: 0,



        message: 'Invalid class day detected.',



      }



    }







    if (



      !Number.isFinite(start) ||



      !Number.isFinite(end) ||



      start >= end



    ) {



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







  const entryIds = updates.map(item => item.id)







  const {



    data: originalEntries,



    error: originalError,



  } = await supabase



    .from('schedule_entries')



    .select(`



      id,



      schedule_version_id,



      class_offering_id,



      faculty_id,



      section_id,



      room_id,



      day_of_week,



      start_time,



      end_time



    `)



    .in('id', entryIds)







  if (originalError) {



    console.error(



      'Schedule preview entry lookup failed:',



      originalError



    )







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







  const originalMap = new Map(



    (originalEntries ?? []).map((entry: any) => [



      entry.id,



      entry,



    ])



  )







  const workingEntries = updates.map(update => {



    const original: any = originalMap.get(update.id)







    return {



      ...original,







      faculty_id:



        update.faculty_id || null,







      room_id:



        update.room_id,







      day_of_week:



        Number(update.day_of_week),







      start_time:



        normalizePreviewTime(



          update.start_time



        ),







      end_time:



        normalizePreviewTime(



          update.end_time



        ),



    }



  })







  /* =======================================================



     VERIFY DRAFT VERSIONS



     ======================================================= */







  const versionIds = [



    ...new Set(



      workingEntries



        .map(



          (entry: any) =>



            entry.schedule_version_id



        )



        .filter(Boolean)



    ),



  ] as string[]







  const {



    data: versions,



    error: versionError,



  } = await supabase



    .from('schedule_versions')



    .select('id,status')



    .in('id', versionIds)







  if (versionError) {



    console.error(



      'Schedule version verification failed:',



      versionError



    )







    return {



      ok: false,



      conflicts: 0,



      message:



        'AlterSched could not verify the Draft schedule.',



    }



  }







  if (



    (versions ?? []).some(



      (version: any) =>



        version.status !== 'draft'



    )



  ) {



    return {



      ok: false,



      conflicts: 0,



      message:



        'Only Draft schedules can be edited.',



    }



  }







  /* =======================================================



     CLASS OFFERINGS



     ======================================================= */







  const offeringIds = [



    ...new Set(



      workingEntries



        .map(



          (entry: any) =>



            entry.class_offering_id



        )



        .filter(Boolean)



    ),



  ] as string[]







  const {



    data: offerings,



    error: offeringError,



  } = await supabase



    .from('class_offerings')



    .select(`



      id,



      semester_id,



      subject_id,



      section_id,



      expected_students,







      subjects (



        id,



        default_room_type_id



      )



    `)



    .in('id', offeringIds)







  if (offeringError) {



    console.error(



      'Schedule preview offering lookup failed:',



      offeringError



    )







    return {



      ok: false,



      conflicts: 0,



      message:



        'AlterSched could not verify the Class Offerings.',



    }



  }







  const offeringMap = new Map(



    (offerings ?? []).map(



      (offering: any) => [



        offering.id,



        offering,



      ]



    )



  )







  /* =======================================================



     ROOMS



     ======================================================= */







  const roomIds = [



    ...new Set(



      workingEntries



        .map(



          (entry: any) =>



            entry.room_id



        )



        .filter(Boolean)



    ),



  ] as string[]







  const {



    data: rooms,



    error: roomError,



  } = await supabase



    .from('rooms')



    .select(`



      id,



      capacity,



      room_type_id,



      is_active



    `)



    .in('id', roomIds)







  if (roomError) {



    console.error(



      'Schedule preview room lookup failed:',



      roomError



    )







    return {



      ok: false,



      conflicts: 0,



      message:



        'AlterSched could not verify the selected rooms.',



    }



  }







  const roomMap = new Map(



    (rooms ?? []).map(



      (room: any) => [



        room.id,



        room,



      ]



    )



  )







  /* =======================================================



     FACULTY QUALIFICATIONS



     ======================================================= */







  const facultyIds = [



    ...new Set(



      workingEntries



        .map(



          (entry: any) =>



            entry.faculty_id



        )



        .filter(Boolean)



    ),



  ] as string[]







  const subjectIds = [



    ...new Set(



      (offerings ?? [])



        .map(



          (offering: any) =>



            offering.subject_id



        )



        .filter(Boolean)



    ),



  ] as string[]







  let qualifications: any[] = []







  if (



    facultyIds.length &&



    subjectIds.length



  ) {



    const {



      data,



      error,



    } = await supabase



      .from('faculty_subjects')



      .select(



        'faculty_id,subject_id'



      )



      .in(



        'faculty_id',



        facultyIds



      )



      .in(



        'subject_id',



        subjectIds



      )







    if (error) {



      console.error(



        'Instructor qualification lookup failed:',



        error



      )







      return {



        ok: false,



        conflicts: 0,



        message:



          'AlterSched could not verify Instructor qualifications.',



      }



    }







    qualifications =



      data ?? []



  }







  const qualificationSet =



    new Set(



      qualifications.map(



        (item: any) =>



          `${item.faculty_id}:${item.subject_id}`



      )



    )







  /* =======================================================



     AVAILABILITY



     ======================================================= */







  const semesterIds = [



    ...new Set(



      (offerings ?? [])



        .map(



          (offering: any) =>



            offering.semester_id



        )



        .filter(Boolean)



    ),



  ] as string[]







  let facultyAvailability: any[] = []



  let roomAvailability: any[] = []







  if (semesterIds.length === 1) {



    const semesterId =



      semesterIds[0]







    const [



      facultyResult,



      roomResult,



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



            .from(



              'room_availability'



            )



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



            .in(



              'room_id',



              roomIds



            )







        : Promise.resolve({



            data: [],



            error: null,



          }),



    ])







    if (



      facultyResult.error ||



      roomResult.error



    ) {



      console.error(



        'Schedule preview availability lookup failed:',



        facultyResult.error ??



          roomResult.error



      )







      return {



        ok: false,



        conflicts: 0,



        message:



          'AlterSched could not verify schedule availability.',



      }



    }







    facultyAvailability =



      facultyResult.data ?? []







    roomAvailability =



      roomResult.data ?? []



  }







  /* =======================================================



     CONFLICT VALIDATION



     ======================================================= */







  let conflictRows = 0







  for (



    const entry



    of workingEntries as any[]



  ) {



    let rowHasConflict = false







    const offering: any =



      offeringMap.get(



        entry.class_offering_id



      )







    const room: any =



      roomMap.get(



        entry.room_id



      )







    const subjectRelation =



      offering?.subjects







    const subject =



      Array.isArray(



        subjectRelation



      )



        ? subjectRelation[0]



        : subjectRelation







    /* Instructor required + qualification */







    if (!entry.faculty_id) {



      rowHasConflict = true



    } else if (



      offering?.subject_id &&



      !qualificationSet.has(



        `${entry.faculty_id}:${offering.subject_id}`



      )



    ) {



      rowHasConflict = true



    }







    /* Room active */







    if (



      !room ||



      room.is_active === false



    ) {



      rowHasConflict = true



    }







    /* Capacity */







    if (



      room &&



      Number(



        offering?.expected_students ??



          0



      ) > 0 &&



      Number(room.capacity ?? 0) <



        Number(



          offering?.expected_students ??



            0



        )



    ) {



      rowHasConflict = true



    }







    /* Room type */







    if (



      room &&



      subject?.default_room_type_id &&



      room.room_type_id !==



        subject.default_room_type_id



    ) {



      rowHasConflict = true



    }







    /* Instructor availability */







    if (



      entry.faculty_id &&



      !facultyAllowsSlot(



        entry.faculty_id,



        Number(



          entry.day_of_week



        ),



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



        Number(



          entry.day_of_week



        ),



        entry.start_time,



        entry.end_time,



        roomAvailability



      )



    ) {



      rowHasConflict = true



    }







    /* Preview overlap */







    const overlapFound =



      (



        workingEntries as any[]



      ).some(other => {



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







        if (



          !overlaps(



            entry.start_time,



            entry.end_time,



            other.start_time,



            other.end_time



          )



        ) {



          return false



        }







        const sectionConflict =



          other.section_id ===



          entry.section_id







        const roomConflict =



          other.room_id ===



          entry.room_id







        const facultyConflict =



          Boolean(



            entry.faculty_id



          ) &&



          other.faculty_id ===



            entry.faculty_id







        return (



          sectionConflict ||



          roomConflict ||



          facultyConflict



        )



      })







    if (overlapFound) {



      rowHasConflict = true



    }







    if (rowHasConflict) {



      conflictRows += 1



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

      message:

        `Cannot save this Draft. Resolve ${conflictRows} conflicting schedule row${conflictRows === 1 ? '' : 's'} first.`,

    }

  }



  /* =======================================================



     SAVE SCHEDULE ENTRIES



     ======================================================= */







  for (



    const entry



    of workingEntries as any[]



  ) {



    const {



      error,



    } = await supabase



      .from(



        'schedule_entries'



      )



      .update({



        faculty_id:



          entry.faculty_id,







        room_id:



          entry.room_id,







        day_of_week:



          Number(



            entry.day_of_week



          ),







        start_time:



          entry.start_time,







        end_time:



          entry.end_time,



      })



      .eq(



        'id',



        entry.id



      )







    if (error) {



      console.error(



        'Schedule preview update failed:',



        error



      )







      return {



        ok: false,



        conflicts:



          conflictRows,







        message:



          'AlterSched could not save all schedule changes.',



      }



    }



  }







  /* =======================================================



     SYNC CLASS OFFERING INSTRUCTOR



     ======================================================= */







  const offeringFaculty =



    new Map<



      string,



      string | null



    >()







  for (



    const entry



    of workingEntries as any[]



  ) {



    if (



      !offeringFaculty.has(



        entry.class_offering_id



      )



    ) {



      offeringFaculty.set(



        entry.class_offering_id,



        entry.faculty_id ??



          null



      )



    }



  }







  for (



    const [



      offeringId,



      facultyId,



    ]



    of offeringFaculty



  ) {



    const {



      error,



    } = await supabase



      .from(



        'class_offerings'



      )



      .update({



        faculty_id:



          facultyId,



      })



      .eq(



        'id',



        offeringId



      )







    if (error) {



      console.error(



        'Class Offering Instructor sync failed:',



        error



      )







      return {



        ok: false,



        conflicts:



          conflictRows,







        message:



          'Schedule entries were updated, but Instructor assignment synchronization failed.',



      }



    }



  }







  /* =======================================================



     REFRESH PAGES



     ======================================================= */







  revalidatePath(



    '/scheduler/schedule-builder'



  )







  revalidatePath(



    '/scheduler/schedules'



  )







  revalidatePath(



    '/scheduler/my-schedule'



  )







  revalidatePath(



    '/faculty/my-schedule'



  )







  return {



    ok: true,



    conflicts:



      conflictRows,



  }



}
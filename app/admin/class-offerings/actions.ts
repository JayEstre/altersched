'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
<<<<<<< HEAD
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { getString } from '@/lib/form-data'

/** Pages that may start "Prepare Class Offerings"; the result is shown back on that page. */
const PREPARE_RETURN_PATHS = ['/admin/class-offerings', '/admin/subjects'] as const

export async function prepareClassOfferings(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const semesterId = getString(formData, 'semester_id')
  const programId = getString(formData, 'program_id')
  const requested = getString(formData, 'return_to')
  const base = PREPARE_RETURN_PATHS.find((path) => path === requested) ?? PREPARE_RETURN_PATHS[0]
=======

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

export async function prepareClassOfferings(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const supabase = await createClient()

  const semesterId = String(
    formData.get('semester_id') ?? ''
  ).trim()

  const programId = String(
    formData.get('program_id') ?? ''
  ).trim()
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =====================================================
     REQUIRED INPUT
  ===================================================== */

  if (!semesterId) {
<<<<<<< HEAD
    redirect(`${base}?error=semester_required`)
=======
    redirect(
      '/admin/class-offerings?error=semester_required'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     LOAD SEMESTER
  ===================================================== */

<<<<<<< HEAD
  const { data: semester, error: semesterError } = await supabase
    .from('semesters')
    .select(
      `
=======
  const {
    data: semester,
    error: semesterError,
  } = await supabase
    .from('semesters')
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      name,
      academic_year_id,
      is_active,
      term_order
<<<<<<< HEAD
    `
    )
=======
    `)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .eq('id', semesterId)
    .maybeSingle()

  if (semesterError || !semester) {
<<<<<<< HEAD
    console.error('Semester lookup failed:', semesterError)
    redirect(`${base}?error=semester_not_found`)
=======
    console.error(
      'Semester lookup failed:',
      semesterError
    )

    redirect(
      '/admin/class-offerings?error=semester_not_found'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     CURRICULUM TERM ORDER
     ===================================================== */

  const termOrder = Number(semester.term_order)

  if (!Number.isInteger(termOrder) || termOrder < 1) {
<<<<<<< HEAD
    redirect(`${base}?error=invalid_semester_term`)
=======
    redirect('/admin/class-offerings?error=invalid_semester_term')
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     LOAD ACTIVE CURRICULA
  ===================================================== */

  let curriculaQuery = supabase
    .from('curricula')
<<<<<<< HEAD
    .select(
      `
=======
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      program_id,
      name,
      is_active
<<<<<<< HEAD
    `
    )
    .eq('is_active', true)

  if (programId) {
    curriculaQuery = curriculaQuery.eq('program_id', programId)
  }

  const { data: curricula, error: curriculaError } = await curriculaQuery

  if (curriculaError) {
    console.error('Curricula lookup failed:', curriculaError)
    redirect(`${base}?error=curricula_load_failed`)
  }

  if (!curricula?.length) {
    redirect(`${base}?error=no_active_curricula`)
  }

  const curriculumIds = curricula.map((curriculum) => curriculum.id)
=======
    `)
    .eq('is_active', true)

  if (programId) {
    curriculaQuery =
      curriculaQuery.eq(
        'program_id',
        programId
      )
  }

  const {
    data: curricula,
    error: curriculaError,
  } = await curriculaQuery

  if (curriculaError) {
    console.error(
      'Curricula lookup failed:',
      curriculaError
    )

    redirect(
      '/admin/class-offerings?error=curricula_load_failed'
    )
  }

  if (!curricula?.length) {
    redirect(
      '/admin/class-offerings?error=no_active_curricula'
    )
  }

  const curriculumIds =
    curricula.map(
      (curriculum) =>
        curriculum.id
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =====================================================
     LOAD CURRICULUM SUBJECTS
  ===================================================== */

<<<<<<< HEAD
  const { data: mappings, error: mappingsError } = await supabase
    .from('curriculum_subjects')
    .select(
      `
=======
  const {
    data: mappings,
    error: mappingsError,
  } = await supabase
    .from('curriculum_subjects')
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      curriculum_id,
      subject_id,
      year_level_id,
      term_order,
      weekly_hours
<<<<<<< HEAD
    `
    )
    .in('curriculum_id', curriculumIds)
    .eq('term_order', termOrder)

  if (mappingsError) {
    console.error('Curriculum Subject load failed:', mappingsError)
    redirect(`${base}?error=mappings_load_failed`)
  }

  if (!mappings?.length) {
    redirect(`${base}?error=no_curriculum_subjects`)
=======
    `)
    .in(
      'curriculum_id',
      curriculumIds
    )
    .eq(
      'term_order',
      termOrder
    )

  if (mappingsError) {
    console.error(
      'Curriculum Subject load failed:',
      mappingsError
    )

    redirect(
      '/admin/class-offerings?error=mappings_load_failed'
    )
  }

  if (!mappings?.length) {
    redirect(
      '/admin/class-offerings?error=no_curriculum_subjects'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     LOAD SECTIONS / BLOCKS
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     Every mapping belongs to one Year Level.
     We create the offering for every active Block
     under that Year Level.
  ===================================================== */

<<<<<<< HEAD
  const yearLevelIds = [...new Set(mappings.map((mapping) => mapping.year_level_id))]

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select(
      `
=======
  const yearLevelIds = [
    ...new Set(
      mappings.map(
        (mapping) =>
          mapping.year_level_id
      )
    ),
  ]

  const {
    data: sections,
    error: sectionsError,
  } = await supabase
    .from('sections')
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      year_level_id,
      code,
      is_active
<<<<<<< HEAD
    `
    )
    .in('year_level_id', yearLevelIds)
    .eq('is_active', true)

  if (sectionsError) {
    console.error('Sections load failed:', sectionsError)
    redirect(`${base}?error=sections_load_failed`)
  }

  if (!sections?.length) {
    redirect(`${base}?error=no_active_sections`)
=======
    `)
    .in(
      'year_level_id',
      yearLevelIds
    )
    .eq(
      'is_active',
      true
    )

  if (sectionsError) {
    console.error(
      'Sections load failed:',
      sectionsError
    )

    redirect(
      '/admin/class-offerings?error=sections_load_failed'
    )
  }

  if (!sections?.length) {
    redirect(
      '/admin/class-offerings?error=no_active_sections'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     BUILD REQUIRED OFFERINGS
  ===================================================== */

  const requiredOfferings: Array<{
    semester_id: string
    section_id: string
    subject_id: string
    faculty_id: null
    required_weekly_hours: number
    expected_students: null
    status: 'active'
  }> = []

  for (const mapping of mappings) {
<<<<<<< HEAD
    const mappingSections = sections.filter(
      (section) => section.year_level_id === mapping.year_level_id
    )

    for (const section of mappingSections) {
      const weeklyHours = Number(mapping.weekly_hours)

      if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) {
=======
    const mappingSections =
      sections.filter(
        (section) =>
          section.year_level_id ===
          mapping.year_level_id
      )

    for (
      const section of
      mappingSections
    ) {
      const weeklyHours =
        Number(
          mapping.weekly_hours
        )

      if (
        !Number.isFinite(
          weeklyHours
        ) ||
        weeklyHours <= 0
      ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        console.error(
          'Invalid weekly hours on curriculum mapping:',
          mapping.id,
          mapping.weekly_hours
        )

<<<<<<< HEAD
        redirect(`${base}?error=invalid_mapping_hours`)
      }

      requiredOfferings.push({
        semester_id: semesterId,
        section_id: section.id,
        subject_id: mapping.subject_id,
        faculty_id: null,
        required_weekly_hours: weeklyHours,
        expected_students: null,
        status: 'active',
=======
        redirect(
          '/admin/class-offerings?error=invalid_mapping_hours'
        )
      }

      requiredOfferings.push({
        semester_id:
          semesterId,

        section_id:
          section.id,

        subject_id:
          mapping.subject_id,

        faculty_id:
          null,

        required_weekly_hours:
          weeklyHours,

        expected_students:
          null,

        status:
          'active',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      })
    }
  }

<<<<<<< HEAD
  if (requiredOfferings.length === 0) {
    redirect(`${base}?error=no_offerings_required`)
=======
  if (
    requiredOfferings.length === 0
  ) {
    redirect(
      '/admin/class-offerings?error=no_offerings_required'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     LOAD EXISTING OFFERINGS
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     We intentionally skip existing records instead
     of causing the UNIQUE constraint to fail.
  ===================================================== */

<<<<<<< HEAD
  const { data: existingOfferings, error: existingError } = await supabase
    .from('class_offerings')
    .select(
      `
=======
  const {
    data: existingOfferings,
    error: existingError,
  } = await supabase
    .from('class_offerings')
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      semester_id,
      section_id,
      subject_id
<<<<<<< HEAD
    `
    )
    .eq('semester_id', semesterId)

  if (existingError) {
    console.error('Existing offerings load failed:', existingError)
    redirect(`${base}?error=existing_offerings_load_failed`)
  }

  const existingKeys = new Set(
    (existingOfferings ?? []).map((offering) =>
      [offering.semester_id, offering.section_id, offering.subject_id].join(':')
    )
  )

  const seenKeys = new Set<string>()

  const newOfferings = requiredOfferings.filter((offering) => {
    const key = [offering.semester_id, offering.section_id, offering.subject_id].join(':')

    if (existingKeys.has(key) || seenKeys.has(key)) {
      return false
    }

    seenKeys.add(key)

    return true
  })
=======
    `)
    .eq(
      'semester_id',
      semesterId
    )

  if (existingError) {
    console.error(
      'Existing offerings load failed:',
      existingError
    )

    redirect(
      '/admin/class-offerings?error=existing_offerings_load_failed'
    )
  }

  const existingKeys =
    new Set(
      (existingOfferings ?? []).map(
        (offering) =>
          [
            offering.semester_id,
            offering.section_id,
            offering.subject_id,
          ].join(':')
      )
    )

  const seenKeys =
    new Set<string>()

  const newOfferings =
    requiredOfferings.filter(
      (offering) => {
        const key = [
          offering.semester_id,
          offering.section_id,
          offering.subject_id,
        ].join(':')

        if (
          existingKeys.has(key) ||
          seenKeys.has(key)
        ) {
          return false
        }

        seenKeys.add(key)

        return true
      }
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =====================================================
     NOTHING NEW TO INSERT
  ===================================================== */

<<<<<<< HEAD
  if (newOfferings.length === 0) {
    revalidatePath('/admin/class-offerings')
    redirect(`${base}?success=offerings_already_prepared`)
=======
  if (
    newOfferings.length === 0
  ) {
    revalidatePath(
      '/admin/class-offerings'
    )

    redirect(
      '/admin/class-offerings?success=offerings_already_prepared'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     INSERT CLASS OFFERINGS
  ===================================================== */

<<<<<<< HEAD
  const { error: insertError } = await supabase.from('class_offerings').insert(newOfferings)

  if (insertError) {
    console.error('Class Offerings insert failed:', insertError)
    redirect(`${base}?error=offerings_create_failed`)
=======
  const {
    error: insertError,
  } = await supabase
    .from('class_offerings')
    .insert(
      newOfferings
    )

  if (insertError) {
    console.error(
      'Class Offerings insert failed:',
      insertError
    )

    redirect(
      '/admin/class-offerings?error=offerings_create_failed'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =====================================================
     REFRESH DEPENDENT PAGES
  ===================================================== */

<<<<<<< HEAD
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/subjects')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/class-offerings')
  revalidatePath('/admin/schedules')
=======
  revalidatePath(
    '/admin/class-offerings'
  )

  revalidatePath(
    '/admin/schedule-builder'
  )

  revalidatePath(
    '/admin/schedules'
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =====================================================
     SUCCESS
  ===================================================== */

<<<<<<< HEAD
  redirect(`${base}?success=offerings_prepared&created=${newOfferings.length}`)
=======
  redirect(
    `/admin/class-offerings?success=offerings_prepared&created=${newOfferings.length}`
  )
}
export async function assignFacultyToOffering(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const offeringId = String(formData.get('offering_id') ?? '').trim()
  const facultyId = String(formData.get('faculty_id') ?? '').trim()
  if (!offeringId || !facultyId) redirect('/admin/class-offerings?error=assignment_required')

  const { data: offering, error: offeringError } = await supabase
    .from('class_offerings').select('id,subject_id').eq('id', offeringId).maybeSingle()
  if (offeringError || !offering) redirect('/admin/class-offerings?error=offering_not_found')

  const { data: qualified, error: qualifiedError } = await supabase
    .from('faculty_subjects').select('id').eq('faculty_id', facultyId)
    .eq('subject_id', offering.subject_id).maybeSingle()
  if (qualifiedError || !qualified) redirect('/admin/class-offerings?error=faculty_not_qualified')

  const { error } = await supabase.from('class_offerings')
    .update({ faculty_id: facultyId, updated_at: new Date().toISOString() }).eq('id', offeringId)
  if (error) {
    console.error('Faculty assignment failed:', error)
    redirect(`/admin/class-offerings?error=assignment_failed&details=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
  redirect('/admin/class-offerings?success=faculty_assigned')
}

export async function unassignFacultyFromOffering(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const offeringId = String(formData.get('offering_id') ?? '').trim()
  if (!offeringId) redirect('/admin/class-offerings?error=offering_not_found')
  const { error } = await supabase.from('class_offerings')
    .update({ faculty_id: null, updated_at: new Date().toISOString() }).eq('id', offeringId)
  if (error) redirect(`/admin/class-offerings?error=assignment_failed&details=${encodeURIComponent(error.message)}`)
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
  redirect('/admin/class-offerings?success=faculty_unassigned')
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

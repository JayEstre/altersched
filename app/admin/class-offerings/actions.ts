'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  /* =====================================================
     REQUIRED INPUT
  ===================================================== */

  if (!semesterId) {
    redirect(
      '/admin/class-offerings?error=semester_required'
    )
  }

  /* =====================================================
     LOAD SEMESTER
  ===================================================== */

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
      term_order
    `)
    .eq('id', semesterId)
    .maybeSingle()

  if (semesterError || !semester) {
    console.error(
      'Semester lookup failed:',
      semesterError
    )

    redirect(
      '/admin/class-offerings?error=semester_not_found'
    )
  }

  /* =====================================================
     CURRICULUM TERM ORDER
     ===================================================== */

  const termOrder = Number(semester.term_order)

  if (!Number.isInteger(termOrder) || termOrder < 1) {
    redirect('/admin/class-offerings?error=invalid_semester_term')
  }

  /* =====================================================
     LOAD ACTIVE CURRICULA
  ===================================================== */

  let curriculaQuery = supabase
    .from('curricula')
    .select(`
      id,
      program_id,
      name,
      is_active
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

  /* =====================================================
     LOAD CURRICULUM SUBJECTS
  ===================================================== */

  const {
    data: mappings,
    error: mappingsError,
  } = await supabase
    .from('curriculum_subjects')
    .select(`
      id,
      curriculum_id,
      subject_id,
      year_level_id,
      term_order,
      weekly_hours
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
  }

  /* =====================================================
     LOAD SECTIONS / BLOCKS

     Every mapping belongs to one Year Level.
     We create the offering for every active Block
     under that Year Level.
  ===================================================== */

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
      id,
      year_level_id,
      code,
      is_active
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
        console.error(
          'Invalid weekly hours on curriculum mapping:',
          mapping.id,
          mapping.weekly_hours
        )

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
      })
    }
  }

  if (
    requiredOfferings.length === 0
  ) {
    redirect(
      '/admin/class-offerings?error=no_offerings_required'
    )
  }

  /* =====================================================
     LOAD EXISTING OFFERINGS

     We intentionally skip existing records instead
     of causing the UNIQUE constraint to fail.
  ===================================================== */

  const {
    data: existingOfferings,
    error: existingError,
  } = await supabase
    .from('class_offerings')
    .select(`
      id,
      semester_id,
      section_id,
      subject_id
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

  /* =====================================================
     NOTHING NEW TO INSERT
  ===================================================== */

  if (
    newOfferings.length === 0
  ) {
    revalidatePath(
      '/admin/class-offerings'
    )

    redirect(
      '/admin/class-offerings?success=offerings_already_prepared'
    )
  }

  /* =====================================================
     INSERT CLASS OFFERINGS
  ===================================================== */

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
  }

  /* =====================================================
     REFRESH DEPENDENT PAGES
  ===================================================== */

  revalidatePath(
    '/admin/class-offerings'
  )

  revalidatePath(
    '/admin/schedule-builder'
  )

  revalidatePath(
    '/admin/schedules'
  )

  /* =====================================================
     SUCCESS
  ===================================================== */

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
}

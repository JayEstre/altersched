'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

  /* =====================================================
     REQUIRED INPUT
  ===================================================== */

  if (!semesterId) {
    redirect(`${base}?error=semester_required`)
  }

  /* =====================================================
     LOAD SEMESTER
  ===================================================== */

  const { data: semester, error: semesterError } = await supabase
    .from('semesters')
    .select(
      `
      id,
      name,
      academic_year_id,
      is_active,
      term_order
    `
    )
    .eq('id', semesterId)
    .maybeSingle()

  if (semesterError || !semester) {
    console.error('Semester lookup failed:', semesterError)
    redirect(`${base}?error=semester_not_found`)
  }

  /* =====================================================
     CURRICULUM TERM ORDER
     ===================================================== */

  const termOrder = Number(semester.term_order)

  if (!Number.isInteger(termOrder) || termOrder < 1) {
    redirect(`${base}?error=invalid_semester_term`)
  }

  /* =====================================================
     LOAD ACTIVE CURRICULA
  ===================================================== */

  let curriculaQuery = supabase
    .from('curricula')
    .select(
      `
      id,
      program_id,
      name,
      is_active
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

  /* =====================================================
     LOAD CURRICULUM SUBJECTS
  ===================================================== */

  const { data: mappings, error: mappingsError } = await supabase
    .from('curriculum_subjects')
    .select(
      `
      id,
      curriculum_id,
      subject_id,
      year_level_id,
      term_order,
      weekly_hours
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
  }

  /* =====================================================
     LOAD SECTIONS / BLOCKS
     Every mapping belongs to one Year Level.
     We create the offering for every active Block
     under that Year Level.
  ===================================================== */

  const yearLevelIds = [...new Set(mappings.map((mapping) => mapping.year_level_id))]

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select(
      `
      id,
      year_level_id,
      code,
      is_active
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
    const mappingSections = sections.filter(
      (section) => section.year_level_id === mapping.year_level_id
    )

    for (const section of mappingSections) {
      const weeklyHours = Number(mapping.weekly_hours)

      if (!Number.isFinite(weeklyHours) || weeklyHours <= 0) {
        console.error(
          'Invalid weekly hours on curriculum mapping:',
          mapping.id,
          mapping.weekly_hours
        )

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
      })
    }
  }

  if (requiredOfferings.length === 0) {
    redirect(`${base}?error=no_offerings_required`)
  }

  /* =====================================================
     LOAD EXISTING OFFERINGS
     We intentionally skip existing records instead
     of causing the UNIQUE constraint to fail.
  ===================================================== */

  const { data: existingOfferings, error: existingError } = await supabase
    .from('class_offerings')
    .select(
      `
      id,
      semester_id,
      section_id,
      subject_id
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

  /* =====================================================
     NOTHING NEW TO INSERT
  ===================================================== */

  if (newOfferings.length === 0) {
    revalidatePath('/admin/class-offerings')
    redirect(`${base}?success=offerings_already_prepared`)
  }

  /* =====================================================
     INSERT CLASS OFFERINGS
  ===================================================== */

  const { error: insertError } = await supabase.from('class_offerings').insert(newOfferings)

  if (insertError) {
    console.error('Class Offerings insert failed:', insertError)
    redirect(`${base}?error=offerings_create_failed`)
  }

  /* =====================================================
     REFRESH DEPENDENT PAGES
  ===================================================== */

  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/subjects')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/class-offerings')
  revalidatePath('/admin/schedules')

  /* =====================================================
     SUCCESS
  ===================================================== */

  redirect(`${base}?success=offerings_prepared&created=${newOfferings.length}`)
}

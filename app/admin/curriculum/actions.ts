'use server'



import { redirect } from 'next/navigation'

import { revalidatePath } from 'next/cache'



import { requireRole } from '@/lib/auth/require-role'

import { createClient } from '@/lib/supabase/server'



const PATH = '/admin/curriculum'



function textValue(formData: FormData, key: string) {

  return String(formData.get(key) ?? '').trim()

}



function uuidValue(formData: FormData, key: string) {

  const value = textValue(formData, key)

  if (!value) throw new Error(`missing_${key}`)

  return value

}



function optionalYear(formData: FormData, key: string) {

  const raw = textValue(formData, key)

  if (!raw) return null



  const value = Number(raw)

  const maxYear = new Date().getFullYear() + 20



  if (!Number.isInteger(value) || value < 1900 || value > maxYear) {

    throw new Error(`invalid_${key}`)

  }



  return value

}



function positiveInteger(formData: FormData, key: string) {

  const value = Number(textValue(formData, key))



  if (!Number.isInteger(value) || value < 1) {

    throw new Error(`invalid_${key}`)

  }



  return value

}



function positiveNumber(formData: FormData, key: string) {

  const value = Number(textValue(formData, key))



  if (!Number.isFinite(value) || value <= 0) {

    throw new Error(`invalid_${key}`)

  }



  return value

}



function go(params: Record<string, string>) {

  const query = new URLSearchParams(params)

  redirect(`${PATH}?${query.toString()}`)

}



async function getSuperAdminClient() {

  await requireRole(['super_admin'])

  return createClient()

}



async function assertProgram(supabase: any, programId: string) {

  const { data, error } = await supabase

    .from('programs')

    .select('id, department_id, code, name')

    .eq('id', programId)

    .maybeSingle()



  if (error || !data) throw new Error('program_not_found')



  return data

}



async function assertCurriculum(supabase: any, curriculumId: string) {

  const { data, error } = await supabase

    .from('curricula')

    .select('id, program_id, name, is_active')

    .eq('id', curriculumId)

    .maybeSingle()



  if (error || !data) throw new Error('curriculum_not_found')



  return data

}



async function assertYearLevelForProgram(

  supabase: any,

  yearLevelId: string,

  programId: string

) {

  const { data, error } = await supabase

    .from('year_levels')

    .select('id, program_id, level_number, name')

    .eq('id', yearLevelId)

    .eq('program_id', programId)

    .maybeSingle()



  if (error || !data) throw new Error('year_level_program_mismatch')



  return data

}



async function assertSubjectForProgramDepartment(

  supabase: any,

  subjectId: string,

  programId: string

) {

  const program = await assertProgram(supabase, programId)



  const { data, error } = await supabase

    .from('subjects')

    .select('id, department_id, code, name, is_active')

    .eq('id', subjectId)

    .eq('department_id', program.department_id)

    .eq('is_active', true)

    .maybeSingle()



  if (error || !data) throw new Error('subject_department_mismatch')



  return data

}



export async function createCurriculum(formData: FormData) {

  try {

    const supabase = await getSuperAdminClient()



    const programId = uuidValue(formData, 'program_id')

    const name = textValue(formData, 'name')

    const effectiveFromYear = optionalYear(formData, 'effective_from_year')

    const effectiveToYear = optionalYear(formData, 'effective_to_year')

    const isActive = formData.get('is_active') === 'on'



    if (!name || name.length > 120) {

      throw new Error('invalid_name')

    }



    if (

      effectiveFromYear !== null &&

      effectiveToYear !== null &&

      effectiveToYear < effectiveFromYear

    ) {

      throw new Error('invalid_year_range')

    }



    await assertProgram(supabase, programId)



    const { data: duplicate, error: duplicateError } = await supabase

      .from('curricula')

      .select('id')

      .eq('program_id', programId)

      .eq('name', name)

      .maybeSingle()



    if (duplicateError) throw duplicateError

    if (duplicate) throw new Error('duplicate_curriculum')



    const { error } = await supabase.from('curricula').insert({

      program_id: programId,

      name,

      effective_from_year: effectiveFromYear,

      effective_to_year: effectiveToYear,

      is_active: isActive,

    })



    if (error) throw error



    revalidatePath(PATH)

  } catch (error) {

    console.error('createCurriculum:', error)



    const message =

      error instanceof Error ? error.message : 'create_curriculum_failed'



    go({ error: message })

  }



  go({ success: 'curriculum_created' })

}



export async function updateCurriculum(formData: FormData) {

  try {

    const supabase = await getSuperAdminClient()



    const curriculumId = uuidValue(formData, 'curriculum_id')

    const name = textValue(formData, 'name')

    const effectiveFromYear = optionalYear(formData, 'effective_from_year')

    const effectiveToYear = optionalYear(formData, 'effective_to_year')



    if (!name || name.length > 120) {

      throw new Error('invalid_name')

    }



    if (

      effectiveFromYear !== null &&

      effectiveToYear !== null &&

      effectiveToYear < effectiveFromYear

    ) {

      throw new Error('invalid_year_range')

    }



    const curriculum = await assertCurriculum(supabase, curriculumId)



    const { data: duplicate, error: duplicateError } = await supabase

      .from('curricula')

      .select('id')

      .eq('program_id', curriculum.program_id)

      .eq('name', name)

      .neq('id', curriculumId)

      .maybeSingle()



    if (duplicateError) throw duplicateError

    if (duplicate) throw new Error('duplicate_curriculum')



    const { error } = await supabase

      .from('curricula')

      .update({

        name,

        effective_from_year: effectiveFromYear,

        effective_to_year: effectiveToYear,

      })

      .eq('id', curriculumId)



    if (error) throw error



    revalidatePath(PATH)

  } catch (error) {

    console.error('updateCurriculum:', error)



    const message =

      error instanceof Error ? error.message : 'update_curriculum_failed'



    go({ error: message })

  }



  go({ success: 'curriculum_updated' })

}



export async function setCurriculumActive(formData: FormData) {
  try {
    const supabase = await getSuperAdminClient()

    const curriculumId = uuidValue(formData, 'curriculum_id')
    const active = textValue(formData, 'active') === 'true'

    const curriculum = await assertCurriculum(
      supabase,
      curriculumId
    )

    if (active) {
      /*
       * Only one curriculum may be active for a program.
       * Deactivate the other versions first, then activate
       * the selected curriculum.
       */
      const { error: deactivateError } = await supabase
        .from('curricula')
        .update({ is_active: false })
        .eq('program_id', curriculum.program_id)
        .neq('id', curriculumId)
        .eq('is_active', true)

      if (deactivateError) throw deactivateError
    }

    const { error } = await supabase
      .from('curricula')
      .update({ is_active: active })
      .eq('id', curriculumId)

    if (error) throw error

    revalidatePath(PATH)
  } catch (error) {
    console.error('setCurriculumActive:', error)

    const message =
      error instanceof Error
        ? error.message
        : 'curriculum_status_failed'

    go({ error: message })
  }

  go({ success: 'curriculum_status_updated' })
}



export async function addCurriculumSubject(formData: FormData) {

  try {

    const supabase = await getSuperAdminClient()



    const curriculumId = uuidValue(formData, 'curriculum_id')

    const subjectId = uuidValue(formData, 'subject_id')

    const yearLevelId = uuidValue(formData, 'year_level_id')

    const termOrder = positiveInteger(formData, 'term_order')

    const weeklyHours = positiveNumber(formData, 'weekly_hours')



    const roomTypeRaw = textValue(formData, 'required_room_type_id')

    const requiredRoomTypeId = roomTypeRaw || null



    const curriculum = await assertCurriculum(supabase, curriculumId)



    await assertYearLevelForProgram(

      supabase,

      yearLevelId,

      curriculum.program_id

    )



    await assertSubjectForProgramDepartment(

      supabase,

      subjectId,

      curriculum.program_id

    )



    if (requiredRoomTypeId) {

      const { data: roomType, error: roomTypeError } = await supabase

        .from('room_types')

        .select('id')

        .eq('id', requiredRoomTypeId)

        .maybeSingle()



      if (roomTypeError || !roomType) {

        throw new Error('room_type_not_found')

      }

    }



    const { data: duplicate, error: duplicateError } = await supabase

      .from('curriculum_subjects')

      .select('id')

      .eq('curriculum_id', curriculumId)

      .eq('subject_id', subjectId)

      .eq('year_level_id', yearLevelId)

      .eq('term_order', termOrder)

      .maybeSingle()



    if (duplicateError) throw duplicateError

    if (duplicate) throw new Error('duplicate_curriculum_subject')



    const { error } = await supabase

      .from('curriculum_subjects')

      .insert({

        curriculum_id: curriculumId,

        subject_id: subjectId,

        year_level_id: yearLevelId,

        term_order: termOrder,

        required_room_type_id: requiredRoomTypeId,

        weekly_hours: weeklyHours,

      })



    if (error) throw error



    revalidatePath(PATH)

  } catch (error) {

    console.error('addCurriculumSubject:', error)



    const message =

      error instanceof Error ? error.message : 'add_subject_failed'



    go({ error: message })

  }



  go({ success: 'subject_added' })

}



export async function updateCurriculumSubject(formData: FormData) {

  try {

    const supabase = await getSuperAdminClient()



    const mappingId = uuidValue(formData, 'curriculum_subject_id')

    const yearLevelId = uuidValue(formData, 'year_level_id')

    const termOrder = positiveInteger(formData, 'term_order')

    const weeklyHours = positiveNumber(formData, 'weekly_hours')



    const roomTypeRaw = textValue(formData, 'required_room_type_id')

    const requiredRoomTypeId = roomTypeRaw || null



    const { data: mapping, error: mappingError } = await supabase

      .from('curriculum_subjects')

      .select('id, curriculum_id, subject_id')

      .eq('id', mappingId)

      .maybeSingle()



    if (mappingError || !mapping) {

      throw new Error('curriculum_subject_not_found')

    }



    const curriculum = await assertCurriculum(

      supabase,

      mapping.curriculum_id

    )



    await assertYearLevelForProgram(

      supabase,

      yearLevelId,

      curriculum.program_id

    )



    if (requiredRoomTypeId) {

      const { data: roomType, error: roomTypeError } = await supabase

        .from('room_types')

        .select('id')

        .eq('id', requiredRoomTypeId)

        .maybeSingle()



      if (roomTypeError || !roomType) {

        throw new Error('room_type_not_found')

      }

    }



    const { data: duplicate, error: duplicateError } = await supabase

      .from('curriculum_subjects')

      .select('id')

      .eq('curriculum_id', mapping.curriculum_id)

      .eq('subject_id', mapping.subject_id)

      .eq('year_level_id', yearLevelId)

      .eq('term_order', termOrder)

      .neq('id', mappingId)

      .maybeSingle()



    if (duplicateError) throw duplicateError

    if (duplicate) throw new Error('duplicate_curriculum_subject')



    const { error } = await supabase

      .from('curriculum_subjects')

      .update({

        year_level_id: yearLevelId,

        term_order: termOrder,

        required_room_type_id: requiredRoomTypeId,

        weekly_hours: weeklyHours,

      })

      .eq('id', mappingId)



    if (error) throw error



    revalidatePath(PATH)

  } catch (error) {

    console.error('updateCurriculumSubject:', error)



    const message =

      error instanceof Error ? error.message : 'update_subject_failed'



    go({ error: message })

  }



  go({ success: 'subject_updated' })

}



export async function removeCurriculumSubject(formData: FormData) {

  try {

    const supabase = await getSuperAdminClient()



    const mappingId = uuidValue(formData, 'curriculum_subject_id')



    const { error } = await supabase

      .from('curriculum_subjects')

      .delete()

      .eq('id', mappingId)



    if (error) throw error



    revalidatePath(PATH)

  } catch (error) {

    console.error('removeCurriculumSubject:', error)



    const message =

      error instanceof Error ? error.message : 'remove_subject_failed'



    go({ error: message })

  }



  go({ success: 'subject_removed' })

}

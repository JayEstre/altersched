'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { getString } from '@/lib/form-data'
/* =========================================================
   HELPER — ERROR REDIRECT
\========================================================= */
function redirectWithDatabaseError(
  fallbackError: string,
  error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined
): never {
  const message =
    error?.message || error?.details || error?.hint || error?.code || 'Unknown database error'
  const details = encodeURIComponent(String(message))
  redirect(`/admin/subjects?error=${fallbackError}&details=${details}`)
}
/* =========================================================
   CREATE SUBJECT
\========================================================= */
export async function createSubject(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  /* -------------------------
     READ FORM VALUES
  ------------------------- */
  const departmentId = getString(formData, 'department_id')
  const code = String(formData.get('code') ?? '')
    .trim()
    .toUpperCase()
  const name = getString(formData, 'subject_name')
  const unitsRaw = getString(formData, 'units')
  const lectureHoursRaw = getString(formData, 'lecture_hours')
  const labHoursRaw = getString(formData, 'lab_hours')
  const descriptionRaw = getString(formData, 'description')
  const description = descriptionRaw || null
  const defaultYearRaw = getString(formData, 'default_year_level')
  const defaultYearLevel = defaultYearRaw ? Number(defaultYearRaw) : null
  const defaultRoomTypeId = getString(formData, 'default_room_type_id') || null
  /* -------------------------
     REQUIRED FIELDS
  ------------------------- */
  if (!departmentId || !code || !name || !unitsRaw || !lectureHoursRaw || !labHoursRaw) {
    redirect('/admin/subjects?error=subject_fields_required')
  }
  const units = Number(unitsRaw)
  const lectureHours = Number(lectureHoursRaw)
  const labHours = Number(labHoursRaw)
  /* -------------------------
     UNITS VALIDATION
  ------------------------- */
  if (!Number.isFinite(units) || units < 0 || units > 20) {
    redirect('/admin/subjects?error=invalid_subject_units')
  }
  /* -------------------------
     LECTURE HOURS VALIDATION
  ------------------------- */
  if (!Number.isFinite(lectureHours) || lectureHours < 0 || lectureHours > 40) {
    redirect('/admin/subjects?error=invalid_lecture_hours')
  }
  /* -------------------------
     LAB HOURS VALIDATION
  ------------------------- */
  if (!Number.isFinite(labHours) || labHours < 0 || labHours > 40) {
    redirect('/admin/subjects?error=invalid_lab_hours')
  }
  /* -------------------------
     AT LEAST ONE COMPONENT
  ------------------------- */
  if (lectureHours === 0 && labHours === 0) {
    redirect('/admin/subjects?error=subject_hours_required')
  }
  /* =====================================================
     CHECK DEPARTMENT
  ===================================================== */
  const { data: department, error: departmentError } = await supabase
    .from('departments')
    .select(
      `
      id,
      code,
      name,
      is_active
    `
    )
    .eq('id', departmentId)
    .maybeSingle()
  if (departmentError) {
    redirectWithDatabaseError('department_lookup_failed', departmentError)
  }
  if (!department) {
    redirect('/admin/subjects?error=department_not_found')
  }
  if (!department.is_active) {
    redirect('/admin/subjects?error=department_inactive')
  }
  /* =====================================================
     DUPLICATE SUBJECT CHECK
  ===================================================== */
  const { data: existingSubjects, error: existingSubjectError } = await supabase
    .from('subjects')
    .select(
      `
      id,
      code
    `
    )
    .eq('department_id', departmentId)
    .ilike('code', code)
    .limit(1)
  if (existingSubjectError) {
    redirectWithDatabaseError('subject_check_failed', existingSubjectError)
  }
  if (existingSubjects && existingSubjects.length > 0) {
    redirect('/admin/subjects?error=duplicate_subject_code')
  }
  /* =====================================================
     INSERT SUBJECT
  ===================================================== */
  const { data: subject, error: createError } = await supabase
    .from('subjects')
    .insert({
      department_id: departmentId,
      code,
      name,
      units,
      lecture_hours: lectureHours,
      lab_hours: labHours,
      description,
      default_year_level: defaultYearLevel,
      default_room_type_id: defaultRoomTypeId,
      is_active: true,
    })
    .select(
      `
      id,
      code,
      name
    `
    )
    .single()
  if (createError) {
    redirectWithDatabaseError('subject_create_failed', createError)
  }
  if (!subject) {
    redirect(
      '/admin/subjects?error=subject_create_failed&details=Insert%20completed%20without%20returning%20a%20Subject.'
    )
  }
  /* =====================================================
     REFRESH DEPENDENT PAGES
  ===================================================== */
  revalidatePath('/admin/subjects')
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
  redirect('/admin/subjects?success=subject_created')
}
/* =========================================================
   UPDATE SUBJECT
\========================================================= */
export async function updateSubject(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const subjectId = getString(formData, 'subject_id')
  const departmentId = getString(formData, 'department_id')
  const code = String(formData.get('code') ?? '')
    .trim()
    .toUpperCase()
  const name = getString(formData, 'subject_name')
  const unitsRaw = getString(formData, 'units')
  const lectureHoursRaw = getString(formData, 'lecture_hours')
  const labHoursRaw = getString(formData, 'lab_hours')
  const yearLevelRaw = getString(formData, 'default_year_level')
  const roomTypeRaw = getString(formData, 'default_room_type_id')
  const defaultFacultyId = getString(formData, 'default_faculty_id') || null
  const descriptionRaw = getString(formData, 'description')
  if (
    !subjectId ||
    !departmentId ||
    !code ||
    !name ||
    !unitsRaw ||
    !lectureHoursRaw ||
    !labHoursRaw ||
    !yearLevelRaw
  ) {
    redirect('/admin/subjects?error=subject_fields_required')
  }
  const units = Number(unitsRaw)
  const lectureHours = Number(lectureHoursRaw)
  const labHours = Number(labHoursRaw)
  const yearLevel = Number(yearLevelRaw)
  const roomTypeId = roomTypeRaw || null
  const description = descriptionRaw || null
  if (!Number.isFinite(units) || units < 0 || units > 20) {
    redirect('/admin/subjects?error=invalid_subject_units')
  }
  if (!Number.isFinite(lectureHours) || lectureHours < 0 || lectureHours > 40) {
    redirect('/admin/subjects?error=invalid_lecture_hours')
  }
  if (!Number.isFinite(labHours) || labHours < 0 || labHours > 40) {
    redirect('/admin/subjects?error=invalid_lab_hours')
  }
  if (lectureHours === 0 && labHours === 0) {
    redirect('/admin/subjects?error=subject_hours_required')
  }
  if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 4) {
    redirect('/admin/subjects?error=invalid_year_level')
  }
  /*
   * Verify that the subject exists.
   */
  const { data: currentSubject, error: subjectLookupError } = await supabase
    .from('subjects')
    .select('id,department_id,code')
    .eq('id', subjectId)
    .maybeSingle()
  if (subjectLookupError) {
    redirectWithDatabaseError('subject_lookup_failed', subjectLookupError)
  }
  if (!currentSubject) {
    redirect('/admin/subjects?error=subject_not_found')
  }
  /*
   * Do not allow the edit form to move a
   * subject into another department.
   */
  if (currentSubject.department_id !== departmentId) {
    redirect('/admin/subjects?error=department_mismatch')
  }
  /*
   * Check duplicate code, excluding
   * the current subject.
   */
  const { data: duplicateSubjects, error: duplicateError } = await supabase
    .from('subjects')
    .select('id')
    .eq('department_id', departmentId)
    .ilike('code', code)
    .neq('id', subjectId)
    .limit(1)
  if (duplicateError) {
    redirectWithDatabaseError('subject_check_failed', duplicateError)
  }
  if (duplicateSubjects && duplicateSubjects.length > 0) {
    redirect('/admin/subjects?error=duplicate_subject_code')
  }
  /*
   * Validate room type when selected.
   */
  if (roomTypeId) {
    const { data: roomType, error: roomTypeError } = await supabase
      .from('room_types')
      .select('id')
      .eq('id', roomTypeId)
      .maybeSingle()
    if (roomTypeError) {
      redirectWithDatabaseError('room_type_lookup_failed', roomTypeError)
    }
    if (!roomType) {
      redirect('/admin/subjects?error=room_type_not_found')
    }
  }
  /*
   * Validate preferred/default instructor when selected.
   */
  if (defaultFacultyId) {
    const { data: faculty, error: facultyError } = await supabase
      .from('faculty_profiles')
      .select('id,profile_id,department_id')
      .eq('id', defaultFacultyId)
      .maybeSingle()
    if (facultyError) {
      redirectWithDatabaseError('instructor_lookup_failed', facultyError)
    }
    if (!faculty || faculty.department_id !== departmentId) {
      redirect('/admin/subjects?error=invalid_subject_instructor')
    }

    const { data: instructorProfile, error: instructorProfileError } = await supabase
      .from('profiles')
      .select('id,role,account_status')
      .eq('id', faculty.profile_id)
      .maybeSingle()
    if (instructorProfileError) {
      redirectWithDatabaseError('instructor_profile_lookup_failed', instructorProfileError)
    }
    if (
      !instructorProfile ||
      instructorProfile.role !== 'faculty' ||
      instructorProfile.account_status !== 'approved'
    ) {
      redirect('/admin/subjects?error=instructor_not_approved')
    }

    const { data: qualification, error: qualificationError } = await supabase
      .from('faculty_subjects')
      .select('id')
      .eq('faculty_id', defaultFacultyId)
      .eq('subject_id', subjectId)
      .maybeSingle()
    if (qualificationError) {
      redirectWithDatabaseError('instructor_qualification_lookup_failed', qualificationError)
    }
    if (!qualification) {
      redirect('/admin/subjects?error=instructor_not_qualified')
    }
  }

  /*
   * Save subject.
   */
  const { error: updateError } = await supabase
    .from('subjects')
    .update({
      code,
      name,
      units,
      lecture_hours: lectureHours,
      lab_hours: labHours,
      default_year_level: yearLevel,
      default_room_type_id: roomTypeId,
      default_faculty_id: defaultFacultyId,
      description,
    })
    .eq('id', subjectId)
  if (updateError) {
    redirectWithDatabaseError('subject_update_failed', updateError)
  }
  /*
   * Refresh pages that depend on
   * subject information.
   */
  revalidatePath('/admin/subjects')
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/class-offerings')
  redirect('/admin/subjects?success=subject_updated')
}

/* =========================================================
   SET SUBJECT STATUS
========================================================= */
export async function setSubjectStatus(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const subjectId = getString(formData, 'subject_id')
  const statusRaw = getString(formData, 'is_active')
  if (!subjectId) redirect('/admin/subjects?error=subject_id_required')
  if (statusRaw !== 'true' && statusRaw !== 'false')
    redirect('/admin/subjects?error=invalid_subject_status')
  const isActive = statusRaw === 'true'
  const { data: subject, error: lookupError } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', subjectId)
    .maybeSingle()
  if (lookupError) redirectWithDatabaseError('subject_lookup_failed', lookupError)
  if (!subject) redirect('/admin/subjects?error=subject_not_found')
  const { error: updateError } = await supabase
    .from('subjects')
    .update({ is_active: isActive })
    .eq('id', subjectId)
  if (updateError) redirectWithDatabaseError('subject_status_update_failed', updateError)
  revalidatePath('/admin/subjects')
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/class-offerings')
  redirect(`/admin/subjects?success=${isActive ? 'subject_reactivated' : 'subject_deactivated'}`)
}

/* =========================================================
   DELETE SUBJECT PERMANENTLY
========================================================= */
export async function deleteSubject(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const subjectId = getString(formData, 'subject_id')
  if (!subjectId) redirect('/admin/subjects?error=subject_id_required')
  const { data: subject, error: lookupError } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', subjectId)
    .maybeSingle()
  if (lookupError) redirectWithDatabaseError('subject_lookup_failed', lookupError)
  if (!subject) redirect('/admin/subjects?error=subject_not_found')
  const { error: deleteError } = await supabase.from('subjects').delete().eq('id', subjectId)
  if (deleteError) {
    if (deleteError.code === '23503') redirect('/admin/subjects?error=subject_in_use')
    redirectWithDatabaseError('subject_delete_failed', deleteError)
  }
  revalidatePath('/admin/subjects')
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/class-offerings')
  redirect('/admin/subjects?success=subject_deleted')
}

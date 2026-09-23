'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

/* =========================================================
   HELPERS
========================================================= */

function clean(value: FormDataEntryValue | null) {
  return String(value ?? '').trim()
}

function redirectError(
  error: string,
  details?: string
): never {
  const params = new URLSearchParams()

  params.set('error', error)

  if (details) {
    params.set('details', details)
  }

  redirect(
    `/admin/faculty?${params.toString()}`
  )
}

function redirectSuccess(
  success: string
): never {
  redirect(
    `/admin/faculty?success=${encodeURIComponent(
      success
    )}`
  )
}

function refreshFacultyPages() {
  revalidatePath('/admin/faculty')
  revalidatePath('/admin/class-offerings')
  revalidatePath('/admin/schedule-builder')
}

/* =========================================================
   CREATE FACULTY PROFILE
========================================================= */

export async function createFacultyProfile(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const supabase = await createClient()

  const profileId = clean(
    formData.get('profile_id')
  )

  const employeeId = clean(
    formData.get('employee_id')
  ).toUpperCase()

  const departmentId = clean(
    formData.get('department_id')
  )

  const employmentTypeRaw = clean(
    formData.get('employment_type')
  )

  const maxTeachingLoadRaw = clean(
    formData.get('max_teaching_load')
  )

  /* =====================================================
     REQUIRED FIELDS
  ===================================================== */

  if (
    !profileId ||
    !employeeId ||
    !departmentId
  ) {
    redirectError(
      'faculty_fields_required'
    )
  }

  /* =====================================================
     MAX TEACHING LOAD
  ===================================================== */

  let maxTeachingLoad: number | null = null

  if (maxTeachingLoadRaw) {
    const parsed = Number(
      maxTeachingLoadRaw
    )

    if (
      !Number.isFinite(parsed) ||
      parsed <= 0 ||
      parsed > 60
    ) {
      redirectError(
        'invalid_teaching_load'
      )
    }

    maxTeachingLoad = parsed
  }

  const employmentType =
    employmentTypeRaw || null

  /* =====================================================
     CONFIRM APPROVED FACULTY ACCOUNT
  ===================================================== */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      account_status,
      full_name,
      email
    `)
    .eq('id', profileId)
    .maybeSingle()

  if (profileError) {
    console.error(
      'Faculty account lookup failed:',
      profileError
    )

    redirectError(
      'faculty_account_lookup_failed',
      profileError.message
    )
  }

  if (!profile) {
    redirectError(
      'faculty_account_not_found'
    )
  }

  /*
   * A department_scheduler is still fundamentally
   * a Faculty member for scheduling purposes.
   */
  if (
    profile.role !== 'faculty' &&
    profile.role !==
      'department_scheduler'
  ) {
    redirectError(
      'account_not_faculty'
    )
  }

  if (
    profile.account_status !==
    'approved'
  ) {
    redirectError(
      'faculty_not_approved'
    )
  }

  /* =====================================================
     CONFIRM DEPARTMENT
  ===================================================== */

  const {
    data: department,
    error: departmentError,
  } = await supabase
    .from('departments')
    .select(`
      id,
      is_active
    `)
    .eq('id', departmentId)
    .maybeSingle()

  if (departmentError) {
    console.error(
      'Department lookup failed:',
      departmentError
    )

    redirectError(
      'department_lookup_failed',
      departmentError.message
    )
  }

  if (!department) {
    redirectError(
      'department_not_found'
    )
  }

  if (!department.is_active) {
    redirectError(
      'department_inactive'
    )
  }

  /* =====================================================
     PREVENT DUPLICATE PROFILE
  ===================================================== */

  const {
    data: existingFaculty,
    error: existingFacultyError,
  } = await supabase
    .from('faculty_profiles')
    .select(`
      id,
      profile_id,
      employee_id
    `)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existingFacultyError) {
    console.error(
      'Existing Faculty lookup failed:',
      existingFacultyError
    )

    redirectError(
      'faculty_check_failed',
      existingFacultyError.message
    )
  }

  if (existingFaculty) {
    redirectError(
      'faculty_profile_exists'
    )
  }

  /* =====================================================
     PREVENT DUPLICATE EMPLOYEE ID
  ===================================================== */

  const {
    data: duplicateEmployee,
    error: employeeCheckError,
  } = await supabase
    .from('faculty_profiles')
    .select(`
      id,
      employee_id
    `)
    .ilike(
      'employee_id',
      employeeId
    )
    .maybeSingle()

  if (employeeCheckError) {
    console.error(
      'Employee ID lookup failed:',
      employeeCheckError
    )

    redirectError(
      'employee_check_failed',
      employeeCheckError.message
    )
  }

  if (duplicateEmployee) {
    redirectError(
      'duplicate_employee_id'
    )
  }

  /* =====================================================
     CREATE FACULTY PROFILE
  ===================================================== */

  const {
    data: faculty,
    error: createError,
  } = await supabase
    .from('faculty_profiles')
    .insert({
      profile_id: profileId,
      employee_id: employeeId,
      department_id: departmentId,
      employment_type:
        employmentType,
      max_teaching_load:
        maxTeachingLoad,
    })
    .select(`
      id,
      profile_id
    `)
    .single()

  if (createError || !faculty) {
    console.error(
      'Faculty profile creation failed:',
      createError
    )

    redirectError(
      'faculty_create_failed',
      createError?.message ??
        'The Faculty profile was not returned after creation.'
    )
  }

  refreshFacultyPages()

  redirectSuccess(
    'faculty_created'
  )
}

/* =========================================================
   ASSIGN QUALIFIED SUBJECT
========================================================= */

export async function assignFacultySubject(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const supabase = await createClient()

  const facultyId = clean(
    formData.get('faculty_id')
  )

  const subjectId = clean(
    formData.get('subject_id')
  )

  if (!facultyId || !subjectId) {
    redirectError(
      'faculty_subject_required'
    )
  }

  /* =====================================================
     CONFIRM FACULTY
  ===================================================== */

  const {
    data: faculty,
    error: facultyError,
  } = await supabase
    .from('faculty_profiles')
    .select(`
      id,
      department_id
    `)
    .eq('id', facultyId)
    .maybeSingle()

  if (facultyError) {
    console.error(
      'Faculty lookup failed:',
      facultyError
    )

    redirectError(
      'faculty_lookup_failed',
      facultyError.message
    )
  }

  if (!faculty) {
    redirectError(
      'faculty_not_found'
    )
  }

  /* =====================================================
     CONFIRM SUBJECT
  ===================================================== */

  const {
    data: subject,
    error: subjectError,
  } = await supabase
    .from('subjects')
    .select(`
      id,
      department_id,
      is_active
    `)
    .eq('id', subjectId)
    .maybeSingle()

  if (subjectError) {
    console.error(
      'Subject lookup failed:',
      subjectError
    )

    redirectError(
      'subject_lookup_failed',
      subjectError.message
    )
  }

  if (!subject) {
    redirectError(
      'subject_not_found'
    )
  }

  if (!subject.is_active) {
    redirectError(
      'subject_inactive'
    )
  }

  /*
   * For V1 we keep Faculty qualifications
   * within the Faculty member's Department.
   */
  if (
    subject.department_id !==
    faculty.department_id
  ) {
    redirectError(
      'subject_department_mismatch'
    )
  }

  /* =====================================================
     CHECK DUPLICATE QUALIFICATION
  ===================================================== */

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from('faculty_subjects')
    .select('id')
    .eq(
      'faculty_id',
      facultyId
    )
    .eq(
      'subject_id',
      subjectId
    )
    .maybeSingle()

  if (existingError) {
    console.error(
      'Faculty Subject duplicate check failed:',
      existingError
    )

    redirectError(
      'faculty_subject_check_failed',
      existingError.message
    )
  }

  if (existing) {
    redirectError(
      'faculty_subject_exists'
    )
  }

  /* =====================================================
     INSERT QUALIFICATION
  ===================================================== */

  const {
    error: insertError,
  } = await supabase
    .from('faculty_subjects')
    .insert({
      faculty_id: facultyId,
      subject_id: subjectId,
    })

  if (insertError) {
    console.error(
      'Faculty Subject assignment failed:',
      insertError
    )

    redirectError(
      'faculty_subject_create_failed',
      insertError.message
    )
  }

  refreshFacultyPages()

  redirectSuccess(
    'faculty_subject_added'
  )
}

/* =========================================================
   REMOVE QUALIFIED SUBJECT
========================================================= */

export async function removeFacultySubject(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const supabase = await createClient()

  const facultySubjectId = clean(
    formData.get(
      'faculty_subject_id'
    )
  )

  if (!facultySubjectId) {
    redirectError(
      'faculty_subject_id_required'
    )
  }

  const {
    data: qualification,
    error: lookupError,
  } = await supabase
    .from('faculty_subjects')
    .select(`
      id,
      faculty_id
    `)
    .eq(
      'id',
      facultySubjectId
    )
    .maybeSingle()

  if (lookupError) {
    console.error(
      'Faculty Subject lookup failed:',
      lookupError
    )

    redirectError(
      'faculty_subject_lookup_failed',
      lookupError.message
    )
  }

  if (!qualification) {
    redirectError(
      'faculty_subject_not_found'
    )
  }

  const {
    error: deleteError,
  } = await supabase
    .from('faculty_subjects')
    .delete()
    .eq(
      'id',
      facultySubjectId
    )

  if (deleteError) {
    console.error(
      'Faculty Subject removal failed:',
      deleteError
    )

    redirectError(
      'faculty_subject_remove_failed',
      deleteError.message
    )
  }

  refreshFacultyPages()

  redirectSuccess(
    'faculty_subject_removed'
  )
}

/* =========================================================
   ADD FACULTY AVAILABILITY
========================================================= */

export async function addFacultyAvailability(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const supabase = await createClient()

  const facultyId = clean(
    formData.get('faculty_id')
  )

  const semesterId = clean(
    formData.get('semester_id')
  )

  const dayOfWeekRaw = clean(
    formData.get('day_of_week')
  )

  const startTime = clean(
    formData.get('start_time')
  )

  const endTime = clean(
    formData.get('end_time')
  )

  const availabilityType = clean(
    formData.get(
      'availability_type'
    )
  )

  if (
    !facultyId ||
    !semesterId ||
    !dayOfWeekRaw ||
    !startTime ||
    !endTime ||
    !availabilityType
  ) {
    redirectError(
      'availability_fields_required'
    )
  }

  const dayOfWeek = Number(
    dayOfWeekRaw
  )

  /*
   * AlterSched convention:
   * 1 = Monday
   * 2 = Tuesday
   * 3 = Wednesday
   * 4 = Thursday
   * 5 = Friday
   * 6 = Saturday
   * 7 = Sunday
   */
  if (
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 7
  ) {
    redirectError(
      'invalid_day'
    )
  }

  if (
    ![
      'available',
      'preferred',
      'unavailable',
    ].includes(
      availabilityType
    )
  ) {
    redirectError(
      'invalid_availability_type'
    )
  }

  if (
    timeToMinutes(startTime) >=
    timeToMinutes(endTime)
  ) {
    redirectError(
      'invalid_availability_time'
    )
  }

  /* =====================================================
     CONFIRM FACULTY
  ===================================================== */

  const {
    data: faculty,
    error: facultyError,
  } = await supabase
    .from('faculty_profiles')
    .select('id')
    .eq('id', facultyId)
    .maybeSingle()

  if (facultyError) {
    console.error(
      'Faculty lookup failed:',
      facultyError
    )

    redirectError(
      'faculty_lookup_failed',
      facultyError.message
    )
  }

  if (!faculty) {
    redirectError(
      'faculty_not_found'
    )
  }

  /* =====================================================
     CONFIRM SEMESTER
  ===================================================== */

  const {
    data: semester,
    error: semesterError,
  } = await supabase
    .from('semesters')
    .select(`
      id,
      is_active
    `)
    .eq('id', semesterId)
    .maybeSingle()

  if (semesterError) {
    console.error(
      'Semester lookup failed:',
      semesterError
    )

    redirectError(
      'semester_lookup_failed',
      semesterError.message
    )
  }

  if (!semester) {
    redirectError(
      'semester_not_found'
    )
  }

  /* =====================================================
     CHECK EXACT DUPLICATE
  ===================================================== */

  const {
    data: existingAvailability,
    error: duplicateError,
  } = await supabase
    .from('faculty_availability')
    .select('id')
    .eq(
      'faculty_id',
      facultyId
    )
    .eq(
      'semester_id',
      semesterId
    )
    .eq(
      'day_of_week',
      dayOfWeek
    )
    .eq(
      'start_time',
      startTime
    )
    .eq(
      'end_time',
      endTime
    )
    .eq(
      'availability_type',
      availabilityType
    )
    .maybeSingle()

  if (duplicateError) {
    console.error(
      'Availability duplicate check failed:',
      duplicateError
    )

    redirectError(
      'availability_check_failed',
      duplicateError.message
    )
  }

  if (existingAvailability) {
    redirectError(
      'availability_exists'
    )
  }

  /* =====================================================
     INSERT AVAILABILITY
  ===================================================== */

  const {
    error: insertError,
  } = await supabase
    .from('faculty_availability')
    .insert({
      faculty_id: facultyId,
      semester_id: semesterId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      availability_type:
        availabilityType,
    })

  if (insertError) {
    console.error(
      'Faculty Availability creation failed:',
      insertError
    )

    redirectError(
      'availability_create_failed',
      insertError.message
    )
  }

  refreshFacultyPages()

  redirectSuccess(
    'availability_added'
  )
}

/* =========================================================
   REMOVE FACULTY AVAILABILITY
========================================================= */

export async function removeFacultyAvailability(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const supabase = await createClient()

  const availabilityId = clean(
    formData.get(
      'availability_id'
    )
  )

  if (!availabilityId) {
    redirectError(
      'availability_id_required'
    )
  }

  const {
    data: availability,
    error: lookupError,
  } = await supabase
    .from('faculty_availability')
    .select(`
      id,
      faculty_id
    `)
    .eq(
      'id',
      availabilityId
    )
    .maybeSingle()

  if (lookupError) {
    console.error(
      'Faculty Availability lookup failed:',
      lookupError
    )

    redirectError(
      'availability_lookup_failed',
      lookupError.message
    )
  }

  if (!availability) {
    redirectError(
      'availability_not_found'
    )
  }

  const {
    error: deleteError,
  } = await supabase
    .from('faculty_availability')
    .delete()
    .eq(
      'id',
      availabilityId
    )

  if (deleteError) {
    console.error(
      'Faculty Availability removal failed:',
      deleteError
    )

    redirectError(
      'availability_remove_failed',
      deleteError.message
    )
  }

  refreshFacultyPages()

  redirectSuccess(
    'availability_removed'
  )
}

/* =========================================================
   TIME HELPER
========================================================= */

function timeToMinutes(
  value: string
) {
  const [hourRaw, minuteRaw] =
    value.split(':')

  const hour = Number(hourRaw)
  const minute = Number(
    minuteRaw
  )

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return Number.NaN
  }

  return hour * 60 + minute
}
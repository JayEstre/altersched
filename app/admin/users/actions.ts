'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

type AccountStatus =
  | 'approved'
  | 'rejected'
  | 'suspended'

type ManagedRole =
  | 'student'
  | 'faculty'
  | 'department_scheduler'
  | 'super_admin'

async function setStatus(
  formData: FormData,
  status: AccountStatus
) {
  /*
   * Only the Super Admin may approve,
   * reject, or suspend accounts.
   */
  await requireRole(['super_admin'])

  const profileId = String(
    formData.get('profile_id') ?? ''
  ).trim()

  if (!profileId) {
    redirect(
      '/admin/users?error=missing_profile'
    )
  }

  const supabase = await createClient()

  /* =========================================================
     TARGET ACCOUNT
     ========================================================= */

  const {
    data: targetUser,
    error: targetError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      account_status
    `)
    .eq('id', profileId)
    .maybeSingle()

  if (targetError) {
    console.error(
      'Failed to load target account:',
      targetError
    )

    redirect(
      '/admin/users?error=user_lookup_failed'
    )
  }

  if (!targetUser) {
    redirect(
      '/admin/users?error=user_not_found'
    )
  }

  const role =
    targetUser.role as ManagedRole

  /*
   * A Super Admin account must never be
   * modified through User Management.
   */
  if (role === 'super_admin') {
    redirect(
      '/admin/users?error=protected_admin'
    )
  }

  /* =========================================================
     APPROVAL VALIDATION
     ========================================================= */

  if (status === 'approved') {
    /*
     * Student accounts must already have a
     * complete student_profiles record.
     */
    if (role === 'student') {
      const {
        data: studentProfile,
        error: studentError,
      } = await supabase
        .from('student_profiles')
        .select(`
          id,
          student_id,
          department_id,
          program_id,
          year_level_id,
          section_id
        `)
        .eq('profile_id', profileId)
        .maybeSingle()

      if (studentError) {
        console.error(
          'Failed to validate student profile:',
          studentError
        )

        redirect(
          '/admin/users?error=student_profile_lookup_failed'
        )
      }

      if (!studentProfile) {
        redirect(
          '/admin/users?error=student_profile_missing'
        )
      }

      if (
        !studentProfile.student_id ||
        !studentProfile.department_id ||
        !studentProfile.program_id ||
        !studentProfile.year_level_id ||
        !studentProfile.section_id
      ) {
        redirect(
          '/admin/users?error=student_profile_incomplete'
        )
      }

      /*
       * Verify that the selected Program,
       * Year Level, and Section still form
       * a valid academic hierarchy.
       */
      const {
        data: program,
        error: programError,
      } = await supabase
        .from('programs')
        .select(`
          id,
          department_id,
          is_active
        `)
        .eq(
          'id',
          studentProfile.program_id
        )
        .maybeSingle()

      if (
        programError ||
        !program ||
        !program.is_active
      ) {
        console.error(
          'Student program validation failed:',
          programError
        )

        redirect(
          '/admin/users?error=invalid_student_program'
        )
      }

      if (
        program.department_id !==
        studentProfile.department_id
      ) {
        redirect(
          '/admin/users?error=invalid_student_department'
        )
      }

      const {
        data: yearLevel,
        error: yearLevelError,
      } = await supabase
        .from('year_levels')
        .select(`
          id,
          program_id,
          is_active
        `)
        .eq(
          'id',
          studentProfile.year_level_id
        )
        .maybeSingle()

      if (
        yearLevelError ||
        !yearLevel ||
        !yearLevel.is_active ||
        yearLevel.program_id !==
          studentProfile.program_id
      ) {
        console.error(
          'Student year-level validation failed:',
          yearLevelError
        )

        redirect(
          '/admin/users?error=invalid_student_year_level'
        )
      }

      const {
        data: section,
        error: sectionError,
      } = await supabase
        .from('sections')
        .select(`
          id,
          year_level_id,
          is_active
        `)
        .eq(
          'id',
          studentProfile.section_id
        )
        .maybeSingle()

      if (
        sectionError ||
        !section ||
        !section.is_active ||
        section.year_level_id !==
          studentProfile.year_level_id
      ) {
        console.error(
          'Student section validation failed:',
          sectionError
        )

        redirect(
          '/admin/users?error=invalid_student_section'
        )
      }
    }

    /*
     * Faculty and Department Scheduler
     * accounts require a faculty profile.
     */
    if (
      role === 'faculty' ||
      role === 'department_scheduler'
    ) {
      const {
        data: facultyProfile,
        error: facultyError,
      } = await supabase
        .from('faculty_profiles')
        .select(`
          id,
          employee_id,
          department_id
        `)
        .eq('profile_id', profileId)
        .maybeSingle()

      if (facultyError) {
        console.error(
          'Failed to validate faculty profile:',
          facultyError
        )

        redirect(
          '/admin/users?error=faculty_profile_lookup_failed'
        )
      }

      if (!facultyProfile) {
        redirect(
          '/admin/users?error=faculty_profile_missing'
        )
      }

      if (
        !facultyProfile.employee_id ||
        !facultyProfile.department_id
      ) {
        redirect(
          '/admin/users?error=faculty_profile_incomplete'
        )
      }

      /*
       * Department must still exist and be active.
       */
      const {
        data: department,
        error: departmentError,
      } = await supabase
        .from('departments')
        .select(`
          id,
          is_active
        `)
        .eq(
          'id',
          facultyProfile.department_id
        )
        .maybeSingle()

      if (
        departmentError ||
        !department ||
        !department.is_active
      ) {
        console.error(
          'Faculty department validation failed:',
          departmentError
        )

        redirect(
          '/admin/users?error=invalid_faculty_department'
        )
      }
    }
  }

  /* =========================================================
     UPDATE ACCOUNT STATUS
     ========================================================= */

  const {
    data: updatedUser,
    error: updateError,
  } = await supabase
    .from('profiles')
    .update({
      account_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select(`
      id,
      account_status
    `)
    .maybeSingle()

  if (updateError) {
    console.error(
      `Failed to set account status to ${status}:`,
      updateError
    )

    redirect(
      `/admin/users?error=${status}_failed`
    )
  }

  /*
   * Protect against an update being silently
   * prevented by RLS.
   */
  if (!updatedUser) {
    console.error(
      'Profile status update returned no row:',
      {
        profileId,
        status,
      }
    )

    redirect(
      '/admin/users?error=update_not_allowed'
    )
  }

  /* =========================================================
     REFRESH ADMIN UI
     ========================================================= */

  revalidatePath('/admin/users')
  revalidatePath('/admin/dashboard')

  /*
   * Refresh role portals as well because an
   * approval/suspension changes account access.
   */
  revalidatePath('/student')
  revalidatePath('/student/dashboard')
  revalidatePath('/faculty')
  revalidatePath('/faculty/dashboard')

  redirect(
    `/admin/users?success=${status}`
  )
}

export async function approveUser(
  formData: FormData
) {
  return setStatus(
    formData,
    'approved'
  )
}

export async function rejectUser(
  formData: FormData
) {
  return setStatus(
    formData,
    'rejected'
  )
}

export async function suspendUser(
  formData: FormData
) {
  return setStatus(
    formData,
    'suspended'
  )
}
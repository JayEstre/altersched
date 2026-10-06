'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

function refreshUsers() {
  revalidatePath('/admin/users')
  revalidatePath('/admin/dashboard')
}

/* =========================================================
   PROMOTE FACULTY → DEPARTMENT SCHEDULER
   ========================================================= */

export async function promoteToDepartmentScheduler(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const profileId = String(
    formData.get('profile_id') ?? ''
  ).trim()

  if (!profileId) {
    redirect('/admin/users?error=missing_profile')
  }

  const supabase = await createClient()

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      account_status
    `)
    .eq('id', profileId)
    .maybeSingle()

  if (profileError || !profile) {
    console.error(
      'Scheduler promotion profile lookup failed:',
      profileError
    )

    redirect(
      '/admin/users?error=user_not_found'
    )
  }

  if (
    profile.role !== 'faculty' ||
    profile.account_status !== 'approved'
  ) {
    redirect(
      '/admin/users?error=invalid_scheduler_candidate'
    )
  }

  /*
   * Scheduler must already have a valid
   * faculty profile and department.
   */
  const {
    data: facultyProfile,
    error: facultyError,
  } = await supabase
    .from('faculty_profiles')
    .select(`
      id,
      department_id
    `)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (
    facultyError ||
    !facultyProfile ||
    !facultyProfile.department_id
  ) {
    console.error(
      'Scheduler faculty profile validation failed:',
      facultyError
    )

    redirect(
      '/admin/users?error=faculty_profile_missing'
    )
  }

  const {
    data: updatedProfile,
    error: updateError,
  } = await supabase
    .from('profiles')
    .update({
      role: 'department_scheduler',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .eq('role', 'faculty')
    .eq('account_status', 'approved')
    .select('id')
    .maybeSingle()

  if (updateError || !updatedProfile) {
    console.error(
      'Scheduler promotion failed:',
      updateError
    )

    redirect(
      '/admin/users?error=scheduler_promotion_failed'
    )
  }

  refreshUsers()

  redirect(
    '/admin/users?success=scheduler_promoted'
  )
}

/* =========================================================
   ASSIGN DEPARTMENT
   ========================================================= */

export async function assignSchedulerDepartment(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const profileId = String(
    formData.get('profile_id') ?? ''
  ).trim()

  const departmentId = String(
    formData.get('department_id') ?? ''
  ).trim()

  if (!profileId || !departmentId) {
    redirect(
      '/admin/users?error=missing_scheduler_assignment'
    )
  }

  const supabase = await createClient()

  /*
   * Confirm scheduler is valid and approved.
   */
  const {
    data: scheduler,
    error: schedulerError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      account_status
    `)
    .eq('id', profileId)
    .maybeSingle()

  if (
    schedulerError ||
    !scheduler ||
    scheduler.role !== 'department_scheduler' ||
    scheduler.account_status !== 'approved'
  ) {
    console.error(
      'Scheduler validation failed:',
      schedulerError
    )

    redirect(
      '/admin/users?error=invalid_scheduler'
    )
  }

  /*
   * Confirm department exists and is active.
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
    .eq('id', departmentId)
    .maybeSingle()

  if (
    departmentError ||
    !department ||
    !department.is_active
  ) {
    console.error(
      'Scheduler department validation failed:',
      departmentError
    )

    redirect(
      '/admin/users?error=invalid_department'
    )
  }

  const {
    error: assignmentError,
  } = await supabase
    .from('scheduler_departments')
    .upsert(
      {
        profile_id: profileId,
        department_id: departmentId,
        active: true,
      },
      {
        onConflict:
          'profile_id,department_id',
      }
    )

  if (assignmentError) {
    console.error(
      'Scheduler department assignment failed:',
      assignmentError
    )

    redirect(
      '/admin/users?error=scheduler_assignment_failed'
    )
  }

  refreshUsers()

  redirect(
    '/admin/users?success=department_assigned'
  )
}

/* =========================================================
   REVOKE DEPARTMENT
   ========================================================= */

export async function revokeSchedulerDepartment(
  formData: FormData
) {
  await requireRole(['super_admin'])

  const assignmentId = String(
    formData.get('assignment_id') ?? ''
  ).trim()

  if (!assignmentId) {
    redirect(
      '/admin/users?error=missing_assignment'
    )
  }

  const supabase = await createClient()

  const {
    data: updatedAssignment,
    error,
  } = await supabase
    .from('scheduler_departments')
    .update({
      active: false,
    })
    .eq('id', assignmentId)
    .select('id')
    .maybeSingle()

  if (error || !updatedAssignment) {
    console.error(
      'Scheduler department revoke failed:',
      error
    )

    redirect(
      '/admin/users?error=scheduler_revoke_failed'
    )
  }

  refreshUsers()

  redirect(
    '/admin/users?success=department_revoked'
  )
}

/* =========================================================
   DEMOTE SCHEDULER → FACULTY
   ========================================================= */

export async function demoteSchedulerToFaculty(
  formData: FormData
) {
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

  /*
   * Verify target before changing assignments.
   */
  const {
    data: scheduler,
    error: schedulerError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role
    `)
    .eq('id', profileId)
    .maybeSingle()

  if (
    schedulerError ||
    !scheduler ||
    scheduler.role !== 'department_scheduler'
  ) {
    console.error(
      'Scheduler demotion validation failed:',
      schedulerError
    )

    redirect(
      '/admin/users?error=invalid_scheduler'
    )
  }

  /*
   * Disable all department permissions first.
   */
  const {
    error: assignmentError,
  } = await supabase
    .from('scheduler_departments')
    .update({
      active: false,
    })
    .eq('profile_id', profileId)

  if (assignmentError) {
    console.error(
      'Failed to revoke scheduler departments:',
      assignmentError
    )

    redirect(
      '/admin/users?error=scheduler_revoke_failed'
    )
  }

  const {
    data: updatedProfile,
    error: profileUpdateError,
  } = await supabase
    .from('profiles')
    .update({
      role: 'faculty',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .eq(
      'role',
      'department_scheduler'
    )
    .select('id')
    .maybeSingle()

  if (
    profileUpdateError ||
    !updatedProfile
  ) {
    console.error(
      'Scheduler demotion failed:',
      profileUpdateError
    )

    redirect(
      '/admin/users?error=scheduler_demotion_failed'
    )
  }

  refreshUsers()

  redirect(
    '/admin/users?success=scheduler_demoted'
  )
}
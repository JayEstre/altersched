'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { getString } from '@/lib/form-data'

function refreshUsers() {
  revalidatePath('/admin/users')
  revalidatePath('/admin/dashboard')
}

/* =========================================================
   PROMOTE FACULTY → DEPARTMENT SCHEDULER
   ========================================================= */

export async function promoteToDepartmentScheduler(formData: FormData) {
  await requireRole(['super_admin'])
  const profileId = getString(formData, 'profile_id')

  if (!profileId) {
    redirect('/admin/users?error=missing_profile')
  }

  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      role,
      account_status
    `
    )
    .eq('id', profileId)
    .maybeSingle()

  if (profileError || !profile) {
    console.error('Scheduler promotion profile lookup failed:', profileError)
    redirect('/admin/users?error=user_not_found')
  }

  if (profile.role !== 'faculty' || profile.account_status !== 'approved') {
    redirect('/admin/users?error=invalid_scheduler_candidate')
  }

  /*
   * Scheduler must already have a valid
   * faculty profile and department.
   */
  const { data: facultyProfile, error: facultyError } = await supabase
    .from('faculty_profiles')
    .select(
      `
      id,
      department_id
    `
    )
    .eq('profile_id', profileId)
    .maybeSingle()

  if (facultyError || !facultyProfile || !facultyProfile.department_id) {
    console.error('Scheduler faculty profile validation failed:', facultyError)
    redirect('/admin/users?error=faculty_profile_missing')
  }

  const { data: updatedProfile, error: updateError } = await supabase
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
    console.error('Scheduler promotion failed:', updateError)
    redirect('/admin/users?error=scheduler_promotion_failed')
  }

  /*
   * A scheduler can only manage departments listed in
   * scheduler_departments (see can_manage_department()).
   * Grant the instructor's own department automatically,
   * otherwise the new scheduler cannot create or edit anything.
   */
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const { error: departmentAssignError } = await supabase.from('scheduler_departments').upsert(
    {
      profile_id: profileId,
      department_id: facultyProfile.department_id,
      active: true,
      assigned_by: adminUser?.id ?? null,
    },
    {
      onConflict: 'profile_id,department_id',
    }
  )

  if (departmentAssignError) {
    console.error('Scheduler department assignment failed:', departmentAssignError)

    // Roll back the role change so the account is not left half-promoted.
    await supabase
      .from('profiles')
      .update({ role: 'faculty', updated_at: new Date().toISOString() })
      .eq('id', profileId)

    redirect('/admin/users?error=scheduler_assignment_failed')
  }

  refreshUsers()
  redirect('/admin/users?success=scheduler_promoted')
}

/* =========================================================
   DEMOTE SCHEDULER → FACULTY
   ========================================================= */

export async function demoteSchedulerToFaculty(formData: FormData) {
  await requireRole(['super_admin'])
  const profileId = getString(formData, 'profile_id')

  if (!profileId) {
    redirect('/admin/users?error=missing_profile')
  }

  const supabase = await createClient()

  /*
   * Verify target before changing assignments.
   */
  const { data: scheduler, error: schedulerError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      role
    `
    )
    .eq('id', profileId)
    .maybeSingle()

  if (schedulerError || !scheduler || scheduler.role !== 'department_scheduler') {
    console.error('Scheduler demotion validation failed:', schedulerError)
    redirect('/admin/users?error=invalid_scheduler')
  }

  /*
   * Disable all department permissions first.
   */
  const { error: assignmentError } = await supabase
    .from('scheduler_departments')
    .update({
      active: false,
    })
    .eq('profile_id', profileId)

  if (assignmentError) {
    console.error('Failed to revoke scheduler departments:', assignmentError)
    redirect('/admin/users?error=scheduler_revoke_failed')
  }

  const { data: updatedProfile, error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      role: 'faculty',
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .eq('role', 'department_scheduler')
    .select('id')
    .maybeSingle()

  if (profileUpdateError || !updatedProfile) {
    console.error('Scheduler demotion failed:', profileUpdateError)
    redirect('/admin/users?error=scheduler_demotion_failed')
  }

  refreshUsers()
  redirect('/admin/users?success=scheduler_demoted')
}

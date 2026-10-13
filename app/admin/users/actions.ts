'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { getString } from '@/lib/form-data'

type AccountStatus = 'approved' | 'rejected' | 'suspended'

async function setStatus(formData: FormData, status: AccountStatus) {
  await requireRole(['super_admin'])
  const profileId = getString(formData, 'profile_id')
  if (!profileId) redirect('/admin/users?error=missing_profile')

  const supabase = await createClient()
  const { data: targetUser, error: targetError } = await supabase
    .from('profiles')
    .select('id,role,account_status')
    .eq('id', profileId)
    .maybeSingle()

  if (targetError || !targetUser) {
    console.error('Failed to load target Instructor account:', targetError)
    redirect('/admin/users?error=user_not_found')
  }

  const role = targetUser.role as string
  if (role !== 'faculty' && role !== 'department_scheduler') {
    redirect('/admin/users?error=role_not_managed')
  }

  if (status === 'approved') {
    const { data: facultyProfile, error: facultyError } = await supabase
      .from('faculty_profiles')
      .select('id,employee_id,department_id')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (facultyError) {
      console.error('Failed to validate Instructor profile:', facultyError)
      redirect('/admin/users?error=faculty_profile_lookup_failed')
    }
    if (!facultyProfile) redirect('/admin/users?error=faculty_profile_missing')
    if (!facultyProfile.employee_id || !facultyProfile.department_id) {
      redirect('/admin/users?error=faculty_profile_incomplete')
    }

    const { data: department, error: departmentError } = await supabase
      .from('departments')
      .select('id,is_active')
      .eq('id', facultyProfile.department_id)
      .maybeSingle()

    if (departmentError || !department?.is_active) {
      console.error('Instructor department validation failed:', departmentError)
      redirect('/admin/users?error=invalid_faculty_department')
    }
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from('profiles')
    .update({ account_status: status, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .in('role', ['faculty', 'department_scheduler'])
    .select('id,account_status')
    .maybeSingle()

  if (updateError || !updatedUser) {
    console.error(`Failed to set Instructor account status to ${status}:`, updateError)
    redirect(`/admin/users?error=${status}_failed`)
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/dashboard')
  revalidatePath('/faculty')
  revalidatePath('/faculty/dashboard')
  revalidatePath('/scheduler')
  revalidatePath('/scheduler/dashboard')
  redirect(`/admin/users?success=${status}`)
}

export async function approveUser(formData: FormData) {
  return setStatus(formData, 'approved')
}
export async function rejectUser(formData: FormData) {
  return setStatus(formData, 'rejected')
}
export async function suspendUser(formData: FormData) {
  return setStatus(formData, 'suspended')
}

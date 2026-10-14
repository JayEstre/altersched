'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { assignInstructor, findInstructorClash } from '@/lib/assignments'
import { requireRole } from '@/lib/auth/require-role'
import { getString } from '@/lib/form-data'
import { createClient } from '@/lib/supabase/server'

/** Pages that can change a class's instructor (first one is the fallback). */
const RETURN_PATHS = [
  '/admin/class-offerings',
  '/scheduler/class-offerings',
  '/admin/subjects',
] as const

function returnPath(formData: FormData) {
  const requested = getString(formData, 'return_to')
  return RETURN_PATHS.find((path) => requested === path) ?? RETURN_PATHS[0]
}

function back(path: string, query: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(query).toString()}`)
}

/**
 * Change or clear the instructor of a class offering.
 * Used by the Super Admin (Class Offerings) and the Department Scheduler (Scheduling Inputs).
 * Form fields: offering_id, faculty_id, intent ("assign" | "clear"), return_to.
 */
export async function updateOfferingInstructor(formData: FormData) {
  await requireRole(['super_admin', 'department_scheduler'])
  const supabase = await createClient()
  const path = returnPath(formData)
  const offeringId = getString(formData, 'offering_id')
  const clear = getString(formData, 'intent') === 'clear'
  const facultyId = clear ? null : getString(formData, 'faculty_id') || null

  if (!offeringId) back(path, { error: 'offering_not_found' })
  if (!clear && !facultyId) back(path, { error: 'assignment_required' })

  if (facultyId) {
    const clash = await findInstructorClash(supabase, facultyId, offeringId)
    if (clash) back(path, { error: 'instructor_clash', details: clash })
  }

  const result = await assignInstructor(supabase, offeringId, facultyId, 'manual')
  if (!result.ok) {
    console.error('Instructor assignment failed:', result.message)
    back(path, { error: 'assignment_failed', details: result.message })
  }

  for (const page of [...RETURN_PATHS, '/scheduler/schedule-builder', '/scheduler/schedules']) {
    revalidatePath(page)
  }
  back(path, {
    success: clear ? 'faculty_unassigned' : 'faculty_assigned',
    sessions: String(result.sessionsUpdated),
  })
}

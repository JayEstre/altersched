'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getString } from '@/lib/form-data'
=======

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

/* ============================================================
   HELPERS
============================================================ */

<<<<<<< HEAD
function schedulesPath(query = '') {
  return `/scheduler/schedules${query}`
}

function refreshSchedulePaths(scheduleId: string) {
  revalidatePath('/scheduler/schedules')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/scheduler/alterations')
  revalidatePath('/admin/schedules')
  revalidatePath(`/admin/schedules/${scheduleId}`)
=======
function field(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) ?? ''
  ).trim()
}

function schedulesPath(
  query = ''
) {
  return `/scheduler/schedules${query}`
}

function refreshSchedulePaths(
  scheduleId: string
) {
  revalidatePath(
    '/scheduler/schedules'
  )

  revalidatePath(
    '/scheduler/schedule-builder'
  )

  revalidatePath(
    '/scheduler/alterations'
  )

  revalidatePath(
    '/admin/schedules'
  )

  revalidatePath(
    `/admin/schedules/${scheduleId}`
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

/* ============================================================
   SUBMIT SCHEDULE FOR SUPER ADMIN REVIEW
<<<<<<< HEAD
   FINAL WORKFLOW:
=======

   FINAL WORKFLOW:

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
   Department Scheduler
        ↓
   Draft
        ↓
   Review / Edit
        ↓
   Validation
        ↓
   Submit for Admin Review
        ↓
   Schedule + Version = submitted
        ↓
   LOCKED FROM SCHEDULER EDITING
        ↓
   Super Admin Final Review
        ↓
   Publish
        ↓
   Generate Code / QR
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
   IMPORTANT:
   - Department Scheduler NEVER publishes.
   - Department Scheduler NEVER generates Code/QR.
   - Only the current Draft version can be submitted.
   - Schedule must belong to an actively managed department.
============================================================ */

<<<<<<< HEAD
export async function submitScheduleForAdminReview(formData: FormData) {
=======
export async function submitScheduleForAdminReview(
  formData: FormData
) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  /* ==========================================================
     AUTHORIZATION
  ========================================================== */

<<<<<<< HEAD
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const scheduleId = getString(formData, 'schedule_id')
=======
  const { profile } =
    await requireRole([
      'department_scheduler',
    ])

  const supabase =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* ==========================================================
     REQUIRE SCHEDULE ID
  ========================================================== */

  if (!scheduleId) {
<<<<<<< HEAD
    redirect(schedulesPath('?error=schedule_required'))
=======
    redirect(
      schedulesPath(
        '?error=schedule_required'
      )
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ==========================================================
     LOAD SCHEDULE
  ========================================================== */

<<<<<<< HEAD
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select(
      `
=======
  const {
    data: schedule,
    error: scheduleError,
  } = await supabase
    .from('schedules')
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      title,
      status,
      department_id,
      current_version_id
<<<<<<< HEAD
    `
    )
    .eq('id', scheduleId)
    .maybeSingle()

  if (scheduleError || !schedule) {
    redirect(
      schedulesPath(
        `?error=schedule_not_found${
          scheduleError ? `&details=${encodeURIComponent(scheduleError.message)}` : ''
=======
    `)
    .eq(
      'id',
      scheduleId
    )
    .maybeSingle()

  if (
    scheduleError ||
    !schedule
  ) {
    redirect(
      schedulesPath(
        `?error=schedule_not_found${
          scheduleError
            ? `&details=${encodeURIComponent(
                scheduleError.message
              )}`
            : ''
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        }`
      )
    )
  }

  /* ==========================================================
     VERIFY ACTIVE DEPARTMENT ACCESS
<<<<<<< HEAD
     Never trust the page/UI alone.
  ========================================================== */

  const { data: departmentAccess, error: departmentAccessError } = await supabase
    .from('scheduler_departments')
    .select(
      `
      department_id
    `
    )
    .eq('profile_id', profile.id)
    .eq('department_id', schedule.department_id)
    .eq('active', true)
    .maybeSingle()

  if (departmentAccessError || !departmentAccess) {
    redirect(schedulesPath('?error=schedule_not_found'))
=======

     Never trust the page/UI alone.
  ========================================================== */

  const {
    data: departmentAccess,
    error: departmentAccessError,
  } = await supabase
    .from(
      'scheduler_departments'
    )
    .select(`
      department_id
    `)
    .eq(
      'profile_id',
      profile.id
    )
    .eq(
      'department_id',
      schedule.department_id
    )
    .eq(
      'active',
      true
    )
    .maybeSingle()

  if (
    departmentAccessError ||
    !departmentAccess
  ) {
    redirect(
      schedulesPath(
        '?error=schedule_not_found'
      )
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ==========================================================
     REQUIRE CURRENT VERSION
  ========================================================== */

<<<<<<< HEAD
  if (!schedule.current_version_id) {
    redirect(schedulesPath('?error=no_current_version'))
=======
  if (
    !schedule.current_version_id
  ) {
    redirect(
      schedulesPath(
        '?error=no_current_version'
      )
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ==========================================================
     REQUIRE TRUE DRAFT SCHEDULE
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     Submitted / Published / Archived schedules are read-only
     from the Department Scheduler submission workflow.
  ========================================================== */

<<<<<<< HEAD
  if (schedule.status === 'submitted') {
    redirect(schedulesPath('?error=already_submitted'))
  }

  if (schedule.status === 'published' || schedule.status === 'archived') {
    redirect(schedulesPath('?error=schedule_read_only'))
  }

  if (schedule.status !== 'draft') {
    redirect(schedulesPath('?error=invalid_schedule_status'))
=======
  if (
    schedule.status ===
    'submitted'
  ) {
    redirect(
      schedulesPath(
        '?error=already_submitted'
      )
    )
  }

  if (
    schedule.status ===
      'published' ||
    schedule.status ===
      'archived'
  ) {
    redirect(
      schedulesPath(
        '?error=schedule_read_only'
      )
    )
  }

  if (
    schedule.status !==
    'draft'
  ) {
    redirect(
      schedulesPath(
        '?error=invalid_schedule_status'
      )
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ==========================================================
     LOAD CURRENT VERSION
  ========================================================== */

<<<<<<< HEAD
  const { data: version, error: versionError } = await supabase
    .from('schedule_versions')
    .select(
      `
=======
  const {
    data: version,
    error: versionError,
  } = await supabase
    .from(
      'schedule_versions'
    )
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      schedule_id,
      version_number,
      status
<<<<<<< HEAD
    `
    )
    .eq('id', schedule.current_version_id)
    .eq('schedule_id', schedule.id)
    .maybeSingle()

  if (versionError || !version) {
    redirect(
      schedulesPath(
        `?error=no_current_version${
          versionError ? `&details=${encodeURIComponent(versionError.message)}` : ''
=======
    `)
    .eq(
      'id',
      schedule.current_version_id
    )
    .eq(
      'schedule_id',
      schedule.id
    )
    .maybeSingle()

  if (
    versionError ||
    !version
  ) {
    redirect(
      schedulesPath(
        `?error=no_current_version${
          versionError
            ? `&details=${encodeURIComponent(
                versionError.message
              )}`
            : ''
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        }`
      )
    )
  }

  /* ==========================================================
     CURRENT VERSION MUST ALSO BE DRAFT
<<<<<<< HEAD
     Prevent schedule/version state mismatch.
  ========================================================== */

  if (version.status !== 'draft') {
    redirect(schedulesPath('?error=invalid_version_status'))
=======

     Prevent schedule/version state mismatch.
  ========================================================== */

  if (
    version.status !==
    'draft'
  ) {
    redirect(
      schedulesPath(
        '?error=invalid_version_status'
      )
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ==========================================================
     VERIFY TIMETABLE HAS ENTRIES
  ========================================================== */

<<<<<<< HEAD
  const { count: entryCount, error: entryError } = await supabase
    .from('schedule_entries')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('schedule_version_id', version.id)

  if (entryError) {
    redirect(
      schedulesPath(`?error=entry_lookup_failed&details=${encodeURIComponent(entryError.message)}`)
    )
  }

  if (!entryCount || entryCount < 1) {
    redirect(schedulesPath('?error=empty_schedule'))
  }

  /* ==========================================================
     REQUIRE ASSIGNED INSTRUCTORS BEFORE SUBMISSION
     Draft generation and editing may leave faculty_id NULL.
     Submission for Super Admin review must not accept those
     incomplete entries. Publication has its own final gate.
  ========================================================== */

  const { count: unassignedCount, error: unassignedError } = await supabase
    .from('schedule_entries')
    .select('id', { count: 'exact', head: true })
    .eq('schedule_version_id', version.id)
    .is('faculty_id', null)

  if (unassignedError) {
    console.error('Unassigned instructor validation failed:', unassignedError)
    redirect(schedulesPath('?error=validation_lookup_failed'))
  }

  if ((unassignedCount ?? 0) > 0) {
    redirect(schedulesPath(`?error=unassigned_instructors&count=${unassignedCount}`))
  }

  /* ==========================================================
     CHECK UNRESOLVED BLOCKING VALIDATION ERRORS
     Warnings may remain.
     Severity "error" blocks submission.
  ========================================================== */

  const { count: errorCount, error: validationError } = await supabase
    .from('schedule_validation_logs')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('schedule_version_id', version.id)
    .eq('resolved', false)
    .eq('severity', 'error')

  if (validationError) {
    redirect(
      schedulesPath(
        `?error=validation_lookup_failed&details=${encodeURIComponent(validationError.message)}`
=======
  const {
    count: entryCount,
    error: entryError,
  } = await supabase
    .from(
      'schedule_entries'
    )
    .select(
      'id',
      {
        count: 'exact',
        head: true,
      }
    )
    .eq(
      'schedule_version_id',
      version.id
    )

  if (entryError) {
    redirect(
      schedulesPath(
        `?error=entry_lookup_failed&details=${encodeURIComponent(
          entryError.message
        )}`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      )
    )
  }

<<<<<<< HEAD
  if ((errorCount ?? 0) > 0) {
    redirect(
      schedulesPath(
        `?error=unresolved_conflicts&count=${encodeURIComponent(String(errorCount ?? 0))}`
=======
  if (
    !entryCount ||
    entryCount < 1
  ) {
    redirect(
      schedulesPath(
        '?error=empty_schedule'
      )
    )
  }

  /* ==========================================================
     CHECK UNRESOLVED BLOCKING VALIDATION ERRORS

     Warnings may remain.
     Severity "error" blocks submission.
  ========================================================== */

  const {
    count: errorCount,
    error: validationError,
  } = await supabase
    .from(
      'schedule_validation_logs'
    )
    .select(
      'id',
      {
        count: 'exact',
        head: true,
      }
    )
    .eq(
      'schedule_version_id',
      version.id
    )
    .eq(
      'resolved',
      false
    )
    .eq(
      'severity',
      'error'
    )

  if (validationError) {
    redirect(
      schedulesPath(
        `?error=validation_lookup_failed&details=${encodeURIComponent(
          validationError.message
        )}`
      )
    )
  }

  if (
    (errorCount ?? 0) > 0
  ) {
    redirect(
      schedulesPath(
        `?error=unresolved_conflicts&count=${encodeURIComponent(
          String(
            errorCount ?? 0
          )
        )}`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      )
    )
  }

  /* ==========================================================
     SUBMIT CURRENT VERSION
<<<<<<< HEAD
     select() is intentional.
=======

     select() is intentional.

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     A Supabase UPDATE can succeed without throwing an error
     even when zero rows matched the filters. We therefore
     require the updated row to be returned.
  ========================================================== */

<<<<<<< HEAD
  const { data: submittedVersion, error: versionSubmitError } = await supabase
    .from('schedule_versions')
    .update({
      status: 'submitted',
    })
    .eq('id', version.id)
    .eq('schedule_id', schedule.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()

  if (versionSubmitError || !submittedVersion) {
    redirect(
      schedulesPath(
        `?error=version_submit_failed${
          versionSubmitError ? `&details=${encodeURIComponent(versionSubmitError.message)}` : ''
=======
  const {
    data: submittedVersion,
    error: versionSubmitError,
  } = await supabase
    .from(
      'schedule_versions'
    )
    .update({
      status: 'submitted',
    })
    .eq(
      'id',
      version.id
    )
    .eq(
      'schedule_id',
      schedule.id
    )
    .eq(
      'status',
      'draft'
    )
    .select('id')
    .maybeSingle()

  if (
    versionSubmitError ||
    !submittedVersion
  ) {
    redirect(
      schedulesPath(
        `?error=version_submit_failed${
          versionSubmitError
            ? `&details=${encodeURIComponent(
                versionSubmitError.message
              )}`
            : ''
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        }`
      )
    )
  }

  /* ==========================================================
     SUBMIT SCHEDULE RECORD
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     Guard against:
     - stale page
     - another process changing status
     - current version changing before submission finishes
  ========================================================== */

<<<<<<< HEAD
  const { data: submittedSchedule, error: scheduleSubmitError } = await supabase
=======
  const {
    data: submittedSchedule,
    error: scheduleSubmitError,
  } = await supabase
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .from('schedules')
    .update({
      status: 'submitted',
    })
<<<<<<< HEAD
    .eq('id', schedule.id)
    .eq('department_id', schedule.department_id)
    .eq('current_version_id', version.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()

  if (scheduleSubmitError || !submittedSchedule) {
    /* ========================================================
       BEST-EFFORT ROLLBACK
       Schedule publication has NOT happened.
=======
    .eq(
      'id',
      schedule.id
    )
    .eq(
      'department_id',
      schedule.department_id
    )
    .eq(
      'current_version_id',
      version.id
    )
    .eq(
      'status',
      'draft'
    )
    .select('id')
    .maybeSingle()

  if (
    scheduleSubmitError ||
    !submittedSchedule
  ) {
    /* ========================================================
       BEST-EFFORT ROLLBACK

       Schedule publication has NOT happened.

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
       Restore the version only when it is still the version
       that this action submitted.
    ======================================================== */

<<<<<<< HEAD
    const { error: rollbackError } = await supabase
      .from('schedule_versions')
      .update({
        status: 'draft',
      })
      .eq('id', version.id)
      .eq('schedule_id', schedule.id)
      .eq('status', 'submitted')

    if (rollbackError) {
      console.error('AlterSched schedule submission rollback failed:', rollbackError)
=======
    const {
      error: rollbackError,
    } = await supabase
      .from(
        'schedule_versions'
      )
      .update({
        status: 'draft',
      })
      .eq(
        'id',
        version.id
      )
      .eq(
        'schedule_id',
        schedule.id
      )
      .eq(
        'status',
        'submitted'
      )

    if (rollbackError) {
      console.error(
        'AlterSched schedule submission rollback failed:',
        rollbackError
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    redirect(
      schedulesPath(
        `?error=schedule_submit_failed${
<<<<<<< HEAD
          scheduleSubmitError ? `&details=${encodeURIComponent(scheduleSubmitError.message)}` : ''
=======
          scheduleSubmitError
            ? `&details=${encodeURIComponent(
                scheduleSubmitError.message
              )}`
            : ''
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        }`
      )
    )
  }

  /* ==========================================================
     REFRESH RELATED UI
  ========================================================== */

<<<<<<< HEAD
  refreshSchedulePaths(schedule.id)

  /* ==========================================================
     SUCCESS
     At this point:
     schedule.status = submitted
     current version.status = submitted
=======
  refreshSchedulePaths(
    schedule.id
  )

  /* ==========================================================
     SUCCESS

     At this point:
     schedule.status = submitted
     current version.status = submitted

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     Department Scheduler can no longer edit it.
     Super Admin owns the next workflow step.
  ========================================================== */

  redirect(
<<<<<<< HEAD
    schedulesPath(`?success=submitted_for_review&schedule=${encodeURIComponent(schedule.id)}`)
  )
}
=======
    schedulesPath(
      `?success=submitted_for_review&schedule=${encodeURIComponent(
        schedule.id
      )}`
    )
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

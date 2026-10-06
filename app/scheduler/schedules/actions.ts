'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

/* ============================================================
   HELPERS
============================================================ */

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
}

/* ============================================================
   SUBMIT SCHEDULE FOR SUPER ADMIN REVIEW

   FINAL WORKFLOW:

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

   IMPORTANT:
   - Department Scheduler NEVER publishes.
   - Department Scheduler NEVER generates Code/QR.
   - Only the current Draft version can be submitted.
   - Schedule must belong to an actively managed department.
============================================================ */

export async function submitScheduleForAdminReview(
  formData: FormData
) {
  /* ==========================================================
     AUTHORIZATION
  ========================================================== */

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

  /* ==========================================================
     REQUIRE SCHEDULE ID
  ========================================================== */

  if (!scheduleId) {
    redirect(
      schedulesPath(
        '?error=schedule_required'
      )
    )
  }

  /* ==========================================================
     LOAD SCHEDULE
  ========================================================== */

  const {
    data: schedule,
    error: scheduleError,
  } = await supabase
    .from('schedules')
    .select(`
      id,
      title,
      status,
      department_id,
      current_version_id
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
        }`
      )
    )
  }

  /* ==========================================================
     VERIFY ACTIVE DEPARTMENT ACCESS

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
  }

  /* ==========================================================
     REQUIRE CURRENT VERSION
  ========================================================== */

  if (
    !schedule.current_version_id
  ) {
    redirect(
      schedulesPath(
        '?error=no_current_version'
      )
    )
  }

  /* ==========================================================
     REQUIRE TRUE DRAFT SCHEDULE

     Submitted / Published / Archived schedules are read-only
     from the Department Scheduler submission workflow.
  ========================================================== */

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
  }

  /* ==========================================================
     LOAD CURRENT VERSION
  ========================================================== */

  const {
    data: version,
    error: versionError,
  } = await supabase
    .from(
      'schedule_versions'
    )
    .select(`
      id,
      schedule_id,
      version_number,
      status
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
        }`
      )
    )
  }

  /* ==========================================================
     CURRENT VERSION MUST ALSO BE DRAFT

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
  }

  /* ==========================================================
     VERIFY TIMETABLE HAS ENTRIES
  ========================================================== */

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
      )
    )
  }

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
      )
    )
  }

  /* ==========================================================
     SUBMIT CURRENT VERSION

     select() is intentional.

     A Supabase UPDATE can succeed without throwing an error
     even when zero rows matched the filters. We therefore
     require the updated row to be returned.
  ========================================================== */

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
        }`
      )
    )
  }

  /* ==========================================================
     SUBMIT SCHEDULE RECORD

     Guard against:
     - stale page
     - another process changing status
     - current version changing before submission finishes
  ========================================================== */

  const {
    data: submittedSchedule,
    error: scheduleSubmitError,
  } = await supabase
    .from('schedules')
    .update({
      status: 'submitted',
    })
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

       Restore the version only when it is still the version
       that this action submitted.
    ======================================================== */

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
    }

    redirect(
      schedulesPath(
        `?error=schedule_submit_failed${
          scheduleSubmitError
            ? `&details=${encodeURIComponent(
                scheduleSubmitError.message
              )}`
            : ''
        }`
      )
    )
  }

  /* ==========================================================
     REFRESH RELATED UI
  ========================================================== */

  refreshSchedulePaths(
    schedule.id
  )

  /* ==========================================================
     SUCCESS

     At this point:
     schedule.status = submitted
     current version.status = submitted

     Department Scheduler can no longer edit it.
     Super Admin owns the next workflow step.
  ========================================================== */

  redirect(
    schedulesPath(
      `?success=submitted_for_review&schedule=${encodeURIComponent(
        schedule.id
      )}`
    )
  )
}
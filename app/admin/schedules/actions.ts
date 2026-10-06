'use server'

import {
  createHash,
  randomBytes,
} from 'crypto'

import {
  revalidatePath,
} from 'next/cache'

import {
  redirect,
} from 'next/navigation'

import {
  requireRole,
} from '@/lib/auth/require-role'

import {
  createClient,
} from '@/lib/supabase/server'

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function field(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) ?? ''
  ).trim()
}

function scheduleDetail(
  id: string,
  query = ''
) {
  return `/admin/schedules/${encodeURIComponent(
    id
  )}${query}`
}

function hash(
  value: string
) {
  return createHash('sha256')
    .update(
      value
        .trim()
        .toUpperCase()
    )
    .digest('hex')
}

function generateCode() {
  return `ALT-${randomBytes(4)
    .toString('hex')
    .toUpperCase()}`
}

function generateQrToken() {
  return randomBytes(18)
    .toString('hex')
    .toUpperCase()
}

/* =========================================================
   LOAD EDITABLE DRAFT

   IMPORTANT:
   Only a real Draft may be edited.

   submitted = locked
   published = locked
   archived = locked
   ========================================================= */

async function editableSchedule(
  s: any,
  scheduleId: string
) {
  if (!scheduleId) {
    throw new Error(
      'Schedule is required.'
    )
  }

  const {
    data,
    error,
  } = await s
    .from('schedules')
    .select(`
      id,
      status,
      current_version_id,
      section_id,
      semester_id
    `)
    .eq(
      'id',
      scheduleId
    )
    .maybeSingle()

  if (
    error ||
    !data ||
    !data.current_version_id
  ) {
    throw new Error(
      error?.message ||
        'Schedule is not ready.'
    )
  }

  if (
    data.status !== 'draft'
  ) {
    throw new Error(
      data.status ===
        'submitted'
        ? 'Submitted schedules are locked while awaiting Super Admin review.'
        : 'Published or archived schedules cannot be edited directly. Use the controlled alteration and versioning workflow.'
    )
  }

  const {
    data: version,
    error: versionError,
  } = await s
    .from(
      'schedule_versions'
    )
    .select(`
      id,
      status
    `)
    .eq(
      'id',
      data.current_version_id
    )
    .eq(
      'schedule_id',
      data.id
    )
    .maybeSingle()

  if (
    versionError ||
    !version
  ) {
    throw new Error(
      versionError?.message ||
        'Current schedule version was not found.'
    )
  }

  if (
    version.status !==
    'draft'
  ) {
    throw new Error(
      'Only a Draft schedule version can be edited.'
    )
  }

  return data
}

/* =========================================================
   LOAD REVIEWABLE SCHEDULE

   Submitted schedules may be revalidated by Super Admin,
   but they cannot be edited.
   ========================================================= */

async function reviewableSchedule(
  s: any,
  scheduleId: string
) {
  if (!scheduleId) {
    throw new Error(
      'Schedule is required.'
    )
  }

  const {
    data,
    error,
  } = await s
    .from('schedules')
    .select(`
      id,
      status,
      current_version_id,
      section_id,
      semester_id
    `)
    .eq(
      'id',
      scheduleId
    )
    .maybeSingle()

  if (
    error ||
    !data ||
    !data.current_version_id
  ) {
    throw new Error(
      error?.message ||
        'Schedule is not ready.'
    )
  }

  if (
    data.status !==
      'draft' &&
    data.status !==
      'submitted'
  ) {
    throw new Error(
      'Only Draft or Submitted schedules can be revalidated.'
    )
  }

  const {
    data: version,
    error: versionError,
  } = await s
    .from(
      'schedule_versions'
    )
    .select(`
      id,
      status
    `)
    .eq(
      'id',
      data.current_version_id
    )
    .eq(
      'schedule_id',
      data.id
    )
    .maybeSingle()

  if (
    versionError ||
    !version
  ) {
    throw new Error(
      versionError?.message ||
        'Current schedule version was not found.'
    )
  }

  if (
    data.status ===
      'draft' &&
    version.status !==
      'draft'
  ) {
    throw new Error(
      'The Draft schedule and its current version are out of sync.'
    )
  }

  if (
    data.status ===
      'submitted' &&
    version.status !==
      'submitted'
  ) {
    throw new Error(
      'The Submitted schedule and its current version are out of sync.'
    )
  }

  return data
}

/* =========================================================
   PUBLISH SCHEDULE

   FINAL BACKEND GATE:
   - Super Admin only
   - schedule must be submitted
   - current version must be submitted
   - must contain entries
   - zero unresolved error validation logs
   - publish version
   - publish schedule
   - revoke old access
   - generate new Code + QR credential
   ========================================================= */

export async function publishSchedule(
  formData: FormData
) {
  const { profile } =
    await requireRole([
      'super_admin',
    ])

  const s =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )

  if (!scheduleId) {
    redirect(
      '/admin/schedules?error=schedule_required'
    )
  }

  /* -------------------------------------------------------
     LOAD SCHEDULE
     ------------------------------------------------------- */

  const {
    data: sch,
    error: scheduleError,
  } = await s
    .from('schedules')
    .select(`
      id,
      status,
      current_version_id,
      section_id
    `)
    .eq(
      'id',
      scheduleId
    )
    .maybeSingle()

  if (
    scheduleError ||
    !sch ||
    !sch.current_version_id
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        '?error=schedule_not_ready'
      )
    )
  }

  /* -------------------------------------------------------
     ONLY SUBMITTED SCHEDULE MAY BE PUBLISHED
     ------------------------------------------------------- */

  if (
    sch.status !==
    'submitted'
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          'Only a schedule submitted for Super Admin review can be published.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY CURRENT VERSION
     ------------------------------------------------------- */

  const {
    data: version,
    error: versionLookupError,
  } = await s
    .from(
      'schedule_versions'
    )
    .select(`
      id,
      schedule_id,
      status,
      version_number
    `)
    .eq(
      'id',
      sch.current_version_id
    )
    .eq(
      'schedule_id',
      sch.id
    )
    .maybeSingle()

  if (
    versionLookupError ||
    !version
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          versionLookupError?.message ||
            'Current schedule version was not found.'
        )}`
      )
    )
  }

  if (
    version.status !==
    'submitted'
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          'Only a submitted schedule version can be published.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY ENTRIES
     ------------------------------------------------------- */

  const {
    count,
    error: entryError,
  } = await s
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
      sch.current_version_id
    )

  if (entryError) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          entryError.message
        )}`
      )
    )
  }

  if (!count) {
    redirect(
      scheduleDetail(
        scheduleId,
        '?error=no_entries'
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY ZERO BLOCKING ERRORS
     ------------------------------------------------------- */

  const {
    count: conflicts,
    error: conflictError,
  } = await s
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
      sch.current_version_id
    )
    .eq(
      'resolved',
      false
    )
    .eq(
      'severity',
      'error'
    )

  if (conflictError) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          conflictError.message
        )}`
      )
    )
  }

  if (
    Number(
      conflicts || 0
    ) > 0
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          `Resolve ${conflicts} blocking validation issue(s) before publication.`
        )}`
      )
    )
  }

  const now =
    new Date().toISOString()

  /* -------------------------------------------------------
     PUBLISH CURRENT VERSION

     Status is changed only when it is still submitted.
     ------------------------------------------------------- */

  const {
    data: publishedVersion,
    error: versionError,
  } = await s
    .from(
      'schedule_versions'
    )
    .update({
      status:
        'published',

      reviewed_by:
        profile.id,

      approved_at:
        now,

      published_by:
        profile.id,

      published_at:
        now,
    })
    .eq(
      'id',
      sch.current_version_id
    )
    .eq(
      'schedule_id',
      sch.id
    )
    .eq(
      'status',
      'submitted'
    )
    .select('id')
    .maybeSingle()

  if (
    versionError ||
    !publishedVersion
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          versionError?.message ||
            'The schedule version is no longer in Submitted status.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     PUBLISH SCHEDULE
     ------------------------------------------------------- */

  const {
    data: publishedSchedule,
    error:
      scheduleUpdateError,
  } = await s
    .from('schedules')
    .update({
      status:
        'published',

      updated_at:
        now,
    })
    .eq(
      'id',
      scheduleId
    )
    .eq(
      'current_version_id',
      sch.current_version_id
    )
    .eq(
      'status',
      'submitted'
    )
    .select('id')
    .maybeSingle()

  if (
    scheduleUpdateError ||
    !publishedSchedule
  ) {
    /*
     * Best-effort restore.
     *
     * A database RPC/transaction would be stronger,
     * but this prevents the common partial state when
     * the schedule-row update fails after version update.
     */

    await s
      .from(
        'schedule_versions'
      )
      .update({
        status:
          'submitted',

        reviewed_by:
          null,

        approved_at:
          null,

        published_by:
          null,

        published_at:
          null,
      })
      .eq(
        'id',
        sch.current_version_id
      )
      .eq(
        'status',
        'published'
      )

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          scheduleUpdateError?.message ||
            'Unable to publish the schedule record.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     REVOKE PREVIOUS ACTIVE ACCESS
     ------------------------------------------------------- */

  const {
    error: revokeError,
  } = await s
    .from(
      'schedule_access_codes'
    )
    .update({
      active:
        false,

      revoked_at:
        now,
    })
    .eq(
      'schedule_id',
      scheduleId
    )
    .eq(
      'active',
      true
    )

  if (revokeError) {
    console.error(
      'Failed to revoke previous schedule access:',
      revokeError
    )
  }

  /* -------------------------------------------------------
     GENERATE NEW CREDENTIALS
     ------------------------------------------------------- */

  const rawCode =
    generateCode()

  const rawQr =
    generateQrToken()

  const {
    error: codeError,
  } = await s
    .from(
      'schedule_access_codes'
    )
    .insert({
      schedule_id:
        scheduleId,

      schedule_version_id:
        sch.current_version_id,

      section_id:
        sch.section_id,

      code_hash:
        hash(rawCode),

      qr_token_hash:
        hash(rawQr),

      active:
        true,

      generated_by:
        profile.id,
    })

  if (codeError) {
    /*
     * Schedule is already officially published.
     * Do NOT silently revert publication here because
     * publication and access generation are separate
     * concerns and a later regenerate action can safely
     * create the access credential.
     */

    console.error(
      'Published schedule access generation failed:',
      codeError
    )

    revalidatePath(
      '/admin/schedules'
    )

    revalidatePath(
      scheduleDetail(
        scheduleId
      )
    )

    revalidatePath(
      '/student/schedule'
    )

    revalidatePath(
      '/faculty/schedule'
    )

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          `Schedule was published, but the student access credential could not be generated: ${codeError.message}`
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     REFRESH
     ------------------------------------------------------- */

  revalidatePath(
    '/admin/schedules'
  )

  revalidatePath(
    scheduleDetail(
      scheduleId
    )
  )

  revalidatePath(
    '/student/schedule'
  )

  revalidatePath(
    '/faculty/schedule'
  )

  /* -------------------------------------------------------
     DISPLAY RAW CREDENTIAL ONCE
     ------------------------------------------------------- */

  redirect(
    scheduleDetail(
      scheduleId,
      `?success=published&code=${encodeURIComponent(
        rawCode
      )}&qr=${encodeURIComponent(
        rawQr
      )}`
    )
  )
}

/* =========================================================
   REGENERATE SCHEDULE ACCESS

   Published schedules only.
   Existing active credential is revoked.
   ========================================================= */

export async function regenerateScheduleAccess(
  formData: FormData
) {
  const { profile } =
    await requireRole([
      'super_admin',
    ])

  const s =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )

  if (!scheduleId) {
    redirect(
      '/admin/schedules?error=schedule_required'
    )
  }

  const {
    data: sch,
    error: scheduleError,
  } = await s
    .from('schedules')
    .select(`
      id,
      status,
      current_version_id,
      section_id
    `)
    .eq(
      'id',
      scheduleId
    )
    .maybeSingle()

  if (
    scheduleError ||
    !sch ||
    !sch.current_version_id
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        '?error=schedule_not_ready'
      )
    )
  }

  if (
    sch.status !==
    'published'
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        '?error=schedule_not_published'
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY VERSION IS PUBLISHED
     ------------------------------------------------------- */

  const {
    data: version,
    error: versionError,
  } = await s
    .from(
      'schedule_versions'
    )
    .select(`
      id,
      status
    `)
    .eq(
      'id',
      sch.current_version_id
    )
    .eq(
      'schedule_id',
      sch.id
    )
    .maybeSingle()

  if (
    versionError ||
    !version ||
    version.status !==
      'published'
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          versionError?.message ||
            'The current schedule version is not published.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY ENTRIES
     ------------------------------------------------------- */

  const {
    count,
    error: entryError,
  } = await s
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
      sch.current_version_id
    )

  if (
    entryError ||
    !count
  ) {
    redirect(
      scheduleDetail(
        scheduleId,
        '?error=no_entries'
      )
    )
  }

  const now =
    new Date().toISOString()

  /* -------------------------------------------------------
     REVOKE OLD ACCESS
     ------------------------------------------------------- */

  const {
    error: revokeError,
  } = await s
    .from(
      'schedule_access_codes'
    )
    .update({
      active:
        false,

      revoked_at:
        now,
    })
    .eq(
      'schedule_id',
      scheduleId
    )
    .eq(
      'active',
      true
    )

  if (revokeError) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          revokeError.message
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     CREATE NEW ACCESS
     ------------------------------------------------------- */

  const rawCode =
    generateCode()

  const rawQr =
    generateQrToken()

  const {
    error: codeError,
  } = await s
    .from(
      'schedule_access_codes'
    )
    .insert({
      schedule_id:
        scheduleId,

      schedule_version_id:
        sch.current_version_id,

      section_id:
        sch.section_id,

      code_hash:
        hash(rawCode),

      qr_token_hash:
        hash(rawQr),

      active:
        true,

      generated_by:
        profile.id,
    })

  if (codeError) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          codeError.message
        )}`
      )
    )
  }

  revalidatePath(
    '/admin/schedules'
  )

  revalidatePath(
    scheduleDetail(
      scheduleId
    )
  )

  revalidatePath(
    '/student/schedule'
  )

  revalidatePath(
    '/faculty/schedule'
  )

  redirect(
    scheduleDetail(
      scheduleId,
      `?success=access_generated&code=${encodeURIComponent(
        rawCode
      )}&qr=${encodeURIComponent(
        rawQr
      )}`
    )
  )
}

/* =========================================================
   ARCHIVE SCHEDULE
   ========================================================= */

export async function archiveSchedule(
  formData: FormData
) {
  await requireRole([
    'super_admin',
  ])

  const s =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )

  if (!scheduleId) {
    redirect(
      '/admin/schedules?error=schedule_required'
    )
  }

  const now =
    new Date().toISOString()

  const {
    data: sch,
    error: scheduleError,
  } = await s
    .from('schedules')
    .select(`
      id,
      status,
      current_version_id
    `)
    .eq(
      'id',
      scheduleId
    )
    .maybeSingle()

  if (
    scheduleError ||
    !sch
  ) {
    redirect(
      '/admin/schedules?error=schedule_not_found'
    )
  }

  if (
    sch.status ===
    'archived'
  ) {
    redirect(
      '/admin/schedules?error=schedule_already_archived'
    )
  }

  /* -------------------------------------------------------
     ARCHIVE SCHEDULE
     ------------------------------------------------------- */

  const {
    error: archiveError,
  } = await s
    .from('schedules')
    .update({
      status:
        'archived',

      updated_at:
        now,
    })
    .eq(
      'id',
      scheduleId
    )

  if (archiveError) {
    redirect(
      `/admin/schedules?error=archive_failed&details=${encodeURIComponent(
        archiveError.message
      )}`
    )
  }

  /* -------------------------------------------------------
     ARCHIVE CURRENT VERSION
     ------------------------------------------------------- */

  if (
    sch.current_version_id
  ) {
    const {
      error: versionError,
    } = await s
      .from(
        'schedule_versions'
      )
      .update({
        status:
          'archived',
      })
      .eq(
        'id',
        sch.current_version_id
      )

    if (versionError) {
      console.error(
        'Failed to archive current schedule version:',
        versionError
      )
    }
  }

  /* -------------------------------------------------------
     REVOKE ACCESS
     ------------------------------------------------------- */

  const {
    error: revokeError,
  } = await s
    .from(
      'schedule_access_codes'
    )
    .update({
      active:
        false,

      revoked_at:
        now,
    })
    .eq(
      'schedule_id',
      scheduleId
    )
    .eq(
      'active',
      true
    )

  if (revokeError) {
    console.error(
      'Failed to revoke archived schedule access:',
      revokeError
    )
  }

  revalidatePath(
    '/admin/schedules'
  )

  revalidatePath(
    '/student/schedule'
  )

  revalidatePath(
    '/faculty/schedule'
  )

  redirect(
    '/admin/schedules?success=archived'
  )
}

/* =========================================================
   ADD SCHEDULE ENTRY

   DRAFT ONLY
   ========================================================= */

export async function addScheduleEntry(
  formData: FormData
) {
  await requireRole([
    'super_admin',
  ])

  const s =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )

  try {
    const sch =
      await editableSchedule(
        s,
        scheduleId
      )

    const offeringId =
      field(
        formData,
        'class_offering_id'
      )

    const facultyId =
      field(
        formData,
        'faculty_id'
      )

    const roomId =
      field(
        formData,
        'room_id'
      )

    const day =
      Number(
        field(
          formData,
          'day_of_week'
        )
      )

    const start =
      field(
        formData,
        'start_time'
      )

    const end =
      field(
        formData,
        'end_time'
      )

    const entryType =
      field(
        formData,
        'entry_type'
      ) || 'regular'

    if (
      !offeringId ||
      !facultyId ||
      !roomId ||
      !day ||
      !start ||
      !end
    ) {
      throw new Error(
        'Complete all schedule entry fields.'
      )
    }

    if (
      !Number.isInteger(
        day
      ) ||
      day < 1 ||
      day > 7
    ) {
      throw new Error(
        'Select a valid schedule day.'
      )
    }

    if (
      start >= end
    ) {
      throw new Error(
        'End time must be later than start time.'
      )
    }

    if (
      ![
        'regular',
        'makeup',
        'special',
      ].includes(
        entryType
      )
    ) {
      throw new Error(
        'Invalid schedule entry type.'
      )
    }

    /* -----------------------------------------------------
       VERIFY OFFERING
       ----------------------------------------------------- */

    const {
      data: offering,
      error:
        offeringError,
    } = await s
      .from(
        'class_offerings'
      )
      .select(`
        id,
        section_id,
        semester_id
      `)
      .eq(
        'id',
        offeringId
      )
      .maybeSingle()

    if (
      offeringError ||
      !offering ||
      offering.section_id !==
        sch.section_id ||
      offering.semester_id !==
        sch.semester_id
    ) {
      throw new Error(
        'Selected class offering does not belong to this schedule.'
      )
    }

    const {
      error,
    } = await s
      .from(
        'schedule_entries'
      )
      .insert({
        schedule_version_id:
          sch.current_version_id,

        class_offering_id:
          offeringId,

        faculty_id:
          facultyId,

        section_id:
          sch.section_id,

        room_id:
          roomId,

        day_of_week:
          day,

        start_time:
          start,

        end_time:
          end,

        entry_type:
          entryType,
      })

    if (error) {
      throw new Error(
        error.message
      )
    }

    revalidatePath(
      scheduleDetail(
        scheduleId
      )
    )

    revalidatePath(
      '/admin/schedules'
    )

    redirect(
      scheduleDetail(
        scheduleId,
        '?success=entry_added'
      )
    )
  } catch (error: any) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          error.message ||
            'Unable to add schedule entry.'
        )}`
      )
    )
  }
}

/* =========================================================
   UPDATE SCHEDULE ENTRY

   DRAFT ONLY
   ========================================================= */

export async function updateScheduleEntry(
  formData: FormData
) {
  await requireRole([
    'super_admin',
  ])

  const s =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )

  const entryId =
    field(
      formData,
      'entry_id'
    )

  try {
    if (!entryId) {
      throw new Error(
        'Schedule entry is required.'
      )
    }

    const sch =
      await editableSchedule(
        s,
        scheduleId
      )

    const facultyId =
      field(
        formData,
        'faculty_id'
      )

    const roomId =
      field(
        formData,
        'room_id'
      )

    const day =
      Number(
        field(
          formData,
          'day_of_week'
        )
      )

    const start =
      field(
        formData,
        'start_time'
      )

    const end =
      field(
        formData,
        'end_time'
      )

    const entryType =
      field(
        formData,
        'entry_type'
      ) || 'regular'

    if (
      !facultyId ||
      !roomId ||
      !day ||
      !start ||
      !end
    ) {
      throw new Error(
        'Complete all schedule entry fields.'
      )
    }

    if (
      !Number.isInteger(
        day
      ) ||
      day < 1 ||
      day > 7
    ) {
      throw new Error(
        'Select a valid schedule day.'
      )
    }

    if (
      start >= end
    ) {
      throw new Error(
        'End time must be later than start time.'
      )
    }

    if (
      ![
        'regular',
        'makeup',
        'special',
      ].includes(
        entryType
      )
    ) {
      throw new Error(
        'Invalid schedule entry type.'
      )
    }

    /* -----------------------------------------------------
       VERIFY ENTRY BELONGS TO CURRENT VERSION
       ----------------------------------------------------- */

    const {
      data: existing,
      error:
        existingError,
    } = await s
      .from(
        'schedule_entries'
      )
      .select(`
        id,
        schedule_version_id
      `)
      .eq(
        'id',
        entryId
      )
      .eq(
        'schedule_version_id',
        sch.current_version_id
      )
      .maybeSingle()

    if (
      existingError ||
      !existing
    ) {
      throw new Error(
        existingError?.message ||
          'Schedule entry was not found in the current Draft.'
      )
    }

    const {
      error,
    } = await s
      .from(
        'schedule_entries'
      )
      .update({
        faculty_id:
          facultyId,

        room_id:
          roomId,

        day_of_week:
          day,

        start_time:
          start,

        end_time:
          end,

        entry_type:
          entryType,
      })
      .eq(
        'id',
        entryId
      )
      .eq(
        'schedule_version_id',
        sch.current_version_id
      )

    if (error) {
      throw new Error(
        error.message
      )
    }

    revalidatePath(
      scheduleDetail(
        scheduleId
      )
    )

    revalidatePath(
      '/admin/schedules'
    )

    redirect(
      scheduleDetail(
        scheduleId,
        '?success=entry_updated'
      )
    )
  } catch (error: any) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          error.message ||
            'Unable to update schedule entry.'
        )}`
      )
    )
  }
}

/* =========================================================
   REMOVE SCHEDULE ENTRY

   DRAFT ONLY
   ========================================================= */

export async function removeScheduleEntry(
  formData: FormData
) {
  await requireRole([
    'super_admin',
  ])

  const s =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )

  const entryId =
    field(
      formData,
      'entry_id'
    )

  try {
    if (!entryId) {
      throw new Error(
        'Schedule entry is required.'
      )
    }

    const sch =
      await editableSchedule(
        s,
        scheduleId
      )

    const {
      data: existing,
      error:
        existingError,
    } = await s
      .from(
        'schedule_entries'
      )
      .select('id')
      .eq(
        'id',
        entryId
      )
      .eq(
        'schedule_version_id',
        sch.current_version_id
      )
      .maybeSingle()

    if (
      existingError ||
      !existing
    ) {
      throw new Error(
        existingError?.message ||
          'Schedule entry was not found in the current Draft.'
      )
    }

    const {
      error,
    } = await s
      .from(
        'schedule_entries'
      )
      .delete()
      .eq(
        'id',
        entryId
      )
      .eq(
        'schedule_version_id',
        sch.current_version_id
      )

    if (error) {
      throw new Error(
        error.message
      )
    }

    revalidatePath(
      scheduleDetail(
        scheduleId
      )
    )

    revalidatePath(
      '/admin/schedules'
    )

    redirect(
      scheduleDetail(
        scheduleId,
        '?success=entry_removed'
      )
    )
  } catch (error: any) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          error.message ||
            'Unable to remove schedule entry.'
        )}`
      )
    )
  }
}

/* =========================================================
   REVALIDATE SCHEDULE

   Allowed:
   - Draft
   - Submitted

   Submitted remains READ-ONLY.
   Revalidation only refreshes validation results.
   ========================================================= */

export async function revalidateSchedule(
  formData: FormData
) {
  await requireRole([
    'super_admin',
  ])

  const s =
    await createClient()

  const scheduleId =
    field(
      formData,
      'schedule_id'
    )

  try {
    const sch =
      await reviewableSchedule(
        s,
        scheduleId
      )

    const {
      data: entries,
      error,
    } = await s
      .from(
        'schedule_entries'
      )
      .select(`
        id,
        faculty_id,
        room_id,
        section_id,
        day_of_week,
        start_time,
        end_time
      `)
      .eq(
        'schedule_version_id',
        sch.current_version_id
      )

    if (error) {
      throw new Error(
        error.message
      )
    }

    /* -----------------------------------------------------
       REMOVE PREVIOUS UNRESOLVED VALIDATION RESULTS
       ----------------------------------------------------- */

    const {
      error:
        deleteLogError,
    } = await s
      .from(
        'schedule_validation_logs'
      )
      .delete()
      .eq(
        'schedule_version_id',
        sch.current_version_id
      )
      .eq(
        'resolved',
        false
      )

    if (
      deleteLogError
    ) {
      throw new Error(
        deleteLogError.message
      )
    }

    const logs: any[] =
      []

    const list =
      entries || []

    /* -----------------------------------------------------
       PAIRWISE OVERLAP VALIDATION
       ----------------------------------------------------- */

    for (
      let i = 0;
      i < list.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < list.length;
        j++
      ) {
        const first =
          list[i]

        const second =
          list[j]

        if (
          first.day_of_week !==
          second.day_of_week
        ) {
          continue
        }

        const overlaps =
          first.start_time <
            second.end_time &&
          first.end_time >
            second.start_time

        if (!overlaps) {
          continue
        }

        const kinds:
          string[] = []

        if (
          first.section_id ===
          second.section_id
        ) {
          kinds.push(
            'section'
          )
        }

        if (
          first.room_id ===
          second.room_id
        ) {
          kinds.push(
            'room'
          )
        }

        if (
          first.faculty_id &&
          first.faculty_id ===
            second.faculty_id
        ) {
          kinds.push(
            'faculty'
          )
        }

        if (
          kinds.length === 0
        ) {
          continue
        }

        logs.push({
          schedule_version_id:
            sch.current_version_id,

          schedule_entry_id:
            first.id,

          related_entry_id:
            second.id,

          conflict_type:
            `${kinds.join(
              '_'
            )}_overlap`,

          severity:
            'error',

          message:
            `Conflicting ${kinds.join(
              ', '
            )} assignment detected.`,

          resolved:
            false,
        })
      }
    }

    /* -----------------------------------------------------
       SAVE VALIDATION RESULTS
       ----------------------------------------------------- */

    if (
      logs.length > 0
    ) {
      const {
        error:
          logInsertError,
      } = await s
        .from(
          'schedule_validation_logs'
        )
        .insert(
          logs
        )

      if (
        logInsertError
      ) {
        throw new Error(
          logInsertError.message
        )
      }
    }

    revalidatePath(
      scheduleDetail(
        scheduleId
      )
    )

    revalidatePath(
      '/admin/schedules'
    )

    redirect(
      scheduleDetail(
        scheduleId,
        `?success=validated&conflicts=${logs.length}`
      )
    )
  } catch (error: any) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          error.message ||
            'Validation failed.'
        )}`
      )
    )
  }
}
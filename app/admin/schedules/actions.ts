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
   ACCESS CODE HELPERS
   ========================================================= */

const hash = (value: string) =>
  createHash('sha256')
    .update(
      value
        .trim()
        .toUpperCase()
    )
    .digest('hex')

const code = () =>
  `ALT-${randomBytes(4)
    .toString('hex')
    .toUpperCase()}`

/* =========================================================
   PUBLISH SCHEDULE
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

  const scheduleId = String(
    formData.get(
      'schedule_id'
    ) ?? ''
  ).trim()

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
      current_version_id,
      section_id,
      status
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
      '/admin/schedules?error=schedule_not_ready'
    )
  }

  /* -------------------------------------------------------
     VERIFY SCHEDULE HAS ENTRIES
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
      '/admin/schedules?error=no_entries'
    )
  }

  /* -------------------------------------------------------
     VERIFY NO UNRESOLVED ERROR CONFLICTS
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
      `/admin/schedules?error=validation_lookup_failed&details=${encodeURIComponent(
        conflictError.message
      )}`
    )
  }

  if (conflicts) {
    redirect(
      `/admin/schedules?error=unresolved_conflicts&count=${conflicts}`
    )
  }

  const now =
    new Date().toISOString()

  /* -------------------------------------------------------
     PUBLISH CURRENT VERSION
     ------------------------------------------------------- */

  const {
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

  if (versionError) {
    redirect(
      `/admin/schedules?error=publish_failed&details=${encodeURIComponent(
        versionError.message
      )}`
    )
  }

  /* -------------------------------------------------------
     PUBLISH SCHEDULE
     ------------------------------------------------------- */

  const {
    error: scheduleUpdateError,
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

  if (
    scheduleUpdateError
  ) {
    redirect(
      `/admin/schedules?error=publish_failed&details=${encodeURIComponent(
        scheduleUpdateError.message
      )}`
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
    redirect(
      `/admin/schedules?error=code_revoke_failed&details=${encodeURIComponent(
        revokeError.message
      )}`
    )
  }

  /* -------------------------------------------------------
     GENERATE ACCESS CREDENTIAL
     ------------------------------------------------------- */

  const rawCode =
    code()

  const rawQr =
    randomBytes(18)
      .toString('hex')
      .toUpperCase()

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
      `/admin/schedules?error=code_failed&details=${encodeURIComponent(
        codeError.message
      )}`
    )
  }

  /* -------------------------------------------------------
     REFRESH
     ------------------------------------------------------- */

  revalidatePath(
    '/admin/schedules'
  )

  revalidatePath(
    `/admin/schedules/${scheduleId}`
  )

  revalidatePath(
    '/student/schedule'
  )

  revalidatePath(
    '/faculty/schedule'
  )

  /* -------------------------------------------------------
     SHOW RAW CODE ONCE
     ------------------------------------------------------- */

  redirect(
    `/admin/schedules/${encodeURIComponent(
      scheduleId
    )}?success=access_generated&code=${encodeURIComponent(
      rawCode
    )}&qr=${encodeURIComponent(
      rawQr
    )}`
  )
}

/* =========================================================
   REGENERATE SCHEDULE ACCESS

   Existing active credentials are revoked.
   Only secure hashes are stored in the database.
   Raw credentials are displayed once after generation.
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
    String(
      formData.get(
        'schedule_id'
      ) ?? ''
    ).trim()

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
      `/admin/schedules/${encodeURIComponent(
        scheduleId
      )}?error=schedule_not_ready`
    )
  }

  /* -------------------------------------------------------
     ONLY PUBLISHED SCHEDULES GET CLAIM CODES
     ------------------------------------------------------- */

  if (
    sch.status !==
    'published'
  ) {
    redirect(
      `/admin/schedules/${encodeURIComponent(
        scheduleId
      )}?error=schedule_not_published`
    )
  }

  /* -------------------------------------------------------
     MAKE SURE PUBLISHED VERSION STILL HAS ENTRIES
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
      `/admin/schedules/${encodeURIComponent(
        scheduleId
      )}?error=no_entries`
    )
  }

  const now =
    new Date().toISOString()

  /* -------------------------------------------------------
     REVOKE CURRENT ACCESS CREDENTIAL
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
      'Failed to revoke existing schedule access:',
      revokeError
    )

    redirect(
      `/admin/schedules/${encodeURIComponent(
        scheduleId
      )}?error=${encodeURIComponent(
        revokeError.message
      )}`
    )
  }

  /* -------------------------------------------------------
     GENERATE NEW CREDENTIAL
     ------------------------------------------------------- */

  const rawCode =
    code()

  const rawQr =
    randomBytes(18)
      .toString('hex')
      .toUpperCase()

  const {
    error: insertError,
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

  if (insertError) {
    console.error(
      'Failed to generate new schedule access:',
      insertError
    )

    redirect(
      `/admin/schedules/${encodeURIComponent(
        scheduleId
      )}?error=${encodeURIComponent(
        insertError.message
      )}`
    )
  }

  /* -------------------------------------------------------
     REFRESH RELEVANT PORTALS
     ------------------------------------------------------- */

  revalidatePath(
    '/admin/schedules'
  )

  revalidatePath(
    `/admin/schedules/${scheduleId}`
  )

  revalidatePath(
    '/student/schedule'
  )

  revalidatePath(
    '/student/dashboard'
  )

  revalidatePath(
    '/faculty/schedule'
  )

  /* -------------------------------------------------------
     DISPLAY NEW RAW CREDENTIAL ONCE
     ------------------------------------------------------- */

  redirect(
    `/admin/schedules/${encodeURIComponent(
      scheduleId
    )}?success=access_generated&code=${encodeURIComponent(
      rawCode
    )}&qr=${encodeURIComponent(
      rawQr
    )}`
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
    String(
      formData.get(
        'schedule_id'
      ) ?? ''
    ).trim()

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
        'Failed to archive schedule version:',
        versionError
      )
    }
  }

  /* -------------------------------------------------------
     REVOKE STUDENT ACCESS
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
   HELPERS
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

async function editableSchedule(
  s: any,
  scheduleId: string
) {
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
    data.status ===
      'published' ||
    data.status ===
      'archived'
  ) {
    throw new Error(
      'Published or archived schedules cannot be edited directly. Create an alteration/revision instead.'
    )
  }

  return data
}

/* =========================================================
   ADD SCHEDULE ENTRY
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
      start >= end
    ) {
      throw new Error(
        'End time must be later than start time.'
      )
    }

    /* -----------------------------------------------------
       VERIFY OFFERING BELONGS TO THIS SCHEDULE
       ----------------------------------------------------- */

    const {
      data: offering,
      error: offeringError,
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

    /* -----------------------------------------------------
       INSERT ENTRY
       ----------------------------------------------------- */

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
      !entryId ||
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
      start >= end
    ) {
      throw new Error(
        'End time must be later than start time.'
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
    const sch =
      await editableSchedule(
        s,
        scheduleId
      )

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
      await editableSchedule(
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
       REMOVE OLD UNRESOLVED VALIDATION RESULTS
       ----------------------------------------------------- */

    const {
      error: deleteLogError,
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

    if (deleteLogError) {
      throw new Error(
        deleteLogError.message
      )
    }

    const logs: any[] =
      []

    const list =
      entries || []

    /* -----------------------------------------------------
       CHECK PAIRWISE OVERLAPS
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

        const kinds: string[] =
          []

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
          kinds.length
        ) {
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
    }

    /* -----------------------------------------------------
       SAVE VALIDATION RESULTS
       ----------------------------------------------------- */

    if (
      logs.length
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
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

function textValue(
  value: FormDataEntryValue | null
) {
  return typeof value === 'string'
    ? value.trim()
    : ''
}

function goWithError(
  message: string
): never {
  redirect(
    `/faculty/alterations?error=${encodeURIComponent(
      message
    )}`
  )
}

function goWithSuccess(
  message: string
): never {
  redirect(
    `/faculty/alterations?success=${encodeURIComponent(
      message
    )}`
  )
}

/* =========================================================
   SUBMIT FACULTY SCHEDULE CHANGE REQUEST
   ========================================================= */

export async function submitScheduleChangeRequest(
  formData: FormData
) {
  const { profile } =
    await requireRole([
      'faculty',
    ])

  const supabase =
    await createClient()

  /* -------------------------------------------------------
     FORM VALUES
     ------------------------------------------------------- */

  const scheduleEntryId =
    textValue(
      formData.get(
        'schedule_entry_id'
      )
    )

  const proposedDayRaw =
    textValue(
      formData.get(
        'proposed_day'
      )
    )

  const proposedStartTime =
    textValue(
      formData.get(
        'proposed_start_time'
      )
    )

  const proposedEndTime =
    textValue(
      formData.get(
        'proposed_end_time'
      )
    )

  const proposedRoomId =
    textValue(
      formData.get(
        'proposed_room_id'
      )
    )

  const reason =
    textValue(
      formData.get('reason')
    )

  /* -------------------------------------------------------
     BASIC VALIDATION
     ------------------------------------------------------- */

  if (!scheduleEntryId) {
    goWithError(
      'Please select a schedule entry.'
    )
  }

  if (!reason) {
    goWithError(
      'Please provide a reason for the schedule change.'
    )
  }

  if (reason.length < 5) {
    goWithError(
      'Please provide a clearer reason for the request.'
    )
  }

  if (reason.length > 1000) {
    goWithError(
      'The reason is too long. Please keep it under 1000 characters.'
    )
  }

  /* -------------------------------------------------------
     PROPOSED DAY
     ------------------------------------------------------- */

  let proposedDay:
    | number
    | null = null

  if (proposedDayRaw) {
    proposedDay =
      Number(
        proposedDayRaw
      )

    if (
      !Number.isInteger(
        proposedDay
      ) ||
      proposedDay < 1 ||
      proposedDay > 7
    ) {
      goWithError(
        'Invalid proposed day.'
      )
    }
  }

  /* -------------------------------------------------------
     PROPOSED TIME

     If one time is supplied, both are required.
     ------------------------------------------------------- */

  if (
    (proposedStartTime &&
      !proposedEndTime) ||
    (!proposedStartTime &&
      proposedEndTime)
  ) {
    goWithError(
      'Please provide both the proposed start time and end time.'
    )
  }

  if (
    proposedStartTime &&
    proposedEndTime &&
    proposedEndTime <=
      proposedStartTime
  ) {
    goWithError(
      'End time must be later than start time.'
    )
  }

  /* -------------------------------------------------------
     AT LEAST ONE PROPOSED VALUE
     ------------------------------------------------------- */

  if (
    proposedDay === null &&
    !proposedStartTime &&
    !proposedEndTime &&
    !proposedRoomId
  ) {
    goWithError(
      'Please provide at least one proposed schedule change.'
    )
  }

  /* =======================================================
     FACULTY PROFILE
     ======================================================= */

  const {
    data: faculty,
    error: facultyError,
  } = await supabase
    .from('faculty_profiles')
    .select(`
      id,
      department_id
    `)
    .eq(
      'profile_id',
      profile.id
    )
    .maybeSingle()

  if (facultyError) {
    goWithError(
      facultyError.message
    )
  }

  if (!faculty) {
    goWithError(
      'Faculty profile was not found.'
    )
  }

  /* =======================================================
     VERIFY SCHEDULE ENTRY

     Requirements:

     1. Entry belongs to logged-in faculty.
     2. Version is Published.
     3. Parent schedule is Published.
     4. Version is the schedule's current_version_id.

     This prevents requests against old/historical versions.
     ======================================================= */

  const {
    data: scheduleEntry,
    error: entryError,
  } = await supabase
    .from('schedule_entries')
    .select(`
      id,
      faculty_id,
      room_id,
      day_of_week,
      start_time,
      end_time,
      schedule_version_id,

      schedule_versions!inner(
        id,
        status,
        schedule_id,

        schedules!inner(
          id,
          status,
          current_version_id,
          department_id
        )
      )
    `)
    .eq(
      'id',
      scheduleEntryId
    )
    .eq(
      'faculty_id',
      faculty.id
    )
    .eq(
      'schedule_versions.status',
      'published'
    )
    .eq(
      'schedule_versions.schedules.status',
      'published'
    )
    .maybeSingle()

  if (entryError) {
    goWithError(
      entryError.message
    )
  }

  if (!scheduleEntry) {
    goWithError(
      'The selected class is not part of your published teaching schedule.'
    )
  }

  const versionRelation:
    any = Array.isArray(
      (scheduleEntry as any)
        .schedule_versions
    )
      ? (scheduleEntry as any)
          .schedule_versions[0]
      : (scheduleEntry as any)
          .schedule_versions

  const scheduleRelation:
    any = Array.isArray(
      versionRelation
        ?.schedules
    )
      ? versionRelation
          .schedules[0]
      : versionRelation
          ?.schedules

  if (
    !versionRelation ||
    !scheduleRelation
  ) {
    goWithError(
      'The official schedule information could not be verified.'
    )
  }

  if (
    versionRelation.status !==
      'published' ||
    scheduleRelation.status !==
      'published'
  ) {
    goWithError(
      'The selected class is not currently published.'
    )
  }

  if (
    scheduleRelation
      .current_version_id !==
    versionRelation.id
  ) {
    goWithError(
      'This class belongs to an older schedule version. Please refresh your schedule and select the current class.'
    )
  }

  /* -------------------------------------------------------
     DEPARTMENT CONSISTENCY
     ------------------------------------------------------- */

  if (
    faculty.department_id &&
    scheduleRelation
      .department_id &&
    faculty.department_id !==
      scheduleRelation
        .department_id
  ) {
    goWithError(
      'The selected class is outside your assigned department.'
    )
  }

  /* =======================================================
     PREVENT DUPLICATE PENDING REQUEST
     ======================================================= */

  const {
    data: existingRequest,
    error: existingError,
  } = await supabase
    .from(
      'schedule_change_requests'
    )
    .select('id')
    .eq(
      'schedule_entry_id',
      scheduleEntryId
    )
    .eq(
      'requested_by',
      profile.id
    )
    .eq(
      'status',
      'pending'
    )
    .maybeSingle()

  if (existingError) {
    goWithError(
      existingError.message
    )
  }

  if (existingRequest) {
    goWithError(
      'You already have a pending change request for this class.'
    )
  }

  /* =======================================================
     PROPOSED ROOM VALIDATION
     ======================================================= */

  if (proposedRoomId) {
    const {
      data: room,
      error: roomError,
    } = await supabase
      .from('rooms')
      .select(`
        id,
        is_active
      `)
      .eq(
        'id',
        proposedRoomId
      )
      .maybeSingle()

    if (roomError) {
      goWithError(
        roomError.message
      )
    }

    if (!room) {
      goWithError(
        'The selected room was not found.'
      )
    }

    if (!room.is_active) {
      goWithError(
        'The selected room is not currently active.'
      )
    }
  }

  /* =======================================================
     ACTUAL CHANGE CHECK

     Reject requests where the proposed values are identical
     to the current official schedule.
     ======================================================= */

  const currentDay =
    Number(
      scheduleEntry
        .day_of_week
    )

  const currentStart =
    String(
      scheduleEntry
        .start_time
    ).slice(
      0,
      5
    )

  const currentEnd =
    String(
      scheduleEntry
        .end_time
    ).slice(
      0,
      5
    )

  const normalizedStart =
    proposedStartTime
      ? proposedStartTime.slice(
          0,
          5
        )
      : ''

  const normalizedEnd =
    proposedEndTime
      ? proposedEndTime.slice(
          0,
          5
        )
      : ''

  const dayChanged =
    proposedDay !== null &&
    proposedDay !==
      currentDay

  const timeChanged =
    Boolean(
      normalizedStart &&
        normalizedEnd &&
        (
          normalizedStart !==
            currentStart ||
          normalizedEnd !==
            currentEnd
        )
    )

  const roomChanged =
    Boolean(
      proposedRoomId &&
        proposedRoomId !==
          scheduleEntry
            .room_id
    )

  if (
    !dayChanged &&
    !timeChanged &&
    !roomChanged
  ) {
    goWithError(
      'The proposed schedule is the same as the current schedule. Please enter an actual change.'
    )
  }

  /* =======================================================
     NORMALIZE UNCHANGED VALUES

     If the faculty selected a value identical to the
     current schedule, store it as NULL instead.

     NULL means "no requested change" for that field.
     ======================================================= */

  const finalProposedDay =
    dayChanged
      ? proposedDay
      : null

  const finalProposedStart =
    timeChanged
      ? normalizedStart
      : null

  const finalProposedEnd =
    timeChanged
      ? normalizedEnd
      : null

  const finalProposedRoom =
    roomChanged
      ? proposedRoomId
      : null

  /* =======================================================
     CREATE REQUEST

     IMPORTANT:

     This does NOT modify schedule_entries.

     The request remains Pending until reviewed by an
     authorized scheduler.

     RLS provides another ownership/security boundary.
     ======================================================= */

  const {
    error: insertError,
  } = await supabase
    .from(
      'schedule_change_requests'
    )
    .insert({
      schedule_entry_id:
        scheduleEntryId,

      requested_by:
        profile.id,

      proposed_day:
        finalProposedDay,

      proposed_start_time:
        finalProposedStart,

      proposed_end_time:
        finalProposedEnd,

      proposed_room_id:
        finalProposedRoom,

      reason,

      change_type:
        'normal_request',

      status:
        'pending',

      reviewed_by:
        null,

      reviewed_at:
        null,

      review_notes:
        null,
    })

  if (insertError) {
    if (
      insertError.code ===
      '23505'
    ) {
      goWithError(
        'You already have a pending change request for this class.'
      )
    }

    goWithError(
      insertError.message
    )
  }

  /* =======================================================
     REFRESH FACULTY UI
     ======================================================= */

  revalidatePath(
    '/faculty/alterations'
  )

  revalidatePath(
    '/faculty/dashboard'
  )

  revalidatePath(
    '/faculty/schedule'
  )

  goWithSuccess(
    'Schedule change request submitted successfully.'
  )
}

/* =========================================================
   CANCEL OWN PENDING REQUEST
   ========================================================= */

export async function cancelScheduleChangeRequest(
  formData: FormData
) {
  const { profile } =
    await requireRole([
      'faculty',
    ])

  const supabase =
    await createClient()

  const requestId =
    textValue(
      formData.get(
        'request_id'
      )
    )

  if (!requestId) {
    goWithError(
      'Invalid change request.'
    )
  }

  /* =======================================================
     CONFIRM OWNERSHIP + STATUS
     ======================================================= */

  const {
    data: request,
    error: requestError,
  } = await supabase
    .from(
      'schedule_change_requests'
    )
    .select(`
      id,
      status,
      requested_by
    `)
    .eq(
      'id',
      requestId
    )
    .eq(
      'requested_by',
      profile.id
    )
    .maybeSingle()

  if (requestError) {
    goWithError(
      requestError.message
    )
  }

  if (!request) {
    goWithError(
      'Change request was not found.'
    )
  }

  if (
    request.status !==
    'pending'
  ) {
    goWithError(
      'Only pending requests can be cancelled.'
    )
  }

  /* =======================================================
     CANCEL

     Keep all original request information intact.
     Only status changes to cancelled.
     ======================================================= */

  const {
    data: cancelled,
    error: updateError,
  } = await supabase
    .from(
      'schedule_change_requests'
    )
    .update({
      status:
        'cancelled',
    })
    .eq(
      'id',
      requestId
    )
    .eq(
      'requested_by',
      profile.id
    )
    .eq(
      'status',
      'pending'
    )
    .select('id')
    .maybeSingle()

  if (updateError) {
    goWithError(
      updateError.message
    )
  }

  /*
   * Protect against a stale page / concurrent review.
   *
   * If another authorized user already reviewed the request
   * before this update reached the database, zero rows will
   * be updated.
   */

  if (!cancelled) {
    goWithError(
      'This request is no longer pending and cannot be cancelled.'
    )
  }

  /* =======================================================
     REFRESH UI
     ======================================================= */

  revalidatePath(
    '/faculty/alterations'
  )

  revalidatePath(
    '/faculty/dashboard'
  )

  revalidatePath(
    '/faculty/schedule'
  )

  goWithSuccess(
    'Schedule change request cancelled.'
  )
}
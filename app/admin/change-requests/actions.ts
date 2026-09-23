'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? '').trim()

function fail(message: string): never {
  redirect(
    `/admin/change-requests?error=${encodeURIComponent(message)}`
  )
}

function refreshChangeRequestPages() {
  revalidatePath('/admin/change-requests')
  revalidatePath('/admin/schedules')
  revalidatePath('/admin/schedule-builder')
  revalidatePath('/faculty')
  revalidatePath('/faculty/dashboard')
  revalidatePath('/student')
  revalidatePath('/student/dashboard')
}

/* =========================================================
   REJECT CHANGE REQUEST
========================================================= */

export async function rejectChangeRequest(
  formData: FormData
) {
  const { profile } = await requireRole([
    'super_admin',
  ])

  const requestId = value(
    formData,
    'request_id'
  )

  const reviewNotes = value(
    formData,
    'review_notes'
  )

  if (!requestId) {
    fail('Missing change request.')
  }

  const supabase = await createClient()

  const {
    data: request,
    error: requestError,
  } = await supabase
    .from('schedule_change_requests')
    .select(`
      id,
      requested_by,
      status
    `)
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
    console.error(
      'Change request lookup failed:',
      requestError
    )

    fail(requestError.message)
  }

  if (!request) {
    fail('Change request not found.')
  }

  if (request.status !== 'pending') {
    fail(
      'Only pending change requests can be rejected.'
    )
  }

  const now = new Date().toISOString()

  const {
    data: updatedRequest,
    error: updateError,
  } = await supabase
    .from('schedule_change_requests')
    .update({
      status: 'rejected',
      reviewed_by: profile.id,
      review_notes: reviewNotes || null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error(
      'Change request rejection failed:',
      updateError
    )

    fail(updateError.message)
  }

  if (!updatedRequest) {
    fail(
      'The request is no longer pending.'
    )
  }

  if (request.requested_by) {
    const { error: notificationError } =
      await supabase
        .from('notifications')
        .insert({
          profile_id: request.requested_by,
          title: 'Schedule alteration rejected',
          message:
            reviewNotes ||
            'Your schedule alteration request was not approved.',
          type: 'schedule_change',
          reference_type:
            'schedule_change_request',
          reference_id: requestId,
          priority: 'normal',
        })

    if (notificationError) {
      console.error(
        'Rejection notification failed:',
        notificationError
      )
    }
  }

  refreshChangeRequestPages()

  redirect(
    '/admin/change-requests?success=rejected'
  )
}

/* =========================================================
   APPROVE CHANGE REQUEST
========================================================= */

export async function approveChangeRequest(
  formData: FormData
) {
  const { profile } = await requireRole([
    'super_admin',
  ])

  const requestId = value(
    formData,
    'request_id'
  )

  const reviewNotes = value(
    formData,
    'review_notes'
  )

  if (!requestId) {
    fail('Missing change request.')
  }

  const supabase = await createClient()

  /* ---------------------------------------------------------
     LOAD REQUEST
  --------------------------------------------------------- */

  const {
    data: request,
    error: requestError,
  } = await supabase
    .from('schedule_change_requests')
    .select(`
      id,
      schedule_entry_id,
      requested_by,
      proposed_day,
      proposed_start_time,
      proposed_end_time,
      proposed_room_id,
      reason,
      change_type,
      status
    `)
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
    console.error(
      'Change request lookup failed:',
      requestError
    )

    fail(requestError.message)
  }

  if (!request) {
    fail('Change request not found.')
  }

  if (request.status !== 'pending') {
    fail(
      'Only pending change requests can be approved.'
    )
  }

  if (!request.schedule_entry_id) {
    fail(
      'The change request has no schedule entry.'
    )
  }

  /* ---------------------------------------------------------
     LOAD ORIGINAL ENTRY
  --------------------------------------------------------- */

  const {
    data: originalEntry,
    error: entryError,
  } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq(
      'id',
      request.schedule_entry_id
    )
    .maybeSingle()

  if (entryError) {
    console.error(
      'Schedule entry lookup failed:',
      entryError
    )

    fail(entryError.message)
  }

  if (!originalEntry) {
    fail('Schedule entry not found.')
  }

  /* ---------------------------------------------------------
     VALIDATE PROPOSED VALUES
  --------------------------------------------------------- */

  const proposedDay =
    request.proposed_day ??
    originalEntry.day_of_week

  const proposedStart =
    request.proposed_start_time ??
    originalEntry.start_time

  const proposedEnd =
    request.proposed_end_time ??
    originalEntry.end_time

  const proposedRoomId =
    request.proposed_room_id ??
    originalEntry.room_id

  if (
    proposedDay === null ||
    proposedDay === undefined
  ) {
    fail('Invalid proposed day.')
  }

  const dayNumber = Number(proposedDay)

  if (
    !Number.isInteger(dayNumber) ||
    dayNumber < 1 ||
    dayNumber > 7
  ) {
    fail('Invalid proposed day.')
  }

  if (
    !proposedStart ||
    !proposedEnd ||
    proposedStart >= proposedEnd
  ) {
    fail('Invalid proposed schedule time.')
  }

  /* ---------------------------------------------------------
     VALIDATE PROPOSED ROOM
  --------------------------------------------------------- */

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
      .eq('id', proposedRoomId)
      .maybeSingle()

    if (roomError) {
      console.error(
        'Proposed room lookup failed:',
        roomError
      )

      fail(roomError.message)
    }

    if (!room || !room.is_active) {
      fail(
        'The proposed room is unavailable or inactive.'
      )
    }
  }

  /* ---------------------------------------------------------
     LOAD ORIGINAL VERSION
  --------------------------------------------------------- */

  const {
    data: originalVersion,
    error: versionError,
  } = await supabase
    .from('schedule_versions')
    .select(`
      id,
      schedule_id,
      version_number
    `)
    .eq(
      'id',
      originalEntry.schedule_version_id
    )
    .maybeSingle()

  if (versionError) {
    console.error(
      'Schedule version lookup failed:',
      versionError
    )

    fail(versionError.message)
  }

  if (!originalVersion) {
    fail('Schedule version not found.')
  }

  /* ---------------------------------------------------------
     LOAD ALL ENTRIES BEFORE CREATING VERSION
  --------------------------------------------------------- */

  const {
    data: originalEntries,
    error: entriesError,
  } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq(
      'schedule_version_id',
      originalVersion.id
    )

  if (entriesError) {
    console.error(
      'Schedule entries lookup failed:',
      entriesError
    )

    fail(entriesError.message)
  }

  if (
    !originalEntries ||
    originalEntries.length === 0
  ) {
    fail(
      'The original schedule version has no entries.'
    )
  }

  /* ---------------------------------------------------------
     DETERMINE NEXT VERSION NUMBER
  --------------------------------------------------------- */

  const {
    data: latestVersion,
    error: latestVersionError,
  } = await supabase
    .from('schedule_versions')
    .select('version_number')
    .eq(
      'schedule_id',
      originalVersion.schedule_id
    )
    .order(
      'version_number',
      { ascending: false }
    )
    .limit(1)
    .maybeSingle()

  if (latestVersionError) {
    console.error(
      'Latest schedule version lookup failed:',
      latestVersionError
    )

    fail(latestVersionError.message)
  }

  const nextVersionNumber =
    Number(
      latestVersion?.version_number ?? 0
    ) + 1

  /* ---------------------------------------------------------
     CREATE NEW DRAFT VERSION
  --------------------------------------------------------- */

  const {
    data: newVersion,
    error: newVersionError,
  } = await supabase
    .from('schedule_versions')
    .insert({
      schedule_id:
        originalVersion.schedule_id,

      version_number:
        nextVersionNumber,

      status: 'draft',

      created_by:
        profile.id,

      change_reason:
        request.reason ||
        'Approved schedule alteration',
    })
    .select('id')
    .single()

  if (
    newVersionError ||
    !newVersion
  ) {
    console.error(
      'Schedule version creation failed:',
      newVersionError
    )

    fail(
      newVersionError?.message ||
        'Version creation failed.'
    )
  }

  /* ---------------------------------------------------------
     COPY ENTRIES + APPLY APPROVED CHANGE
  --------------------------------------------------------- */

  let changedEntry: any = null

  const copiedEntries =
    originalEntries.map((entry: any) => {
      const {
        id,
        created_at,
        updated_at,
        ...rest
      } = entry

      const copied: any = {
        ...rest,
        schedule_version_id:
          newVersion.id,
      }

      if (entry.id === originalEntry.id) {
        copied.day_of_week =
          dayNumber

        copied.start_time =
          proposedStart

        copied.end_time =
          proposedEnd

        copied.room_id =
          proposedRoomId || null

        changedEntry = copied
      }

      return copied
    })

  if (!changedEntry) {
    await supabase
      .from('schedule_versions')
      .delete()
      .eq('id', newVersion.id)

    fail(
      'Original schedule entry was not found in its version.'
    )
  }

  const {
    error: insertEntriesError,
  } = await supabase
    .from('schedule_entries')
    .insert(copiedEntries)

  if (insertEntriesError) {
    console.error(
      'Schedule entry copy failed:',
      insertEntriesError
    )

    await supabase
      .from('schedule_versions')
      .delete()
      .eq('id', newVersion.id)

    fail(insertEntriesError.message)
  }

  const now = new Date().toISOString()

  /* ---------------------------------------------------------
     MOVE SCHEDULE TO NEW DRAFT
  --------------------------------------------------------- */

  const {
    data: updatedSchedule,
    error: scheduleUpdateError,
  } = await supabase
    .from('schedules')
    .update({
      current_version_id:
        newVersion.id,

      status: 'draft',

      updated_at: now,
    })
    .eq(
      'id',
      originalVersion.schedule_id
    )
    .select('id')
    .maybeSingle()

  if (
    scheduleUpdateError ||
    !updatedSchedule
  ) {
    console.error(
      'Schedule update failed:',
      scheduleUpdateError
    )

    await supabase
      .from('schedule_versions')
      .delete()
      .eq('id', newVersion.id)

    fail(
      scheduleUpdateError?.message ||
        'Schedule update failed.'
    )
  }

  /* ---------------------------------------------------------
     APPROVE REQUEST
  --------------------------------------------------------- */

  const {
    data: approvedRequest,
    error: approveError,
  } = await supabase
    .from('schedule_change_requests')
    .update({
      status: 'approved',

      reviewed_by:
        profile.id,

      review_notes:
        reviewNotes || null,

      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (
    approveError ||
    !approvedRequest
  ) {
    console.error(
      'Change request approval update failed:',
      approveError
    )

    fail(
      approveError?.message ||
        'Change request approval failed.'
    )
  }

  /* ---------------------------------------------------------
     REVISION HISTORY
  --------------------------------------------------------- */

  const {
    error: historyError,
  } = await supabase
    .from('schedule_revision_history')
    .insert({
      schedule_id:
        originalVersion.schedule_id,

      old_version_id:
        originalVersion.id,

      new_version_id:
        newVersion.id,

      change_request_id:
        requestId,

      changed_by:
        profile.id,

      change_type:
        request.change_type,

      reason:
        request.reason,

      before_data:
        originalEntry,

      after_data:
        changedEntry,
    })

  if (historyError) {
    console.error(
      'Schedule revision history insert failed:',
      historyError
    )
  }

  /* ---------------------------------------------------------
     NOTIFY REQUESTER
  --------------------------------------------------------- */

  if (request.requested_by) {
    const {
      error: notificationError,
    } = await supabase
      .from('notifications')
      .insert({
        profile_id:
          request.requested_by,

        title:
          'Schedule alteration approved',

        message:
          'Your request was approved. A new draft schedule version was created and must be validated before publication.',

        type:
          'schedule_change',

        reference_type:
          'schedule_change_request',

        reference_id:
          requestId,

        priority:
          'high',
      })

    if (notificationError) {
      console.error(
        'Approval notification failed:',
        notificationError
      )
    }
  }

  refreshChangeRequestPages()

  redirect(
    '/admin/change-requests?success=approved'
  )
}
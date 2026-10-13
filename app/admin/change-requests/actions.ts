'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getString } from '@/lib/form-data'
import type { Tables, TablesInsert } from '@/lib/database.types'

type ScheduleEntryRow = Tables<'schedule_entries'>
type ScheduleEntryDraft = TablesInsert<'schedule_entries'>

function fail(message: string): never {
  redirect(`/admin/change-requests?error=${encodeURIComponent(message)}`)
=======

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

type ScheduleEntryRow = {
  id: string
  schedule_version_id: string
  day_of_week: number | string | null
  start_time: string | null
  end_time: string | null
  room_id: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

type ScheduleEntryDraft = Omit<
  ScheduleEntryRow,
  'id' | 'created_at' | 'updated_at'
> & {
  schedule_version_id: string
}

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? '').trim()

function fail(message: string): never {
  redirect(
    `/admin/change-requests?error=${encodeURIComponent(message)}`
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

function refreshChangeRequestPages() {
  revalidatePath('/admin/change-requests')
  revalidatePath('/admin/schedules')
  revalidatePath('/admin/schedule-builder')
  revalidatePath('/faculty')
  revalidatePath('/faculty/dashboard')
<<<<<<< HEAD
=======
  revalidatePath('/student')
  revalidatePath('/student/dashboard')
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

/* =========================================================
   REJECT CHANGE REQUEST
========================================================= */

<<<<<<< HEAD
export async function rejectChangeRequest(formData: FormData) {
  const { profile } = await requireRole(['super_admin'])
  const requestId = getString(formData, 'request_id')
  const reviewNotes = getString(formData, 'review_notes')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!requestId) {
    fail('Missing change request.')
  }

  const supabase = await createClient()

<<<<<<< HEAD
  const { data: request, error: requestError } = await supabase
    .from('schedule_change_requests')
    .select(
      `
      id,
      requested_by,
      status
    `
    )
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
<<<<<<< HEAD
    console.error('Change request lookup failed:', requestError)
=======
    console.error(
      'Change request lookup failed:',
      requestError
    )

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail(requestError.message)
  }

  if (!request) {
    fail('Change request not found.')
  }

  if (request.status !== 'pending') {
<<<<<<< HEAD
    fail('Only pending change requests can be rejected.')
=======
    fail(
      'Only pending change requests can be rejected.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  const now = new Date().toISOString()

<<<<<<< HEAD
  const { data: updatedRequest, error: updateError } = await supabase
=======
  const {
    data: updatedRequest,
    error: updateError,
  } = await supabase
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
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
<<<<<<< HEAD
    console.error('Change request rejection failed:', updateError)
=======
    console.error(
      'Change request rejection failed:',
      updateError
    )

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail(updateError.message)
  }

  if (!updatedRequest) {
<<<<<<< HEAD
    fail('The request is no longer pending.')
  }

  if (request.requested_by) {
    const { error: notificationError } = await supabase.from('notifications').insert({
      profile_id: request.requested_by,
      title: 'Schedule alteration rejected',
      message: reviewNotes || 'Your schedule alteration request was not approved.',
      type: 'schedule_change',
      reference_type: 'schedule_change_request',
      reference_id: requestId,
      priority: 'normal',
    })

    if (notificationError) {
      console.error('Rejection notification failed:', notificationError)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  refreshChangeRequestPages()
<<<<<<< HEAD
  redirect('/admin/change-requests?success=rejected')
=======

  redirect(
    '/admin/change-requests?success=rejected'
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

/* =========================================================
   APPROVE CHANGE REQUEST
========================================================= */

<<<<<<< HEAD
export async function approveChangeRequest(formData: FormData) {
  const { profile } = await requireRole(['super_admin'])
  const requestId = getString(formData, 'request_id')
  const reviewNotes = getString(formData, 'review_notes')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!requestId) {
    fail('Missing change request.')
  }

  const supabase = await createClient()

  /* ---------------------------------------------------------
     LOAD REQUEST
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: request, error: requestError } = await supabase
    .from('schedule_change_requests')
    .select(
      `
=======
  const {
    data: request,
    error: requestError,
  } = await supabase
    .from('schedule_change_requests')
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
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
<<<<<<< HEAD
    `
    )
=======
    `)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .eq('id', requestId)
    .maybeSingle()

  if (requestError) {
<<<<<<< HEAD
    console.error('Change request lookup failed:', requestError)
=======
    console.error(
      'Change request lookup failed:',
      requestError
    )

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail(requestError.message)
  }

  if (!request) {
    fail('Change request not found.')
  }

  if (request.status !== 'pending') {
<<<<<<< HEAD
    fail('Only pending change requests can be approved.')
  }

  if (!request.schedule_entry_id) {
    fail('The change request has no schedule entry.')
=======
    fail(
      'Only pending change requests can be approved.'
    )
  }

  if (!request.schedule_entry_id) {
    fail(
      'The change request has no schedule entry.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ---------------------------------------------------------
     LOAD ORIGINAL ENTRY
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: originalEntry, error: entryError } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('id', request.schedule_entry_id)
    .maybeSingle()

  if (entryError) {
    console.error('Schedule entry lookup failed:', entryError)
=======
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

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail(entryError.message)
  }

  if (!originalEntry) {
    fail('Schedule entry not found.')
  }

  /* ---------------------------------------------------------
     VALIDATE PROPOSED VALUES
  --------------------------------------------------------- */

<<<<<<< HEAD
  const proposedDay = request.proposed_day ?? originalEntry.day_of_week
  const proposedStart = request.proposed_start_time ?? originalEntry.start_time
  const proposedEnd = request.proposed_end_time ?? originalEntry.end_time
  const proposedRoomId = request.proposed_room_id ?? originalEntry.room_id

  if (proposedDay === null || proposedDay === undefined) {
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail('Invalid proposed day.')
  }

  const dayNumber = Number(proposedDay)

<<<<<<< HEAD
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
    fail('Invalid proposed day.')
  }

  if (!proposedStart || !proposedEnd || proposedStart >= proposedEnd) {
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail('Invalid proposed schedule time.')
  }

  /* ---------------------------------------------------------
     VALIDATE PROPOSED ROOM
  --------------------------------------------------------- */

  if (proposedRoomId) {
<<<<<<< HEAD
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(
        `
        id,
        is_active
      `
      )
=======
    const {
      data: room,
      error: roomError,
    } = await supabase
      .from('rooms')
      .select(`
        id,
        is_active
      `)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      .eq('id', proposedRoomId)
      .maybeSingle()

    if (roomError) {
<<<<<<< HEAD
      console.error('Proposed room lookup failed:', roomError)
=======
      console.error(
        'Proposed room lookup failed:',
        roomError
      )

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      fail(roomError.message)
    }

    if (!room || !room.is_active) {
<<<<<<< HEAD
      fail('The proposed room is unavailable or inactive.')
=======
      fail(
        'The proposed room is unavailable or inactive.'
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  /* ---------------------------------------------------------
     LOAD ORIGINAL VERSION
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: originalVersion, error: versionError } = await supabase
    .from('schedule_versions')
    .select(
      `
      id,
      schedule_id,
      version_number
    `
    )
    .eq('id', originalEntry.schedule_version_id)
    .maybeSingle()

  if (versionError) {
    console.error('Schedule version lookup failed:', versionError)
=======
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

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail(versionError.message)
  }

  if (!originalVersion) {
    fail('Schedule version not found.')
  }

  /* ---------------------------------------------------------
     LOAD ALL ENTRIES BEFORE CREATING VERSION
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: originalEntries, error: entriesError } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('schedule_version_id', originalVersion.id)

  if (entriesError) {
    console.error('Schedule entries lookup failed:', entriesError)
    fail(entriesError.message)
  }

  if (!originalEntries || originalEntries.length === 0) {
    fail('The original schedule version has no entries.')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ---------------------------------------------------------
     DETERMINE NEXT VERSION NUMBER
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: latestVersion, error: latestVersionError } = await supabase
    .from('schedule_versions')
    .select('version_number')
    .eq('schedule_id', originalVersion.schedule_id)
    .order('version_number', { ascending: false })
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .limit(1)
    .maybeSingle()

  if (latestVersionError) {
<<<<<<< HEAD
    console.error('Latest schedule version lookup failed:', latestVersionError)
    fail(latestVersionError.message)
  }

  const nextVersionNumber = Number(latestVersion?.version_number ?? 0) + 1
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* ---------------------------------------------------------
     CREATE NEW DRAFT VERSION
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: newVersion, error: newVersionError } = await supabase
    .from('schedule_versions')
    .insert({
      schedule_id: originalVersion.schedule_id,
      version_number: nextVersionNumber,
      status: 'draft',
      created_by: profile.id,
      change_reason: request.reason || 'Approved schedule alteration',
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    })
    .select('id')
    .single()

<<<<<<< HEAD
  if (newVersionError || !newVersion) {
    console.error('Schedule version creation failed:', newVersionError)
    fail(newVersionError?.message || 'Version creation failed.')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ---------------------------------------------------------
     COPY ENTRIES + APPLY APPROVED CHANGE
  --------------------------------------------------------- */

  let changedEntry: ScheduleEntryDraft | null = null

<<<<<<< HEAD
  const copiedEntries: ScheduleEntryDraft[] = originalEntries.map((entry: ScheduleEntryRow) => {
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = entry
    void _id
    void _createdAt
    void _updatedAt

    const copied: ScheduleEntryDraft = { ...rest, schedule_version_id: newVersion.id }

    if (entry.id === originalEntry.id) {
      copied.day_of_week = dayNumber
      copied.start_time = proposedStart
      copied.end_time = proposedEnd
      copied.room_id = proposedRoomId
      changedEntry = copied
    }

    return copied
  })

  if (!changedEntry) {
    await supabase.from('schedule_versions').delete().eq('id', newVersion.id)
    fail('Original schedule entry was not found in its version.')
  }

  const { error: insertEntriesError } = await supabase
=======
  const copiedEntries: ScheduleEntryDraft[] =
    originalEntries.map((entry: ScheduleEntryRow) => {
      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        ...rest
      } = entry

      void _id
      void _createdAt
      void _updatedAt

      const copied: ScheduleEntryDraft = {
        ...(rest as Omit<
          ScheduleEntryRow,
          'id' | 'created_at' | 'updated_at'
        >),
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .from('schedule_entries')
    .insert(copiedEntries)

  if (insertEntriesError) {
<<<<<<< HEAD
    console.error('Schedule entry copy failed:', insertEntriesError)
    await supabase.from('schedule_versions').delete().eq('id', newVersion.id)
=======
    console.error(
      'Schedule entry copy failed:',
      insertEntriesError
    )

    await supabase
      .from('schedule_versions')
      .delete()
      .eq('id', newVersion.id)

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    fail(insertEntriesError.message)
  }

  const now = new Date().toISOString()

  /* ---------------------------------------------------------
     MOVE SCHEDULE TO NEW DRAFT
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: updatedSchedule, error: scheduleUpdateError } = await supabase
    .from('schedules')
    .update({
      current_version_id: newVersion.id,
      status: 'draft',
      updated_at: now,
    })
    .eq('id', originalVersion.schedule_id)
    .select('id')
    .maybeSingle()

  if (scheduleUpdateError || !updatedSchedule) {
    console.error('Schedule update failed:', scheduleUpdateError)
    await supabase.from('schedule_versions').delete().eq('id', newVersion.id)
    fail(scheduleUpdateError?.message || 'Schedule update failed.')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ---------------------------------------------------------
     APPROVE REQUEST
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { data: approvedRequest, error: approveError } = await supabase
    .from('schedule_change_requests')
    .update({
      status: 'approved',
      reviewed_by: profile.id,
      review_notes: reviewNotes || null,
=======
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

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

<<<<<<< HEAD
  if (approveError || !approvedRequest) {
    console.error('Change request approval update failed:', approveError)
    fail(approveError?.message || 'Change request approval failed.')
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ---------------------------------------------------------
     REVISION HISTORY
  --------------------------------------------------------- */

<<<<<<< HEAD
  const { error: historyError } = await supabase.from('schedule_revision_history').insert({
    schedule_id: originalVersion.schedule_id,
    old_version_id: originalVersion.id,
    new_version_id: newVersion.id,
    change_request_id: requestId,
    changed_by: profile.id,
    change_type: request.change_type,
    reason: request.reason,
    before_data: originalEntry,
    after_data: changedEntry,
  })

  if (historyError) {
    console.error('Schedule revision history insert failed:', historyError)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ---------------------------------------------------------
     NOTIFY REQUESTER
  --------------------------------------------------------- */

  if (request.requested_by) {
<<<<<<< HEAD
    const { error: notificationError } = await supabase.from('notifications').insert({
      profile_id: request.requested_by,
      title: 'Schedule alteration approved',
      message:
        'Your request was approved. A new draft schedule version was created and must be validated before publication.',
      type: 'schedule_change',
      reference_type: 'schedule_change_request',
      reference_id: requestId,
      priority: 'high',
    })

    if (notificationError) {
      console.error('Approval notification failed:', notificationError)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  refreshChangeRequestPages()
<<<<<<< HEAD
  redirect('/admin/change-requests?success=approved')
}
=======

  redirect(
    '/admin/change-requests?success=approved'
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getString } from '@/lib/form-data'
import { one } from '@/lib/relations'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

function errorRedirect(message: string): never {
  redirect(`/scheduler/alterations?error=${encodeURIComponent(message)}`)
}

async function notifyRequester(
  supabase: SupabaseClient<Database>,
  profileId: string | null | undefined,
  requestId: string,
  title: string,
  message: string
) {
  if (!profileId) return
  const { error } = await supabase.from('notifications').insert({
    profile_id: profileId,
    type: 'alteration_review',
    title,
    message,
    reference_type: 'schedule_change_request',
    reference_id: requestId,
    priority: 'normal',
  })
  if (error) console.error('Failed to notify alteration requester:', error)
}

function successRedirect(message: string): never {
  redirect(`/scheduler/alterations?success=${encodeURIComponent(message)}`)
=======

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

function field(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function errorRedirect(message: string): never {
  redirect(
    `/scheduler/alterations?error=${encodeURIComponent(message)}`
  )
}

function successRedirect(message: string): never {
  redirect(
    `/scheduler/alterations?success=${encodeURIComponent(message)}`
  )
}

function one(value: any) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

/* ============================================================
   GET + VERIFY MANAGED REQUEST
============================================================ */

async function getManagedRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  requestId: string
) {
<<<<<<< HEAD
  const { data: assignments, error: assignmentError } = await supabase
    .from('scheduler_departments')
    .select('department_id')
    .eq('profile_id', profileId)
    .eq('active', true)
=======
  const { data: assignments, error: assignmentError } =
    await supabase
      .from('scheduler_departments')
      .select('department_id')
      .eq('profile_id', profileId)
      .eq('active', true)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (assignmentError) {
    return {
      request: null,
      schedule: null,
      version: null,
      entry: null,
      error: assignmentError.message,
    }
  }

<<<<<<< HEAD
  const departmentIds = assignments?.map((x) => x.department_id) ?? []
=======
  const departmentIds =
    assignments?.map((x: any) => x.department_id) ?? []
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!departmentIds.length) {
    return {
      request: null,
      schedule: null,
      version: null,
      entry: null,
      error: 'You are not assigned to an active department.',
    }
  }

  const { data: request, error } = await supabase
    .from('schedule_change_requests')
<<<<<<< HEAD
    .select(
      `
=======
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
      status,
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      schedule_entries!inner(
        id,
        schedule_version_id,
        class_offering_id,
        faculty_id,
        section_id,
        room_id,
        day_of_week,
        start_time,
        end_time,
        entry_type,
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        schedule_versions!inner(
          id,
          schedule_id,
          status,
<<<<<<< HEAD
          schedules!schedule_versions_schedule_id_fkey!inner(
=======

          schedules!inner(
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
            id,
            department_id,
            current_version_id,
            status
          )
        )
      )
<<<<<<< HEAD
    `
    )
=======
    `)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .eq('id', requestId)
    .maybeSingle()

  if (error || !request) {
    return {
      request: null,
      schedule: null,
      version: null,
      entry: null,
      error: error?.message || 'Change request was not found.',
    }
  }

  const entry = one(request.schedule_entries)
  const version = one(entry?.schedule_versions)
  const schedule = one(version?.schedules)

<<<<<<< HEAD
  if (!schedule?.department_id || !departmentIds.includes(schedule.department_id)) {
=======
  if (
    !schedule?.department_id ||
    !departmentIds.includes(schedule.department_id)
  ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    return {
      request: null,
      schedule: null,
      version: null,
      entry: null,
<<<<<<< HEAD
      error: 'You are not authorized to manage this schedule request.',
=======
      error:
        'You are not authorized to manage this schedule request.',
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  return {
    request,
    schedule,
    version,
    entry,
    error: null,
  }
}

/* ============================================================
   REJECT REQUEST
============================================================ */

<<<<<<< HEAD
export async function rejectScheduleChangeRequest(formData: FormData) {
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const requestId = getString(formData, 'request_id')
  const reviewNotes = getString(formData, 'review_notes')
=======
export async function rejectScheduleChangeRequest(
  formData: FormData
) {
  const { profile } = await requireRole([
    'department_scheduler',
  ])

  const supabase = await createClient()

  const requestId = field(formData.get('request_id'))
  const reviewNotes = field(formData.get('review_notes'))
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!requestId) {
    errorRedirect('Invalid schedule change request.')
  }

  if (!reviewNotes) {
<<<<<<< HEAD
    errorRedirect('Please provide a reason for rejecting the request.')
  }

  const result = await getManagedRequest(supabase, profile.id, requestId)
=======
    errorRedirect(
      'Please provide a reason for rejecting the request.'
    )
  }

  const result = await getManagedRequest(
    supabase,
    profile.id,
    requestId
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (result.error || !result.request) {
    errorRedirect(result.error || 'Request was not found.')
  }

  if (result.request.status !== 'pending') {
    errorRedirect('Only pending requests can be reviewed.')
  }

  const { error } = await supabase
    .from('schedule_change_requests')
    .update({
      status: 'rejected',
      reviewed_by: profile.id,
      review_notes: reviewNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (error) {
    errorRedirect(error.message)
  }

<<<<<<< HEAD
  await notifyRequester(
    supabase,
    result.request?.requested_by,
    requestId,
    'Alteration request rejected',
    reviewNotes
      ? `Your schedule change request was rejected. Notes: ${reviewNotes}`
      : 'Your schedule change request was rejected.'
  )

  revalidatePath('/scheduler/alterations')
  revalidatePath('/faculty/alterations')
=======
  revalidatePath('/scheduler/alterations')
  revalidatePath('/faculty/alterations')

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  successRedirect('Schedule change request rejected.')
}

/* ============================================================
   APPROVE + CREATE REVISED DRAFT VERSION
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
   IMPORTANT:
   - Original published version is NOT modified.
   - A new draft version is created.
   - All entries are copied.
   - Requested alteration is applied to the copied entry.
   - Revision history is recorded.
============================================================ */

<<<<<<< HEAD
export async function approveScheduleChangeRequest(formData: FormData) {
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const requestId = getString(formData, 'request_id')
  const reviewNotes = getString(formData, 'review_notes')
=======
export async function approveScheduleChangeRequest(
  formData: FormData
) {
  const { profile } = await requireRole([
    'department_scheduler',
  ])

  const supabase = await createClient()

  const requestId = field(formData.get('request_id'))
  const reviewNotes = field(formData.get('review_notes'))
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!requestId) {
    errorRedirect('Invalid schedule change request.')
  }

<<<<<<< HEAD
  const result = await getManagedRequest(supabase, profile.id, requestId)

  if (result.error || !result.request || !result.entry || !result.version || !result.schedule) {
    errorRedirect(result.error || 'Unable to load the alteration request.')
=======
  const result = await getManagedRequest(
    supabase,
    profile.id,
    requestId
  )

  if (
    result.error ||
    !result.request ||
    !result.entry ||
    !result.version ||
    !result.schedule
  ) {
    errorRedirect(
      result.error || 'Unable to load the alteration request.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  const request = result.request
  const sourceEntry = result.entry
  const sourceVersion = result.version
  const schedule = result.schedule

  if (request.status !== 'pending') {
    errorRedirect('Only pending requests can be approved.')
  }

  /* ----------------------------------------------------------
     SOURCE MUST STILL BE THE PUBLISHED VERSION
  ---------------------------------------------------------- */

  if (sourceVersion.status !== 'published') {
<<<<<<< HEAD
    errorRedirect('The original schedule version is no longer published.')
=======
    errorRedirect(
      'The original schedule version is no longer published.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ----------------------------------------------------------
     VALIDATE PROPOSED VALUES
  ---------------------------------------------------------- */

<<<<<<< HEAD
  const proposedDay = request.proposed_day ?? sourceEntry.day_of_week
  const proposedStart = request.proposed_start_time ?? sourceEntry.start_time
  const proposedEnd = request.proposed_end_time ?? sourceEntry.end_time
  const proposedRoom = request.proposed_room_id ?? sourceEntry.room_id

  if (!proposedDay || proposedDay < 1 || proposedDay > 7) {
=======
  const proposedDay =
    request.proposed_day ?? sourceEntry.day_of_week

  const proposedStart =
    request.proposed_start_time ?? sourceEntry.start_time

  const proposedEnd =
    request.proposed_end_time ?? sourceEntry.end_time

  const proposedRoom =
    request.proposed_room_id ?? sourceEntry.room_id

  if (
    !proposedDay ||
    proposedDay < 1 ||
    proposedDay > 7
  ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    errorRedirect('Invalid proposed day.')
  }

  if (!proposedStart || !proposedEnd) {
    errorRedirect('Invalid proposed schedule time.')
  }

  if (proposedStart >= proposedEnd) {
<<<<<<< HEAD
    errorRedirect('Proposed end time must be later than start time.')
=======
    errorRedirect(
      'Proposed end time must be later than start time.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  if (!proposedRoom) {
    errorRedirect('A valid room is required.')
  }

  /* ----------------------------------------------------------
     VERIFY PROPOSED ROOM
  ---------------------------------------------------------- */

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', proposedRoom)
    .maybeSingle()

  if (roomError || !room) {
<<<<<<< HEAD
    errorRedirect(roomError?.message || 'Proposed room was not found.')
=======
    errorRedirect(
      roomError?.message || 'Proposed room was not found.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ----------------------------------------------------------
     GET ALL ENTRIES FROM ORIGINAL PUBLISHED VERSION
  ---------------------------------------------------------- */

<<<<<<< HEAD
  const { data: sourceEntries, error: sourceEntriesError } = await supabase
    .from('schedule_entries')
    .select(
      `
=======
  const { data: sourceEntries, error: sourceEntriesError } =
    await supabase
      .from('schedule_entries')
      .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        id,
        class_offering_id,
        faculty_id,
        section_id,
        room_id,
        day_of_week,
        start_time,
        end_time,
<<<<<<< HEAD
        entry_type,
        session_type,
        delivery_mode
      `
    )
    .eq('schedule_version_id', sourceVersion.id)
    .order('day_of_week')
    .order('start_time')
=======
        entry_type
      `)
      .eq('schedule_version_id', sourceVersion.id)
      .order('day_of_week')
      .order('start_time')
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (sourceEntriesError) {
    errorRedirect(sourceEntriesError.message)
  }

  if (!sourceEntries?.length) {
<<<<<<< HEAD
    errorRedirect('The published schedule does not contain any entries.')
=======
    errorRedirect(
      'The published schedule does not contain any entries.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ----------------------------------------------------------
     GET NEXT VERSION NUMBER
  ---------------------------------------------------------- */

<<<<<<< HEAD
  const { data: latestVersion, error: latestVersionError } = await supabase
    .from('schedule_versions')
    .select('version_number')
    .eq('schedule_id', schedule.id)
    .order('version_number', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()
=======
  const { data: latestVersion, error: latestVersionError } =
    await supabase
      .from('schedule_versions')
      .select('version_number')
      .eq('schedule_id', schedule.id)
      .order('version_number', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (latestVersionError) {
    errorRedirect(latestVersionError.message)
  }

<<<<<<< HEAD
  const nextVersionNumber = Number(latestVersion?.version_number ?? 0) + 1
=======
  const nextVersionNumber =
    Number(latestVersion?.version_number ?? 0) + 1
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* ----------------------------------------------------------
     CREATE NEW DRAFT VERSION
  ---------------------------------------------------------- */

<<<<<<< HEAD
  const { data: newVersion, error: versionError } = await supabase
    .from('schedule_versions')
    .insert({
      schedule_id: schedule.id,
      version_number: nextVersionNumber,
      status: 'draft',
      created_by: profile.id,
      change_reason: `Faculty alteration request: ${request.reason}`,
    })
    .select('id, version_number')
    .single()

  if (versionError || !newVersion) {
    errorRedirect(versionError?.message || 'Failed to create revised schedule version.')
=======
  const { data: newVersion, error: versionError } =
    await supabase
      .from('schedule_versions')
      .insert({
        schedule_id: schedule.id,
        version_number: nextVersionNumber,
        status: 'draft',
        created_by: profile.id,
        change_reason:
          `Faculty alteration request: ${request.reason}`,
      })
      .select('id, version_number')
      .single()

  if (versionError || !newVersion) {
    errorRedirect(
      versionError?.message ||
        'Failed to create revised schedule version.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ----------------------------------------------------------
     COPY ALL ENTRIES TO NEW VERSION
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     Requested entry receives proposed values.
     Everything else remains unchanged.
  ---------------------------------------------------------- */

<<<<<<< HEAD
  const copiedEntries = sourceEntries.map((entry) => {
    const isChangedEntry = entry.id === request.schedule_entry_id

    return {
      schedule_version_id: newVersion.id,
      class_offering_id: entry.class_offering_id,
      faculty_id: entry.faculty_id,
      section_id: entry.section_id,
      room_id: isChangedEntry ? proposedRoom : entry.room_id,
      day_of_week: isChangedEntry ? proposedDay : entry.day_of_week,
      start_time: isChangedEntry ? proposedStart : entry.start_time,
      end_time: isChangedEntry ? proposedEnd : entry.end_time,
      entry_type: entry.entry_type,
      // Keep Lecture/Lab and delivery mode; without these every copied
      // lab session silently became a lecture in the revised version.
      session_type: entry.session_type,
      delivery_mode: entry.delivery_mode,
    }
  })

  const { error: copyError } = await supabase.from('schedule_entries').insert(copiedEntries)

  if (copyError) {
    // Clean up incomplete version if copying fails.
    await supabase.from('schedule_versions').delete().eq('id', newVersion.id)

    errorRedirect(
      copyError.code === 'P0001' || /conflict/i.test(copyError.message)
        ? 'The proposed day/time conflicts with another class of the same block, room, or instructor in this schedule. Reject the request with a note, or ask the instructor to propose another time.'
        : `Unable to create revised schedule: ${copyError.message}`
=======
  const copiedEntries = sourceEntries.map((entry: any) => {
    const isChangedEntry =
      entry.id === request.schedule_entry_id

    return {
      schedule_version_id: newVersion.id,

      class_offering_id: entry.class_offering_id,
      faculty_id: entry.faculty_id,
      section_id: entry.section_id,

      room_id: isChangedEntry
        ? proposedRoom
        : entry.room_id,

      day_of_week: isChangedEntry
        ? proposedDay
        : entry.day_of_week,

      start_time: isChangedEntry
        ? proposedStart
        : entry.start_time,

      end_time: isChangedEntry
        ? proposedEnd
        : entry.end_time,

      entry_type: entry.entry_type,
    }
  })

  const { error: copyError } = await supabase
    .from('schedule_entries')
    .insert(copiedEntries)

  if (copyError) {
    // Clean up incomplete version if copying fails.
    await supabase
      .from('schedule_versions')
      .delete()
      .eq('id', newVersion.id)

    errorRedirect(
      `Unable to create revised schedule: ${copyError.message}`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    )
  }

  /* ----------------------------------------------------------
     UPDATE SCHEDULE TO NEW WORKING VERSION
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     Schedule itself becomes draft again.
     Original published VERSION remains untouched.
  ---------------------------------------------------------- */

  const { error: scheduleUpdateError } = await supabase
    .from('schedules')
    .update({
      current_version_id: newVersion.id,
      status: 'draft',
    })
    .eq('id', schedule.id)

  if (scheduleUpdateError) {
<<<<<<< HEAD
    await supabase.from('schedule_versions').delete().eq('id', newVersion.id)
=======
    await supabase
      .from('schedule_versions')
      .delete()
      .eq('id', newVersion.id)

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    errorRedirect(scheduleUpdateError.message)
  }

  /* ----------------------------------------------------------
     MARK CHANGE REQUEST APPROVED
  ---------------------------------------------------------- */

  const reviewedAt = new Date().toISOString()

  const { error: requestUpdateError } = await supabase
    .from('schedule_change_requests')
    .update({
      status: 'approved',
      reviewed_by: profile.id,
      review_notes: reviewNotes || null,
      reviewed_at: reviewedAt,
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (requestUpdateError) {
    errorRedirect(requestUpdateError.message)
  }

  /* ----------------------------------------------------------
     REVISION HISTORY
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     V2 has dedicated old/new version references and JSON
     before/after snapshots.
  ---------------------------------------------------------- */

  const beforeData = {
    schedule_entry_id: sourceEntry.id,
    day_of_week: sourceEntry.day_of_week,
    start_time: sourceEntry.start_time,
    end_time: sourceEntry.end_time,
    room_id: sourceEntry.room_id,
  }

  const afterData = {
    original_schedule_entry_id: sourceEntry.id,
    day_of_week: proposedDay,
    start_time: proposedStart,
    end_time: proposedEnd,
    room_id: proposedRoom,
  }

<<<<<<< HEAD
  const { error: historyError } = await supabase.from('schedule_revision_history').insert({
    schedule_id: schedule.id,
    old_version_id: sourceVersion.id,
    new_version_id: newVersion.id,
    change_request_id: request.id,
    changed_by: profile.id,
    change_type: request.change_type || 'normal_request',
    reason: request.reason,
    before_data: beforeData,
    after_data: afterData,
  })

  if (historyError) {
    console.error('Failed to record schedule revision history:', historyError)
=======
  const { error: historyError } = await supabase
    .from('schedule_revision_history')
    .insert({
      schedule_id: schedule.id,
      old_version_id: sourceVersion.id,
      new_version_id: newVersion.id,
      change_request_id: request.id,
      changed_by: profile.id,
      change_type: request.change_type || 'normal_request',
      reason: request.reason,
      before_data: beforeData,
      after_data: afterData,
    })

  if (historyError) {
    console.error(
      'Failed to record schedule revision history:',
      historyError
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ----------------------------------------------------------
     REVALIDATE
  ---------------------------------------------------------- */

<<<<<<< HEAD
  await notifyRequester(
    supabase,
    request.requested_by,
    request.id,
    'Alteration request approved',
    'Your schedule change request was approved. The change takes effect once the revised schedule is published.'
  )

=======
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  revalidatePath('/scheduler/alterations')
  revalidatePath('/scheduler/schedules')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/faculty/alterations')
  revalidatePath('/faculty/schedule')
  revalidatePath('/admin/schedules')

  successRedirect(
    `Request approved. Revised schedule version ${newVersion.version_number} was created as a draft for validation and Admin review.`
  )
<<<<<<< HEAD
}
=======
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

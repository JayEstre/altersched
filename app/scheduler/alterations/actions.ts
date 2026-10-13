'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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
}

/* ============================================================
   GET + VERIFY MANAGED REQUEST
============================================================ */

async function getManagedRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  requestId: string
) {
  const { data: assignments, error: assignmentError } = await supabase
    .from('scheduler_departments')
    .select('department_id')
    .eq('profile_id', profileId)
    .eq('active', true)

  if (assignmentError) {
    return {
      request: null,
      schedule: null,
      version: null,
      entry: null,
      error: assignmentError.message,
    }
  }

  const departmentIds = assignments?.map((x) => x.department_id) ?? []

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
    .select(
      `
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
        schedule_versions!inner(
          id,
          schedule_id,
          status,
          schedules!schedule_versions_schedule_id_fkey!inner(
            id,
            department_id,
            current_version_id,
            status
          )
        )
      )
    `
    )
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

  if (!schedule?.department_id || !departmentIds.includes(schedule.department_id)) {
    return {
      request: null,
      schedule: null,
      version: null,
      entry: null,
      error: 'You are not authorized to manage this schedule request.',
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

export async function rejectScheduleChangeRequest(formData: FormData) {
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const requestId = getString(formData, 'request_id')
  const reviewNotes = getString(formData, 'review_notes')

  if (!requestId) {
    errorRedirect('Invalid schedule change request.')
  }

  if (!reviewNotes) {
    errorRedirect('Please provide a reason for rejecting the request.')
  }

  const result = await getManagedRequest(supabase, profile.id, requestId)

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
  successRedirect('Schedule change request rejected.')
}

/* ============================================================
   APPROVE + CREATE REVISED DRAFT VERSION
   IMPORTANT:
   - Original published version is NOT modified.
   - A new draft version is created.
   - All entries are copied.
   - Requested alteration is applied to the copied entry.
   - Revision history is recorded.
============================================================ */

export async function approveScheduleChangeRequest(formData: FormData) {
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const requestId = getString(formData, 'request_id')
  const reviewNotes = getString(formData, 'review_notes')

  if (!requestId) {
    errorRedirect('Invalid schedule change request.')
  }

  const result = await getManagedRequest(supabase, profile.id, requestId)

  if (result.error || !result.request || !result.entry || !result.version || !result.schedule) {
    errorRedirect(result.error || 'Unable to load the alteration request.')
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
    errorRedirect('The original schedule version is no longer published.')
  }

  /* ----------------------------------------------------------
     VALIDATE PROPOSED VALUES
  ---------------------------------------------------------- */

  const proposedDay = request.proposed_day ?? sourceEntry.day_of_week
  const proposedStart = request.proposed_start_time ?? sourceEntry.start_time
  const proposedEnd = request.proposed_end_time ?? sourceEntry.end_time
  const proposedRoom = request.proposed_room_id ?? sourceEntry.room_id

  if (!proposedDay || proposedDay < 1 || proposedDay > 7) {
    errorRedirect('Invalid proposed day.')
  }

  if (!proposedStart || !proposedEnd) {
    errorRedirect('Invalid proposed schedule time.')
  }

  if (proposedStart >= proposedEnd) {
    errorRedirect('Proposed end time must be later than start time.')
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
    errorRedirect(roomError?.message || 'Proposed room was not found.')
  }

  /* ----------------------------------------------------------
     GET ALL ENTRIES FROM ORIGINAL PUBLISHED VERSION
  ---------------------------------------------------------- */

  const { data: sourceEntries, error: sourceEntriesError } = await supabase
    .from('schedule_entries')
    .select(
      `
        id,
        class_offering_id,
        faculty_id,
        section_id,
        room_id,
        day_of_week,
        start_time,
        end_time,
        entry_type,
        session_type,
        delivery_mode
      `
    )
    .eq('schedule_version_id', sourceVersion.id)
    .order('day_of_week')
    .order('start_time')

  if (sourceEntriesError) {
    errorRedirect(sourceEntriesError.message)
  }

  if (!sourceEntries?.length) {
    errorRedirect('The published schedule does not contain any entries.')
  }

  /* ----------------------------------------------------------
     GET NEXT VERSION NUMBER
  ---------------------------------------------------------- */

  const { data: latestVersion, error: latestVersionError } = await supabase
    .from('schedule_versions')
    .select('version_number')
    .eq('schedule_id', schedule.id)
    .order('version_number', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  if (latestVersionError) {
    errorRedirect(latestVersionError.message)
  }

  const nextVersionNumber = Number(latestVersion?.version_number ?? 0) + 1

  /* ----------------------------------------------------------
     CREATE NEW DRAFT VERSION
  ---------------------------------------------------------- */

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
  }

  /* ----------------------------------------------------------
     COPY ALL ENTRIES TO NEW VERSION
     Requested entry receives proposed values.
     Everything else remains unchanged.
  ---------------------------------------------------------- */

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
    )
  }

  /* ----------------------------------------------------------
     UPDATE SCHEDULE TO NEW WORKING VERSION
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
    await supabase.from('schedule_versions').delete().eq('id', newVersion.id)
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
  }

  /* ----------------------------------------------------------
     REVALIDATE
  ---------------------------------------------------------- */

  await notifyRequester(
    supabase,
    request.requested_by,
    request.id,
    'Alteration request approved',
    'Your schedule change request was approved. The change takes effect once the revised schedule is published.'
  )

  revalidatePath('/scheduler/alterations')
  revalidatePath('/scheduler/schedules')
  revalidatePath('/scheduler/schedule-builder')
  revalidatePath('/faculty/alterations')
  revalidatePath('/faculty/schedule')
  revalidatePath('/admin/schedules')

  successRedirect(
    `Request approved. Revised schedule version ${newVersion.version_number} was created as a draft for validation and Admin review.`
  )
}

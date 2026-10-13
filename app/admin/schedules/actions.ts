'use server'

import { createHash, randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect, unstable_rethrow } from 'next/navigation'
import {
  createPublicScheduleShare,
  notifyInstructorsOfPublication,
} from '@/lib/schedule-publication'
import { assignInstructor, findInstructorClash } from '@/lib/assignments'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { getString } from '@/lib/form-data'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TablesInsert } from '@/lib/database.types'
import { errorMessage } from '@/lib/errors'

type Client = SupabaseClient<Database>

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function scheduleDetail(id: string, query = '') {
  return `/admin/schedules/${encodeURIComponent(id)}${query}`
}

function hash(value: string) {
  return createHash('sha256').update(value.trim().toUpperCase()).digest('hex')
}

function generateCode() {
  return `ALT-${randomBytes(4).toString('hex').toUpperCase()}`
}

function generateQrToken() {
  return randomBytes(18).toString('hex').toUpperCase()
}

/* =========================================================
   LOAD EDITABLE DRAFT
   IMPORTANT:
   Only a real Draft may be edited.
   submitted = locked
   published = locked
   archived = locked
   ========================================================= */

async function editableSchedule(s: Client, scheduleId: string) {
  if (!scheduleId) {
    throw new Error('Schedule is required.')
  }

  const { data, error } = await s
    .from('schedules')
    .select(
      `
      id,
      status,
      current_version_id,
      section_id,
      semester_id
    `
    )
    .eq('id', scheduleId)
    .maybeSingle()

  if (error || !data || !data.current_version_id) {
    throw new Error(error?.message || 'Schedule is not ready.')
  }

  if (data.status !== 'draft') {
    throw new Error(
      data.status === 'submitted'
        ? 'Submitted schedules are locked while awaiting Super Admin review.'
        : 'Published or archived schedules cannot be edited directly. Use the controlled alteration and versioning workflow.'
    )
  }

  const { data: version, error: versionError } = await s
    .from('schedule_versions')
    .select(
      `
      id,
      status
    `
    )
    .eq('id', data.current_version_id)
    .eq('schedule_id', data.id)
    .maybeSingle()

  if (versionError || !version) {
    throw new Error(versionError?.message || 'Current schedule version was not found.')
  }

  if (version.status !== 'draft') {
    throw new Error('Only a Draft schedule version can be edited.')
  }

  return { ...data, current_version_id: data.current_version_id }
}

/* =========================================================
   LOAD REVIEWABLE SCHEDULE
   Submitted schedules may be revalidated by Super Admin,
   but they cannot be edited.
   ========================================================= */

async function reviewableSchedule(s: Client, scheduleId: string) {
  if (!scheduleId) {
    throw new Error('Schedule is required.')
  }

  const { data, error } = await s
    .from('schedules')
    .select(
      `
      id,
      status,
      current_version_id,
      section_id,
      semester_id
    `
    )
    .eq('id', scheduleId)
    .maybeSingle()

  if (error || !data || !data.current_version_id) {
    throw new Error(error?.message || 'Schedule is not ready.')
  }

  if (data.status !== 'draft' && data.status !== 'submitted') {
    throw new Error('Only Draft or Submitted schedules can be revalidated.')
  }

  const { data: version, error: versionError } = await s
    .from('schedule_versions')
    .select(
      `
      id,
      status
    `
    )
    .eq('id', data.current_version_id)
    .eq('schedule_id', data.id)
    .maybeSingle()

  if (versionError || !version) {
    throw new Error(versionError?.message || 'Current schedule version was not found.')
  }

  if (data.status === 'draft' && version.status !== 'draft') {
    throw new Error('The Draft schedule and its current version are out of sync.')
  }

  if (data.status === 'submitted' && version.status !== 'submitted') {
    throw new Error('The Submitted schedule and its current version are out of sync.')
  }

  return { ...data, current_version_id: data.current_version_id }
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

/* Cross-schedule checks use published current versions in the same semester.
   Fail closed when any required comparison cannot be loaded completely. */
type ConflictEntry = {
  id: string
  faculty_id: string | null
  room_id: string | null
  section_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
}

async function findPublishedScheduleConflicts(
  s: Client,
  scheduleId: string,
  semesterId: string,
  entries: ConflictEntry[]
): Promise<Array<{ entryId: string; relatedId: string; kinds: string[] }>> {
  if (!semesterId) throw new Error('Schedule semester is missing.')
  // Pagination avoids PostgREST's default row limit hiding published schedules.
  const published: Array<{ id: string; current_version_id: string | null }> = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await s
      .from('schedules')
      .select('id,current_version_id')
      .eq('semester_id', semesterId)
      .eq('status', 'published')
      .neq('id', scheduleId)
      .order('id')
      .range(offset, offset + 499)
    if (error) throw new Error(`Unable to check published schedules: ${error.message}`)
    const page = (data || []) as Array<{ id: string; current_version_id: string | null }>
    published.push(...page)
    if (page.length < 500) break
  }
  if (published.some((x) => !x.current_version_id)) {
    throw new Error('A published schedule has no current version; cannot validate conflicts.')
  }
  const otherEntries: ConflictEntry[] = []
  const versionIds = published.map((x) => x.current_version_id as string)
  for (let i = 0; i < versionIds.length; i += 50) {
    const ids = versionIds.slice(i, i + 50)
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await s
        .from('schedule_entries')
        .select('id,faculty_id,room_id,section_id,day_of_week,start_time,end_time')
        .in('schedule_version_id', ids)
        .order('id')
        .range(offset, offset + 499)
      if (error) throw new Error(`Unable to check published timetable entries: ${error.message}`)
      const page = (data || []) as ConflictEntry[]
      otherEntries.push(...page)
      if (page.length < 500) break
    }
  }
  const found: Array<{ entryId: string; relatedId: string; kinds: string[] }> = []
  for (const entry of entries) {
    for (const other of otherEntries) {
      if (
        entry.day_of_week !== other.day_of_week ||
        !(entry.start_time < other.end_time && entry.end_time > other.start_time)
      )
        continue
      const kinds: string[] = []
      if (entry.section_id && entry.section_id === other.section_id) kinds.push('section')
      if (entry.room_id && entry.room_id === other.room_id) kinds.push('room')
      if (entry.faculty_id && entry.faculty_id === other.faculty_id) kinds.push('faculty')
      if (kinds.length) found.push({ entryId: entry.id, relatedId: other.id, kinds })
    }
  }
  return found
}

export async function publishSchedule(formData: FormData) {
  const { profile } = await requireRole(['super_admin'])
  const s = await createClient()
  const scheduleId = getString(formData, 'schedule_id')

  if (!scheduleId) {
    redirect('/admin/schedules?error=schedule_required')
  }

  /* -------------------------------------------------------
     LOAD SCHEDULE
     ------------------------------------------------------- */

  const { data: sch, error: scheduleError } = await s
    .from('schedules')
    .select(
      `
      id,
      title,
      status,
      current_version_id,
      section_id,
      semester_id
    `
    )
    .eq('id', scheduleId)
    .maybeSingle()

  if (scheduleError || !sch || !sch.current_version_id) {
    redirect(scheduleDetail(scheduleId, '?error=schedule_not_ready'))
  }

  /* -------------------------------------------------------
     ONLY SUBMITTED SCHEDULE MAY BE PUBLISHED
     ------------------------------------------------------- */

  if (sch.status !== 'submitted') {
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

  const { data: version, error: versionLookupError } = await s
    .from('schedule_versions')
    .select(
      `
      id,
      schedule_id,
      status,
      version_number
    `
    )
    .eq('id', sch.current_version_id)
    .eq('schedule_id', sch.id)
    .maybeSingle()

  if (versionLookupError || !version) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          versionLookupError?.message || 'Current schedule version was not found.'
        )}`
      )
    )
  }

  if (version.status !== 'submitted') {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent('Only a submitted schedule version can be published.')}`
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY ENTRIES
     ------------------------------------------------------- */

  const { count, error: entryError } = await s
    .from('schedule_entries')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('schedule_version_id', sch.current_version_id)

  if (entryError) {
    redirect(scheduleDetail(scheduleId, `?error=${encodeURIComponent(entryError.message)}`))
  }

  if (!count) {
    redirect(scheduleDetail(scheduleId, '?error=no_entries'))
  }

  /* -------------------------------------------------------
     FINAL GATE: EVERY SCHEDULE ENTRY NEEDS AN INSTRUCTOR
     Draft entries may have faculty_id = NULL, but published
     schedules must not contain unassigned instructors.
     Fail closed if the validation query cannot be completed.
     ------------------------------------------------------- */

  const { count: unassignedCount, error: unassignedError } = await s
    .from('schedule_entries')
    .select('id', { count: 'exact', head: true })
    .eq('schedule_version_id', sch.current_version_id)
    .is('faculty_id', null)

  if (unassignedError) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(`Unable to verify instructor assignments: ${unassignedError.message}`)}`
      )
    )
  }

  if ((unassignedCount ?? 0) > 0) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(`Assign instructors to ${unassignedCount} unassigned schedule entry/entries before publication.`)}`
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY ZERO BLOCKING ERRORS
     ------------------------------------------------------- */

  const { count: conflicts, error: conflictError } = await s
    .from('schedule_validation_logs')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('schedule_version_id', sch.current_version_id)
    .eq('resolved', false)
    .eq('severity', 'error')

  if (conflictError) {
    redirect(scheduleDetail(scheduleId, `?error=${encodeURIComponent(conflictError.message)}`))
  }

  if (Number(conflicts || 0) > 0) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          `Resolve ${conflicts} blocking validation issue(s) before publication.`
        )}`
      )
    )
  }

  /* Final cross-schedule gate: do not trust validation logs alone. */
  const { data: publishEntries, error: publishEntryError } = await s
    .from('schedule_entries')
    .select('id,faculty_id,room_id,section_id,day_of_week,start_time,end_time')
    .eq('schedule_version_id', sch.current_version_id)
  if (publishEntryError || !publishEntries || publishEntries.length !== count) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          publishEntryError?.message || 'Unable to load all entries for final conflict validation.'
        )}`
      )
    )
  }
  let publishedConflicts: Awaited<ReturnType<typeof findPublishedScheduleConflicts>>
  try {
    publishedConflicts = await findPublishedScheduleConflicts(
      s,
      sch.id,
      sch.semester_id,
      publishEntries
    )
  } catch (error) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'Cross-schedule validation failed.'
        )}`
      )
    )
  }
  if (publishedConflicts.length) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          `Resolve ${publishedConflicts.length} conflict(s) with published schedules before publication.`
        )}`
      )
    )
  }

  const now = new Date().toISOString()

  /* -------------------------------------------------------
     PUBLISH CURRENT VERSION
     Status is changed only when it is still submitted.
     ------------------------------------------------------- */

  const { data: publishedVersion, error: versionError } = await s
    .from('schedule_versions')
    .update({
      status: 'published',
      reviewed_by: profile.id,
      approved_at: now,
      published_by: profile.id,
      published_at: now,
    })
    .eq('id', sch.current_version_id)
    .eq('schedule_id', sch.id)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()

  if (versionError || !publishedVersion) {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          versionError?.message || 'The schedule version is no longer in Submitted status.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     PUBLISH SCHEDULE
     ------------------------------------------------------- */

  const { data: publishedSchedule, error: scheduleUpdateError } = await s
    .from('schedules')
    .update({
      status: 'published',
      updated_at: now,
    })
    .eq('id', scheduleId)
    .eq('current_version_id', sch.current_version_id)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()

  if (scheduleUpdateError || !publishedSchedule) {
    /*
     * Best-effort restore.
     *
     * A database RPC/transaction would be stronger,
     * but this prevents the common partial state when
     * the schedule-row update fails after version update.
     */

    await s
      .from('schedule_versions')
      .update({
        status: 'submitted',
        reviewed_by: null,
        approved_at: null,
        published_by: null,
        published_at: null,
      })
      .eq('id', sch.current_version_id)
      .eq('status', 'published')

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          scheduleUpdateError?.message || 'Unable to publish the schedule record.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     REVOKE PREVIOUS ACTIVE ACCESS
     ------------------------------------------------------- */

  const { error: revokeError } = await s
    .from('schedule_access_codes')
    .update({
      active: false,
      revoked_at: now,
    })
    .eq('schedule_id', scheduleId)
    .eq('active', true)

  if (revokeError) {
    console.error('Failed to revoke previous schedule access:', revokeError)
  }

  /* -------------------------------------------------------
     GENERATE NEW CREDENTIALS
     ------------------------------------------------------- */

  const rawCode = generateCode()
  const rawQr = generateQrToken()

  const { error: codeError } = await s.from('schedule_access_codes').insert({
    schedule_id: scheduleId,
    schedule_version_id: sch.current_version_id,
    section_id: sch.section_id,
    code_hash: hash(rawCode),
    qr_token_hash: hash(rawQr),
    active: true,
    generated_by: profile.id,
  })

  if (codeError) {
    /*
     * Schedule is already officially published.
     * Do NOT silently revert publication here because
     * publication and access generation are separate
     * concerns and a later regenerate action can safely
     * create the access credential.
     */

    console.error('Published schedule access generation failed:', codeError)
    revalidatePath('/admin/schedules')
    revalidatePath(scheduleDetail(scheduleId))
    revalidatePath('/faculty/schedule')

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          `Schedule was published, but the public schedule access credential could not be generated: ${codeError.message}`
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     REFRESH
     ------------------------------------------------------- */

  revalidatePath('/admin/schedules')
  revalidatePath(scheduleDetail(scheduleId))
  revalidatePath('/faculty/schedule')

  /* -------------------------------------------------------
     DISPLAY RAW CREDENTIAL ONCE
     ------------------------------------------------------- */

  /* Public read-only link + QR (see lib/schedule-publication.ts). */
  const share = await createPublicScheduleShare(s, scheduleId, sch.current_version_id, profile.id)

  const notified = await notifyInstructorsOfPublication(
    s,
    scheduleId,
    sch.current_version_id,
    sch.title ?? null
  )

  redirect(
    scheduleDetail(
      scheduleId,
      `?success=published&code=${encodeURIComponent(rawCode)}&qr=${encodeURIComponent(
        rawQr
      )}${share.token ? `&share=${share.token}` : share.existing ? '&share_existing=1' : '&share_error=1'}&notified=${notified}`
    )
  )
}

/* =========================================================
   REGENERATE SCHEDULE ACCESS
   Published schedules only.
   Existing active credential is revoked.
   ========================================================= */

export async function regenerateScheduleAccess(formData: FormData) {
  const { profile } = await requireRole(['super_admin'])
  const s = await createClient()
  const scheduleId = getString(formData, 'schedule_id')

  if (!scheduleId) {
    redirect('/admin/schedules?error=schedule_required')
  }

  const { data: sch, error: scheduleError } = await s
    .from('schedules')
    .select(
      `
      id,
      status,
      current_version_id,
      section_id
    `
    )
    .eq('id', scheduleId)
    .maybeSingle()

  if (scheduleError || !sch || !sch.current_version_id) {
    redirect(scheduleDetail(scheduleId, '?error=schedule_not_ready'))
  }

  if (sch.status !== 'published') {
    redirect(scheduleDetail(scheduleId, '?error=schedule_not_published'))
  }

  /* -------------------------------------------------------
     VERIFY VERSION IS PUBLISHED
     ------------------------------------------------------- */

  const { data: version, error: versionError } = await s
    .from('schedule_versions')
    .select(
      `
      id,
      status
    `
    )
    .eq('id', sch.current_version_id)
    .eq('schedule_id', sch.id)
    .maybeSingle()

  if (versionError || !version || version.status !== 'published') {
    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(
          versionError?.message || 'The current schedule version is not published.'
        )}`
      )
    )
  }

  /* -------------------------------------------------------
     VERIFY ENTRIES
     ------------------------------------------------------- */

  const { count, error: entryError } = await s
    .from('schedule_entries')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('schedule_version_id', sch.current_version_id)

  if (entryError || !count) {
    redirect(scheduleDetail(scheduleId, '?error=no_entries'))
  }

  const now = new Date().toISOString()

  /* -------------------------------------------------------
     REVOKE OLD ACCESS
     ------------------------------------------------------- */

  const { error: revokeError } = await s
    .from('schedule_access_codes')
    .update({
      active: false,
      revoked_at: now,
    })
    .eq('schedule_id', scheduleId)
    .eq('active', true)

  if (revokeError) {
    redirect(scheduleDetail(scheduleId, `?error=${encodeURIComponent(revokeError.message)}`))
  }

  /* -------------------------------------------------------
     CREATE NEW ACCESS
     ------------------------------------------------------- */

  const rawCode = generateCode()
  const rawQr = generateQrToken()

  const { error: codeError } = await s.from('schedule_access_codes').insert({
    schedule_id: scheduleId,
    schedule_version_id: sch.current_version_id,
    section_id: sch.section_id,
    code_hash: hash(rawCode),
    qr_token_hash: hash(rawQr),
    active: true,
    generated_by: profile.id,
  })

  if (codeError) {
    redirect(scheduleDetail(scheduleId, `?error=${encodeURIComponent(codeError.message)}`))
  }

  revalidatePath('/admin/schedules')
  revalidatePath(scheduleDetail(scheduleId))
  revalidatePath('/faculty/schedule')

  /* Public read-only link + QR (see lib/schedule-publication.ts). */
  const share = await createPublicScheduleShare(s, scheduleId, sch.current_version_id, profile.id, {
    rotate: true,
  })

  const notified = 0

  redirect(
    scheduleDetail(
      scheduleId,
      `?success=access_generated&code=${encodeURIComponent(rawCode)}&qr=${encodeURIComponent(
        rawQr
      )}${share.token ? `&share=${share.token}` : share.existing ? '&share_existing=1' : '&share_error=1'}&notified=${notified}`
    )
  )
}

/* =========================================================
   ARCHIVE SCHEDULE
   ========================================================= */

export async function archiveSchedule(formData: FormData) {
  await requireRole(['super_admin'])
  const s = await createClient()
  const scheduleId = getString(formData, 'schedule_id')

  if (!scheduleId) {
    redirect('/admin/schedules?error=schedule_required')
  }

  const now = new Date().toISOString()

  const { data: sch, error: scheduleError } = await s
    .from('schedules')
    .select(
      `
      id,
      status,
      current_version_id
    `
    )
    .eq('id', scheduleId)
    .maybeSingle()

  if (scheduleError || !sch) {
    redirect('/admin/schedules?error=schedule_not_found')
  }

  if (sch.status === 'archived') {
    redirect('/admin/schedules?error=schedule_already_archived')
  }

  /* -------------------------------------------------------
     ARCHIVE SCHEDULE
     ------------------------------------------------------- */

  const { error: archiveError } = await s
    .from('schedules')
    .update({
      status: 'archived',
      updated_at: now,
    })
    .eq('id', scheduleId)

  if (archiveError) {
    redirect(
      `/admin/schedules?error=archive_failed&details=${encodeURIComponent(archiveError.message)}`
    )
  }

  /* -------------------------------------------------------
     ARCHIVE CURRENT VERSION
     ------------------------------------------------------- */

  if (sch.current_version_id) {
    const { error: versionError } = await s
      .from('schedule_versions')
      .update({
        status: 'archived',
      })
      .eq('id', sch.current_version_id)

    if (versionError) {
      console.error('Failed to archive current schedule version:', versionError)
    }
  }

  /* -------------------------------------------------------
     REVOKE ACCESS
     ------------------------------------------------------- */

  const { error: revokeError } = await s
    .from('schedule_access_codes')
    .update({
      active: false,
      revoked_at: now,
    })
    .eq('schedule_id', scheduleId)
    .eq('active', true)

  if (revokeError) {
    console.error('Failed to revoke archived schedule access:', revokeError)
  }

  revalidatePath('/admin/schedules')
  revalidatePath('/faculty/schedule')
  redirect('/admin/schedules?success=archived')
}

/** Changes the instructor of a class offering (and its draft sessions), or throws a readable error. */
async function changeClassInstructor(s: Client, offeringId: string, facultyId: string) {
  const clash = await findInstructorClash(s, facultyId, offeringId)
  if (clash) throw new Error(`The selected instructor ${clash}.`)
  const result = await assignInstructor(s, offeringId, facultyId, 'manual')
  if (!result.ok) throw new Error(result.message)
}

/* =========================================================
   ADD SCHEDULE ENTRY
   DRAFT ONLY
   ========================================================= */

export async function addScheduleEntry(formData: FormData) {
  await requireRole(['super_admin'])
  const s = await createClient()
  const scheduleId = getString(formData, 'schedule_id')

  try {
    const sch = await editableSchedule(s, scheduleId)
    const offeringId = getString(formData, 'class_offering_id')
    const facultyId = getString(formData, 'faculty_id')
    const roomId = getString(formData, 'room_id')
    const day = Number(getString(formData, 'day_of_week'))
    const start = getString(formData, 'start_time')
    const end = getString(formData, 'end_time')
    const entryType = getString(formData, 'entry_type') || 'regular'

    if (!offeringId || !facultyId || !roomId || !day || !start || !end) {
      throw new Error('Complete all schedule entry fields.')
    }

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new Error('Select a valid schedule day.')
    }

    if (start >= end) {
      throw new Error('End time must be later than start time.')
    }

    if (!['regular', 'makeup', 'special'].includes(entryType)) {
      throw new Error('Invalid schedule entry type.')
    }

    /* -----------------------------------------------------
       VERIFY OFFERING
       ----------------------------------------------------- */

    const { data: offering, error: offeringError } = await s
      .from('class_offerings')
      .select('id, section_id, semester_id, faculty_id')
      .eq('id', offeringId)
      .maybeSingle()

    if (
      offeringError ||
      !offering ||
      offering.section_id !== sch.section_id ||
      offering.semester_id !== sch.semester_id
    ) {
      throw new Error('Selected class offering does not belong to this schedule.')
    }

    // The instructor belongs to the class offering (all of its sessions).
    if (offering.faculty_id !== facultyId) {
      await changeClassInstructor(s, offeringId, facultyId)
    }

    const { error } = await s.from('schedule_entries').insert({
      schedule_version_id: sch.current_version_id,
      class_offering_id: offeringId,
      faculty_id: facultyId,
      section_id: sch.section_id,
      room_id: roomId,
      day_of_week: day,
      start_time: start,
      end_time: end,
      entry_type: entryType,
    })

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(scheduleDetail(scheduleId))
    revalidatePath('/admin/schedules')
    redirect(scheduleDetail(scheduleId, '?success=entry_added'))
  } catch (error) {
    unstable_rethrow(error)

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(errorMessage(error, 'Unable to add schedule entry.'))}`
      )
    )
  }
}

/* =========================================================
   UPDATE SCHEDULE ENTRY
   DRAFT ONLY
   ========================================================= */

export async function updateScheduleEntry(formData: FormData) {
  await requireRole(['super_admin'])
  const s = await createClient()
  const scheduleId = getString(formData, 'schedule_id')
  const entryId = getString(formData, 'entry_id')

  try {
    if (!entryId) {
      throw new Error('Schedule entry is required.')
    }

    const sch = await editableSchedule(s, scheduleId)
    const facultyId = getString(formData, 'faculty_id')
    const roomId = getString(formData, 'room_id')
    const day = Number(getString(formData, 'day_of_week'))
    const start = getString(formData, 'start_time')
    const end = getString(formData, 'end_time')
    const entryType = getString(formData, 'entry_type') || 'regular'

    if (!facultyId || !roomId || !day || !start || !end) {
      throw new Error('Complete all schedule entry fields.')
    }

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new Error('Select a valid schedule day.')
    }

    if (start >= end) {
      throw new Error('End time must be later than start time.')
    }

    if (!['regular', 'makeup', 'special'].includes(entryType)) {
      throw new Error('Invalid schedule entry type.')
    }

    /* -----------------------------------------------------
       VERIFY ENTRY BELONGS TO CURRENT VERSION
       ----------------------------------------------------- */

    const { data: existing, error: existingError } = await s
      .from('schedule_entries')
      .select('id, schedule_version_id, class_offering_id, faculty_id')
      .eq('id', entryId)
      .eq('schedule_version_id', sch.current_version_id)
      .maybeSingle()

    if (existingError || !existing) {
      throw new Error(
        existingError?.message || 'Schedule entry was not found in the current Draft.'
      )
    }

    // The instructor belongs to the class offering: changing it here updates every session
    // of the class (lecture and lab) in this draft.
    if (existing.faculty_id !== facultyId) {
      await changeClassInstructor(s, existing.class_offering_id, facultyId)
    }

    const { error } = await s
      .from('schedule_entries')
      .update({
        room_id: roomId,
        day_of_week: day,
        start_time: start,
        end_time: end,
        entry_type: entryType,
      })
      .eq('id', entryId)
      .eq('schedule_version_id', sch.current_version_id)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(scheduleDetail(scheduleId))
    revalidatePath('/admin/schedules')
    redirect(scheduleDetail(scheduleId, '?success=entry_updated'))
  } catch (error) {
    unstable_rethrow(error)

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(errorMessage(error, 'Unable to update schedule entry.'))}`
      )
    )
  }
}

/* =========================================================
   REMOVE SCHEDULE ENTRY
   DRAFT ONLY
   ========================================================= */

export async function removeScheduleEntry(formData: FormData) {
  await requireRole(['super_admin'])
  const s = await createClient()
  const scheduleId = getString(formData, 'schedule_id')
  const entryId = getString(formData, 'entry_id')

  try {
    if (!entryId) {
      throw new Error('Schedule entry is required.')
    }

    const sch = await editableSchedule(s, scheduleId)

    const { data: existing, error: existingError } = await s
      .from('schedule_entries')
      .select('id')
      .eq('id', entryId)
      .eq('schedule_version_id', sch.current_version_id)
      .maybeSingle()

    if (existingError || !existing) {
      throw new Error(
        existingError?.message || 'Schedule entry was not found in the current Draft.'
      )
    }

    const { error } = await s
      .from('schedule_entries')
      .delete()
      .eq('id', entryId)
      .eq('schedule_version_id', sch.current_version_id)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(scheduleDetail(scheduleId))
    revalidatePath('/admin/schedules')
    redirect(scheduleDetail(scheduleId, '?success=entry_removed'))
  } catch (error) {
    unstable_rethrow(error)

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(errorMessage(error, 'Unable to remove schedule entry.'))}`
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

export async function revalidateSchedule(formData: FormData) {
  await requireRole(['super_admin'])
  const s = await createClient()
  const scheduleId = getString(formData, 'schedule_id')

  try {
    const sch = await reviewableSchedule(s, scheduleId)

    const { data: entries, error } = await s
      .from('schedule_entries')
      .select(
        `
        id,
        faculty_id,
        room_id,
        section_id,
        day_of_week,
        start_time,
        end_time
      `
      )
      .eq('schedule_version_id', sch.current_version_id)

    if (error) {
      throw new Error(error.message)
    }

    /* -----------------------------------------------------
       REMOVE PREVIOUS UNRESOLVED VALIDATION RESULTS
       ----------------------------------------------------- */

    const { error: deleteLogError } = await s
      .from('schedule_validation_logs')
      .delete()
      .eq('schedule_version_id', sch.current_version_id)
      .eq('resolved', false)

    if (deleteLogError) {
      throw new Error(deleteLogError.message)
    }

    const logs: TablesInsert<'schedule_validation_logs'>[] = []
    const list = entries || []

    /* -----------------------------------------------------
       PAIRWISE OVERLAP VALIDATION
       ----------------------------------------------------- */

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const first = list[i]
        const second = list[j]

        if (first.day_of_week !== second.day_of_week) {
          continue
        }

        const overlaps = first.start_time < second.end_time && first.end_time > second.start_time

        if (!overlaps) {
          continue
        }

        const kinds: string[] = []

        if (first.section_id === second.section_id) {
          kinds.push('section')
        }

        if (first.room_id === second.room_id) {
          kinds.push('room')
        }

        if (first.faculty_id && first.faculty_id === second.faculty_id) {
          kinds.push('faculty')
        }

        if (kinds.length === 0) {
          continue
        }

        logs.push({
          schedule_version_id: sch.current_version_id,
          schedule_entry_id: first.id,
          related_entry_id: second.id,
          conflict_type: `${kinds.join('_')}_overlap`,
          severity: 'error',
          message: `Conflicting ${kinds.join(', ')} assignment detected.`,
          resolved: false,
        })
      }
    }

    /* Compare with published schedules in the same semester. */
    const crossConflicts = await findPublishedScheduleConflicts(
      s,
      scheduleId,
      sch.semester_id,
      list
    )
    for (const conflict of crossConflicts) {
      logs.push({
        schedule_version_id: sch.current_version_id,
        schedule_entry_id: conflict.entryId,
        related_entry_id: conflict.relatedId,
        conflict_type: `${conflict.kinds.join('_')}_overlap`,
        severity: 'error',
        message: `Conflicting ${conflict.kinds.join(', ')} assignment with a published schedule.`,
        resolved: false,
      })
    }

    /* -----------------------------------------------------
       SAVE VALIDATION RESULTS
       ----------------------------------------------------- */

    if (logs.length > 0) {
      const { error: logInsertError } = await s.from('schedule_validation_logs').insert(logs)

      if (logInsertError) {
        throw new Error(logInsertError.message)
      }
    }

    revalidatePath(scheduleDetail(scheduleId))
    revalidatePath('/admin/schedules')
    redirect(scheduleDetail(scheduleId, `?success=validated&conflicts=${logs.length}`))
  } catch (error) {
    unstable_rethrow(error)

    redirect(
      scheduleDetail(
        scheduleId,
        `?error=${encodeURIComponent(errorMessage(error, 'Validation failed.'))}`
      )
    )
  }
}

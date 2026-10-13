import Link from 'next/link'
<<<<<<< HEAD
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Badge, Empty } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import QRCode from 'qrcode'
import {
  addScheduleEntry,
  updateScheduleEntry,
  removeScheduleEntry,
  revalidateSchedule,
  publishSchedule,
  regenerateScheduleAccess,
} from '../actions'
import { DAY_NAMES, DAY_OPTIONS } from '@/lib/format'
import styles from './page.module.css'
import { one } from '@/lib/relations'
import { WeeklyTimetable, sessionKind } from '@/components/weekly-timetable'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<Record<string, string | undefined>>
}) {
  await requireRole(['super_admin'])
  const { id } = await params
  const q = searchParams ? await searchParams : {}

  /* Public read-only link shown once after Publish / Regenerate Access. */
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const shareToken = typeof q.share === 'string' && /^[0-9a-f]{20,}$/.test(q.share) ? q.share : null
  const shareUrl = shareToken ? `${siteUrl}/public/schedule/${shareToken}` : null
  const shareQr = shareUrl ? await QRCode.toDataURL(shareUrl, { margin: 1, width: 220 }) : null
  const s = await createClient()

  /* =========================================================
     SCHEDULE
     ========================================================= */

  const { data: sch, error: scheduleError } = await s
    .from('schedules')
    .select(
      `
      id,
      title,
      status,
      current_version_id,
      semester_id,
      section_id,
      programs(code),
      sections(code),
      semesters(name)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (scheduleError) {
    console.error('Failed to load schedule:', scheduleError)
  }

  if (!sch) {
    notFound()
  }

=======

import { notFound } from 'next/navigation'

import { requireRole } from '@/lib/auth/require-role'



import {

  createClient,

} from '@/lib/supabase/server'



import {

  PageHead,

  Badge,

  Empty,

} from '@/components/ui'
import { DataTable } from '@/components/data-table'



import {

  addScheduleEntry,

  updateScheduleEntry,

  removeScheduleEntry,

  revalidateSchedule,

  publishSchedule,

  regenerateScheduleAccess,

} from '../actions'



const DAYS = [

  '',

  'Monday',

  'Tuesday',

  'Wednesday',

  'Thursday',

  'Friday',

  'Saturday',

  'Sunday',

]



export default async function Page({

  params,

  searchParams,

}: {

  params: Promise<{

    id: string

  }>

  searchParams?: Promise<

    Record<

      string,

      string | undefined

    >

  >

}) {

  await requireRole(['super_admin'])

  const { id } = await params



  const q = searchParams

    ? await searchParams

    : {}



  const s =

    await createClient()



  /* =========================================================

     SCHEDULE

     ========================================================= */



  const {

    data: sch,

    error: scheduleError,

  } = await s

    .from('schedules')

    .select(`

      id,

      title,

      status,

      current_version_id,

      semester_id,

      section_id,

      programs(code),

      sections(code),

      semesters(name)

    `)

    .eq('id', id)

    .maybeSingle()



  if (scheduleError) {

    console.error(

      'Failed to load schedule:',

      scheduleError

    )

  }



  if (!sch) {

    notFound()

  }



>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const isDraft = sch.status === 'draft'
  const isSubmitted = sch.status === 'submitted'
  const isPublished = sch.status === 'published'
  const isArchived = sch.status === 'archived'
  const editable = isDraft

<<<<<<< HEAD
  /* =========================================================
     LOAD PAGE DATA
     ========================================================= */

  const [versionR, entriesR, offerR, facultyR, roomsR, logsR, accessR] = await Promise.all([
    sch.current_version_id
      ? s
          .from('schedule_versions')
          .select(
            `
=======


  /* =========================================================

     LOAD PAGE DATA

     ========================================================= */



  const [

    versionR,

    entriesR,

    offerR,

    facultyR,

    roomsR,

    logsR,

    accessR,

  ] = await Promise.all([

    sch.current_version_id
      ? s
          .from('schedule_versions')
          .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
            id,
            version_number,
            status,
            change_reason,
            created_at,
            published_at
<<<<<<< HEAD
          `
          )
          .eq('id', sch.current_version_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sch.current_version_id
      ? s
          .from('schedule_entries')
          .select(
            `
            id,
            class_offering_id,
            faculty_id,
            room_id,
            day_of_week,
            start_time,
            end_time,
            entry_type,
            session_type,
            class_offerings(
              subjects(
                code,
                name
              )
            ),
            faculty_profiles(
              profiles(
                full_name
              )
            ),
            rooms(
              code,
              name
            )
          `
          )
          .eq('schedule_version_id', sch.current_version_id)
          .order('day_of_week')
          .order('start_time')
      : Promise.resolve({
          data: [],
          error: null,
        }),
    s
      .from('class_offerings')
      .select(
        `
        id,
        faculty_id,
        subjects(
          code,
          name
        )
      `
      )
      .eq('semester_id', sch.semester_id)
      .eq('section_id', sch.section_id)
      .eq('status', 'active'),
    s
      .from('faculty_profiles')
      .select(
        `
        id,
        employee_id,
        profiles(
          full_name
        ),
        departments(
          code
        )
      `
      )
      .order('employee_id'),
    s
      .from('rooms')
      .select(
        `
        id,
        code,
        name,
        capacity
      `
      )
      .eq('is_active', true)
      .order('code'),
    sch.current_version_id
      ? s
          .from('schedule_validation_logs')
          .select(
            `
            id,
            message,
            severity,
            resolved,
            schedule_entry_id,
            related_entry_id
          `
          )
          .eq('schedule_version_id', sch.current_version_id)
          .eq('resolved', false)
      : Promise.resolve({
          data: [],
          error: null,
        }),
    /* =======================================================
       ACCESS RECORD
       Only hashes are stored in DB.
       Raw code is intentionally not recoverable.
       ======================================================= */
    s
      .from('schedule_access_codes')
      .select(
        `
        id,
        schedule_id,
        schedule_version_id,
        section_id,
        active,
        created_at,
        revoked_at
      `
      )
      .eq('schedule_id', id)
      .eq('active', true)
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),
  ])

  /* =========================================================
     NORMALIZE
     ========================================================= */

  const currentVersion = versionR.data || null
  const entries = entriesR.data || []
  const offerings = offerR.data || []
  const faculty = facultyR.data || []
  const rooms = roomsR.data || []
  const logs = logsR.data || []
  const blockingLogs = logs.filter((item) => item.severity === 'error' && !item.resolved)
=======
          `)
          .eq('id', sch.current_version_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    sch.current_version_id

      ? s

          .from(

            'schedule_entries'

          )

          .select(`

            id,

            class_offering_id,

            faculty_id,

            room_id,

            day_of_week,

            start_time,

            end_time,

            entry_type,

            class_offerings(

              subjects(

                code,

                name

              )

            ),

            faculty_profiles(

              profiles(

                full_name

              )

            ),

            rooms(

              code,

              name

            )

          `)

          .eq(

            'schedule_version_id',

            sch.current_version_id

          )

          .order(

            'day_of_week'

          )

          .order(

            'start_time'

          )

      : Promise.resolve({

          data: [],

          error: null,

        }),



    s

      .from(

        'class_offerings'

      )

      .select(`

        id,

        faculty_id,

        subjects(

          code,

          name

        )

      `)

      .eq(

        'semester_id',

        sch.semester_id

      )

      .eq(

        'section_id',

        sch.section_id

      )

      .eq(

        'status',

        'active'

      ),



    s

      .from(

        'faculty_profiles'

      )

      .select(`

        id,

        employee_id,

        profiles(

          full_name

        ),

        departments(

          code

        )

      `)

      .order(

        'employee_id'

      ),



    s

      .from('rooms')

      .select(`

        id,

        code,

        name,

        capacity

      `)

      .eq(

        'is_active',

        true

      )

      .order('code'),



    sch.current_version_id

      ? s

          .from(

            'schedule_validation_logs'

          )

          .select(`

            id,

            message,

            severity,

            resolved

          `)

          .eq(

            'schedule_version_id',

            sch.current_version_id

          )

          .eq(

            'resolved',

            false

          )

      : Promise.resolve({

          data: [],

          error: null,

        }),



    /* =======================================================

       ACCESS RECORD



       Only hashes are stored in DB.

       Raw code is intentionally not recoverable.

       ======================================================= */



    s

      .from(

        'schedule_access_codes'

      )

      .select(`

        id,

        schedule_id,

        schedule_version_id,

        section_id,

        active,

        created_at,

        revoked_at

      `)

      .eq(

        'schedule_id',

        id

      )

      .eq(

        'active',

        true

      )

      .order(

        'created_at',

        {

          ascending: false,

        }

      )

      .limit(1)

      .maybeSingle(),

  ])



  /* =========================================================

     NORMALIZE

     ========================================================= */



  const currentVersion: any = versionR.data || null

  const entries: any[] =

    entriesR.data || []



  const offerings: any[] =

    offerR.data || []



  const faculty: any[] =

    facultyR.data || []



  const rooms: any[] =

    roomsR.data || []



  const logs: any[] =

    logsR.data || []



  const blockingLogs = logs.filter(
    (item: any) => item.severity === 'error' && !item.resolved
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  const canPublish =
    isSubmitted &&
    currentVersion?.status === 'submitted' &&
    entries.length > 0 &&
    blockingLogs.length === 0

<<<<<<< HEAD
  const activeAccess = accessR.data || null
  const programCode = one(sch.programs)?.code || '—'
  const sectionCode = one(sch.sections)?.code || '—'
  const semesterName = one(sch.semesters)?.name || '—'

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <div className={styles.scope}>
      <>
        <PageHead
          eyebrow={
            isPublished
              ? 'PUBLISHED SCHEDULE'
              : isSubmitted
                ? 'FINAL ADMIN REVIEW'
                : isArchived
                  ? 'ARCHIVED SCHEDULE'
                  : 'DRAFT REVIEW'
          }
          title={sch.title || 'Schedule'}
          description={
            isPublished
              ? 'Review the published timetable and manage the public schedule access credential.'
              : isSubmitted
                ? 'Final Super Admin review. Revalidate the submitted timetable, then publish only when no blocking errors remain.'
                : isArchived
                  ? 'Historical schedule record. Archived schedules are read only.'
                  : 'Review the working draft. Draft schedules support manual add, edit, remove, and revalidation.'
          }
        />
        {/* =====================================================
          HEADER
          ===================================================== */}
        <div className="badge-row">
          <Link href="/admin/schedules" className="user-btn">
            ← Schedules
          </Link>
          <Badge>{sch.status}</Badge>
          <span className="muted">
            {programCode}
            {' / '}
            {sectionCode}
            {' · '}
            {semesterName}
          </span>
        </div>
        {/* =====================================================
          ERROR
          ===================================================== */}
        {q.error && (
          <div className="portal-alert portal-alert-danger">
            <strong>Action failed.</strong>
            <span>{decodeURIComponent(q.error)}</span>
          </div>
        )}
        {/* =====================================================
          ACCESS GENERATED SUCCESS
          ===================================================== */}
        {(q.success === 'access_generated' || q.success === 'published') && q.code && (
          <div className="portal-alert portal-alert-success">
            <strong>New schedule access generated.</strong>
            <span>
              Save or distribute the new access code now. For security, it will not be shown again
              after leaving this page.
            </span>
          </div>
        )}
        {/* =====================================================
          NORMAL SUCCESS
          ===================================================== */}
        {q.success && q.success !== 'access_generated' && q.success !== 'published' && (
          <div className="portal-alert portal-alert-success">
            <strong>
              {q.success === 'validated' ? 'Validation complete.' : 'Schedule updated.'}
            </strong>
            <span>
              {q.success === 'validated'
                ? `${q.conflicts || 0} unresolved overlap conflict(s) found.`
                : 'The draft schedule was saved.'}
            </span>
          </div>
        )}
        {/* =====================================================
          READ ONLY
          ===================================================== */}
        {!editable && (
          <div className="portal-alert">
            <strong>Read only.</strong>
            <span>
              {isSubmitted
                ? 'Submitted schedules are locked for final Super Admin review. Revalidate or publish; use the Department Scheduler workflow for further draft changes.'
                : isArchived
                  ? 'Archived schedules are historical records and cannot be edited.'
                  : 'Published schedules cannot be edited directly. Use Schedule Alterations for controlled revisions.'}
            </span>
          </div>
        )}
        {isSubmitted && (
          <section className="panel head-gap">
            <div className="split-head-tight">
              <div>
                <span className="sched-kicker">FINAL PUBLICATION REVIEW</span>
                <h3 className="tight-text">Ready for Super Admin Decision</h3>
                <p className="muted flush">
                  Submitted schedules are locked. Revalidate the current version before official
                  publication.
                </p>
              </div>
              <Badge tone={canPublish ? 'success' : 'warning'}>
                {canPublish ? 'Ready to Publish' : 'Needs Attention'}
              </Badge>
            </div>
            <div className="fact-grid">
              <div className="sched-review-card">
                <span className="muted">VERSION</span>
                <strong>{currentVersion?.version_number ?? '—'}</strong>
              </div>
              <div className="sched-review-card">
                <span className="muted">ENTRIES</span>
                <strong>{entries.length}</strong>
              </div>
              <div className="sched-review-card">
                <span className="muted">BLOCKING ERRORS</span>
                <strong>{blockingLogs.length}</strong>
              </div>
            </div>
            {currentVersion?.change_reason && (
              <div className="portal-alert detail-note">
                <strong>Revision reason</strong>
                <span>{currentVersion.change_reason}</span>
              </div>
            )}
            {!entries.length && (
              <div className="portal-alert portal-alert-danger detail-note">
                <strong>Publication blocked.</strong>
                <span>This submitted version has no schedule entries.</span>
              </div>
            )}
            {blockingLogs.length > 0 && (
              <div className="portal-alert portal-alert-danger detail-note">
                <strong>Publication blocked by validation.</strong>
                <span>{blockingLogs.map((item) => item.message).join(' · ')}</span>
              </div>
            )}
            <div className="action-bar">
              <form action={revalidateSchedule}>
                <input type="hidden" name="schedule_id" value={id} />
                <button className="user-btn">Revalidate</button>
              </form>
              {canPublish && (
                <form action={publishSchedule}>
                  <input type="hidden" name="schedule_id" value={id} />
                  <button className="user-btn user-btn-primary">Publish & Generate Access</button>
                </form>
              )}
            </div>
          </section>
        )}
        {/* =====================================================
          STUDENT ACCESS
          ===================================================== */}
        {isPublished && (
          <section className="panel head-gap">
            <div className="split-head">
              <div>
                <span className="sched-kicker">STUDENT ACCESS</span>
                <h3 className="tight-text">Schedule Access</h3>
                <p className="muted flush">
                  Students use the active class code or QR credential to claim this published
                  schedule.
                </p>
              </div>
              <Badge tone={activeAccess ? 'success' : 'warning'}>
                {activeAccess ? 'Active' : 'No Active Code'}
              </Badge>
            </div>
            {/* ===============================================
              ACCESS QUERY ERROR
              =============================================== */}
            {accessR.error && (
              <div className="portal-alert portal-alert-danger gap-16">
                <strong>Unable to load access status.</strong>
                <span>{accessR.error.message}</span>
              </div>
            )}
            {/* ===============================================
              NEW RAW CODE
              This exists only immediately after generation.
              =============================================== */}
            {(q.success === 'access_generated' || q.success === 'published') && q.code && (
              <div className="share-card">
                <span className="sched-kicker field-caption">NEW CLASS CODE</span>
                <strong className="share-code">{q.code}</strong>
                <p className="muted share-hint">
                  Use this code for authorized read-only access to {programCode} / Block{' '}
                  {sectionCode}.
                </p>
                <div className="portal-alert detail-note">
                  <strong>Save this code now.</strong>
                  <span>
                    AlterSched stores only a secure hash of the code. The original code cannot be
                    recovered after leaving this page.
                  </span>
                </div>
              </div>
            )}
            {shareUrl && shareQr && (
              <div className="portal-alert portal-alert-success share-body">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="qr-image"
                  src={shareQr}
                  alt="QR code for the public schedule"
                  width={160}
                  height={160}
                />
                <div className="grow">
                  <strong>Public schedule link</strong>
                  <span className="share-link">
                    <a href={shareUrl} target="_blank" rel="noreferrer">
                      {shareUrl}
                    </a>
                  </span>
                  <span>
                    Share this link or QR code with students. Save it now: only a secure hash is
                    stored, so the link cannot be shown again. Use Regenerate Access to issue a new
                    one (the old link stops working).
                  </span>
                  {q.notified && Number(q.notified) > 0 ? (
                    <span className="block-note">
                      {q.notified} instructor{Number(q.notified) === 1 ? '' : 's'} notified.
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            {q.share_existing && (
              <div className="portal-alert portal-alert-success gap-12">
                <strong>Public link unchanged.</strong>
                <span>
                  The existing public link and QR code now show this newly published version.
                  {q.notified && Number(q.notified) > 0
                    ? ` ${q.notified} instructor${Number(q.notified) === 1 ? '' : 's'} notified.`
                    : ''}
                </span>
              </div>
            )}
            {q.share_error && (
              <div className="portal-alert portal-alert-danger gap-12">
                <strong>Public link not created.</strong>
                <span>
                  The schedule is published, but the public link could not be generated. Use
                  Regenerate Access to try again.
                </span>
              </div>
            )}
            {/* ===============================================
              QR TOKEN GENERATED
              =============================================== */}
            {(q.success === 'access_generated' || q.success === 'published') && q.qr && (
              <div className="detail-panel">
                <span className="sched-kicker field-caption">QR CLAIM CREDENTIAL</span>
                <strong>Generated</strong>
                <p className="muted detail-text">
                  A new QR claim token was also generated for this schedule.
                </p>
              </div>
            )}
            {/* ===============================================
              ACTIVE CREDENTIAL STATUS
              =============================================== */}
            {!accessR.error && activeAccess && (
              <div className="card-grid">
                <div className="detail-card">
                  <span className="muted detail-label">ACCESS STATUS</span>
                  <strong>Active</strong>
                  <p className="muted detail-hint">
                    This schedule currently has an active claim credential.
                  </p>
                </div>
                <div className="detail-card">
                  <span className="muted detail-label">SECURITY</span>
                  <strong>Protected</strong>
                  <p className="muted detail-hint">
                    Plaintext credentials are not stored in the database.
                  </p>
                </div>
              </div>
            )}
            {/* ===============================================
              NO ACTIVE CODE
              =============================================== */}
            {!accessR.error && !activeAccess && (
              <div className="portal-alert gap-18">
                <strong>No active access credential.</strong>
                <span>Generate a new class code before distributing this published schedule.</span>
              </div>
            )}
            {/* ===============================================
              GENERATE / REGENERATE
              =============================================== */}
            <div className="divided">
              <form action={regenerateScheduleAccess}>
                <input type="hidden" name="schedule_id" value={id} />
                <button type="submit" className="user-btn user-btn-primary">
                  {activeAccess ? 'Generate New Code' : 'Generate Access Code'}
                </button>
              </form>
              {activeAccess && (
                <p className="muted small-text">
                  Generating a new code immediately revokes the previous active credential.
                </p>
              )}
            </div>
          </section>
        )}
        {/* =====================================================
          MANUAL ADD
          ===================================================== */}
        {editable && (
          <div className="panel">
            <h3>Add Schedule Entry</h3>
            <p className="muted">
              Manual override for special or unresolved classes. Database conflict protection still
              applies.
            </p>
            <form action={addScheduleEntry} className="sched-form">
              <input type="hidden" name="schedule_id" value={id} />
              <div className="sched-form-grid">
                <div className="sched-field">
                  <label>Class Offering</label>
                  <select name="class_offering_id" required defaultValue="">
                    <option value="" disabled>
                      Select class
                    </option>
                    {offerings.map((offering) => (
                      <option key={offering.id} value={offering.id}>
                        {one(offering.subjects)?.code || '—'} —{' '}
                        {one(offering.subjects)?.name || 'Subject'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sched-field">
                  <label>Faculty</label>
                  <select name="faculty_id" required defaultValue="">
                    <option value="" disabled>
                      Select faculty
                    </option>
                    {faculty.map((item) => (
                      <option key={item.id} value={item.id}>
                        {one(item.profiles)?.full_name || item.employee_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sched-field">
                  <label>Room</label>
                  <select name="room_id" required defaultValue="">
                    <option value="" disabled>
                      Select room
                    </option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.code} — {room.name || 'Room'} ({room.capacity ?? '—'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sched-field">
                  <label>Day</label>
                  <select name="day_of_week" required defaultValue="">
                    <option value="" disabled>
                      Select day
                    </option>
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sched-field">
                  <label>Start</label>
                  <input type="time" name="start_time" required />
                </div>
                <div className="sched-field">
                  <label>End</label>
                  <input type="time" name="end_time" required />
                </div>
                <div className="sched-field">
                  <label>Type</label>
                  <select name="entry_type" defaultValue="regular">
                    <option value="regular">Regular</option>
                    <option value="makeup">Make-up</option>
                    <option value="special">Special</option>
                  </select>
                </div>
              </div>
              <div className="sched-form-actions">
                <button className="sched-primary-btn">+ Add Entry</button>
              </div>
            </form>
          </div>
        )}
        {/* =====================================================
          WEEK VIEW
          ===================================================== */}
        {entries.length > 0 && (
          <div className="panel">
            <div className="split-row">
              <div>
                <h3>Week View</h3>
                <p className="muted">
                  Block {sectionCode} · {semesterName}. Red marks a class with a validation issue.
                </p>
              </div>
            </div>
            <WeeklyTimetable
              sessions={entries.map((entry) => {
                const subject = one(one(entry.class_offerings)?.subjects)
                const facultyUser = one(one(entry.faculty_profiles)?.profiles)
                const room = one(entry.rooms)
                return {
                  id: entry.id,
                  day: entry.day_of_week,
                  start: entry.start_time,
                  end: entry.end_time,
                  title: subject?.code ?? 'Class',
                  lines: [facultyUser?.full_name ?? 'No instructor', room?.code ?? 'No room'],
                  kind: sessionKind(entry.session_type),
                  alert: logs.some(
                    (log) =>
                      !log.resolved &&
                      (log.schedule_entry_id === entry.id || log.related_entry_id === entry.id)
                  ),
                }
              })}
            />
          </div>
        )}
        {/* =====================================================
          CURRENT TIMETABLE
          ===================================================== */}
        <div className="panel">
          <div className="split-row">
            <div>
              <h3>Current Timetable</h3>
              <p className="muted">
                {entries.length} entry/entries · {logs.length} unresolved validation issue(s)
              </p>
            </div>
            {(isDraft || isSubmitted) && (
              <form action={revalidateSchedule}>
                <input type="hidden" name="schedule_id" value={id} />
                <button className="user-btn user-btn-primary">Revalidate</button>
              </form>
            )}
          </div>
          {/* ===================================================
            VALIDATION LOGS
            =================================================== */}
          {logs.length > 0 && (
            <div className="portal-alert portal-alert-danger">
              <strong>Validation issues</strong>
              <span>{logs.map((item) => item.message).join(' · ')}</span>
            </div>
          )}
          {/* ===================================================
            TABLE
            =================================================== */}
          {entries.length ? (
            <div className="scroll-x">
              <DataTable>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Faculty</th>
                    <th>Room</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Type</th>
                    {editable && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const offering = one(entry.class_offerings)
                    const subject = offering?.subjects ? one(offering.subjects) : null
                    const facultyProfile = one(entry.faculty_profiles)
                    const facultyUser = one(facultyProfile?.profiles)
                    const room = one(entry.rooms)

                    return (
                      <tr key={entry.id}>
                        <td>
                          <strong>{subject?.code || '—'}</strong>
                          <br />
                          <small>{subject?.name || ''}</small>
                        </td>
                        <td>{facultyUser?.full_name || '—'}</td>
                        <td>{room?.code || '—'}</td>
                        <td>{DAY_NAMES[entry.day_of_week] || entry.day_of_week}</td>
                        <td>
                          {String(entry.start_time).slice(0, 5)}–
                          {String(entry.end_time).slice(0, 5)}
                        </td>
                        <td>{entry.entry_type}</td>
                        {/* =================================
                            EDIT ACTIONS
                            ================================= */}
                        {editable && (
                          <td>
                            <details>
                              <summary className="user-btn">Edit</summary>
                              <form action={updateScheduleEntry} className="sched-form wide-field">
                                <input type="hidden" name="schedule_id" value={id} />
                                <input type="hidden" name="entry_id" value={entry.id} />
                                <select
                                  name="faculty_id"
                                  defaultValue={entry.faculty_id || ''}
                                  required
                                >
                                  {faculty.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {one(item.profiles)?.full_name || item.employee_id}
                                    </option>
                                  ))}
                                </select>
                                <select name="room_id" defaultValue={entry.room_id} required>
                                  {rooms.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.code}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  name="day_of_week"
                                  defaultValue={entry.day_of_week}
                                  required
                                >
                                  {DAY_OPTIONS.map((day) => (
                                    <option key={day.value} value={day.value}>
                                      {day.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="time"
                                  name="start_time"
                                  defaultValue={String(entry.start_time).slice(0, 5)}
                                  required
                                />
                                <input
                                  type="time"
                                  name="end_time"
                                  defaultValue={String(entry.end_time).slice(0, 5)}
                                  required
                                />
                                <select name="entry_type" defaultValue={entry.entry_type}>
                                  <option value="regular">Regular</option>
                                  <option value="makeup">Make-up</option>
                                  <option value="special">Special</option>
                                </select>
                                <button className="user-btn user-btn-primary">Save</button>
                              </form>
                              <form className="gap-6" action={removeScheduleEntry}>
                                <input type="hidden" name="schedule_id" value={id} />
                                <input type="hidden" name="entry_id" value={entry.id} />
                                <button className="user-btn user-btn-danger-soft">Remove</button>
                              </form>
                            </details>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </DataTable>
            </div>
          ) : (
            <Empty text="No schedule entries yet. Add one manually or regenerate from Schedule Builder." />
          )}
        </div>
      </>
    </div>
  )
}
=======
  const activeAccess =

    accessR.data || null



  const rel = (

    value: any

  ) =>

    Array.isArray(value)

      ? value[0]

      : value



  const programCode =

    rel(sch.programs)

      ?.code || '—'



  const sectionCode =

    rel(sch.sections)

      ?.code || '—'



  const semesterName =

    rel(sch.semesters)

      ?.name || '—'



  /* =========================================================

     PAGE

     ========================================================= */



  return (

    <>

      <PageHead
        eyebrow={
          isPublished
            ? 'PUBLISHED SCHEDULE'
            : isSubmitted
              ? 'FINAL ADMIN REVIEW'
              : isArchived
                ? 'ARCHIVED SCHEDULE'
                : 'DRAFT REVIEW'
        }
        title={sch.title || 'Schedule'}
        description={
          isPublished
            ? 'Review the published timetable and manage the student schedule access credential.'
            : isSubmitted
              ? 'Final Super Admin review. Revalidate the submitted timetable, then publish only when no blocking errors remain.'
              : isArchived
                ? 'Historical schedule record. Archived schedules are read only.'
                : 'Review the working draft. Draft schedules support manual add, edit, remove, and revalidation.'
        }
      />

      {/* =====================================================

          HEADER

          ===================================================== */}



      <div

        style={{

          display: 'flex',

          alignItems:

            'center',

          flexWrap: 'wrap',

          gap: 8,

          marginBottom: 16,

        }}

      >

        <Link

          href="/admin/schedules"

          className="user-btn"

        >

          ← Schedules

        </Link>



        <Badge>

          {sch.status}

        </Badge>



        <span className="muted">

          {programCode}

          {' / '}

          {sectionCode}

          {' · '}

          {semesterName}

        </span>

      </div>



      {/* =====================================================

          ERROR

          ===================================================== */}



      {q.error && (

        <div className="portal-alert portal-alert-danger">

          <strong>

            Action failed.

          </strong>



          <span>

            {decodeURIComponent(

              q.error

            )}

          </span>

        </div>

      )}



      {/* =====================================================

          ACCESS GENERATED SUCCESS

          ===================================================== */}



      {(q.success === 'access_generated' || q.success === 'published') && q.code && (

          <div className="portal-alert portal-alert-success">

            <strong>

              New schedule access

              generated.

            </strong>



            <span>

              Save or distribute

              the new access code

              now. For security,

              it will not be shown

              again after leaving

              this page.

            </span>

          </div>

        )}



      {/* =====================================================

          NORMAL SUCCESS

          ===================================================== */}



      {q.success && q.success !== 'access_generated' && q.success !== 'published' && (

          <div className="portal-alert portal-alert-success">

            <strong>

              {q.success ===

              'validated'

                ? 'Validation complete.'

                : 'Schedule updated.'}

            </strong>



            <span>

              {q.success ===

              'validated'

                ? `${

                    q.conflicts ||

                    0

                  } unresolved overlap conflict(s) found.`

                : 'The draft schedule was saved.'}

            </span>

          </div>

        )}



      {/* =====================================================
          READ ONLY
          ===================================================== */}

      {!editable && (
        <div className="portal-alert">
          <strong>Read only.</strong>
          <span>
            {isSubmitted
              ? 'Submitted schedules are locked for final Super Admin review. Revalidate or publish; use the Department Scheduler workflow for further draft changes.'
              : isArchived
                ? 'Archived schedules are historical records and cannot be edited.'
                : 'Published schedules cannot be edited directly. Use Schedule Alterations for controlled revisions.'}
          </span>
        </div>
      )}

      {isSubmitted && (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <span className="sched-kicker">FINAL PUBLICATION REVIEW</span>
              <h3 style={{ marginTop: 5, marginBottom: 5 }}>Ready for Super Admin Decision</h3>
              <p className="muted" style={{ margin: 0 }}>
                Submitted schedules are locked. Revalidate the current version before official publication.
              </p>
            </div>
            <Badge tone={canPublish ? 'success' : 'warning'}>
              {canPublish ? 'Ready to Publish' : 'Needs Attention'}
            </Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
            <div className="sched-review-card">
              <span className="muted">VERSION</span>
              <strong>{currentVersion?.version_number ?? '—'}</strong>
            </div>
            <div className="sched-review-card">
              <span className="muted">ENTRIES</span>
              <strong>{entries.length}</strong>
            </div>
            <div className="sched-review-card">
              <span className="muted">BLOCKING ERRORS</span>
              <strong>{blockingLogs.length}</strong>
            </div>
          </div>

          {currentVersion?.change_reason && (
            <div className="portal-alert" style={{ marginTop: 14, marginBottom: 0 }}>
              <strong>Revision reason</strong>
              <span>{currentVersion.change_reason}</span>
            </div>
          )}

          {!entries.length && (
            <div className="portal-alert portal-alert-danger" style={{ marginTop: 14, marginBottom: 0 }}>
              <strong>Publication blocked.</strong>
              <span>This submitted version has no schedule entries.</span>
            </div>
          )}

          {blockingLogs.length > 0 && (
            <div className="portal-alert portal-alert-danger" style={{ marginTop: 14, marginBottom: 0 }}>
              <strong>Publication blocked by validation.</strong>
              <span>{blockingLogs.map((item: any) => item.message).join(' · ')}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <form action={revalidateSchedule}>
              <input type="hidden" name="schedule_id" value={id} />
              <button className="user-btn">Revalidate</button>
            </form>

            {canPublish && (
              <form action={publishSchedule}>
                <input type="hidden" name="schedule_id" value={id} />
                <button className="user-btn user-btn-primary">Publish & Generate Access</button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* =====================================================

          STUDENT ACCESS

          ===================================================== */}



      {isPublished && (

        <section

          className="panel"

          style={{

            marginBottom: 18,

          }}

        >

          <div

            style={{

              display: 'flex',

              justifyContent:

                'space-between',

              alignItems:

                'flex-start',

              gap: 16,

              flexWrap:

                'wrap',

            }}

          >

            <div>

              <span className="sched-kicker">

                STUDENT ACCESS

              </span>



              <h3

                style={{

                  marginTop: 5,

                  marginBottom: 5,

                }}

              >

                Schedule Access

              </h3>



              <p

                className="muted"

                style={{

                  margin: 0,

                }}

              >

                Students use the

                active class code

                or QR credential

                to claim this

                published

                schedule.

              </p>

            </div>



            <Badge

              tone={

                activeAccess

                  ? 'success'

                  : 'warning'

              }

            >

              {activeAccess

                ? 'Active'

                : 'No Active Code'}

            </Badge>

          </div>



          {/* ===============================================

              ACCESS QUERY ERROR

              =============================================== */}



          {accessR.error && (

            <div

              className="portal-alert portal-alert-danger"

              style={{

                marginTop: 16,

              }}

            >

              <strong>

                Unable to load

                access status.

              </strong>



              <span>

                {

                  accessR

                    .error

                    .message

                }

              </span>

            </div>

          )}



          {/* ===============================================

              NEW RAW CODE



              This exists only immediately after generation.

              =============================================== */}



          {(q.success === 'access_generated' || q.success === 'published') && q.code && (

              <div

                style={{

                  marginTop: 18,

                  border:

                    '1px solid var(--line)',

                  borderRadius:

                    14,

                  padding: 18,

                }}

              >

                <span

                  className="sched-kicker"

                  style={{

                    display:

                      'block',

                    marginBottom:

                      8,

                  }}

                >

                  NEW CLASS CODE

                </span>



                <strong

                  style={{

                    display:

                      'block',

                    fontSize: 26,

                    letterSpacing:

                      '0.1em',

                    wordBreak:

                      'break-word',

                  }}

                >

                  {q.code}

                </strong>



                <p

                  className="muted"

                  style={{

                    marginTop: 10,

                    marginBottom:

                      0,

                  }}

                >

                  Give this code

                  only to students

                  assigned to{' '}

                  {programCode} /

                  Block{' '}

                  {sectionCode}.

                </p>



                <div

                  className="portal-alert"

                  style={{

                    marginTop: 14,

                    marginBottom:

                      0,

                  }}

                >

                  <strong>

                    Save this code

                    now.

                  </strong>



                  <span>

                    AlterSched

                    stores only a

                    secure hash of

                    the code. The

                    original code

                    cannot be

                    recovered after

                    leaving this

                    page.

                  </span>

                </div>

              </div>

            )}



          {/* ===============================================

              QR TOKEN GENERATED

              =============================================== */}



          {(q.success === 'access_generated' || q.success === 'published') && q.qr && (

              <div

                style={{

                  marginTop: 12,

                  border:

                    '1px solid var(--line)',

                  borderRadius:

                    14,

                  padding: 18,

                }}

              >

                <span

                  className="sched-kicker"

                  style={{

                    display:

                      'block',

                    marginBottom:

                      8,

                  }}

                >

                  QR CLAIM

                  CREDENTIAL

                </span>



                <strong>

                  Generated

                </strong>



                <p

                  className="muted"

                  style={{

                    marginTop: 7,

                    marginBottom:

                      0,

                  }}

                >

                  A new QR claim

                  token was also

                  generated for

                  this schedule.

                </p>

              </div>

            )}



          {/* ===============================================

              ACTIVE CREDENTIAL STATUS

              =============================================== */}



          {!accessR.error &&

            activeAccess && (

              <div

                style={{

                  display:

                    'grid',

                  gridTemplateColumns:

                    'repeat(auto-fit, minmax(220px, 1fr))',

                  gap: 12,

                  marginTop: 18,

                }}

              >

                <div

                  style={{

                    border:

                      '1px solid var(--line)',

                    borderRadius:

                      14,

                    padding: 16,

                  }}

                >

                  <span

                    className="muted"

                    style={{

                      display:

                        'block',

                      fontSize: 11,

                      marginBottom:

                        7,

                    }}

                  >

                    ACCESS STATUS

                  </span>



                  <strong>

                    Active

                  </strong>



                  <p

                    className="muted"

                    style={{

                      marginTop: 7,

                      marginBottom:

                        0,

                      fontSize: 11,

                    }}

                  >

                    This schedule

                    currently has

                    an active claim

                    credential.

                  </p>

                </div>



                <div

                  style={{

                    border:

                      '1px solid var(--line)',

                    borderRadius:

                      14,

                    padding: 16,

                  }}

                >

                  <span

                    className="muted"

                    style={{

                      display:

                        'block',

                      fontSize: 11,

                      marginBottom:

                        7,

                    }}

                  >

                    SECURITY

                  </span>



                  <strong>

                    Protected

                  </strong>



                  <p

                    className="muted"

                    style={{

                      marginTop: 7,

                      marginBottom:

                        0,

                      fontSize: 11,

                    }}

                  >

                    Plaintext

                    credentials are

                    not stored in

                    the database.

                  </p>

                </div>

              </div>

            )}



          {/* ===============================================

              NO ACTIVE CODE

              =============================================== */}



          {!accessR.error &&

            !activeAccess && (

              <div

                className="portal-alert"

                style={{

                  marginTop: 18,

                }}

              >

                <strong>

                  No active access

                  credential.

                </strong>



                <span>

                  Generate a new

                  class code before

                  distributing this

                  schedule to

                  students.

                </span>

              </div>

            )}



          {/* ===============================================

              GENERATE / REGENERATE

              =============================================== */}



          <div

            style={{

              marginTop: 18,

              paddingTop: 16,

              borderTop:

                '1px solid var(--line)',

            }}

          >

            <form

              action={

                regenerateScheduleAccess

              }

            >

              <input

                type="hidden"

                name="schedule_id"

                value={id}

              />



              <button

                type="submit"

                className="user-btn user-btn-primary"

              >

                {activeAccess

                  ? 'Generate New Code'

                  : 'Generate Access Code'}

              </button>

            </form>



            {activeAccess && (

              <p

                className="muted"

                style={{

                  marginTop: 8,

                  marginBottom:

                    0,

                  fontSize: 11,

                }}

              >

                Generating a new

                code immediately

                revokes the

                previous active

                credential.

              </p>

            )}

          </div>

        </section>

      )}



      {/* =====================================================

          MANUAL ADD

          ===================================================== */}



      {editable && (

        <div className="panel">

          <h3>

            Add Schedule Entry

          </h3>



          <p className="muted">

            Manual override for

            special or unresolved

            classes. Database

            conflict protection

            still applies.

          </p>



          <form

            action={

              addScheduleEntry

            }

            className="sched-form"

          >

            <input

              type="hidden"

              name="schedule_id"

              value={id}

            />



            <div className="sched-form-grid">

              <div className="sched-field">

                <label>

                  Class Offering

                </label>



                <select

                  name="class_offering_id"

                  required

                  defaultValue=""

                >

                  <option

                    value=""

                    disabled

                  >

                    Select class

                  </option>



                  {offerings.map(

                    (offering) => (

                      <option

                        key={

                          offering.id

                        }

                        value={

                          offering.id

                        }

                      >

                        {rel(

                          offering.subjects

                        )?.code ||

                          '—'}{' '}

                        —{' '}

                        {rel(

                          offering.subjects

                        )?.name ||

                          'Subject'}

                      </option>

                    )

                  )}

                </select>

              </div>



              <div className="sched-field">

                <label>

                  Faculty

                </label>



                <select

                  name="faculty_id"

                  required

                  defaultValue=""

                >

                  <option

                    value=""

                    disabled

                  >

                    Select faculty

                  </option>



                  {faculty.map(

                    (item) => (

                      <option

                        key={

                          item.id

                        }

                        value={

                          item.id

                        }

                      >

                        {rel(

                          item.profiles

                        )

                          ?.full_name ||

                          item.employee_id}

                      </option>

                    )

                  )}

                </select>

              </div>



              <div className="sched-field">

                <label>

                  Room

                </label>



                <select

                  name="room_id"

                  required

                  defaultValue=""

                >

                  <option

                    value=""

                    disabled

                  >

                    Select room

                  </option>



                  {rooms.map(

                    (room) => (

                      <option

                        key={

                          room.id

                        }

                        value={

                          room.id

                        }

                      >

                        {

                          room.code

                        }{' '}

                        —{' '}

                        {room.name ||

                          'Room'}{' '}

                        (

                        {room.capacity ??

                          '—'}

                        )

                      </option>

                    )

                  )}

                </select>

              </div>



              <div className="sched-field">

                <label>

                  Day

                </label>



                <select

                  name="day_of_week"

                  required

                  defaultValue=""

                >

                  <option

                    value=""

                    disabled

                  >

                    Select day

                  </option>



                  {DAYS.slice(

                    1

                  ).map(

                    (

                      day,

                      index

                    ) => (

                      <option

                        key={day}

                        value={

                          index +

                          1

                        }

                      >

                        {day}

                      </option>

                    )

                  )}

                </select>

              </div>



              <div className="sched-field">

                <label>

                  Start

                </label>



                <input

                  type="time"

                  name="start_time"

                  required

                />

              </div>



              <div className="sched-field">

                <label>

                  End

                </label>



                <input

                  type="time"

                  name="end_time"

                  required

                />

              </div>



              <div className="sched-field">

                <label>

                  Type

                </label>



                <select

                  name="entry_type"

                  defaultValue="regular"

                >

                  <option value="regular">

                    Regular

                  </option>



                  <option value="makeup">

                    Make-up

                  </option>



                  <option value="special">

                    Special

                  </option>

                </select>

              </div>

            </div>



            <div className="sched-form-actions">

              <button className="sched-primary-btn">

                + Add Entry

              </button>

            </div>

          </form>

        </div>

      )}



      {/* =====================================================

          CURRENT TIMETABLE

          ===================================================== */}



      <div className="panel">

        <div

          style={{

            display: 'flex',

            justifyContent:

              'space-between',

            gap: 12,

            alignItems:

              'center',

            flexWrap: 'wrap',

          }}

        >

          <div>

            <h3>

              Current Timetable

            </h3>



            <p className="muted">

              {entries.length}{' '}

              entry/entries ·{' '}

              {logs.length}{' '}

              unresolved

              validation

              issue(s)

            </p>

          </div>



          {(isDraft || isSubmitted) && (

            <form

              action={

                revalidateSchedule

              }

            >

              <input

                type="hidden"

                name="schedule_id"

                value={id}

              />



              <button className="user-btn user-btn-primary">

                Revalidate

              </button>

            </form>

          )}

        </div>



        {/* ===================================================

            VALIDATION LOGS

            =================================================== */}



        {logs.length >

          0 && (

          <div className="portal-alert portal-alert-danger">

            <strong>

              Validation issues

            </strong>



            <span>

              {logs

                .map(

                  (item) =>

                    item.message

                )

                .join(' · ')}

            </span>

          </div>

        )}



        {/* ===================================================

            TABLE

            =================================================== */}



        {entries.length ? (

          <div

            style={{

              overflowX:

                'auto',

            }}

          >

            <DataTable>

              <thead>

                <tr>

                  <th>

                    Class

                  </th>



                  <th>

                    Faculty

                  </th>



                  <th>

                    Room

                  </th>



                  <th>

                    Day

                  </th>



                  <th>

                    Time

                  </th>



                  <th>

                    Type

                  </th>



                  {editable && (

                    <th>

                      Actions

                    </th>

                  )}

                </tr>

              </thead>



              <tbody>

                {entries.map(

                  (entry) => {

                    const offering =

                      rel(

                        entry.class_offerings

                      )



                    const subject =

                      offering

                        ?.subjects

                        ? rel(

                            offering.subjects

                          )

                        : null



                    const facultyProfile =

                      rel(

                        entry.faculty_profiles

                      )



                    const facultyUser =

                      rel(

                        facultyProfile

                          ?.profiles

                      )



                    const room =

                      rel(

                        entry.rooms

                      )



                    return (

                      <tr

                        key={

                          entry.id

                        }

                      >

                        <td>

                          <strong>

                            {subject

                              ?.code ||

                              '—'}

                          </strong>



                          <br />



                          <small>

                            {subject

                              ?.name ||

                              ''}

                          </small>

                        </td>



                        <td>

                          {facultyUser

                            ?.full_name ||

                            '—'}

                        </td>



                        <td>

                          {room

                            ?.code ||

                            '—'}

                        </td>



                        <td>

                          {DAYS[

                            entry

                              .day_of_week

                          ] ||

                            entry.day_of_week}

                        </td>



                        <td>

                          {String(

                            entry.start_time

                          ).slice(

                            0,

                            5

                          )}

                          –

                          {String(

                            entry.end_time

                          ).slice(

                            0,

                            5

                          )}

                        </td>



                        <td>

                          {

                            entry.entry_type

                          }

                        </td>



                        {/* =================================

                            EDIT ACTIONS

                            ================================= */}



                        {editable && (

                          <td>

                            <details>

                              <summary className="user-btn">

                                Edit

                              </summary>



                              <form

                                action={

                                  updateScheduleEntry

                                }

                                className="sched-form"

                                style={{

                                  minWidth:

                                    280,

                                  marginTop:

                                    8,

                                }}

                              >

                                <input

                                  type="hidden"

                                  name="schedule_id"

                                  value={

                                    id

                                  }

                                />



                                <input

                                  type="hidden"

                                  name="entry_id"

                                  value={

                                    entry.id

                                  }

                                />



                                <select

                                  name="faculty_id"

                                  defaultValue={

                                    entry.faculty_id ||

                                    ''

                                  }

                                  required

                                >

                                  {faculty.map(

                                    (

                                      item

                                    ) => (

                                      <option

                                        key={

                                          item.id

                                        }

                                        value={

                                          item.id

                                        }

                                      >

                                        {rel(

                                          item.profiles

                                        )

                                          ?.full_name ||

                                          item.employee_id}

                                      </option>

                                    )

                                  )}

                                </select>



                                <select

                                  name="room_id"

                                  defaultValue={

                                    entry.room_id

                                  }

                                  required

                                >

                                  {rooms.map(

                                    (

                                      item

                                    ) => (

                                      <option

                                        key={

                                          item.id

                                        }

                                        value={

                                          item.id

                                        }

                                      >

                                        {

                                          item.code

                                        }

                                      </option>

                                    )

                                  )}

                                </select>



                                <select

                                  name="day_of_week"

                                  defaultValue={

                                    entry.day_of_week

                                  }

                                  required

                                >

                                  {DAYS.slice(

                                    1

                                  ).map(

                                    (

                                      day,

                                      index

                                    ) => (

                                      <option

                                        key={

                                          day

                                        }

                                        value={

                                          index +

                                          1

                                        }

                                      >

                                        {

                                          day

                                        }

                                      </option>

                                    )

                                  )}

                                </select>



                                <input

                                  type="time"

                                  name="start_time"

                                  defaultValue={String(

                                    entry.start_time

                                  ).slice(

                                    0,

                                    5

                                  )}

                                  required

                                />



                                <input

                                  type="time"

                                  name="end_time"

                                  defaultValue={String(

                                    entry.end_time

                                  ).slice(

                                    0,

                                    5

                                  )}

                                  required

                                />



                                <select

                                  name="entry_type"

                                  defaultValue={

                                    entry.entry_type

                                  }

                                >

                                  <option value="regular">

                                    Regular

                                  </option>



                                  <option value="makeup">

                                    Make-up

                                  </option>



                                  <option value="special">

                                    Special

                                  </option>

                                </select>



                                <button className="user-btn user-btn-primary">

                                  Save

                                </button>

                              </form>



                              <form

                                action={

                                  removeScheduleEntry

                                }

                                style={{

                                  marginTop:

                                    6,

                                }}

                              >

                                <input

                                  type="hidden"

                                  name="schedule_id"

                                  value={

                                    id

                                  }

                                />



                                <input

                                  type="hidden"

                                  name="entry_id"

                                  value={

                                    entry.id

                                  }

                                />



                                <button className="user-btn user-btn-danger-soft">

                                  Remove

                                </button>

                              </form>

                            </details>

                          </td>

                        )}

                      </tr>

                    )

                  }

                )}

              </tbody>

            </DataTable>

          </div>

        ) : (

          <Empty text="No schedule entries yet. Add one manually or regenerate from Schedule Builder." />

        )}

      </div>

    </>

  )

}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

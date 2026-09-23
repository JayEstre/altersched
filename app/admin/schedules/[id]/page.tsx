import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import {
  PageHead,
  Badge,
  Empty,
} from '@/components/ui'

import {
  addScheduleEntry,
  updateScheduleEntry,
  removeScheduleEntry,
  revalidateSchedule,
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

  const editable =
    sch.status !== 'published' &&
    sch.status !== 'archived'

  /* =========================================================
     LOAD PAGE DATA
     ========================================================= */

  const [
    entriesR,
    offerR,
    facultyR,
    roomsR,
    logsR,
    accessR,
  ] = await Promise.all([
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
          sch.status ===
          'published'
            ? 'PUBLISHED SCHEDULE'
            : 'DRAFT REVIEW'
        }
        title={
          sch.title ||
          'Schedule'
        }
        description={
          sch.status ===
          'published'
            ? 'Review the published timetable and manage the student schedule access credential.'
            : 'Review the generated timetable. Draft schedules support manual add, edit, remove, and revalidation before publishing.'
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

      {q.success ===
        'access_generated' &&
        q.code && (
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

      {q.success &&
        q.success !==
          'access_generated' && (
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
          <strong>
            Read only.
          </strong>

          <span>
            Published/archived
            schedules cannot be
            edited directly. Use
            Schedule Alterations
            for controlled
            revisions.
          </span>
        </div>
      )}

      {/* =====================================================
          STUDENT ACCESS
          ===================================================== */}

      {sch.status ===
        'published' && (
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

          {q.success ===
            'access_generated' &&
            q.code && (
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

          {q.success ===
            'access_generated' &&
            q.qr && (
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

          {editable && (
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
            <table className="data-table">
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
            </table>
          </div>
        ) : (
          <Empty text="No schedule entries yet. Add one manually or regenerate from Schedule Builder." />
        )}
      </div>
    </>
  )
}
import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

import {
  PageHead,
  Empty,
  Badge,
} from '@/components/ui'

import {
  submitScheduleChangeRequest,
  cancelScheduleChangeRequest,
} from './actions'

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

function rel(value: any) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function formatTime(
  value: string | null | undefined
) {
  if (!value) return '—'

  return String(value).slice(0, 5)
}

function statusLabel(
  status: string
) {
  switch (status) {
    case 'pending':
      return 'Pending'

    case 'approved':
      return 'Approved'

    case 'rejected':
      return 'Rejected'

    case 'cancelled':
      return 'Cancelled'

    default:
      return status
  }
}

function statusTone(
  status: string
):
  | 'success'
  | 'warning'
  | 'danger'
  | undefined {
  switch (status) {
    case 'approved':
      return 'success'

    case 'pending':
      return 'warning'

    case 'rejected':
      return 'danger'

    default:
      return undefined
  }
}

type SearchParams =
  Promise<{
    success?: string
    error?: string
  }>

export default async function FacultyAlterationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params =
    await searchParams

  const { profile } =
    await requireRole([
      'faculty',
    ])

  const supabase =
    await createClient()

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
      employee_id,
      department_id,
      departments(
        code,
        name
      )
    `)
    .eq(
      'profile_id',
      profile.id
    )
    .maybeSingle()

  if (facultyError) {
    console.error(
      'Failed to load faculty profile:',
      facultyError
    )
  }

  if (!faculty) {
    return (
      <>
        <PageHead
          eyebrow="SCHEDULE CHANGES"
          title="Alteration Requests"
          description="Request changes to your published teaching schedule."
        />

        <div className="panel">
          <Empty text="Faculty profile was not found." />
        </div>
      </>
    )
  }

  const department =
    rel(
      (faculty as any)
        ?.departments
    )

  /* =======================================================
     PUBLISHED SCHEDULE ENTRIES

     First retrieve published-version entries assigned to
     this faculty.

     We then keep only entries whose version is also the
     schedule's current_version_id.
     ======================================================= */

  const {
    data: candidateEntries,
    error: entriesError,
  } = await supabase
    .from('schedule_entries')
    .select(`
      id,
      schedule_version_id,
      day_of_week,
      start_time,
      end_time,
      room_id,

      rooms(
        code,
        name
      ),

      class_offerings(
        subjects(
          code,
          name
        ),

        sections(
          code
        )
      ),

      schedule_versions!inner(
        id,
        status,

        schedules!inner(
          id,
          status,
          current_version_id
        )
      )
    `)
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
    .order(
      'day_of_week'
    )
    .order(
      'start_time'
    )

  if (entriesError) {
    console.error(
      'Failed to load published faculty entries:',
      entriesError
    )
  }

  const entries =
    (candidateEntries ?? [])
      .filter((entry: any) => {
        const version =
          rel(
            entry
              .schedule_versions
          )

        const schedule =
          rel(
            version
              ?.schedules
          )

        return Boolean(
          version &&
            schedule &&
            version.status ===
              'published' &&
            schedule.status ===
              'published' &&
            schedule
              .current_version_id ===
              version.id
        )
      })

  /* =======================================================
     ROOMS

     Load rooms separately.

     This is also used to resolve proposed_room_id in
     request history, avoiding a fragile relation alias.
     ======================================================= */

  const {
    data: rooms,
    error: roomsError,
  } = await supabase
    .from('rooms')
    .select(`
      id,
      code,
      name,
      room_type,
      capacity,
      is_active
    `)
    .eq(
      'is_active',
      true
    )
    .order('code')

  if (roomsError) {
    console.error(
      'Failed to load rooms:',
      roomsError
    )
  }

  const roomMap =
    new Map(
      (rooms ?? []).map(
        (room: any) => [
          room.id,
          room,
        ]
      )
    )

  /* =======================================================
     FACULTY CHANGE REQUESTS
     ======================================================= */

  const {
    data: requests,
    error: requestsError,
  } = await supabase
    .from(
      'schedule_change_requests'
    )
    .select(`
      id,
      schedule_entry_id,
      proposed_day,
      proposed_start_time,
      proposed_end_time,
      proposed_room_id,
      reason,
      change_type,
      status,
      review_notes,
      reviewed_at,
      created_at,

      schedule_entries(
        day_of_week,
        start_time,
        end_time,
        room_id,

        rooms(
          code,
          name
        ),

        class_offerings(
          subjects(
            code,
            name
          ),

          sections(
            code
          )
        )
      )
    `)
    .eq(
      'requested_by',
      profile.id
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )

  if (requestsError) {
    console.error(
      'Failed to load alteration requests:',
      requestsError
    )
  }

  const pendingCount =
    (requests ?? []).filter(
      (request: any) =>
        request.status ===
        'pending'
    ).length

  const approvedCount =
    (requests ?? []).filter(
      (request: any) =>
        request.status ===
        'approved'
    ).length

  const rejectedCount =
    (requests ?? []).filter(
      (request: any) =>
        request.status ===
        'rejected'
    ).length

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <>
      <PageHead
        eyebrow="SCHEDULE CHANGES"
        title="Alteration Requests"
        description="Request a change to one of your classes in the official published teaching schedule."
      />

      {/* ===================================================
          NAVIGATION
          =================================================== */}

      <div className="alteration-nav">
        <Link
          href="/faculty/dashboard"
          className="user-btn"
        >
          ← Dashboard
        </Link>

        <div className="alteration-nav-actions">
          <Link
            href="/faculty/schedule"
            className="user-btn"
          >
            My Schedule
          </Link>

          <Link
            href="/faculty/availability"
            className="user-btn"
          >
            Availability
          </Link>

          {pendingCount > 0 && (
            <Badge tone="warning">
              {pendingCount}{' '}
              Pending
            </Badge>
          )}
        </div>
      </div>

      {/* ===================================================
          FACULTY
          =================================================== */}

      <section className="panel alteration-faculty">
        <div className="alteration-faculty-head">
          <div>
            <span className="sched-kicker">
              FACULTY
            </span>

            <h3>
              {profile.full_name ||
                'Faculty'}
            </h3>

            <p className="muted">
              Employee ID:{' '}
              {faculty.employee_id ||
                '—'}

              {' · '}

              {department?.code ||
                'No Department'}
            </p>
          </div>

          <Badge>
            Request Only
          </Badge>
        </div>
      </section>

      {/* ===================================================
          FEEDBACK
          =================================================== */}

      {params.success && (
        <div className="portal-alert portal-alert-success">
          <strong>
            Request updated.
          </strong>

          <span>
            {params.success}
          </span>
        </div>
      )}

      {params.error && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Unable to continue.
          </strong>

          <span>
            {params.error}
          </span>
        </div>
      )}

      {entriesError && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Published schedule unavailable.
          </strong>

          <span>
            {entriesError.message}
          </span>
        </div>
      )}

      {requestsError && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Request history unavailable.
          </strong>

          <span>
            {requestsError.message}
          </span>
        </div>
      )}

      {/* ===================================================
          SUMMARY
          =================================================== */}

      <div className="alteration-summary">
        <div className="alteration-stat">
          <span>
            Published Classes
          </span>

          <strong>
            {entries.length}
          </strong>
        </div>

        <div className="alteration-stat">
          <span>
            Pending
          </span>

          <strong>
            {pendingCount}
          </strong>
        </div>

        <div className="alteration-stat">
          <span>
            Approved
          </span>

          <strong>
            {approvedCount}
          </strong>
        </div>

        <div className="alteration-stat">
          <span>
            Rejected
          </span>

          <strong>
            {rejectedCount}
          </strong>
        </div>
      </div>

      {/* ===================================================
          NEW REQUEST
          =================================================== */}

      <section className="panel alteration-request-panel">
        <div className="alteration-head">
          <div>
            <span className="sched-kicker">
              NEW REQUEST
            </span>

            <h3>
              Request Schedule Change
            </h3>

            <p className="muted">
              Select one of your current published classes and propose the change you need.
            </p>
          </div>

          <Badge>
            Normal Request
          </Badge>
        </div>

        {entries.length > 0 ? (
          <form
            action={
              submitScheduleChangeRequest
            }
          >
            <div className="alteration-form-grid">
              {/* CLASS */}

              <label>
                <span>
                  Published Class
                </span>

                <select
                  name="schedule_entry_id"
                  required
                  defaultValue=""
                >
                  <option
                    value=""
                    disabled
                  >
                    Select class
                  </option>

                  {entries.map(
                    (entry: any) => {
                      const offering =
                        rel(
                          entry
                            .class_offerings
                        )

                      const subject =
                        rel(
                          offering
                            ?.subjects
                        )

                      const section =
                        rel(
                          offering
                            ?.sections
                        )

                      const room =
                        rel(
                          entry.rooms
                        )

                      return (
                        <option
                          key={
                            entry.id
                          }
                          value={
                            entry.id
                          }
                        >
                          {subject
                            ?.code ||
                            'Class'}

                          {' — '}

                          Block{' '}
                          {section
                            ?.code ||
                            '—'}

                          {' — '}

                          {DAYS[
                            entry
                              .day_of_week
                          ]}

                          {' '}

                          {formatTime(
                            entry
                              .start_time
                          )}

                          {'–'}

                          {formatTime(
                            entry
                              .end_time
                          )}

                          {room
                            ?.code
                            ? ` — ${room.code}`
                            : ''}
                        </option>
                      )
                    }
                  )}
                </select>
              </label>

              {/* DAY */}

              <label>
                <span>
                  Proposed Day
                </span>

                <select
                  name="proposed_day"
                  defaultValue=""
                >
                  <option value="">
                    No change
                  </option>

                  {DAYS
                    .slice(1)
                    .map(
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
                          {day}
                        </option>
                      )
                    )}
                </select>
              </label>

              {/* START */}

              <label>
                <span>
                  Proposed Start
                </span>

                <input
                  type="time"
                  name="proposed_start_time"
                />
              </label>

              {/* END */}

              <label>
                <span>
                  Proposed End
                </span>

                <input
                  type="time"
                  name="proposed_end_time"
                />
              </label>

              {/* ROOM */}

              <label>
                <span>
                  Proposed Room
                </span>

                <select
                  name="proposed_room_id"
                  defaultValue=""
                >
                  <option value="">
                    No change
                  </option>

                  {(rooms ?? []).map(
                    (room: any) => (
                      <option
                        key={
                          room.id
                        }
                        value={
                          room.id
                        }
                      >
                        {room.code}
                        {room.name
                          ? ` — ${room.name}`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <label className="alteration-reason">
              <span>
                Reason for Request
              </span>

              <textarea
                name="reason"
                required
                rows={4}
                maxLength={1000}
                placeholder="Explain why you are requesting this schedule change..."
              />
            </label>

            <div className="alteration-submit">
              <button
                type="submit"
                className="user-btn user-btn-primary"
              >
                Submit Change Request
              </button>
            </div>
          </form>
        ) : (
          <Empty text="You do not have any current published schedule entries available for alteration." />
        )}

        <div className="alteration-note">
          <strong>
            Request only
          </strong>

          <span>
            Submitting this form does not immediately change the official timetable. The request remains pending until reviewed.
          </span>
        </div>
      </section>

      {/* ===================================================
          REQUEST HISTORY
          =================================================== */}

      <section className="panel">
        <div className="alteration-head">
          <div>
            <span className="sched-kicker">
              HISTORY
            </span>

            <h3>
              Request History
            </h3>

            <p className="muted">
              Track pending, approved, rejected, and cancelled schedule change requests.
            </p>
          </div>

          {(requests?.length ?? 0) >
            0 && (
            <Badge>
              {requests?.length}{' '}
              Request
              {requests?.length === 1
                ? ''
                : 's'}
            </Badge>
          )}
        </div>

        {requests?.length ? (
          <div className="alteration-history">
            {requests.map(
              (request: any) => {
                const entry =
                  rel(
                    request
                      .schedule_entries
                  )

                const offering =
                  rel(
                    entry
                      ?.class_offerings
                  )

                const subject =
                  rel(
                    offering
                      ?.subjects
                  )

                const section =
                  rel(
                    offering
                      ?.sections
                  )

                const currentRoom =
                  rel(
                    entry?.rooms
                  )

                const proposedRoom =
                  request
                    .proposed_room_id
                    ? roomMap.get(
                        request
                          .proposed_room_id
                      )
                    : null

                const hasDayChange =
                  request
                    .proposed_day !==
                    null

                const hasTimeChange =
                  request
                    .proposed_start_time &&
                  request
                    .proposed_end_time

                const hasRoomChange =
                  Boolean(
                    request
                      .proposed_room_id
                  )

                return (
                  <article
                    key={
                      request.id
                    }
                    className="alteration-history-item"
                  >
                    <div className="alteration-history-head">
                      <div>
                        <strong>
                          {subject
                            ?.code ||
                            'Class'}

                          {subject
                            ?.name
                            ? ` — ${subject.name}`
                            : ''}
                        </strong>

                        <div className="muted alteration-block">
                          Block{' '}
                          {section
                            ?.code ||
                            '—'}
                        </div>
                      </div>

                      <Badge
                        tone={
                          statusTone(
                            request.status
                          )
                        }
                      >
                        {statusLabel(
                          request.status
                        )}
                      </Badge>
                    </div>

                    <div className="alteration-compare">
                      <div>
                        <span>
                          CURRENT
                        </span>

                        <strong>
                          {DAYS[
                            entry
                              ?.day_of_week
                          ] ||
                            '—'}
                        </strong>

                        <p>
                          {formatTime(
                            entry
                              ?.start_time
                          )}
                          {' – '}
                          {formatTime(
                            entry
                              ?.end_time
                          )}
                        </p>

                        <p>
                          Room{' '}
                          {currentRoom
                            ?.code ||
                            '—'}
                        </p>
                      </div>

                      <div>
                        <span>
                          REQUESTED
                        </span>

                        <strong>
                          {hasDayChange
                            ? DAYS[
                                request
                                  .proposed_day
                              ]
                            : 'Same day'}
                        </strong>

                        <p>
                          {hasTimeChange
                            ? `${formatTime(
                                request
                                  .proposed_start_time
                              )} – ${formatTime(
                                request
                                  .proposed_end_time
                              )}`
                            : 'Same time'}
                        </p>

                        <p>
                          {hasRoomChange
                            ? `Room ${
                                proposedRoom
                                  ?.code ||
                                '—'
                              }`
                            : 'Same room'}
                        </p>
                      </div>
                    </div>

                    <div className="alteration-reason-box">
                      <span>
                        REASON
                      </span>

                      <p>
                        {request.reason}
                      </p>
                    </div>

                    {request.review_notes && (
                      <div className="alteration-review-box">
                        <span>
                          REVIEW NOTES
                        </span>

                        <p>
                          {
                            request
                              .review_notes
                          }
                        </p>
                      </div>
                    )}

                    <div className="alteration-history-footer">
                      <small className="muted">
                        Requested:{' '}
                        {new Date(
                          request
                            .created_at
                        ).toLocaleString()}
                      </small>

                      {request.status ===
                        'pending' && (
                        <form
                          action={
                            cancelScheduleChangeRequest
                          }
                        >
                          <input
                            type="hidden"
                            name="request_id"
                            value={
                              request.id
                            }
                          />

                          <button
                            type="submit"
                            className="user-btn"
                          >
                            Cancel Request
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                )
              }
            )}
          </div>
        ) : (
          <Empty text="No schedule change requests yet." />
        )}
      </section>

      <style>{`
        .alteration-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .alteration-nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .alteration-faculty {
          margin-bottom: 16px;
        }

        .alteration-faculty-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
        }

        .alteration-faculty-head h3 {
          margin: 5px 0 4px;
        }

        .alteration-faculty-head p {
          margin: 0;
        }

        .alteration-summary {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(110px, 1fr)
            );
          gap: 9px;
          margin-bottom: 16px;
        }

        .alteration-stat {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 12px;
        }

        .alteration-stat span {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .alteration-stat strong {
          font-size: 18px;
        }

        .alteration-request-panel {
          margin-bottom: 16px;
        }

        .alteration-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .alteration-head h3 {
          margin: 5px 0 4px;
        }

        .alteration-head p {
          margin: 0;
        }

        .alteration-form-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 12px;
        }

        .alteration-form-grid label,
        .alteration-reason {
          display: grid;
          gap: 6px;
        }

        .alteration-form-grid label > span,
        .alteration-reason > span {
          font-size: 12px;
          font-weight: 700;
        }

        .alteration-form-grid select,
        .alteration-form-grid input,
        .alteration-reason textarea {
          width: 100%;
          min-height: 38px;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: var(--panel);
          color: inherit;
          padding: 8px 10px;
          font: inherit;
        }

        .alteration-reason {
          margin-top: 12px;
        }

        .alteration-reason textarea {
          resize: vertical;
        }

        .alteration-submit {
          display: flex;
          justify-content: flex-end;
          margin-top: 14px;
        }

        .alteration-note {
          display: flex;
          flex-direction: column;
          gap: 3px;
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 10px 12px;
          margin-top: 14px;
          font-size: 12px;
        }

        .alteration-note span {
          color: var(--muted);
        }

        .alteration-history {
          display: grid;
          gap: 10px;
        }

        .alteration-history-item {
          border: 1px solid var(--line);
          border-radius: 11px;
          padding: 13px;
        }

        .alteration-history-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .alteration-block {
          margin-top: 3px;
          font-size: 12px;
        }

        .alteration-compare {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 9px;
          margin-top: 12px;
        }

        .alteration-compare > div {
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 10px;
        }

        .alteration-compare span,
        .alteration-reason-box span,
        .alteration-review-box span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .alteration-compare p {
          margin: 4px 0 0;
          font-size: 12px;
        }

        .alteration-reason-box,
        .alteration-review-box {
          margin-top: 10px;
          border-top: 1px solid var(--line);
          padding-top: 10px;
        }

        .alteration-reason-box p,
        .alteration-review-box p {
          margin: 0;
          font-size: 13px;
        }

        .alteration-history-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        @media (max-width: 760px) {
          .alteration-summary,
          .alteration-form-grid,
          .alteration-compare {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .alteration-nav {
            align-items: stretch;
          }

          .alteration-nav-actions {
            width: 100%;
          }

          .alteration-nav-actions .user-btn {
            flex: 1;
            justify-content: center;
          }

          .alteration-submit .user-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  )
}
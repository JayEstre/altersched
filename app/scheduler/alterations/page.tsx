import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

import {
  PageHead,
  Empty,
  Badge,
} from '@/components/ui'

import {
  approveScheduleChangeRequest,
  rejectScheduleChangeRequest,
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

function formatDate(
  value: string | null | undefined
) {
  if (!value) return '—'

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(new Date(value))
}

function statusText(
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

export default async function SchedulerAlterationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params =
    await searchParams

  const { profile } =
    await requireRole([
      'department_scheduler',
    ])

  const supabase =
    await createClient()

  /* =======================================================
     MANAGED DEPARTMENTS
     ======================================================= */

  const {
    data: assignments,
    error: assignmentError,
  } = await supabase
    .from('scheduler_departments')
    .select(`
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
    .eq(
      'active',
      true
    )

  const departmentIds =
    (assignments ?? [])
      .map(
        (item: any) =>
          item.department_id
      )
      .filter(Boolean)

  const managedDepartments =
    (assignments ?? [])
      .map(
        (item: any) =>
          rel(item.departments)
      )
      .filter(Boolean)

  /* =======================================================
     CHANGE REQUESTS

     RLS remains the database security boundary.

     We additionally filter through the managed department
     chain for clarity and defense in depth.
     ======================================================= */

  let requestData: any[] = []
  let requestError:
    | string
    | null = null

  if (departmentIds.length) {
    const {
      data,
      error,
    } = await supabase
      .from(
        'schedule_change_requests'
      )
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
        status,
        review_notes,
        reviewed_at,
        created_at,

        schedule_entries!inner(
          id,
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
            schedule_id,

            schedules!inner(
              id,
              department_id,
              current_version_id,
              status
            )
          )
        )
      `)
      .in(
        'schedule_entries.schedule_versions.schedules.department_id',
        departmentIds
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

    if (error) {
      requestError =
        error.message
    } else {
      requestData =
        data ?? []
    }
  }

  /* =======================================================
     RELATED DISPLAY DATA

     Resolve proposed rooms and requester names separately
     instead of relying on ambiguous relationship aliases.
     ======================================================= */

  const proposedRoomIds =
    Array.from(
      new Set(
        requestData
          .map(
            (request: any) =>
              request
                .proposed_room_id
          )
          .filter(Boolean)
      )
    )

  const requesterIds =
    Array.from(
      new Set(
        requestData
          .map(
            (request: any) =>
              request.requested_by
          )
          .filter(Boolean)
      )
    )

  let roomMap =
    new Map<string, any>()

  if (
    proposedRoomIds.length
  ) {
    const {
      data: proposedRooms,
      error: roomError,
    } = await supabase
      .from('rooms')
      .select(`
        id,
        code,
        name
      `)
      .in(
        'id',
        proposedRoomIds
      )

    if (roomError) {
      console.error(
        'Failed to load proposed rooms:',
        roomError
      )
    }

    roomMap =
      new Map(
        (proposedRooms ?? [])
          .map(
            (room: any) => [
              room.id,
              room,
            ]
          )
      )
  }

  let requesterMap =
    new Map<string, any>()

  if (requesterIds.length) {
    const {
      data: requesters,
      error: requesterError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name
      `)
      .in(
        'id',
        requesterIds
      )

    if (requesterError) {
      console.error(
        'Failed to load requesters:',
        requesterError
      )
    }

    requesterMap =
      new Map(
        (requesters ?? [])
          .map(
            (requester: any) => [
              requester.id,
              requester,
            ]
          )
      )
  }

  /* =======================================================
     GROUP REQUESTS
     ======================================================= */

  const requests =
    requestData ?? []

  const pendingRequests =
    requests.filter(
      (request: any) =>
        request.status ===
        'pending'
    )

  const approvedRequests =
    requests.filter(
      (request: any) =>
        request.status ===
        'approved'
    )

  const rejectedRequests =
    requests.filter(
      (request: any) =>
        request.status ===
        'rejected'
    )

  const cancelledRequests =
    requests.filter(
      (request: any) =>
        request.status ===
        'cancelled'
    )

  const reviewedRequests =
    requests.filter(
      (request: any) =>
        request.status !==
        'pending'
    )

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <>
      <PageHead
        eyebrow="ALTERATION WORKFLOW"
        title="Schedule Change Requests"
        description="Review faculty schedule alteration requests for your assigned department."
      />

      {/* ===================================================
          NAVIGATION
          =================================================== */}

      <div className="alter-nav">
        <Link
          href="/scheduler/dashboard"
          className="user-btn"
        >
          ← Dashboard
        </Link>

        <div className="alter-nav-actions">
          <Link
            href="/scheduler/schedules"
            className="user-btn"
          >
            Schedules
          </Link>

          <Link
            href="/scheduler/schedule-builder"
            className="user-btn"
          >
            Schedule Builder
          </Link>

          {pendingRequests.length >
            0 && (
            <Badge tone="warning">
              {
                pendingRequests.length
              }{' '}
              Pending
            </Badge>
          )}
        </div>
      </div>

      {/* ===================================================
          DEPARTMENT SCOPE
          =================================================== */}

      <section className="panel alter-scope">
        <div className="alter-scope-head">
          <div>
            <span className="alter-kicker">
              MANAGEMENT SCOPE
            </span>

            <h3>
              Assigned Department
            </h3>

            <p className="alter-muted">
              Only alteration requests within your active department assignment can be reviewed.
            </p>
          </div>

          <Badge>
            Department Scheduler
          </Badge>
        </div>

        {managedDepartments.length ? (
          <div className="alter-departments">
            {managedDepartments.map(
              (
                department: any,
                index
              ) => (
                <span
                  key={
                    department.code ??
                    index
                  }
                  className="alter-department"
                >
                  <strong>
                    {department.code ||
                      'Department'}
                  </strong>

                  {department.name &&
                    department.name !==
                      department.code && (
                      <small>
                        {
                          department.name
                        }
                      </small>
                    )}
                </span>
              )
            )}
          </div>
        ) : (
          <Empty text="You are not assigned to an active department." />
        )}
      </section>

      {/* ===================================================
          FEEDBACK
          =================================================== */}

      {params.success && (
        <div className="alter-alert alter-alert-success">
          <strong>
            Request updated.
          </strong>

          <span>
            {params.success}
          </span>
        </div>
      )}

      {params.error && (
        <div className="alter-alert alter-alert-danger">
          <strong>
            Unable to continue.
          </strong>

          <span>
            {params.error}
          </span>
        </div>
      )}

      {assignmentError && (
        <div className="alter-alert alter-alert-danger">
          <strong>
            Department assignment unavailable.
          </strong>

          <span>
            {
              assignmentError.message
            }
          </span>
        </div>
      )}

      {requestError && (
        <div className="alter-alert alter-alert-danger">
          <strong>
            Requests could not be loaded.
          </strong>

          <span>
            {requestError}
          </span>
        </div>
      )}

      {/* ===================================================
          SUMMARY
          =================================================== */}

      <div className="alter-stats">
        <div className="alter-stat">
          <span>
            Pending
          </span>

          <strong>
            {
              pendingRequests.length
            }
          </strong>
        </div>

        <div className="alter-stat">
          <span>
            Approved
          </span>

          <strong>
            {
              approvedRequests.length
            }
          </strong>
        </div>

        <div className="alter-stat">
          <span>
            Rejected
          </span>

          <strong>
            {
              rejectedRequests.length
            }
          </strong>
        </div>

        <div className="alter-stat">
          <span>
            Cancelled
          </span>

          <strong>
            {
              cancelledRequests.length
            }
          </strong>
        </div>
      </div>

      {/* ===================================================
          WORKFLOW NOTICE
          =================================================== */}

      <section className="panel alter-workflow">
        <div>
          <strong>
            Alteration workflow
          </strong>

          <p>
            Approving a faculty request does not directly replace the official published schedule.
            A revised draft version is created first for validation and Admin review.
          </p>
        </div>

        <div className="alter-flow">
          <span>
            Faculty Request
          </span>

          <b>→</b>

          <span>
            Scheduler Review
          </span>

          <b>→</b>

          <span>
            Revised Draft
          </span>

          <b>→</b>

          <span>
            Admin Review
          </span>

          <b>→</b>

          <span>
            Publish
          </span>
        </div>
      </section>

      {/* ===================================================
          PENDING REQUESTS
          =================================================== */}

      <section className="panel alter-section">
        <div className="alter-section-head">
          <div>
            <span className="alter-kicker">
              NEEDS REVIEW
            </span>

            <h3>
              Pending Requests
            </h3>

            <p className="alter-muted">
              Compare the official class schedule with the faculty member&apos;s requested change.
            </p>
          </div>

          <Badge
            tone={
              pendingRequests.length
                ? 'warning'
                : undefined
            }
          >
            {
              pendingRequests.length
            }{' '}
            Pending
          </Badge>
        </div>

        {!departmentIds.length ? (
          <Empty text="You are not assigned to an active department." />
        ) : pendingRequests.length ? (
          <div className="alter-request-list">
            {pendingRequests.map(
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

                const version =
                  rel(
                    entry
                      ?.schedule_versions
                  )

                const schedule =
                  rel(
                    version
                      ?.schedules
                  )

                const proposedRoom =
                  request
                    .proposed_room_id
                    ? roomMap.get(
                        request
                          .proposed_room_id
                      )
                    : null

                const requester =
                  requesterMap.get(
                    request
                      .requested_by
                  )

                const isCurrentOfficial =
                  version?.status ===
                    'published' &&
                  schedule?.status ===
                    'published' &&
                  schedule
                    ?.current_version_id ===
                    version?.id

                return (
                  <article
                    key={
                      request.id
                    }
                    className="alter-request"
                  >
                    {/* HEADER */}

                    <div className="alter-request-head">
                      <div>
                        <div className="alter-request-title">
                          <strong>
                            {subject
                              ?.code ||
                              'Class'}

                            {subject
                              ?.name
                              ? ` — ${subject.name}`
                              : ''}
                          </strong>

                          <Badge tone="warning">
                            Pending
                          </Badge>
                        </div>

                        <p className="alter-muted">
                          Block{' '}
                          {section
                            ?.code ||
                            '—'}
                        </p>
                      </div>

                      <div className="alter-request-meta">
                        <strong>
                          {requester
                            ?.full_name ||
                            'Faculty'}
                        </strong>

                        <span>
                          Submitted{' '}
                          {formatDate(
                            request
                              .created_at
                          )}
                        </span>
                      </div>
                    </div>

                    {!isCurrentOfficial && (
                      <div className="alter-alert alter-alert-warning alter-inline-alert">
                        <strong>
                          Outdated request
                        </strong>

                        <span>
                          This request no longer points to the current official published schedule. Approval will be blocked by the server.
                        </span>
                      </div>
                    )}

                    {/* CURRENT VS REQUESTED */}

                    <div className="alter-compare">
                      <div className="alter-compare-card">
                        <span className="alter-kicker">
                          CURRENT
                        </span>

                        <strong>
                          Official Schedule
                        </strong>

                        <dl>
                          <div>
                            <dt>
                              Day
                            </dt>

                            <dd>
                              {DAYS[
                                entry
                                  ?.day_of_week
                              ] ||
                                '—'}
                            </dd>
                          </div>

                          <div>
                            <dt>
                              Time
                            </dt>

                            <dd>
                              {formatTime(
                                entry
                                  ?.start_time
                              )}
                              {' – '}
                              {formatTime(
                                entry
                                  ?.end_time
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt>
                              Room
                            </dt>

                            <dd>
                              {currentRoom
                                ?.code ||
                                '—'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="alter-compare-card">
                        <span className="alter-kicker">
                          REQUESTED
                        </span>

                        <strong>
                          Proposed Change
                        </strong>

                        <dl>
                          <div>
                            <dt>
                              Day
                            </dt>

                            <dd>
                              {request
                                .proposed_day
                                ? DAYS[
                                    request
                                      .proposed_day
                                  ]
                                : 'No change'}
                            </dd>
                          </div>

                          <div>
                            <dt>
                              Time
                            </dt>

                            <dd>
                              {request
                                .proposed_start_time &&
                              request
                                .proposed_end_time
                                ? `${formatTime(
                                    request
                                      .proposed_start_time
                                  )} – ${formatTime(
                                    request
                                      .proposed_end_time
                                  )}`
                                : 'No change'}
                            </dd>
                          </div>

                          <div>
                            <dt>
                              Room
                            </dt>

                            <dd>
                              {proposedRoom
                                ?.code ||
                                'No change'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* REASON */}

                    <div className="alter-reason">
                      <span className="alter-kicker">
                        FACULTY REASON
                      </span>

                      <p>
                        {
                          request.reason
                        }
                      </p>
                    </div>

                    {/* REVIEW ACTIONS */}

                    <div className="alter-review-grid">
                      <form
                        action={
                          approveScheduleChangeRequest
                        }
                        className="alter-review-form"
                      >
                        <div>
                          <strong>
                            Approve Request
                          </strong>

                          <p className="alter-muted">
                            Creates a revised draft version. It will still require validation and Admin publication.
                          </p>
                        </div>

                        <input
                          type="hidden"
                          name="request_id"
                          value={
                            request.id
                          }
                        />

                        <textarea
                          name="review_notes"
                          rows={3}
                          maxLength={1000}
                          placeholder="Approval notes (optional)"
                        />

                        <button
                          type="submit"
                          className="user-btn user-btn-primary"
                          disabled={
                            !isCurrentOfficial
                          }
                        >
                          Approve & Create Draft
                        </button>
                      </form>

                      <form
                        action={
                          rejectScheduleChangeRequest
                        }
                        className="alter-review-form"
                      >
                        <div>
                          <strong>
                            Reject Request
                          </strong>

                          <p className="alter-muted">
                            The faculty member will see the rejection and your review notes.
                          </p>
                        </div>

                        <input
                          type="hidden"
                          name="request_id"
                          value={
                            request.id
                          }
                        />

                        <textarea
                          name="review_notes"
                          rows={3}
                          maxLength={1000}
                          required
                          placeholder="Reason for rejection"
                        />

                        <button
                          type="submit"
                          className="user-btn"
                        >
                          Reject Request
                        </button>
                      </form>
                    </div>
                  </article>
                )
              }
            )}
          </div>
        ) : (
          <Empty text="No pending schedule change requests." />
        )}
      </section>

      {/* ===================================================
          REVIEW HISTORY
          =================================================== */}

      <section className="panel">
        <div className="alter-section-head">
          <div>
            <span className="alter-kicker">
              HISTORY
            </span>

            <h3>
              Review History
            </h3>

            <p className="alter-muted">
              Previously approved, rejected, or cancelled alteration requests.
            </p>
          </div>

          <Badge>
            {
              reviewedRequests.length
            }{' '}
            Reviewed
          </Badge>
        </div>

        {reviewedRequests.length ? (
          <div className="alter-history">
            {reviewedRequests.map(
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

                const requester =
                  requesterMap.get(
                    request
                      .requested_by
                  )

                return (
                  <article
                    key={
                      request.id
                    }
                    className="alter-history-item"
                  >
                    <div className="alter-history-head">
                      <div>
                        <strong>
                          {subject
                            ?.code ||
                            'Class'}

                          {' · Block '}

                          {section
                            ?.code ||
                            '—'}
                        </strong>

                        <p className="alter-muted">
                          {requester
                            ?.full_name ||
                            'Faculty'}
                        </p>
                      </div>

                      <Badge
                        tone={
                          statusTone(
                            request.status
                          )
                        }
                      >
                        {statusText(
                          request.status
                        )}
                      </Badge>
                    </div>

                    <div className="alter-history-details">
                      <div>
                        <span>
                          ORIGINAL
                        </span>

                        <strong>
                          {DAYS[
                            entry
                              ?.day_of_week
                          ] ||
                            '—'}
                          {' · '}
                          {formatTime(
                            entry
                              ?.start_time
                          )}
                          {'–'}
                          {formatTime(
                            entry
                              ?.end_time
                          )}
                          {' · '}
                          {currentRoom
                            ?.code ||
                            '—'}
                        </strong>
                      </div>

                      <div>
                        <span>
                          REQUESTED
                        </span>

                        <strong>
                          {request
                            .proposed_day
                            ? DAYS[
                                request
                                  .proposed_day
                              ]
                            : 'Same day'}

                          {' · '}

                          {request
                            .proposed_start_time &&
                          request
                            .proposed_end_time
                            ? `${formatTime(
                                request
                                  .proposed_start_time
                              )}–${formatTime(
                                request
                                  .proposed_end_time
                              )}`
                            : 'Same time'}

                          {' · '}

                          {proposedRoom
                            ?.code ||
                            'Same room'}
                        </strong>
                      </div>
                    </div>

                    <div className="alter-history-reason">
                      <span>
                        FACULTY REASON
                      </span>

                      <p>
                        {
                          request.reason
                        }
                      </p>
                    </div>

                    {request.review_notes && (
                      <div className="alter-history-notes">
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

                    <div className="alter-history-footer">
                      <span>
                        Submitted{' '}
                        {formatDate(
                          request
                            .created_at
                        )}
                      </span>

                      <span>
                        {request
                          .reviewed_at
                          ? `Reviewed ${formatDate(
                              request
                                .reviewed_at
                            )}`
                          : statusText(
                              request
                                .status
                            )}
                      </span>
                    </div>
                  </article>
                )
              }
            )}
          </div>
        ) : (
          <Empty text="No reviewed alteration requests yet." />
        )}
      </section>

      {/* ===================================================
          STYLES
          =================================================== */}

      <style>{`
        .alter-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .alter-nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .alter-scope {
          margin-bottom: 14px;
        }

        .alter-scope-head,
        .alter-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .alter-scope-head h3,
        .alter-section-head h3 {
          margin: 4px 0;
        }

        .alter-kicker {
          display: block;
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .09em;
        }

        .alter-muted {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
        }

        .alter-departments {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .alter-department {
          display: flex;
          flex-direction: column;
          gap: 2px;
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 8px 10px;
        }

        .alter-department small {
          color: var(--muted);
        }

        .alter-alert {
          display: flex;
          flex-direction: column;
          gap: 3px;
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 12px;
        }

        .alter-alert-success {
          border-color: rgba(34,197,94,.35);
        }

        .alter-alert-danger {
          border-color: rgba(239,68,68,.4);
        }

        .alter-alert-warning {
          border-color: rgba(245,158,11,.4);
        }

        .alter-inline-alert {
          margin: 0;
        }

        .alter-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(100px,1fr));
          gap: 8px;
          margin-bottom: 14px;
        }

        .alter-stat {
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 9px 11px;
        }

        .alter-stat span {
          display: block;
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .alter-stat strong {
          display: block;
          margin-top: 3px;
          font-size: 18px;
        }

        .alter-workflow {
          display: grid;
          gap: 10px;
          margin-bottom: 14px;
        }

        .alter-workflow p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 12px;
        }

        .alter-flow {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .alter-flow span {
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 10px;
        }

        .alter-flow b {
          color: var(--muted);
        }

        .alter-section {
          margin-bottom: 14px;
        }

        .alter-section-head {
          margin-bottom: 14px;
        }

        .alter-request-list,
        .alter-history {
          display: grid;
          gap: 10px;
        }

        .alter-request,
        .alter-history-item {
          border: 1px solid var(--line);
          border-radius: 11px;
          padding: 12px;
        }

        .alter-request-head,
        .alter-history-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .alter-request-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .alter-request-head p,
        .alter-history-head p {
          margin-top: 3px;
        }

        .alter-request-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          font-size: 11px;
        }

        .alter-request-meta span {
          color: var(--muted);
        }

        .alter-compare {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 9px;
          margin-top: 11px;
        }

        .alter-compare-card {
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 10px;
        }

        .alter-compare-card > strong {
          display: block;
          margin-top: 3px;
        }

        .alter-compare-card dl {
          display: grid;
          gap: 5px;
          margin: 9px 0 0;
        }

        .alter-compare-card dl > div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
        }

        .alter-compare-card dt {
          color: var(--muted);
        }

        .alter-compare-card dd {
          margin: 0;
          font-weight: 600;
          text-align: right;
        }

        .alter-reason {
          margin-top: 10px;
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 10px;
        }

        .alter-reason p {
          margin: 5px 0 0;
          font-size: 13px;
        }

        .alter-review-grid {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 9px;
          margin-top: 10px;
        }

        .alter-review-form {
          display: grid;
          gap: 8px;
          border: 1px solid var(--line);
          border-radius: 9px;
          padding: 10px;
        }

        .alter-review-form textarea {
          width: 100%;
          resize: vertical;
          min-height: 72px;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 8px 9px;
          background: var(--panel);
          color: inherit;
          font: inherit;
        }

        .alter-history-details {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 8px;
          margin-top: 10px;
        }

        .alter-history-details > div {
          display: grid;
          gap: 3px;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 9px;
        }

        .alter-history-details span,
        .alter-history-reason span,
        .alter-history-notes span {
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .alter-history-details strong {
          font-size: 11px;
        }

        .alter-history-reason,
        .alter-history-notes {
          margin-top: 9px;
          border-top: 1px solid var(--line);
          padding-top: 9px;
        }

        .alter-history-reason p,
        .alter-history-notes p {
          margin: 4px 0 0;
          font-size: 12px;
        }

        .alter-history-footer {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 10px;
          color: var(--muted);
          font-size: 10px;
        }

        @media (max-width: 760px) {
          .alter-stats {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .alter-compare,
          .alter-review-grid,
          .alter-history-details {
            grid-template-columns: 1fr;
          }

          .alter-request-meta {
            align-items: flex-start;
          }
        }

        @media (max-width: 560px) {
          .alter-stats {
            grid-template-columns: 1fr 1fr;
          }

          .alter-nav-actions {
            width: 100%;
          }

          .alter-nav-actions .user-btn {
            flex: 1;
            justify-content: center;
          }

          .alter-review-form .user-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </>
  )
}
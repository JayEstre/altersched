import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge } from '@/components/ui'
import { approveScheduleChangeRequest, rejectScheduleChangeRequest } from './actions'
import { one } from '@/lib/relations'
import { DAY_NAMES, formatDateTime, formatTime, statusTone } from '@/lib/format'
import styles from './page.module.css'

function statusText(status: string) {
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

type SearchParams = Promise<{
  success?: string
  error?: string
}>

export default async function SchedulerAlterationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()

  /* =======================================================
     MANAGED DEPARTMENTS
     ======================================================= */

  const { data: assignments, error: assignmentError } = await supabase
    .from('scheduler_departments')
    .select(
      `
      department_id,
      departments(
        code,
        name
      )
    `
    )
    .eq('profile_id', profile.id)
    .eq('active', true)

  const departmentIds = (assignments ?? []).map((item) => item.department_id).filter(Boolean)

  const managedDepartments = (assignments ?? [])
    .map((item) => one(item.departments))
    .filter((department) => department !== null && department !== undefined)

  /* =======================================================
     CHANGE REQUESTS
     RLS remains the database security boundary.
     We additionally filter through the managed department
     chain for clarity and defense in depth.
     ======================================================= */

  const requestResult = departmentIds.length
    ? await supabase
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
        .in('schedule_entries.schedule_versions.schedules.department_id', departmentIds)
        .order('created_at', {
          ascending: false,
        })
    : null
  const requestError = requestResult?.error?.message ?? null
  const requestData = requestResult?.error ? [] : (requestResult?.data ?? [])

  /* =======================================================
     RELATED DISPLAY DATA
     Resolve proposed rooms and requester names separately
     instead of relying on ambiguous relationship aliases.
     ======================================================= */

  const proposedRoomIds = Array.from(
    new Set(
      requestData
        .map((request) => request.proposed_room_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const requesterIds = Array.from(
    new Set(
      requestData.map((request) => request.requested_by).filter((id): id is string => Boolean(id))
    )
  )

  let roomMap = new Map<string, { id: string; code: string; name: string }>()

  if (proposedRoomIds.length) {
    const { data: proposedRooms, error: roomError } = await supabase
      .from('rooms')
      .select(
        `
        id,
        code,
        name
      `
      )
      .in('id', proposedRoomIds)

    if (roomError) {
      console.error('Failed to load proposed rooms:', roomError)
    }

    roomMap = new Map((proposedRooms ?? []).map((room) => [room.id, room]))
  }

  let requesterMap = new Map<string, { id: string; full_name: string | null }>()

  if (requesterIds.length) {
    const { data: requesters, error: requesterError } = await supabase
      .from('profiles')
      .select(
        `
        id,
        full_name
      `
      )
      .in('id', requesterIds)

    if (requesterError) {
      console.error('Failed to load requesters:', requesterError)
    }

    requesterMap = new Map((requesters ?? []).map((requester) => [requester.id, requester]))
  }

  /* =======================================================
     GROUP REQUESTS
     ======================================================= */

  const requests = requestData ?? []
  const pendingRequests = requests.filter((request) => request.status === 'pending')
  const approvedRequests = requests.filter((request) => request.status === 'approved')
  const rejectedRequests = requests.filter((request) => request.status === 'rejected')
  const cancelledRequests = requests.filter((request) => request.status === 'cancelled')
  const reviewedRequests = requests.filter((request) => request.status !== 'pending')

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <div className={styles.scope}>
      <PageHead
        eyebrow="ALTERATION WORKFLOW"
        title="Schedule Change Requests"
        description="Review faculty schedule alteration requests for your assigned department."
      />
      {/* ===================================================
          NAVIGATION
          =================================================== */}
      <div className="alter-nav">
        <Link href="/scheduler/dashboard" className="user-btn">
          ← Dashboard
        </Link>
        <div className="alter-nav-actions">
          <Link href="/scheduler/schedules" className="user-btn">
            Schedules
          </Link>
          <Link href="/scheduler/schedule-builder" className="user-btn">
            Schedule Builder
          </Link>
          {pendingRequests.length > 0 && (
            <Badge tone="warning">{pendingRequests.length} Pending</Badge>
          )}
        </div>
      </div>
      {/* ===================================================
          DEPARTMENT SCOPE
          =================================================== */}
      <section className="panel alter-scope">
        <div className="alter-scope-head">
          <div>
            <span className="alter-kicker">MANAGEMENT SCOPE</span>
            <h3>Assigned Department</h3>
            <p className="alter-muted">
              Only alteration requests within your active department assignment can be reviewed.
            </p>
          </div>
          <Badge>Department Scheduler</Badge>
        </div>
        {managedDepartments.length ? (
          <div className="alter-departments">
            {managedDepartments.map((department, index) => (
              <span key={department.code ?? index} className="alter-department">
                <strong>{department.code || 'Department'}</strong>
                {department.name && department.name !== department.code && (
                  <small>{department.name}</small>
                )}
              </span>
            ))}
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
          <strong>Request updated.</strong>
          <span>{params.success}</span>
        </div>
      )}
      {params.error && (
        <div className="alter-alert alter-alert-danger">
          <strong>Unable to continue.</strong>
          <span>{params.error}</span>
        </div>
      )}
      {assignmentError && (
        <div className="alter-alert alter-alert-danger">
          <strong>Department assignment unavailable.</strong>
          <span>{assignmentError.message}</span>
        </div>
      )}
      {requestError && (
        <div className="alter-alert alter-alert-danger">
          <strong>Requests could not be loaded.</strong>
          <span>{requestError}</span>
        </div>
      )}
      {/* ===================================================
          SUMMARY
          =================================================== */}
      <div className="alter-stats">
        <div className="alter-stat">
          <span>Pending</span>
          <strong>{pendingRequests.length}</strong>
        </div>
        <div className="alter-stat">
          <span>Approved</span>
          <strong>{approvedRequests.length}</strong>
        </div>
        <div className="alter-stat">
          <span>Rejected</span>
          <strong>{rejectedRequests.length}</strong>
        </div>
        <div className="alter-stat">
          <span>Cancelled</span>
          <strong>{cancelledRequests.length}</strong>
        </div>
      </div>
      {/* ===================================================
          WORKFLOW NOTICE
          =================================================== */}
      <section className="panel alter-workflow">
        <div>
          <strong>Alteration workflow</strong>
          <p>
            Approving a faculty request does not directly replace the official published schedule. A
            revised draft version is created first for validation and Admin review.
          </p>
        </div>
        <div className="alter-flow">
          <span>Faculty Request</span>
          <b>→</b>
          <span>Scheduler Review</span>
          <b>→</b>
          <span>Revised Draft</span>
          <b>→</b>
          <span>Admin Review</span>
          <b>→</b>
          <span>Publish</span>
        </div>
      </section>
      {/* ===================================================
          PENDING REQUESTS
          =================================================== */}
      <section className="panel alter-section">
        <div className="alter-section-head">
          <div>
            <span className="alter-kicker">NEEDS REVIEW</span>
            <h3>Pending Requests</h3>
            <p className="alter-muted">
              Compare the official class schedule with the faculty member&apos;s requested change.
            </p>
          </div>
          <Badge tone={pendingRequests.length ? 'warning' : undefined}>
            {pendingRequests.length} Pending
          </Badge>
        </div>
        {!departmentIds.length ? (
          <Empty text="You are not assigned to an active department." />
        ) : pendingRequests.length ? (
          <div className="alter-request-list">
            {pendingRequests.map((request) => {
              const entry = one(request.schedule_entries)
              const offering = one(entry?.class_offerings)
              const subject = one(offering?.subjects)
              const section = one(offering?.sections)
              const currentRoom = one(entry?.rooms)
              const version = one(entry?.schedule_versions)
              const schedule = one(version?.schedules)

              const proposedRoom = request.proposed_room_id
                ? roomMap.get(request.proposed_room_id)
                : null

              const requester = requesterMap.get(request.requested_by)

              const isCurrentOfficial =
                version?.status === 'published' &&
                schedule?.status === 'published' &&
                schedule?.current_version_id === version?.id

              return (
                <article key={request.id} className="alter-request">
                  {/* HEADER */}
                  <div className="alter-request-head">
                    <div>
                      <div className="alter-request-title">
                        <strong>
                          {subject?.code || 'Class'}
                          {subject?.name ? ` — ${subject.name}` : ''}
                        </strong>
                        <Badge tone="warning">Pending</Badge>
                      </div>
                      <p className="alter-muted">Block {section?.code || '—'}</p>
                    </div>
                    <div className="alter-request-meta">
                      <strong>{requester?.full_name || 'Faculty'}</strong>
                      <span>Submitted {formatDateTime(request.created_at)}</span>
                    </div>
                  </div>
                  {!isCurrentOfficial && (
                    <div className="alter-alert alter-alert-warning alter-inline-alert">
                      <strong>Outdated request</strong>
                      <span>
                        This request no longer points to the current official published schedule.
                        Approval will be blocked by the server.
                      </span>
                    </div>
                  )}
                  {/* CURRENT VS REQUESTED */}
                  <div className="alter-compare">
                    <div className="alter-compare-card">
                      <span className="alter-kicker">CURRENT</span>
                      <strong>Official Schedule</strong>
                      <dl>
                        <div>
                          <dt>Day</dt>
                          <dd>{DAY_NAMES[entry?.day_of_week ?? 0] || '—'}</dd>
                        </div>
                        <div>
                          <dt>Time</dt>
                          <dd>
                            {formatTime(entry?.start_time)}
                            {' – '}
                            {formatTime(entry?.end_time)}
                          </dd>
                        </div>
                        <div>
                          <dt>Room</dt>
                          <dd>{currentRoom?.code || '—'}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="alter-compare-card">
                      <span className="alter-kicker">REQUESTED</span>
                      <strong>Proposed Change</strong>
                      <dl>
                        <div>
                          <dt>Day</dt>
                          <dd>
                            {request.proposed_day ? DAY_NAMES[request.proposed_day] : 'No change'}
                          </dd>
                        </div>
                        <div>
                          <dt>Time</dt>
                          <dd>
                            {request.proposed_start_time && request.proposed_end_time
                              ? `${formatTime(request.proposed_start_time)} – ${formatTime(
                                  request.proposed_end_time
                                )}`
                              : 'No change'}
                          </dd>
                        </div>
                        <div>
                          <dt>Room</dt>
                          <dd>{proposedRoom?.code || 'No change'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  {/* REASON */}
                  <div className="alter-reason">
                    <span className="alter-kicker">FACULTY REASON</span>
                    <p>{request.reason}</p>
                  </div>
                  {/* REVIEW ACTIONS */}
                  <div className="alter-review-grid">
                    <form action={approveScheduleChangeRequest} className="alter-review-form">
                      <div>
                        <strong>Approve Request</strong>
                        <p className="alter-muted">
                          Creates a revised draft version. It will still require validation and
                          Admin publication.
                        </p>
                      </div>
                      <input type="hidden" name="request_id" value={request.id} />
                      <textarea
                        name="review_notes"
                        rows={3}
                        maxLength={1000}
                        placeholder="Approval notes (optional)"
                      />
                      <button
                        type="submit"
                        className="user-btn user-btn-primary"
                        disabled={!isCurrentOfficial}
                      >
                        Approve & Create Draft
                      </button>
                    </form>
                    <form action={rejectScheduleChangeRequest} className="alter-review-form">
                      <div>
                        <strong>Reject Request</strong>
                        <p className="alter-muted">
                          The faculty member will see the rejection and your review notes.
                        </p>
                      </div>
                      <input type="hidden" name="request_id" value={request.id} />
                      <textarea
                        name="review_notes"
                        rows={3}
                        maxLength={1000}
                        required
                        placeholder="Reason for rejection"
                      />
                      <button type="submit" className="user-btn">
                        Reject Request
                      </button>
                    </form>
                  </div>
                </article>
              )
            })}
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
            <span className="alter-kicker">HISTORY</span>
            <h3>Review History</h3>
            <p className="alter-muted">
              Previously approved, rejected, or cancelled alteration requests.
            </p>
          </div>
          <Badge>{reviewedRequests.length} Reviewed</Badge>
        </div>
        {reviewedRequests.length ? (
          <div className="alter-history">
            {reviewedRequests.map((request) => {
              const entry = one(request.schedule_entries)
              const offering = one(entry?.class_offerings)
              const subject = one(offering?.subjects)
              const section = one(offering?.sections)
              const currentRoom = one(entry?.rooms)

              const proposedRoom = request.proposed_room_id
                ? roomMap.get(request.proposed_room_id)
                : null

              const requester = requesterMap.get(request.requested_by)

              return (
                <article key={request.id} className="alter-history-item">
                  <div className="alter-history-head">
                    <div>
                      <strong>
                        {subject?.code || 'Class'}
                        {' · Block '}
                        {section?.code || '—'}
                      </strong>
                      <p className="alter-muted">{requester?.full_name || 'Faculty'}</p>
                    </div>
                    <Badge tone={statusTone(request.status)}>{statusText(request.status)}</Badge>
                  </div>
                  <div className="alter-history-details">
                    <div>
                      <span>ORIGINAL</span>
                      <strong>
                        {DAY_NAMES[entry?.day_of_week ?? 0] || '—'}
                        {' · '}
                        {formatTime(entry?.start_time)}
                        {'–'}
                        {formatTime(entry?.end_time)}
                        {' · '}
                        {currentRoom?.code || '—'}
                      </strong>
                    </div>
                    <div>
                      <span>REQUESTED</span>
                      <strong>
                        {request.proposed_day ? DAY_NAMES[request.proposed_day] : 'Same day'}
                        {' · '}
                        {request.proposed_start_time && request.proposed_end_time
                          ? `${formatTime(request.proposed_start_time)}–${formatTime(
                              request.proposed_end_time
                            )}`
                          : 'Same time'}
                        {' · '}
                        {proposedRoom?.code || 'Same room'}
                      </strong>
                    </div>
                  </div>
                  <div className="alter-history-reason">
                    <span>FACULTY REASON</span>
                    <p>{request.reason}</p>
                  </div>
                  {request.review_notes && (
                    <div className="alter-history-notes">
                      <span>REVIEW NOTES</span>
                      <p>{request.review_notes}</p>
                    </div>
                  )}
                  <div className="alter-history-footer">
                    <span>Submitted {formatDateTime(request.created_at)}</span>
                    <span>
                      {request.reviewed_at
                        ? `Reviewed ${formatDateTime(request.reviewed_at)}`
                        : statusText(request.status)}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <Empty text="No reviewed alteration requests yet." />
        )}
      </section>
    </div>
  )
}

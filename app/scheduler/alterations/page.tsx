import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge, Notice, Stat } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { approveScheduleChangeRequest, rejectScheduleChangeRequest } from './actions'
import { one } from '@/lib/relations'
import { DAY_NAMES, DAY_SHORT_NAMES, formatDateTime, formatTime12, statusTone } from '@/lib/format'
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
    <>
      <PageHead
        title="Schedule Requests"
        description={`Requests from instructors to move one of their published classes${
          managedDepartments.length
            ? ` in ${managedDepartments.map((item) => item.code).join(', ')}`
            : ''
        }. Approving creates a revised draft that the Administrator publishes.`}
      />
      {params.success && <Notice tone="success">{params.success}</Notice>}
      {params.error && <Notice tone="danger">{params.error}</Notice>}
      {assignmentError && (
        <Notice tone="danger" title="Your department assignment could not be loaded.">
          {assignmentError.message}
        </Notice>
      )}
      {requestError && (
        <Notice tone="danger" title="Requests could not be loaded.">
          {requestError}
        </Notice>
      )}
      {!managedDepartments.length && !assignmentError && (
        <Notice tone="warning" title="You are not assigned to a department.">
          Ask the Administrator to assign you as Department Scheduler.
        </Notice>
      )}

      <div className="stats-grid">
        <Stat label="Waiting for you" value={pendingRequests.length} />
        <Stat label="Approved" value={approvedRequests.length} />
        <Stat label="Rejected" value={rejectedRequests.length} />
        <Stat label="Cancelled by instructor" value={cancelledRequests.length} />
      </div>

      <section className="panel">
        <h3>Waiting for your decision</h3>
        <p className="muted">Compare the published class with the requested change.</p>
        {pendingRequests.length ? (
          <ul className={styles.list}>
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
                <li key={request.id} className={styles.request}>
                  <div className={styles.head}>
                    <strong>
                      {subject?.code || 'Class'}
                      {subject?.name ? ` · ${subject.name}` : ''}
                      <span> · Block {section?.code || '—'}</span>
                    </strong>
                    <span className={styles.meta}>
                      {requester?.full_name || 'Instructor'} · {formatDateTime(request.created_at)}
                    </span>
                  </div>

                  {!isCurrentOfficial && (
                    <Notice
                      tone="warning"
                      title="This schedule changed since the request was sent."
                    >
                      It is no longer the published version, so it cannot be approved. Reject it
                      with a short note so the instructor can send a new one.
                    </Notice>
                  )}

                  <div className={styles.compare}>
                    <div>
                      <span>Published</span>
                      <strong>
                        {DAY_NAMES[entry?.day_of_week ?? 0] || '—'},{' '}
                        {formatTime12(entry?.start_time)}–{formatTime12(entry?.end_time)}
                      </strong>
                      <small>Room {currentRoom?.code || '—'}</small>
                    </div>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                    <div className={styles.proposed}>
                      <span>Requested</span>
                      <strong>
                        {request.proposed_day ? DAY_NAMES[request.proposed_day] : 'Same day'},{' '}
                        {request.proposed_start_time && request.proposed_end_time
                          ? `${formatTime12(request.proposed_start_time)}–${formatTime12(request.proposed_end_time)}`
                          : 'same time'}
                      </strong>
                      <small>
                        {proposedRoom?.code ? `Room ${proposedRoom.code}` : 'Same room'}
                      </small>
                    </div>
                  </div>

                  <p className={styles.reason}>“{request.reason}”</p>

                  <div className={styles.decide}>
                    <form action={approveScheduleChangeRequest}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <label className="field">
                        <span className="field-label">Note for the instructor (optional)</span>
                        <textarea name="review_notes" rows={2} maxLength={1000} />
                      </label>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!isCurrentOfficial}
                      >
                        Approve
                      </button>
                      <small>Creates a revised draft for the Administrator to publish.</small>
                    </form>
                    <form action={rejectScheduleChangeRequest}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <label className="field">
                        <span className="field-label">Reason for rejecting</span>
                        <textarea name="review_notes" rows={2} maxLength={1000} required />
                      </label>
                      <button type="submit" className="btn btn-outline">
                        Reject request
                      </button>
                      <small>The instructor sees your reason.</small>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty title="No requests waiting" text="New requests from instructors appear here." />
        )}
      </section>

      <section className="panel">
        <h3>Decided requests</h3>
        {reviewedRequests.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Class</th>
                <th>Instructor</th>
                <th>Change</th>
                <th>Decision</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
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
                  <tr key={request.id}>
                    <td>
                      <strong>{subject?.code || 'Class'}</strong>
                      <small>Block {section?.code || '—'}</small>
                    </td>
                    <td>{requester?.full_name || 'Instructor'}</td>
                    <td>
                      {DAY_SHORT_NAMES[entry?.day_of_week ?? 0] || '—'}{' '}
                      {formatTime12(entry?.start_time)} · {currentRoom?.code || '—'}
                      <small>
                        →{' '}
                        {request.proposed_day ? DAY_SHORT_NAMES[request.proposed_day] : 'same day'}{' '}
                        {request.proposed_start_time
                          ? formatTime12(request.proposed_start_time)
                          : ''}
                        {' · '}
                        {proposedRoom?.code || 'same room'}
                      </small>
                    </td>
                    <td>
                      <Badge tone={statusTone(request.status)}>{statusText(request.status)}</Badge>
                      <small>
                        {request.reviewed_at ? formatDateTime(request.reviewed_at) : ''}
                      </small>
                    </td>
                    <td className={styles.noteCell}>{request.review_notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        ) : (
          <p className="muted">No decided requests yet.</p>
        )}
      </section>
    </>
  )
}

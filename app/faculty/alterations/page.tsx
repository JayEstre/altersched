import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge } from '@/components/ui'
import { submitScheduleChangeRequest, cancelScheduleChangeRequest } from './actions'
import { one } from '@/lib/relations'
import { DAY_NAMES, DAY_OPTIONS, formatTime, statusTone } from '@/lib/format'
import styles from './page.module.css'

function statusLabel(status: string) {
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

export default async function FacultyAlterationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const { profile } = await requireRole(['faculty'])
  const supabase = await createClient()

  /* =======================================================
     FACULTY PROFILE
     ======================================================= */

  const { data: faculty, error: facultyError } = await supabase
    .from('faculty_profiles')
    .select(
      `
      id,
      employee_id,
      department_id,
      departments(
        code,
        name
      )
    `
    )
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (facultyError) {
    console.error('Failed to load faculty profile:', facultyError)
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

  const department = one(faculty?.departments)

  /* =======================================================
     PUBLISHED SCHEDULE ENTRIES
     First retrieve published-version entries assigned to
     this faculty.
     We then keep only entries whose version is also the
     schedule's current_version_id.
     ======================================================= */

  const { data: candidateEntries, error: entriesError } = await supabase
    .from('schedule_entries')
    .select(
      `
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
        schedules!schedule_versions_schedule_id_fkey!inner(
          id,
          status,
          current_version_id
        )
      )
    `
    )
    .eq('faculty_id', faculty.id)
    .eq('schedule_versions.status', 'published')
    .eq('schedule_versions.schedules.status', 'published')
    .order('day_of_week')
    .order('start_time')

  if (entriesError) {
    console.error('Failed to load published faculty entries:', entriesError)
  }

  const entries = (candidateEntries ?? []).filter((entry) => {
    const version = one(entry.schedule_versions)
    const schedule = one(version?.schedules)

    return Boolean(
      version &&
      schedule &&
      version.status === 'published' &&
      schedule.status === 'published' &&
      schedule.current_version_id === version.id
    )
  })

  /* =======================================================
     ROOMS
     Load rooms separately.
     This is also used to resolve proposed_room_id in
     request history, avoiding a fragile relation alias.
     ======================================================= */

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select(
      `
      id,
      code,
      name,
      capacity,
      is_active
    `
    )
    .eq('is_active', true)
    .order('code')

  if (roomsError) {
    console.error('Failed to load rooms:', roomsError)
  }

  const roomMap = new Map((rooms ?? []).map((room) => [room.id, room]))

  /* =======================================================
     FACULTY CHANGE REQUESTS
     ======================================================= */

  const { data: requests, error: requestsError } = await supabase
    .from('schedule_change_requests')
    .select(
      `
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
    `
    )
    .eq('requested_by', profile.id)
    .order('created_at', {
      ascending: false,
    })

  if (requestsError) {
    console.error('Failed to load alteration requests:', requestsError)
  }

  const pendingCount = (requests ?? []).filter((request) => request.status === 'pending').length

  const approvedCount = (requests ?? []).filter((request) => request.status === 'approved').length

  const rejectedCount = (requests ?? []).filter((request) => request.status === 'rejected').length

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <div className={styles.scope}>
      <PageHead
        eyebrow="SCHEDULE CHANGES"
        title="Alteration Requests"
        description="Request a change to one of your classes in the official published teaching schedule."
      />
      {/* ===================================================
          NAVIGATION
          =================================================== */}
      <div className="alteration-nav">
        <Link href="/faculty/dashboard" className="user-btn">
          ← Dashboard
        </Link>
        <div className="alteration-nav-actions">
          <Link href="/faculty/schedule" className="user-btn">
            My Schedule
          </Link>
          <Link href="/faculty/availability" className="user-btn">
            Availability
          </Link>
          {pendingCount > 0 && <Badge tone="warning">{pendingCount} Pending</Badge>}
        </div>
      </div>
      {/* ===================================================
          FACULTY
          =================================================== */}
      <section className="panel alteration-faculty">
        <div className="alteration-faculty-head">
          <div>
            <span className="sched-kicker">FACULTY</span>
            <h3>{profile.full_name || 'Faculty'}</h3>
            <p className="muted">
              Employee ID: {faculty.employee_id || '—'}
              {' · '}
              {department?.code || 'No Department'}
            </p>
          </div>
          <Badge>Request Only</Badge>
        </div>
      </section>
      {/* ===================================================
          FEEDBACK
          =================================================== */}
      {params.success && (
        <div className="portal-alert portal-alert-success">
          <strong>Request updated.</strong>
          <span>{params.success}</span>
        </div>
      )}
      {params.error && (
        <div className="portal-alert portal-alert-danger">
          <strong>Unable to continue.</strong>
          <span>{params.error}</span>
        </div>
      )}
      {entriesError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Published schedule unavailable.</strong>
          <span>{entriesError.message}</span>
        </div>
      )}
      {requestsError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Request history unavailable.</strong>
          <span>{requestsError.message}</span>
        </div>
      )}
      {/* ===================================================
          SUMMARY
          =================================================== */}
      <div className="alteration-summary">
        <div className="alteration-stat">
          <span>Published Classes</span>
          <strong>{entries.length}</strong>
        </div>
        <div className="alteration-stat">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="alteration-stat">
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </div>
        <div className="alteration-stat">
          <span>Rejected</span>
          <strong>{rejectedCount}</strong>
        </div>
      </div>
      {/* ===================================================
          NEW REQUEST
          =================================================== */}
      <section className="panel alteration-request-panel">
        <div className="alteration-head">
          <div>
            <span className="sched-kicker">NEW REQUEST</span>
            <h3>Request Schedule Change</h3>
            <p className="muted">
              Select one of your current published classes and propose the change you need.
            </p>
          </div>
          <Badge>Normal Request</Badge>
        </div>
        {entries.length > 0 ? (
          <form action={submitScheduleChangeRequest}>
            <div className="alteration-form-grid">
              {/* CLASS */}
              <label>
                <span>Published Class</span>
                <select name="schedule_entry_id" required defaultValue="">
                  <option value="" disabled>
                    Select class
                  </option>
                  {entries.map((entry) => {
                    const offering = one(entry.class_offerings)
                    const subject = one(offering?.subjects)
                    const section = one(offering?.sections)
                    const room = one(entry.rooms)

                    return (
                      <option key={entry.id} value={entry.id}>
                        {subject?.code || 'Class'}
                        {' — '}
                        Block {section?.code || '—'}
                        {' — '}
                        {DAY_NAMES[entry.day_of_week]} {formatTime(entry.start_time)}
                        {'–'}
                        {formatTime(entry.end_time)}
                        {room?.code ? ` — ${room.code}` : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
              {/* DAY */}
              <label>
                <span>Proposed Day</span>
                <select name="proposed_day" defaultValue="">
                  <option value="">No change</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>
              {/* START */}
              <label>
                <span>Proposed Start</span>
                <input type="time" name="proposed_start_time" />
              </label>
              {/* END */}
              <label>
                <span>Proposed End</span>
                <input type="time" name="proposed_end_time" />
              </label>
              {/* ROOM */}
              <label>
                <span>Proposed Room</span>
                <select name="proposed_room_id" defaultValue="">
                  <option value="">No change</option>
                  {(rooms ?? []).map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.code}
                      {room.name ? ` — ${room.name}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="alteration-reason">
              <span>Reason for Request</span>
              <textarea
                name="reason"
                required
                rows={4}
                maxLength={1000}
                placeholder="Explain why you are requesting this schedule change..."
              />
            </label>
            <div className="alteration-submit">
              <button type="submit" className="user-btn user-btn-primary">
                Submit Change Request
              </button>
            </div>
          </form>
        ) : (
          <Empty text="You do not have any current published schedule entries available for alteration." />
        )}
        <div className="alteration-note">
          <strong>Request only</strong>
          <span>
            Submitting this form does not immediately change the official timetable. The request
            remains pending until reviewed.
          </span>
        </div>
      </section>
      {/* ===================================================
          REQUEST HISTORY
          =================================================== */}
      <section className="panel">
        <div className="alteration-head">
          <div>
            <span className="sched-kicker">HISTORY</span>
            <h3>Request History</h3>
            <p className="muted">
              Track pending, approved, rejected, and cancelled schedule change requests.
            </p>
          </div>
          {(requests?.length ?? 0) > 0 && (
            <Badge>
              {requests?.length} Request
              {requests?.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        {requests?.length ? (
          <div className="alteration-history">
            {requests.map((request) => {
              const entry = one(request.schedule_entries)
              const offering = one(entry?.class_offerings)
              const subject = one(offering?.subjects)
              const section = one(offering?.sections)
              const currentRoom = one(entry?.rooms)

              const proposedRoom = request.proposed_room_id
                ? roomMap.get(request.proposed_room_id)
                : null

              const hasDayChange = request.proposed_day !== null
              const hasTimeChange = request.proposed_start_time && request.proposed_end_time
              const hasRoomChange = Boolean(request.proposed_room_id)

              return (
                <article key={request.id} className="alteration-history-item">
                  <div className="alteration-history-head">
                    <div>
                      <strong>
                        {subject?.code || 'Class'}
                        {subject?.name ? ` — ${subject.name}` : ''}
                      </strong>
                      <div className="muted alteration-block">Block {section?.code || '—'}</div>
                    </div>
                    <Badge tone={statusTone(request.status)}>{statusLabel(request.status)}</Badge>
                  </div>
                  <div className="alteration-compare">
                    <div>
                      <span>CURRENT</span>
                      <strong>{DAY_NAMES[entry?.day_of_week ?? 0] || '—'}</strong>
                      <p>
                        {formatTime(entry?.start_time)}
                        {' – '}
                        {formatTime(entry?.end_time)}
                      </p>
                      <p>Room {currentRoom?.code || '—'}</p>
                    </div>
                    <div>
                      <span>REQUESTED</span>
                      <strong>
                        {hasDayChange ? DAY_NAMES[request.proposed_day ?? 0] : 'Same day'}
                      </strong>
                      <p>
                        {hasTimeChange
                          ? `${formatTime(request.proposed_start_time)} – ${formatTime(
                              request.proposed_end_time
                            )}`
                          : 'Same time'}
                      </p>
                      <p>{hasRoomChange ? `Room ${proposedRoom?.code || '—'}` : 'Same room'}</p>
                    </div>
                  </div>
                  <div className="alteration-reason-box">
                    <span>REASON</span>
                    <p>{request.reason}</p>
                  </div>
                  {request.review_notes && (
                    <div className="alteration-review-box">
                      <span>REVIEW NOTES</span>
                      <p>{request.review_notes}</p>
                    </div>
                  )}
                  <div className="alteration-history-footer">
                    <small className="muted">
                      Requested: {new Date(request.created_at).toLocaleString()}
                    </small>
                    {request.status === 'pending' && (
                      <form action={cancelScheduleChangeRequest}>
                        <input type="hidden" name="request_id" value={request.id} />
                        <button type="submit" className="user-btn">
                          Cancel Request
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <Empty text="No schedule change requests yet." />
        )}
      </section>
    </div>
  )
}

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge, Notice, Stat } from '@/components/ui'
import { submitScheduleChangeRequest, cancelScheduleChangeRequest } from './actions'
import { one } from '@/lib/relations'
import { isUnderRevision, loadPublishedEntries } from '@/lib/faculty-schedule'
import { DAY_NAMES, DAY_OPTIONS, formatDateTime, formatTime12, statusTone } from '@/lib/format'
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
          title="Schedule Requests"
          description="Ask for a different day, time or room for one of your published classes."
        />
        <Notice tone="warning" title="Your instructor record is not set up yet.">
          You can send requests once the Administrator finishes your record.
        </Notice>
      </>
    )
  }

  const { entries, error: entriesError } = await loadPublishedEntries(supabase, faculty.id)
  const requestable = entries.filter((entry) => !isUnderRevision(entry))

  if (entriesError) {
    console.error('Failed to load published faculty entries:', entriesError)
  }

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
    <>
      <PageHead
        title="Schedule Requests"
        description="Ask for a different day, time or room for one of your published classes. The Department Scheduler reviews each request; nothing changes until it is approved and republished."
      />
      {params.success && <Notice tone="success">{params.success}</Notice>}
      {params.error && <Notice tone="danger">{params.error}</Notice>}
      {entriesError && (
        <Notice tone="danger" title="Your published classes could not be loaded.">
          {entriesError.message}
        </Notice>
      )}
      {requestsError && (
        <Notice tone="danger" title="Your requests could not be loaded.">
          {requestsError.message}
        </Notice>
      )}

      <div className="stats-grid">
        <Stat label="Published classes" value={entries.length} />
        <Stat label="Pending" value={pendingCount} />
        <Stat label="Approved" value={approvedCount} />
        <Stat label="Rejected" value={rejectedCount} />
      </div>

      <section className="panel">
        <h3>New request</h3>
        <p className="muted">
          Pick the class, then fill in only what should change. Leave the rest as it is.
        </p>
        {entries.length > 0 && requestable.length < entries.length && (
          <p className={styles.lockNote}>
            {requestable.length === 0 ? 'All of your classes are' : 'Some classes are'} in a
            schedule that is being revised after an approved request. New requests for those classes
            open again once the revised schedule is published.
          </p>
        )}
        {entries.length > 0 ? (
          <form action={submitScheduleChangeRequest} className={styles.form}>
            <label className={`field ${styles.wide}`}>
              <span className="field-label">Class</span>
              <select name="schedule_entry_id" required defaultValue="">
                <option value="" disabled>
                  Select a class
                </option>
                {entries.map((entry) => {
                  const offering = one(entry.class_offerings)
                  const subject = one(offering?.subjects)
                  const section = one(offering?.sections)
                  const room = one(entry.rooms)
                  const locked = isUnderRevision(entry)
                  return (
                    <option key={entry.id} value={entry.id} disabled={locked}>
                      {subject?.code || 'Class'} · Block {section?.code || '—'} ·{' '}
                      {DAY_NAMES[entry.day_of_week]} {formatTime12(entry.start_time)}–
                      {formatTime12(entry.end_time)}
                      {room?.code ? ` · ${room.code}` : ''}
                      {locked ? ' (being revised)' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
            <label className="field">
              <span className="field-label">New day</span>
              <select name="proposed_day" defaultValue="">
                <option value="">Keep the same day</option>
                {DAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">New start</span>
              <input type="time" name="proposed_start_time" />
            </label>
            <label className="field">
              <span className="field-label">New end</span>
              <input type="time" name="proposed_end_time" />
            </label>
            <label className="field">
              <span className="field-label">New room</span>
              <select name="proposed_room_id" defaultValue="">
                <option value="">Keep the same room</option>
                {(rooms ?? []).map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code}
                    {room.name ? ` · ${room.name}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className={`field ${styles.wide}`}>
              <span className="field-label">Reason</span>
              <textarea
                name="reason"
                required
                rows={3}
                maxLength={1000}
                placeholder="For example: a department meeting is set at this time every week."
              />
            </label>
            <div className={styles.submit}>
              <button type="submit" className="btn btn-primary">
                Send request
              </button>
            </div>
          </form>
        ) : (
          <Empty
            title="No published classes"
            text="You can request a change once your classes are published."
          />
        )}
      </section>

      <section className="panel">
        <h3>Your requests</h3>
        <p className="muted">Newest first. You can cancel a request while it is still pending.</p>
        {requests?.length ? (
          <ul className={styles.history}>
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
                <li key={request.id} className={styles.request}>
                  <div className={styles.requestHead}>
                    <strong>
                      {subject?.code || 'Class'}
                      {subject?.name ? ` · ${subject.name}` : ''}
                      <span> · Block {section?.code || '—'}</span>
                    </strong>
                    <Badge tone={statusTone(request.status)}>{statusLabel(request.status)}</Badge>
                  </div>
                  <div className={styles.change}>
                    <span>
                      {DAY_NAMES[entry?.day_of_week ?? 0] || '—'}, {formatTime12(entry?.start_time)}
                      –{formatTime12(entry?.end_time)}, {currentRoom?.code || 'no room'}
                    </span>
                    <span className={styles.arrow} aria-label="changes to">
                      →
                    </span>
                    <span className={styles.proposed}>
                      {hasDayChange ? DAY_NAMES[request.proposed_day ?? 0] : 'Same day'},{' '}
                      {hasTimeChange
                        ? `${formatTime12(request.proposed_start_time)}–${formatTime12(request.proposed_end_time)}`
                        : 'same time'}
                      , {hasRoomChange ? proposedRoom?.code || 'new room' : 'same room'}
                    </span>
                  </div>
                  <p className={styles.reason}>“{request.reason}”</p>
                  {request.review_notes && (
                    <p className={styles.notes}>
                      <strong>Scheduler&apos;s note:</strong> {request.review_notes}
                    </p>
                  )}
                  <div className={styles.requestFoot}>
                    <small>Sent {formatDateTime(request.created_at)}</small>
                    {request.status === 'pending' && (
                      <form action={cancelScheduleChangeRequest}>
                        <input type="hidden" name="request_id" value={request.id} />
                        <button type="submit" className="btn btn-outline btn-sm">
                          Cancel request
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty title="No requests yet" text="Requests you send will be listed here." />
        )}
      </section>
    </>
  )
}

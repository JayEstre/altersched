import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { PageHead, Stat, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { approveChangeRequest, rejectChangeRequest } from './actions'
import { DAY_NAMES, formatDateTime, formatTime } from '@/lib/format'
import { one } from '@/lib/relations'
import styles from './page.module.css'

type SearchParams = Record<string, string | undefined>

function formatDay(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const number = Number(value)

  return DAY_NAMES[number] || `Day ${value}`
}

function humanize(value: string | null | undefined) {
  if (!value) return '—'

  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireRole(['super_admin'])
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()

  const { data: requests, error } = await supabase
    .from('schedule_change_requests')
    .select(
      `
      id,
      reason,
      status,
      change_type,
      created_at,
      proposed_day,
      proposed_start_time,
      proposed_end_time,
      proposed_room_id,
      profiles!schedule_change_requests_requested_by_fkey (
        full_name,
        email
      ),
      schedule_entries (
        id,
        day_of_week,
        start_time,
        end_time,
        room_id
      )
    `
    )
    .order('created_at', { ascending: false })

  const rows = requests ?? []
  const pendingCount = rows.filter((request) => request.status === 'pending').length
  const approvedCount = rows.filter((request) => request.status === 'approved').length
  const rejectedCount = rows.filter((request) => request.status === 'rejected').length

  return (
    <div className={styles.scope}>
      <>
        <PageHead
          eyebrow="ALTERATIONS"
          title="Schedule Alterations"
          description="Review faculty schedule alteration requests. Approved changes create a new draft schedule version that must still pass validation before publication."
        />
        {params.success && (
          <div className="portal-alert portal-alert-success">
            <strong>Request {params.success}.</strong>
          </div>
        )}
        {(params.error || error) && (
          <div className="portal-alert portal-alert-danger">
            <strong>Action failed.</strong>
            <span>{params.error || error?.message}</span>
          </div>
        )}
        <div className="stats-grid">
          <Stat label="Total Requests" value={rows.length} />
          <Stat label="Pending" value={pendingCount} />
          <Stat label="Approved" value={approvedCount} />
          <Stat label="Rejected" value={rejectedCount} />
        </div>
        <div className="panel">
          {rows.length > 0 ? (
            <div className="scroll-x">
              <DataTable>
                <thead>
                  <tr>
                    <th>Requested By</th>
                    <th>Request</th>
                    <th>Current Schedule</th>
                    <th>Proposed Change</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((request) => {
                    const requester = one(request.profiles)
                    const entry = one(request.schedule_entries)

                    const currentSchedule = entry
                      ? [
                          formatDay(entry.day_of_week),
                          formatTime(entry.start_time, '') && formatTime(entry.end_time, '')
                            ? `${formatTime(entry.start_time, '')} – ${formatTime(entry.end_time, '')}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : '—'

                    const proposedDay = formatDay(request.proposed_day)
                    const proposedStart = formatTime(request.proposed_start_time, '')
                    const proposedEnd = formatTime(request.proposed_end_time, '')

                    const proposedSchedule =
                      [
                        proposedDay,
                        proposedStart && proposedEnd
                          ? `${proposedStart} – ${proposedEnd}`
                          : proposedStart || proposedEnd,
                        request.proposed_room_id ? 'Room change requested' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Keep unspecified values'

                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>{requester?.full_name || 'Unknown user'}</strong>
                          {requester?.email && <div className="muted">{requester.email}</div>}
                        </td>
                        <td>
                          <strong>{humanize(request.change_type)}</strong>
                          <div className="muted">{request.reason || 'No reason provided.'}</div>
                        </td>
                        <td>{currentSchedule}</td>
                        <td>{proposedSchedule}</td>
                        <td>{formatDateTime(request.created_at)}</td>
                        <td>
                          <Badge>{humanize(request.status)}</Badge>
                        </td>
                        <td>
                          {request.status === 'pending' ? (
                            <div className="review-form">
                              <form action={approveChangeRequest}>
                                <input type="hidden" name="request_id" value={request.id} />
                                <input
                                  className="full-field"
                                  type="text"
                                  name="review_notes"
                                  placeholder="Review notes (optional)"
                                />
                                <button type="submit" className="user-btn user-btn-primary">
                                  Approve
                                </button>
                              </form>
                              <form action={rejectChangeRequest}>
                                <input type="hidden" name="request_id" value={request.id} />
                                <input
                                  className="full-field"
                                  type="text"
                                  name="review_notes"
                                  placeholder="Reason for rejection"
                                />
                                <button type="submit" className="user-btn user-btn-danger-soft">
                                  Reject
                                </button>
                              </form>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </DataTable>
            </div>
          ) : (
            <Empty text="No schedule alteration requests." />
          )}
        </div>
      </>
    </div>
  )
}

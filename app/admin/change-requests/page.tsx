import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

import {
  PageHead,
  Stat,
  Empty,
  Badge,
} from '@/components/ui'

import {
  approveChangeRequest,
  rejectChangeRequest,
} from './actions'

type SearchParams = Record<
  string,
  string | undefined
>

const DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

function relationOne<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function formatTime(
  value: string | null | undefined
) {
  if (!value) return null

  return value.slice(0, 5)
}

function formatDay(
  value: number | string | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  const number = Number(value)

  return (
    DAY_NAMES[number] ||
    `Day ${value}`
  )
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(date)
}

function humanize(
  value: string | null | undefined
) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await requireRole(['super_admin'])

  const params = searchParams
    ? await searchParams
    : {}

  const supabase = await createClient()

  const {
    data: requests,
    error,
  } = await supabase
    .from('schedule_change_requests')
    .select(`
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
    `)
    .order(
      'created_at',
      { ascending: false }
    )

  const rows = requests ?? []

  const pendingCount =
    rows.filter(
      (request: any) =>
        request.status === 'pending'
    ).length

  const approvedCount =
    rows.filter(
      (request: any) =>
        request.status === 'approved'
    ).length

  const rejectedCount =
    rows.filter(
      (request: any) =>
        request.status === 'rejected'
    ).length

  return (
    <>
      <PageHead
        eyebrow="ALTERATIONS"
        title="Schedule Alterations"
        description="Review faculty schedule alteration requests. Approved changes create a new draft schedule version that must still pass validation before publication."
      />

      {params.success && (
        <div className="portal-alert portal-alert-success">
          <strong>
            Request {params.success}.
          </strong>
        </div>
      )}

      {(params.error || error) && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Action failed.
          </strong>

          <span>
            {params.error ||
              error?.message}
          </span>
        </div>
      )}

      <div className="stats-grid">
        <Stat
          label="Total Requests"
          value={rows.length}
        />

        <Stat
          label="Pending"
          value={pendingCount}
        />

        <Stat
          label="Approved"
          value={approvedCount}
        />

        <Stat
          label="Rejected"
          value={rejectedCount}
        />
      </div>

      <div className="panel">
        {rows.length > 0 ? (
          <div
            style={{
              overflowX: 'auto',
            }}
          >
            <table className="data-table">
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
                {rows.map(
                  (request: any) => {
                    const requester =
                      relationOne<any>(
                        request.profiles
                      )

                    const entry =
                      relationOne<any>(
                        request.schedule_entries
                      )

                    const currentSchedule =
                      entry
                        ? [
                            formatDay(
                              entry.day_of_week
                            ),
                            formatTime(
                              entry.start_time
                            ) &&
                            formatTime(
                              entry.end_time
                            )
                              ? `${formatTime(
                                  entry.start_time
                                )} – ${formatTime(
                                  entry.end_time
                                )}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : '—'

                    const proposedDay =
                      formatDay(
                        request.proposed_day
                      )

                    const proposedStart =
                      formatTime(
                        request.proposed_start_time
                      )

                    const proposedEnd =
                      formatTime(
                        request.proposed_end_time
                      )

                    const proposedSchedule =
                      [
                        proposedDay,
                        proposedStart &&
                        proposedEnd
                          ? `${proposedStart} – ${proposedEnd}`
                          : proposedStart ||
                            proposedEnd,
                        request.proposed_room_id
                          ? 'Room change requested'
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') ||
                      'Keep unspecified values'

                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>
                            {requester?.full_name ||
                              'Unknown user'}
                          </strong>

                          {requester?.email && (
                            <div className="muted">
                              {requester.email}
                            </div>
                          )}
                        </td>

                        <td>
                          <strong>
                            {humanize(
                              request.change_type
                            )}
                          </strong>

                          <div className="muted">
                            {request.reason ||
                              'No reason provided.'}
                          </div>
                        </td>

                        <td>
                          {currentSchedule}
                        </td>

                        <td>
                          {proposedSchedule}
                        </td>

                        <td>
                          {formatDate(
                            request.created_at
                          )}
                        </td>

                        <td>
                          <Badge>
                            {humanize(
                              request.status
                            )}
                          </Badge>
                        </td>

                        <td>
                          {request.status ===
                          'pending' ? (
                            <div
                              style={{
                                display: 'grid',
                                gap: 8,
                                minWidth: 220,
                              }}
                            >
                              <form
                                action={
                                  approveChangeRequest
                                }
                              >
                                <input
                                  type="hidden"
                                  name="request_id"
                                  value={
                                    request.id
                                  }
                                />

                                <input
                                  type="text"
                                  name="review_notes"
                                  placeholder="Review notes (optional)"
                                  style={{
                                    width: '100%',
                                    marginBottom: 8,
                                  }}
                                />

                                <button
                                  type="submit"
                                  className="user-btn user-btn-primary"
                                >
                                  Approve
                                </button>
                              </form>

                              <form
                                action={
                                  rejectChangeRequest
                                }
                              >
                                <input
                                  type="hidden"
                                  name="request_id"
                                  value={
                                    request.id
                                  }
                                />

                                <input
                                  type="text"
                                  name="review_notes"
                                  placeholder="Reason for rejection"
                                  style={{
                                    width: '100%',
                                    marginBottom: 8,
                                  }}
                                />

                                <button
                                  type="submit"
                                  className="user-btn user-btn-danger-soft"
                                >
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
                  }
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No schedule alteration requests." />
        )}
      </div>
    </>
  )
}
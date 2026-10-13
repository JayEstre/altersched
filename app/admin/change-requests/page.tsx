import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
<<<<<<< HEAD
import { PageHead, Stat, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { approveChangeRequest, rejectChangeRequest } from './actions'
import { DAY_NAMES, formatDateTime, formatTime } from '@/lib/format'
import { one } from '@/lib/relations'
import styles from './page.module.css'

type SearchParams = Record<string, string | undefined>

function formatDay(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
=======

import {
  PageHead,
  Stat,
  Empty,
  Badge,
} from '@/components/ui'
import { DataTable } from '@/components/data-table'

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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    return null
  }

  const number = Number(value)

<<<<<<< HEAD
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
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      reason,
      status,
      change_type,
      created_at,
      proposed_day,
      proposed_start_time,
      proposed_end_time,
      proposed_room_id,
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      profiles!schedule_change_requests_requested_by_fkey (
        full_name,
        email
      ),
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      schedule_entries (
        id,
        day_of_week,
        start_time,
        end_time,
        room_id
      )
<<<<<<< HEAD
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
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

                    const proposedSchedule =
                      [
                        proposedDay,
<<<<<<< HEAD
                        proposedStart && proposedEnd
                          ? `${proposedStart} – ${proposedEnd}`
                          : proposedStart || proposedEnd,
                        request.proposed_room_id ? 'Room change requested' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Keep unspecified values'
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

                    return (
                      <tr key={request.id}>
                        <td>
<<<<<<< HEAD
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
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
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
<<<<<<< HEAD
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
=======
                  }
                )}
              </tbody>
            </DataTable>
          </div>
        ) : (
          <Empty text="No schedule alteration requests." />
        )}
      </div>
    </>
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

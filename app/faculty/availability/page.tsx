import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

import {
  PageHead,
  Empty,
  Badge,
} from '@/components/ui'
import { DataTable } from '@/components/data-table'

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
  return Array.isArray(value)
    ? value[0]
    : value
}

function formatTime(
  value: string | null | undefined
) {
  if (!value) return '—'

  return String(value).slice(0, 5)
}

function formatType(
  value: string | null | undefined
) {
  if (!value) return '—'

  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase()
    )
}

export default async function Page() {
  const { profile } =
    await requireRole(['faculty'])

  const s = await createClient()

  /* =======================================================
     FACULTY PROFILE
     ======================================================= */

  const {
    data: facultyProfile,
    error: facultyError,
  } = await s
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

  const department =
    rel(
      (facultyProfile as any)
        ?.departments
    )

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  let availability: any[] = []
  let availabilityError: any = null

  if (facultyProfile?.id) {
    const result = await s
      .from('faculty_availability')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        availability_type,
        semester_id,
        semesters(
          name
        )
      `)
      .eq(
        'faculty_id',
        facultyProfile.id
      )
      .order(
        'day_of_week',
        {
          ascending: true,
        }
      )
      .order(
        'start_time',
        {
          ascending: true,
        }
      )

    availability =
      result.data ?? []

    availabilityError =
      result.error
  }

  if (availabilityError) {
    console.error(
      'Failed to load faculty availability:',
      availabilityError
    )
  }

  /* =======================================================
     SUMMARY
     ======================================================= */

  const daysCovered =
    new Set(
      availability.map(
        (record) =>
          record.day_of_week
      )
    ).size

  const semesters =
    new Set(
      availability
        .map((record) => {
          const semester =
            rel(
              record.semesters
            )

          return semester?.name
        })
        .filter(Boolean)
    ).size

  const availableCount =
    availability.filter(
      (record) =>
        record.availability_type ===
        'available'
    ).length

  const preferredCount =
    availability.filter(
      (record) =>
        record.availability_type ===
        'preferred'
    ).length

  const unavailableCount =
    availability.filter(
      (record) =>
        record.availability_type ===
        'unavailable'
    ).length

  return (
    <>
      <PageHead
        eyebrow="TEACHING PREFERENCES"
        title="My Availability"
        description="Availability and scheduling constraints currently recorded for your faculty profile."
      />

      {/* ===================================================
          NAVIGATION
          =================================================== */}

      <div className="availability-nav">
        <Link
          href="/faculty/dashboard"
          className="user-btn"
        >
          ← Dashboard
        </Link>

        <div className="availability-nav-actions">
          <Link
            href="/faculty/schedule"
            className="user-btn"
          >
            My Schedule
          </Link>

          <Link
            href="/faculty/alterations"
            className="user-btn"
          >
            Alterations
          </Link>

          <Badge
            tone={
              availability.length > 0
                ? 'success'
                : 'warning'
            }
          >
            {availability.length > 0
              ? 'Configured'
              : 'Not Configured'}
          </Badge>
        </div>
      </div>

      {/* ===================================================
          FACULTY INFO
          =================================================== */}

      <section className="panel availability-profile">
        <div className="availability-profile-head">
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
              {facultyProfile
                ?.employee_id ||
                '—'}

              {' · '}

              {department?.code ||
                'No Department'}
            </p>
          </div>

          <Badge>
            Read Only
          </Badge>
        </div>
      </section>

      {/* ===================================================
          FACULTY PROFILE ERROR
          =================================================== */}

      {facultyError && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Faculty profile unavailable.
          </strong>

          <span>
            AlterSched could not load your faculty profile.
          </span>
        </div>
      )}

      {!facultyError &&
        !facultyProfile && (
          <div className="portal-alert portal-alert-danger">
            <strong>
              Faculty profile not found.
            </strong>

            <span>
              Your account does not currently have a faculty profile connected to it.
            </span>
          </div>
        )}

      {/* ===================================================
          SUMMARY
          =================================================== */}

      <div className="availability-summary">
        <div className="availability-stat">
          <span>
            Records
          </span>

          <strong>
            {availability.length}
          </strong>
        </div>

        <div className="availability-stat">
          <span>
            Days Covered
          </span>

          <strong>
            {daysCovered}
          </strong>
        </div>

        <div className="availability-stat">
          <span>
            Preferred
          </span>

          <strong>
            {preferredCount}
          </strong>
        </div>

        <div className="availability-stat">
          <span>
            Unavailable
          </span>

          <strong>
            {unavailableCount}
          </strong>
        </div>
      </div>

      {/* ===================================================
          QUERY ERROR
          =================================================== */}

      {availabilityError && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Unable to load availability.
          </strong>

          <span>
            {availabilityError.message}
          </span>
        </div>
      )}

      {/* ===================================================
          AVAILABILITY TABLE
          =================================================== */}

      <section className="panel">
        <div className="availability-head">
          <div>
            <span className="sched-kicker">
              AVAILABILITY
            </span>

            <h3>
              Teaching Time Preferences
            </h3>

            <p className="muted">
              AlterSched uses these records during schedule generation and faculty conflict validation.
            </p>
          </div>

          {availability.length > 0 && (
            <Badge tone="success">
              {availability.length}{' '}
              Record
              {availability.length === 1
                ? ''
                : 's'}
            </Badge>
          )}
        </div>

        {availability.length > 0 ? (
          <div className="availability-table-wrap">
            <DataTable>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Semester</th>
                  <th>Type</th>
                </tr>
              </thead>

              <tbody>
                {availability.map(
                  (record) => {
                    const semester =
                      rel(
                        record.semesters
                      )

                    const type =
                      record
                        .availability_type

                    return (
                      <tr
                        key={
                          record.id
                        }
                      >
                        <td>
                          <strong>
                            {DAYS[
                              record
                                .day_of_week
                            ] ||
                              '—'}
                          </strong>
                        </td>

                        <td>
                          {formatTime(
                            record.start_time
                          )}

                          {' – '}

                          {formatTime(
                            record.end_time
                          )}
                        </td>

                        <td>
                          {semester?.name ||
                            '—'}
                        </td>

                        <td>
                          <Badge
                            tone={
                              type ===
                              'unavailable'
                                ? 'danger'
                                : type ===
                                    'preferred'
                                  ? 'success'
                                  : undefined
                            }
                          >
                            {formatType(
                              type
                            )}
                          </Badge>
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </DataTable>
          </div>
        ) : (
          <div className="availability-empty">
            <Empty text="No availability records have been configured for your faculty profile." />
          </div>
        )}
      </section>

      {/* ===================================================
          LEGEND
          =================================================== */}

      {availability.length > 0 && (
        <section className="panel availability-legend">
          <span className="sched-kicker">
            SCHEDULING MEANING
          </span>

          <div className="availability-legend-grid">
            <div>
              <Badge>
                Available
              </Badge>

              <p>
                The faculty member may be assigned during this time.
              </p>
            </div>

            <div>
              <Badge tone="success">
                Preferred
              </Badge>

              <p>
                A preferred teaching window when scheduling permits.
              </p>
            </div>

            <div>
              <Badge tone="danger">
                Unavailable
              </Badge>

              <p>
                Classes must not be assigned during this period.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
          NOTICE
          =================================================== */}

      <div className="portal-alert availability-notice">
        <strong>
          Scheduling constraint.
        </strong>

        <span>
          These records are read-only from your faculty account and are used by AlterSched when checking class assignments.
        </span>
      </div>

      <style>{`
        .availability-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .availability-nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .availability-profile {
          margin-bottom: 16px;
        }

        .availability-profile-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
        }

        .availability-profile-head h3 {
          margin-top: 5px;
          margin-bottom: 4px;
        }

        .availability-profile-head p {
          margin: 0;
        }

        .availability-summary {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(120px, 1fr)
            );
          gap: 9px;
          margin-bottom: 16px;
        }

        .availability-stat {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 12px;
          min-width: 0;
        }

        .availability-stat span {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .availability-stat strong {
          display: block;
          font-size: 18px;
        }

        .availability-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
        }

        .availability-head h3 {
          margin-top: 5px;
          margin-bottom: 4px;
        }

        .availability-head p {
          margin: 0;
          max-width: 680px;
        }

        .availability-table-wrap {
          overflow-x: auto;
          margin-top: 14px;
        }

        .availability-empty {
          margin-top: 14px;
        }

        .availability-legend {
          margin-top: 16px;
        }

        .availability-legend-grid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 10px;
          margin-top: 12px;
        }

        .availability-legend-grid > div {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px;
        }

        .availability-legend-grid p {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }

        .availability-notice {
          margin-top: 16px;
        }

        @media (max-width: 800px) {
          .availability-summary {
            grid-template-columns:
              repeat(
                2,
                minmax(120px, 1fr)
              );
          }

          .availability-legend-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .availability-nav {
            align-items: stretch;
          }

          .availability-nav-actions {
            width: 100%;
          }

          .availability-nav-actions .user-btn {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .availability-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

import {
  PageHead,
  Badge,
  Empty,
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

  return String(value).slice(
    0,
    5
  )
}

export default async function Page() {
  const { profile } =
    await requireRole([
      'faculty',
    ])

  const s =
    await createClient()

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
      employment_type,
      max_teaching_load,

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
     PUBLISHED TEACHING ENTRIES

     Step 1:
     Get entries assigned to this faculty member where the
     parent schedule version is Published.

     Step 2 below confirms that each version is also the
     schedule's official current_version_id.
     ======================================================= */

  let candidateEntries: any[] = []
  let scheduleError: any = null

  if (facultyProfile?.id) {
    const result = await s
      .from('schedule_entries')
      .select(`
        id,
        schedule_version_id,
        day_of_week,
        start_time,
        end_time,
        entry_type,
        room_id,
        class_offering_id,

        rooms(
          code,
          name
        ),

        class_offerings(
          id,

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
          schedule_id,
          version_number,
          status,

          schedules!inner(
            id,
            title,
            status,
            current_version_id
          )
        )
      `)
      .eq(
        'faculty_id',
        facultyProfile.id
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

    candidateEntries =
      result.data ?? []

    scheduleError =
      result.error
  }

  if (scheduleError) {
    console.error(
      'Failed to load faculty schedule:',
      scheduleError
    )
  }

  /* =======================================================
     CURRENT VERSION SAFETY

     A schedule can have historical versions.

     Faculty should only see an entry when:

       entry.schedule_version_id
         ===
       schedule.current_version_id

     and both the schedule/version are Published.

     This prevents an older published version from appearing
     together with a newer official version.
     ======================================================= */

  const entries =
    candidateEntries.filter(
      (entry) => {
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

        if (!version) {
          return false
        }

        if (!schedule) {
          return false
        }

        if (
          version.status !==
          'published'
        ) {
          return false
        }

        if (
          schedule.status !==
          'published'
        ) {
          return false
        }

        return (
          schedule
            .current_version_id ===
          version.id
        )
      }
    )

  /* =======================================================
     SUMMARY COUNTS
     ======================================================= */

  const teachingDays =
    new Set(
      entries.map(
        (entry) =>
          entry.day_of_week
      )
    ).size

  const subjectCodes =
    new Set(
      entries
        .map((entry) => {
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

          return subject?.code
        })
        .filter(Boolean)
    )

  const sectionCodes =
    new Set(
      entries
        .map((entry) => {
          const offering =
            rel(
              entry
                .class_offerings
            )

          const section =
            rel(
              offering
                ?.sections
            )

          return section?.code
        })
        .filter(Boolean)
    )

  const scheduleIds =
    new Set(
      entries
        .map((entry) => {
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

          return schedule?.id
        })
        .filter(Boolean)
    )

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <>
      <PageHead
        eyebrow="PUBLISHED SCHEDULE"
        title="My Teaching Schedule"
        description="Your official published teaching assignments, class times, blocks, and rooms."
      />

      {/* ===================================================
          NAVIGATION
          =================================================== */}

      <div className="faculty-schedule-nav">
        <Link
          href="/faculty/dashboard"
          className="user-btn"
        >
          ← Dashboard
        </Link>

        <div className="faculty-schedule-actions">
          <Link
            href="/faculty/availability"
            className="user-btn"
          >
            Availability
          </Link>

          <Link
            href="/faculty/alterations"
            className="user-btn"
          >
            Alterations
          </Link>

          <Badge
            tone={
              entries.length > 0
                ? 'success'
                : 'warning'
            }
          >
            {entries.length > 0
              ? 'Published'
              : 'No Schedule'}
          </Badge>
        </div>
      </div>

      {/* ===================================================
          FACULTY INFORMATION
          =================================================== */}

      <section className="panel faculty-info-panel">
        <div className="faculty-info-head">
          <div>
            <span className="sched-kicker">
              FACULTY
            </span>

            <h3 className="faculty-name">
              {profile.full_name ||
                'Faculty'}
            </h3>

            <p className="muted faculty-meta">
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

      {/* ===================================================
          NO FACULTY PROFILE
          =================================================== */}

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

      {entries.length > 0 && (
        <div className="faculty-schedule-summary">
          <div className="faculty-schedule-stat">
            <span>
              Sessions
            </span>

            <strong>
              {entries.length}
            </strong>
          </div>

          <div className="faculty-schedule-stat">
            <span>
              Subjects
            </span>

            <strong>
              {subjectCodes.size}
            </strong>
          </div>

          <div className="faculty-schedule-stat">
            <span>
              Blocks
            </span>

            <strong>
              {sectionCodes.size}
            </strong>
          </div>

          <div className="faculty-schedule-stat">
            <span>
              Teaching Days
            </span>

            <strong>
              {teachingDays}
            </strong>
          </div>
        </div>
      )}

      {/* ===================================================
          QUERY ERROR
          =================================================== */}

      {scheduleError && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Unable to load schedule.
          </strong>

          <span>
            {scheduleError.message}
          </span>
        </div>
      )}

      {/* ===================================================
          TIMETABLE
          =================================================== */}

      <section className="panel">
        <div className="faculty-timetable-head">
          <div>
            <span className="sched-kicker">
              WEEKLY TIMETABLE
            </span>

            <h3 className="faculty-timetable-title">
              Assigned Classes
            </h3>

            <p className="muted faculty-timetable-description">
              Only assignments from the current official published schedule versions are shown.
            </p>
          </div>

          {entries.length > 0 && (
            <Badge tone="success">
              {entries.length}{' '}
              Session
              {entries.length === 1
                ? ''
                : 's'}
            </Badge>
          )}
        </div>

        {entries.length > 0 ? (
          <div className="faculty-table-wrap">
            <DataTable>
              <thead>
                <tr>
                  <th>
                    Day
                  </th>

                  <th>
                    Time
                  </th>

                  <th>
                    Subject
                  </th>

                  <th>
                    Block
                  </th>

                  <th>
                    Room
                  </th>

                  <th>
                    Type
                  </th>
                </tr>
              </thead>

              <tbody>
                {entries.map(
                  (entry) => {
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
                      <tr
                        key={
                          entry.id
                        }
                      >
                        <td>
                          <strong>
                            {DAYS[
                              entry
                                .day_of_week
                            ] ||
                              '—'}
                          </strong>
                        </td>

                        <td>
                          {formatTime(
                            entry
                              .start_time
                          )}

                          {' – '}

                          {formatTime(
                            entry
                              .end_time
                          )}
                        </td>

                        <td>
                          <strong>
                            {subject
                              ?.code ||
                              '—'}
                          </strong>

                          {subject
                            ?.name && (
                            <>
                              <br />

                              <small>
                                {
                                  subject.name
                                }
                              </small>
                            </>
                          )}
                        </td>

                        <td>
                          {section
                            ?.code ||
                            '—'}
                        </td>

                        <td>
                          <strong>
                            {room
                              ?.code ||
                              '—'}
                          </strong>

                          {room
                            ?.name && (
                            <>
                              <br />

                              <small>
                                {
                                  room.name
                                }
                              </small>
                            </>
                          )}
                        </td>

                        <td>
                          <span className="faculty-entry-type">
                            {entry
                              .entry_type ||
                              'regular'}
                          </span>
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </DataTable>
          </div>
        ) : (
          <Empty text="No official published schedule entries are currently assigned to you." />
        )}
      </section>

      {/* ===================================================
          NOTICE
          =================================================== */}

      {entries.length > 0 && (
        <div className="portal-alert faculty-schedule-notice">
          <strong>
            Official published schedule.
          </strong>

          <span>
            This timetable is read-only. If an assigned class needs to change, submit a request through the schedule alteration workflow.
          </span>
        </div>
      )}

      {/* ===================================================
          LOCAL STYLES
          =================================================== */}

      <style>{`
        .faculty-schedule-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .faculty-schedule-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .faculty-info-panel {
          margin-bottom: 16px;
        }

        .faculty-info-head,
        .faculty-timetable-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
        }

        .faculty-name,
        .faculty-timetable-title {
          margin-top: 5px;
          margin-bottom: 4px;
        }

        .faculty-meta,
        .faculty-timetable-description {
          margin: 0;
        }

        .faculty-schedule-summary {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(120px, 1fr)
            );
          gap: 9px;
          margin-bottom: 16px;
        }

        .faculty-schedule-stat {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 12px;
          min-width: 0;
        }

        .faculty-schedule-stat span {
          display: block;
          color: var(--muted);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 4px;
        }

        .faculty-schedule-stat strong {
          font-size: 18px;
        }

        .faculty-timetable-head {
          align-items: center;
          margin-bottom: 13px;
        }

        .faculty-table-wrap {
          overflow-x: auto;
        }

        .faculty-entry-type {
          text-transform: capitalize;
        }

        .faculty-schedule-notice {
          margin-top: 16px;
        }

        @media (max-width: 800px) {
          .faculty-schedule-summary {
            grid-template-columns:
              repeat(
                2,
                minmax(120px, 1fr)
              );
          }
        }

        @media (max-width: 640px) {
          .faculty-schedule-nav {
            align-items: stretch;
          }

          .faculty-schedule-actions {
            width: 100%;
          }

          .faculty-schedule-actions .user-btn {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .faculty-schedule-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
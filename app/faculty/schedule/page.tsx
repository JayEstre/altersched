import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Badge, Empty } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { one } from '@/lib/relations'
import { DAY_NAMES, formatTime } from '@/lib/format'
import styles from './page.module.css'
import { ViewSwitch } from '@/components/view-switch'
import { WeeklyTimetable, sessionKind } from '@/components/weekly-timetable'

export default async function Page() {
  const { profile } = await requireRole(['faculty'])
  const s = await createClient()

  /* =======================================================
     FACULTY PROFILE
     ======================================================= */

  const { data: facultyProfile, error: facultyError } = await s
    .from('faculty_profiles')
    .select(
      `
      id,
      employee_id,
      department_id,
      employment_type,
      max_teaching_load,
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

  const department = one(facultyProfile?.departments)

  /* =======================================================
     PUBLISHED TEACHING ENTRIES
     Step 1:
     Get entries assigned to this faculty member where the
     parent schedule version is Published.
     Step 2 below confirms that each version is also the
     schedule's official published_version_id (stays visible while a revision is in draft).
     ======================================================= */

  const candidateEntriesResult = facultyProfile?.id
    ? await s
        .from('schedule_entries')
        .select(
          `
      id,
      schedule_version_id,
      day_of_week,
      start_time,
      end_time,
      entry_type,
      session_type,
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
        schedules!schedule_versions_schedule_id_fkey!inner(
          id,
          title,
          status,
          published_version_id
        )
      )
    `
        )
        .eq('faculty_id', facultyProfile.id)
        .eq('schedule_versions.status', 'published')
        .neq('schedule_versions.schedules.status', 'archived')
        .order('day_of_week', {
          ascending: true,
        })
        .order('start_time', {
          ascending: true,
        })
    : null
  const candidateEntries = candidateEntriesResult?.data ?? []
  const scheduleError = candidateEntriesResult?.error ?? null

  if (scheduleError) {
    console.error('Failed to load faculty schedule:', scheduleError)
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

  const entries = candidateEntries.filter((entry) => {
    const version = one(entry.schedule_versions)
    const schedule = one(version?.schedules)

    if (!version) {
      return false
    }

    if (!schedule) {
      return false
    }

    if (version.status !== 'published') {
      return false
    }

    if (schedule.status === 'archived') {
      return false
    }

    return schedule.published_version_id === version.id
  })

  /* =======================================================
     SUMMARY COUNTS
     ======================================================= */

  const teachingDays = new Set(entries.map((entry) => entry.day_of_week)).size

  const subjectCodes = new Set(
    entries
      .map((entry) => {
        const offering = one(entry.class_offerings)
        const subject = one(offering?.subjects)

        return subject?.code
      })
      .filter(Boolean)
  )

  const sectionCodes = new Set(
    entries
      .map((entry) => {
        const offering = one(entry.class_offerings)
        const section = one(offering?.sections)

        return section?.code
      })
      .filter(Boolean)
  )

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <div className={styles.scope}>
      <PageHead
        eyebrow="PUBLISHED SCHEDULE"
        title="My Teaching Schedule"
        description="Your official published teaching assignments, class times, blocks, and rooms."
      />
      {/* ===================================================
          NAVIGATION
          =================================================== */}
      <div className="faculty-schedule-nav">
        <Link href="/faculty/dashboard" className="user-btn">
          ← Dashboard
        </Link>
        <div className="faculty-schedule-actions">
          <Link href="/faculty/availability" className="user-btn">
            Availability
          </Link>
          <Link href="/faculty/alterations" className="user-btn">
            Alterations
          </Link>
          <Badge tone={entries.length > 0 ? 'success' : 'warning'}>
            {entries.length > 0 ? 'Published' : 'No Schedule'}
          </Badge>
        </div>
      </div>
      {/* ===================================================
          FACULTY INFORMATION
          =================================================== */}
      <section className="panel faculty-info-panel">
        <div className="faculty-info-head">
          <div>
            <span className="sched-kicker">FACULTY</span>
            <h3 className="faculty-name">{profile.full_name || 'Faculty'}</h3>
            <p className="muted faculty-meta">
              Employee ID: {facultyProfile?.employee_id || '—'}
              {' · '}
              {department?.code || 'No Department'}
            </p>
          </div>
          <Badge>Read Only</Badge>
        </div>
      </section>
      {/* ===================================================
          FACULTY PROFILE ERROR
          =================================================== */}
      {facultyError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Faculty profile unavailable.</strong>
          <span>AlterSched could not load your faculty profile.</span>
        </div>
      )}
      {/* ===================================================
          NO FACULTY PROFILE
          =================================================== */}
      {!facultyError && !facultyProfile && (
        <div className="portal-alert portal-alert-danger">
          <strong>Faculty profile not found.</strong>
          <span>Your account does not currently have a faculty profile connected to it.</span>
        </div>
      )}
      {/* ===================================================
          SUMMARY
          =================================================== */}
      {entries.length > 0 && (
        <div className="faculty-schedule-summary">
          <div className="faculty-schedule-stat">
            <span>Sessions</span>
            <strong>{entries.length}</strong>
          </div>
          <div className="faculty-schedule-stat">
            <span>Subjects</span>
            <strong>{subjectCodes.size}</strong>
          </div>
          <div className="faculty-schedule-stat">
            <span>Blocks</span>
            <strong>{sectionCodes.size}</strong>
          </div>
          <div className="faculty-schedule-stat">
            <span>Teaching Days</span>
            <strong>{teachingDays}</strong>
          </div>
        </div>
      )}
      {/* ===================================================
          QUERY ERROR
          =================================================== */}
      {scheduleError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Unable to load schedule.</strong>
          <span>{scheduleError.message}</span>
        </div>
      )}
      {/* ===================================================
          TIMETABLE
          =================================================== */}
      <section className="panel">
        <div className="faculty-timetable-head">
          <div>
            <span className="sched-kicker">WEEKLY TIMETABLE</span>
            <h3 className="faculty-timetable-title">Assigned Classes</h3>
            <p className="muted faculty-timetable-description">
              Only assignments from the current official published schedule versions are shown.
            </p>
          </div>
          {entries.length > 0 && (
            <Badge tone="success">
              {entries.length} Session
              {entries.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        {entries.length > 0 ? (
          <ViewSwitch
            storageKey="faculty-schedule"
            week={
              <WeeklyTimetable
                sessions={entries.map((entry) => {
                  const offering = one(entry.class_offerings)
                  const subject = one(offering?.subjects)
                  const section = one(offering?.sections)
                  const room = one(entry.rooms)
                  return {
                    id: entry.id,
                    day: entry.day_of_week,
                    start: entry.start_time,
                    end: entry.end_time,
                    title: subject?.code ?? 'Class',
                    lines: [`Block ${section?.code ?? '—'}`, room?.code ?? room?.name ?? 'No room'],
                    kind: sessionKind(entry.session_type),
                  }
                })}
              />
            }
            list={
              <div className="faculty-table-wrap">
                <DataTable>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Block</th>
                      <th>Room</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const offering = one(entry.class_offerings)
                      const subject = one(offering?.subjects)
                      const section = one(offering?.sections)
                      const room = one(entry.rooms)

                      return (
                        <tr key={entry.id}>
                          <td>
                            <strong>{DAY_NAMES[entry.day_of_week] || '—'}</strong>
                          </td>
                          <td>
                            {formatTime(entry.start_time)}
                            {' – '}
                            {formatTime(entry.end_time)}
                          </td>
                          <td>
                            <strong>{subject?.code || '—'}</strong>
                            {subject?.name && (
                              <>
                                <br />
                                <small>{subject.name}</small>
                              </>
                            )}
                          </td>
                          <td>{section?.code || '—'}</td>
                          <td>
                            <strong>{room?.code || '—'}</strong>
                            {room?.name && (
                              <>
                                <br />
                                <small>{room.name}</small>
                              </>
                            )}
                          </td>
                          <td>
                            <span className="faculty-entry-type">
                              {entry.entry_type || 'regular'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </DataTable>
              </div>
            }
          />
        ) : (
          <Empty text="No official published schedule entries are currently assigned to you." />
        )}
      </section>
      {/* ===================================================
          NOTICE
          =================================================== */}
      {entries.length > 0 && (
        <div className="portal-alert faculty-schedule-notice">
          <strong>Official published schedule.</strong>
          <span>
            This timetable is read-only. If an assigned class needs to change, submit a request
            through the schedule alteration workflow.
          </span>
        </div>
      )}
    </div>
  )
}

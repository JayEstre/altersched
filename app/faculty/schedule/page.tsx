import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Notice, Stat } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { one } from '@/lib/relations'
import { loadPublishedEntries } from '@/lib/faculty-schedule'
import { DAY_NAMES, formatTime12, humanize } from '@/lib/format'
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

  const { entries, error: scheduleError } = await loadPublishedEntries(s, facultyProfile?.id)

  if (scheduleError) {
    console.error('Failed to load faculty schedule:', scheduleError)
  }

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

  const rows = entries.map((entry) => {
    const offering = one(entry.class_offerings)
    const subject = one(offering?.subjects)
    const section = one(offering?.sections)
    const room = one(entry.rooms)
    return { entry, subject, section, room }
  })

  return (
    <>
      <PageHead
        title="My Schedule"
        description={`Your published classes for this semester${
          department?.code ? ` · ${department.code}` : ''
        }. Need a change? Send a schedule request.`}
        actions={
          <Link href="/faculty/alterations" className="btn btn-outline">
            Request a change
          </Link>
        }
      />

      {facultyError && (
        <Notice tone="danger" title="Your instructor profile could not be loaded.">
          Try again in a moment. If it keeps happening, contact the Administrator.
        </Notice>
      )}
      {!facultyError && !facultyProfile && (
        <Notice tone="warning" title="No instructor profile yet.">
          The Administrator has not finished setting up your instructor record.
        </Notice>
      )}
      {scheduleError && (
        <Notice tone="danger" title="Your schedule could not be loaded.">
          {scheduleError.message}
        </Notice>
      )}

      {entries.length > 0 && (
        <div className="stats-grid">
          <Stat label="Class sessions" value={entries.length} />
          <Stat label="Subjects" value={subjectCodes.size} />
          <Stat label="Blocks" value={sectionCodes.size} />
          <Stat label="Teaching days" value={teachingDays} />
        </div>
      )}

      <section className="panel">
        {entries.length > 0 ? (
          <ViewSwitch
            storageKey="faculty-schedule"
            week={
              <WeeklyTimetable
                sessions={rows.map(({ entry, subject, section, room }) => ({
                  id: entry.id,
                  day: entry.day_of_week,
                  start: entry.start_time,
                  end: entry.end_time,
                  title: subject?.code ?? 'Class',
                  lines: [
                    section?.code ? `Block ${section.code}` : 'Block —',
                    room?.code ?? room?.name ?? 'No room',
                  ],
                  kind: sessionKind(entry.session_type),
                }))}
              />
            }
            list={
              <DataTable>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Block</th>
                    <th>Room</th>
                    <th>Session</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ entry, subject, section, room }) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>{DAY_NAMES[entry.day_of_week] || '—'}</strong>
                      </td>
                      <td>
                        {formatTime12(entry.start_time)} – {formatTime12(entry.end_time)}
                      </td>
                      <td>
                        <strong>{subject?.code || '—'}</strong>
                        {subject?.name && <small>{subject.name}</small>}
                      </td>
                      <td>{section?.code || '—'}</td>
                      <td>
                        <strong>{room?.code || '—'}</strong>
                        {room?.name && <small>{room.name}</small>}
                      </td>
                      <td>{humanize(entry.session_type || 'lecture')}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            }
          />
        ) : (
          <Empty
            title="No published classes yet"
            text="Your classes appear here once the Administrator publishes this semester's schedule."
          />
        )}
      </section>
    </>
  )
}

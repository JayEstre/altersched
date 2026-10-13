import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { DataTable } from '@/components/data-table'
import { Empty, Notice, PageHead, Panel, Stat } from '@/components/ui'
import { DAY_NAMES, formatTime12 } from '@/lib/format'
import { one } from '@/lib/relations'
import { ViewSwitch } from '@/components/view-switch'
import { WeeklyTimetable, sessionKind } from '@/components/weekly-timetable'

const PAGE_HEAD = {
  eyebrow: 'TEACHING SCHEDULE',
  title: 'My Schedule',
}

/** The Department Scheduler's own published teaching schedule (they can also teach). */
export default async function MySchedulePage() {
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()

  const { data: facultyProfile, error: facultyError } = await supabase
    .from('faculty_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (facultyError) console.error('Faculty profile lookup failed:', facultyError)

  if (!facultyProfile) {
    return (
      <div className="page-stack">
        <PageHead {...PAGE_HEAD} description="View your assigned published teaching schedule." />
        <Notice tone="danger" title="Faculty Profile Required">
          Your scheduler account does not have a Faculty scheduling profile.
        </Notice>
      </div>
    )
  }

  // One query: every entry of this instructor with its class, block, room and schedule.
  const { data, error } = await supabase
    .from('schedule_entries')
    .select(
      `
      id, schedule_version_id, day_of_week, start_time, end_time, session_type,
      sections(code, name),
      rooms(code, name),
      class_offerings(subjects(code, name)),
      schedule_versions(
        schedules!schedule_versions_schedule_id_fkey(
          status, published_version_id,
          semesters(name, academic_years(name))
        )
      )
    `
    )
    .eq('faculty_id', facultyProfile.id)
    .order('day_of_week')
    .order('start_time')

  if (error) console.error('Faculty schedule entries lookup failed:', error)

  const entries = data ?? []

  if (entries.length === 0) {
    return (
      <div className="page-stack">
        <PageHead {...PAGE_HEAD} description="View your assigned published teaching schedule." />
        <Empty
          title="No teaching schedule available"
          text="You currently have no schedule entries assigned to your Faculty profile."
        />
      </div>
    )
  }

  // Only entries that belong to the published version of a non-archived schedule.
  const published = entries
    .map((entry) => {
      const schedule = one(one(entry.schedule_versions)?.schedules)
      return { entry, schedule }
    })
    .filter(
      ({ entry, schedule }) =>
        schedule &&
        schedule.status !== 'archived' &&
        schedule.published_version_id === entry.schedule_version_id
    )

  const teachingDays = new Set(published.map(({ entry }) => entry.day_of_week)).size

  return (
    <div className="page-stack">
      <PageHead
        {...PAGE_HEAD}
        description="Your published teaching assignments, class times, blocks, and rooms."
      />

      <div className="stats-grid">
        <Stat label="Teaching Sessions" value={published.length} />
        <Stat label="Teaching Days" value={teachingDays} />
        <Stat label="Published" value={published.length ? 'Active' : 'None'} />
      </div>

      <Panel
        title="Published Teaching Schedule"
        description="Only your current published assignments are shown."
      >
        {published.length === 0 ? (
          <Empty
            title="No published schedule"
            text="No published teaching assignments are currently available."
          />
        ) : (
          <ViewSwitch
            storageKey="scheduler-my-schedule"
            week={
              <WeeklyTimetable
                sessions={published.map(({ entry }) => {
                  const subject = one(one(entry.class_offerings)?.subjects)
                  const section = one(entry.sections)
                  const room = one(entry.rooms)
                  return {
                    id: entry.id,
                    day: entry.day_of_week,
                    start: entry.start_time,
                    end: entry.end_time,
                    title: subject?.code ?? 'Class',
                    lines: [
                      `Block ${section?.code ?? section?.name ?? '—'}`,
                      room?.code ?? room?.name ?? 'No room',
                    ],
                    kind: sessionKind(entry.session_type),
                  }
                })}
              />
            }
            list={
              <DataTable minWidth={720}>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Block</th>
                    <th>Room</th>
                    <th>Term</th>
                  </tr>
                </thead>
                <tbody>
                  {published.map(({ entry, schedule }) => {
                    const subject = one(one(entry.class_offerings)?.subjects)
                    const section = one(entry.sections)
                    const room = one(entry.rooms)
                    const semester = one(schedule?.semesters)
                    const academicYear = one(semester?.academic_years)

                    return (
                      <tr key={entry.id}>
                        <td>
                          <strong>{DAY_NAMES[entry.day_of_week] ?? '—'}</strong>
                        </td>
                        <td>
                          {formatTime12(entry.start_time)} – {formatTime12(entry.end_time)}
                        </td>
                        <td>
                          <strong>{subject?.code ?? '—'}</strong>
                          <small className="cell-note">{subject?.name ?? 'Subject'}</small>
                        </td>
                        <td>{section?.code || section?.name || '—'}</td>
                        <td>{room?.code || room?.name || '—'}</td>
                        <td>
                          {semester?.name ?? '—'}
                          {academicYear ? ` — ${academicYear.name}` : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </DataTable>
            }
          />
        )}
      </Panel>
    </div>
  )
}

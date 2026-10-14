import { DataTable } from '@/components/data-table'
import { Badge, Empty, PageHead, Stat } from '@/components/ui'
import { PrintButton } from '@/components/print-button'
import { createClient } from '@/lib/supabase/server'
import { one } from '@/lib/relations'
import { loadSchedulingSettings } from '@/lib/scheduling/settings'
import { timeToMinutes } from '@/lib/time'
import styles from './page.module.css'

const hours = (minutes: number) => Math.round((minutes / 60) * 10) / 10

export default async function Page() {
  const supabase = await createClient()

  const [
    { data: facultyRows },
    { data: roomRows },
    { data: publishedEntries },
    { data: scheduleRows },
    { count: pendingRequests },
    settings,
  ] = await Promise.all([
    supabase
      .from('faculty_profiles')
      .select(
        'id, employee_id, max_teaching_load, profiles!inner(full_name, account_status), departments(code), class_offerings(required_weekly_hours, status)'
      )
      .eq('profiles.account_status', 'approved')
      .order('employee_id'),
    supabase
      .from('rooms')
      .select('id, code, name, capacity, is_active, room_types(name)')
      .order('code'),
    supabase
      .from('schedule_entries')
      .select(
        'room_id, start_time, end_time, schedule_versions!inner(id, status, schedules!schedule_versions_schedule_id_fkey!inner(published_version_id, status))'
      )
      .eq('schedule_versions.status', 'published'),
    supabase.from('schedules').select('id, status'),
    supabase
      .from('schedule_change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    loadSchedulingSettings(supabase),
  ])

  // Teaching load: active class hours per approved instructor, against their maximum.
  const loads = (facultyRows ?? [])
    .map((row) => {
      const assigned = (row.class_offerings ?? [])
        .filter((offering) => offering.status === 'active')
        .reduce((total, offering) => total + Number(offering.required_weekly_hours ?? 0), 0)
      const max = Number(row.max_teaching_load ?? 0)
      return {
        id: row.id,
        name: one(row.profiles)?.full_name || row.employee_id,
        employeeId: row.employee_id,
        department: one(row.departments)?.code ?? '—',
        assigned,
        max,
        share: max > 0 ? Math.min(assigned / max, 1.25) : 0,
      }
    })
    .sort((a, b) => b.assigned - a.assigned)
  const overloaded = loads.filter((row) => row.max > 0 && row.assigned > row.max).length
  const noClasses = loads.filter((row) => row.assigned === 0).length

  // Room use: published class hours per room, against the teaching week in Settings.
  const weekMinutes =
    settings.days.length * (timeToMinutes(settings.dayEnd) - timeToMinutes(settings.dayStart))
  const roomMinutes = new Map<string, number>()
  for (const entry of publishedEntries ?? []) {
    const version = one(entry.schedule_versions)
    const schedule = one(version?.schedules)
    if (!entry.room_id || !schedule || schedule.published_version_id !== version?.id) continue
    if (schedule.status === 'archived') continue
    const minutes = timeToMinutes(entry.end_time) - timeToMinutes(entry.start_time)
    roomMinutes.set(entry.room_id, (roomMinutes.get(entry.room_id) ?? 0) + minutes)
  }

  const statusCounts = new Map<string, number>()
  for (const row of scheduleRows ?? []) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1)
  }

  return (
    <>
      <PageHead
        title="Reports"
        description="Teaching loads, room use and schedule status from the current records."
        actions={<PrintButton />}
      />

      <div className="stats-grid">
        <Stat label="Instructors" value={loads.length} />
        <Stat label="Over maximum load" value={overloaded} />
        <Stat label="Without classes" value={noClasses} />
        <Stat label="Published schedules" value={statusCounts.get('published') ?? 0} />
        <Stat label="Pending requests" value={pendingRequests ?? 0} />
      </div>

      <section className="panel">
        <h3>Teaching load</h3>
        <p className="muted">
          Weekly hours of active classes against each instructor&apos;s maximum.
        </p>
        {loads.length ? (
          <DataTable minWidth={720}>
            <thead>
              <tr>
                <th>Instructor</th>
                <th>Department</th>
                <th>Hours / maximum</th>
                <th className={styles.barHead}>Load</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((row) => {
                const over = row.max > 0 && row.assigned > row.max
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.employeeId}</small>
                    </td>
                    <td>{row.department}</td>
                    <td>
                      {row.assigned} h{row.max > 0 ? ` / ${row.max} h` : ''}
                      {over && (
                        <>
                          {' '}
                          <Badge tone="danger">Over</Badge>
                        </>
                      )}
                    </td>
                    <td>
                      <span className={styles.bar} aria-hidden="true">
                        <span
                          className={over ? styles.barOver : styles.barFill}
                          style={{ width: `${Math.round((row.share / 1.25) * 100)}%` }}
                        />
                        <span className={styles.barMax} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        ) : (
          <Empty title="No instructors yet" text="Approved instructors appear here." />
        )}
      </section>

      <section className="panel">
        <h3>Room use</h3>
        <p className="muted">
          Hours booked by published schedules each week, out of {hours(weekMinutes)} teaching hours
          (Settings).
        </p>
        {roomRows?.length ? (
          <DataTable minWidth={720}>
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Booked</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {roomRows.map((room) => {
                const used = roomMinutes.get(room.id) ?? 0
                const percent = weekMinutes ? Math.round((used / weekMinutes) * 100) : 0
                return (
                  <tr key={room.id}>
                    <td>
                      <strong>{room.code}</strong>
                      <small>{room.name}</small>
                    </td>
                    <td>{one(room.room_types)?.name ?? 'General'}</td>
                    <td>{room.capacity}</td>
                    <td>
                      {hours(used)} h <small>{percent}% of the week</small>
                    </td>
                    <td>
                      <Badge tone={room.is_active ? 'success' : 'default'}>
                        {room.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        ) : (
          <Empty title="No rooms yet" text="Add rooms in Rooms & Labs." />
        )}
      </section>
    </>
  )
}

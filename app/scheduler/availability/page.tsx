import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Badge, Empty } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { one } from '@/lib/relations'
import { DAY_SHORT_NAMES, formatTime12, humanize } from '@/lib/format'
import styles from './page.module.css'

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler'])
  const s = await createClient()

  const departmentsResult = await s
    .from('scheduler_departments')
    .select('department_id')
    .eq('profile_id', profile.id)
    .eq('active', true)

  const departmentIds = (departmentsResult.data ?? [])
    .map((item) => item.department_id)
    .filter(Boolean)

  const facultyQuery = departmentIds.length
    ? s
        .from('faculty_profiles')
        .select(
          'id, employee_id, profiles!inner(full_name, account_status), departments(code,name)'
        )
        .eq('profiles.account_status', 'approved')
        .in('department_id', departmentIds)
    : s
        .from('faculty_profiles')
        .select(
          'id, employee_id, profiles!inner(full_name, account_status), departments(code,name)'
        )
        .eq('profiles.account_status', 'approved')

  const facultyResult = await facultyQuery
  const faculty = facultyResult.data ?? []
  const facultyIds = faculty.map((item) => item.id).filter(Boolean)
  const availabilityResult = facultyIds.length
    ? await s
        .from('faculty_availability')
        .select('id, faculty_id, day_of_week, start_time, end_time, availability_type')
        .in('faculty_id', facultyIds)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })
    : null
  const availability = availabilityResult?.data ?? []

  const availabilityByFaculty = new Map<string, typeof availability>()
  for (const item of availability) {
    const current = availabilityByFaculty.get(item.faculty_id) ?? []
    current.push(item)
    availabilityByFaculty.set(item.faculty_id, current)
  }

  const days = [1, 2, 3, 4, 5, 6]
  const rows = faculty
    .map((member) => {
      const records = availabilityByFaculty.get(member.id) ?? []
      return {
        id: member.id,
        name: one(member.profiles)?.full_name || member.employee_id || 'Instructor',
        employeeId: member.employee_id || '—',
        records,
      }
    })
    .sort((a, b) =>
      a.records.length === 0 && b.records.length > 0
        ? -1
        : b.records.length === 0 && a.records.length > 0
          ? 1
          : a.name.localeCompare(b.name)
    )
  const missing = rows.filter((row) => !row.records.length).length

  return (
    <>
      <PageHead
        title="Availability"
        description="When each instructor can teach. The generator only places classes inside these times; instructors with no availability can be placed at any time."
      />
      <div className="stats-grid">
        <Stat label="Instructors" value={rows.length} />
        <Stat label="Not entered yet" value={missing} />
        <Stat label="Time windows" value={availability.length} />
      </div>
      <section className="panel">
        {rows.length ? (
          <DataTable minWidth={900}>
            <thead>
              <tr>
                <th>Instructor</th>
                {days.map((day) => (
                  <th key={day}>{DAY_SHORT_NAMES[day]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <small>{row.employeeId}</small>
                  </td>
                  {row.records.length ? (
                    days.map((day) => {
                      const windows = row.records.filter(
                        (record) => Number(record.day_of_week) === day
                      )
                      return (
                        <td key={day} className={styles.cell}>
                          {windows.length ? (
                            windows.map((record) => (
                              <span
                                key={record.id}
                                className={`${styles.window} ${styles[record.availability_type] ?? ''}`}
                                title={humanize(record.availability_type)}
                              >
                                {formatTime12(record.start_time)}–{formatTime12(record.end_time)}
                              </span>
                            ))
                          ) : (
                            <span className={styles.off}>—</span>
                          )}
                        </td>
                      )
                    })
                  ) : (
                    <td colSpan={days.length}>
                      <Badge tone="warning">Not entered yet</Badge>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty
            title="No instructors in your department"
            text="Instructors appear here once the Administrator sets up their records."
          />
        )}
        <p className={styles.legend}>
          <span className={styles.window}>Available</span>
          <span className={`${styles.window} ${styles.preferred}`}>Preferred</span>
          <span className={`${styles.window} ${styles.unavailable}`}>Unavailable</span>
        </p>
      </section>
    </>
  )
}

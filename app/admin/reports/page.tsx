import { DataTable } from '@/components/data-table'
import { Badge, Empty, PageHead, Stat } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import { one } from '@/lib/relations'

export default async function Page() {
  const supabase = await createClient()

  const [
    { count: users },
    { count: faculty },
    { count: rooms },
    { count: subjects },
    { count: offerings },
    { count: schedules },
    { count: changes },
    { data: roomRows },
    { data: facultyRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('faculty_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('rooms').select('id', { count: 'exact', head: true }),
    supabase.from('subjects').select('id', { count: 'exact', head: true }),
    supabase.from('class_offerings').select('id', { count: 'exact', head: true }),
    supabase.from('schedules').select('id', { count: 'exact', head: true }),
    supabase.from('schedule_change_requests').select('id', { count: 'exact', head: true }),
    supabase.from('rooms').select('id,code,name,capacity,is_active').order('code'),
    supabase
      .from('faculty_profiles')
      .select(
        'id,employee_id,max_teaching_load,profiles(full_name),class_offerings(id,required_weekly_hours)'
      )
      .order('employee_id'),
  ])

  return (
    <>
      <PageHead
        eyebrow="REPORTING"
        title="Reports"
        description="Live operational summaries generated from AlterSched records."
      />
      <div className="stats-grid">
        <Stat label="Accounts" value={users || 0} />
        <Stat label="Faculty" value={faculty || 0} />
        <Stat label="Rooms" value={rooms || 0} />
        <Stat label="Subjects" value={subjects || 0} />
        <Stat label="Offerings" value={offerings || 0} />
        <Stat label="Schedules" value={schedules || 0} />
        <Stat label="Alterations" value={changes || 0} />
      </div>
      <div className="panel">
        <h3>Faculty Teaching Load</h3>
        {facultyRows?.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Employee ID</th>
                <th>Assigned Hours</th>
                <th>Maximum Load</th>
              </tr>
            </thead>
            <tbody>
              {facultyRows.map((facultyRow) => (
                <tr key={facultyRow.id}>
                  <td>{one(facultyRow.profiles)?.full_name || '—'}</td>
                  <td>{facultyRow.employee_id}</td>
                  <td>
                    {(facultyRow.class_offerings ?? []).reduce(
                      (
                        total: number,
                        offering: { required_weekly_hours: number | string | null }
                      ) => total + Number(offering.required_weekly_hours || 0),
                      0
                    )}
                  </td>
                  <td>{facultyRow.max_teaching_load ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No faculty records." />
        )}
      </div>
      <div className="panel">
        <h3>Room Inventory</h3>
        {roomRows?.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Room</th>
                <th>Name</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {roomRows.map((room) => (
                <tr key={room.id}>
                  <td>{room.code}</td>
                  <td>{room.name}</td>
                  <td>{room.capacity}</td>
                  <td>
                    <Badge>{room.is_active ? 'active' : 'inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No room records." />
        )}
      </div>
    </>
  )
}

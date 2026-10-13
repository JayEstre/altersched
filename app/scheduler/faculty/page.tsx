<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import { PageHead, Stat, Badge, Empty } from '@/components/ui'
import { one } from '@/lib/relations'

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler'])
  const s = await createClient()
=======
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/data-table';
import { PageHead, Stat, Badge, Empty } from '@/components/ui';

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler']);
  const s = await createClient();
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  const [facultyResult, offeringsResult, departmentsResult] = await Promise.all([
    s
      .from('faculty_profiles')
<<<<<<< HEAD
      .select(
        'id,employee_id,max_teaching_load,profiles(full_name),departments(code,name),class_offerings(id,required_weekly_hours)'
      )
=======
      .select('id,employee_id,max_teaching_load,profiles(full_name),departments(code,name),class_offerings(id,required_weekly_hours)')
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      .order('employee_id'),
    s
      .from('class_offerings')
      .select('id,faculty_id,required_weekly_hours')
      .not('faculty_id', 'is', null),
    s
      .from('scheduler_departments')
      .select('department_id,departments(code,name)')
      .eq('profile_id', profile.id)
      .eq('active', true),
<<<<<<< HEAD
  ])

  const faculty = facultyResult.data ?? []
  const offerings = offeringsResult.data ?? []
  const departments = departmentsResult.data ?? []
  const loadByFaculty = new Map<string, number>()
  for (const offering of offerings) {
    const key = String(offering.faculty_id ?? '')
    if (!key) continue
    const current = loadByFaculty.get(key) ?? 0
    loadByFaculty.set(key, current + Number(offering.required_weekly_hours ?? 0))
  }

  const facultyRows = faculty.map((member) => {
    const totalLoad = loadByFaculty.get(member.id) ?? 0
    const maxLoad = Number(member.max_teaching_load ?? 0)
    const status =
      maxLoad > 0
        ? totalLoad > maxLoad
          ? 'Overload'
          : totalLoad >= maxLoad * 0.8
            ? 'High'
            : 'Healthy'
        : 'Unbounded'
=======
  ]);

  const faculty = facultyResult.data ?? [];
  const offerings = offeringsResult.data ?? [];
  const departments = departmentsResult.data ?? [];

  const loadByFaculty = new Map<string, number>();
  for (const offering of offerings) {
    const key = String(offering.faculty_id ?? '');
    if (!key) continue;
    const current = loadByFaculty.get(key) ?? 0;
    loadByFaculty.set(key, current + Number(offering.required_weekly_hours ?? 0));
  }

  const facultyRows = faculty.map((member: any) => {
    const totalLoad = loadByFaculty.get(member.id) ?? 0;
    const maxLoad = Number(member.max_teaching_load ?? 0);
    const status = maxLoad > 0 ? (totalLoad > maxLoad ? 'Overload' : totalLoad >= maxLoad * 0.8 ? 'High' : 'Healthy') : 'Unbounded';
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    return {
      ...member,
      totalLoad,
      maxLoad,
      status,
<<<<<<< HEAD
      department: one(member.departments)?.code || '—',
      fullName: one(member.profiles)?.full_name || member.employee_id || 'Unknown faculty',
    }
  })

  const overloadCount = facultyRows.filter(
    (member) => member.maxLoad > 0 && member.totalLoad > member.maxLoad
  ).length
  const highLoadCount = facultyRows.filter(
    (member) =>
      member.maxLoad > 0 &&
      member.totalLoad >= member.maxLoad * 0.8 &&
      member.totalLoad <= member.maxLoad
  ).length
  const averageLoad = facultyRows.length
    ? Math.round(
        facultyRows.reduce((sum, member) => sum + member.totalLoad, 0) / facultyRows.length
      )
    : 0
=======
      department: member.departments?.[0]?.code || '—',
      fullName: member.profiles?.[0]?.full_name || member.employee_id || 'Unknown faculty',
    };
  });

  const overloadCount = facultyRows.filter((member) => member.maxLoad > 0 && member.totalLoad > member.maxLoad).length;
  const highLoadCount = facultyRows.filter((member) => member.maxLoad > 0 && member.totalLoad >= member.maxLoad * 0.8 && member.totalLoad <= member.maxLoad).length;
  const averageLoad = facultyRows.length ? Math.round(facultyRows.reduce((sum, member) => sum + member.totalLoad, 0) / facultyRows.length) : 0;
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return (
    <>
      <PageHead
        eyebrow="RESOURCES"
        title="Faculty"
        description="Faculty workload and teaching capacity across the scheduler’s active departments."
      />
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <div className="stats-grid">
        <Stat label="Faculty Members" value={facultyRows.length} hint="Tracked in the roster" />
        <Stat label="Average Load" value={`${averageLoad}h`} hint="Current teaching load" />
        <Stat label="Overload Risk" value={overloadCount} hint="Above approved max" />
        <Stat label="High Load" value={highLoadCount} hint="Near capacity" />
      </div>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Instructor workload summary</h3>
            <p>Compare assigned teaching load against each faculty member’s approved max.</p>
          </div>
        </div>
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        {facultyRows.length ? (
          <DataTable minWidth={760}>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Assigned Load</th>
                <th>Max Load</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {facultyRows.map((member) => {
<<<<<<< HEAD
                const tone =
                  member.status === 'Overload'
                    ? 'danger'
                    : member.status === 'High'
                      ? 'warning'
                      : member.status === 'Healthy'
                        ? 'success'
                        : 'info'
=======
                const tone = member.status === 'Overload' ? 'danger' : member.status === 'High' ? 'warning' : member.status === 'Healthy' ? 'success' : 'info';
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                return (
                  <tr key={member.id}>
                    <td>{member.fullName}</td>
                    <td>{member.employee_id || '—'}</td>
                    <td>{member.department}</td>
                    <td>{member.totalLoad}h</td>
                    <td>{member.maxLoad ? `${member.maxLoad}h` : '—'}</td>
<<<<<<< HEAD
                    <td>
                      <Badge tone={tone}>{member.status}</Badge>
                    </td>
                  </tr>
                )
=======
                    <td><Badge tone={tone}>{member.status}</Badge></td>
                  </tr>
                );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              })}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No faculty records are available for this scheduler scope." />
        )}
      </div>
<<<<<<< HEAD
      <div className="panel">
        <h3>Assigned department scope</h3>
        <p className="muted">
          {departments
            .map((item) => one(item.departments)?.code)
            .filter(Boolean)
            .join(', ') || 'No active department assignment.'}
        </p>
      </div>
    </>
  )
}
=======

      <div className="panel">
        <h3>Assigned department scope</h3>
        <p className="muted">
          {departments.map((item: any) => item.departments?.[0]?.code).filter(Boolean).join(', ') || 'No active department assignment.'}
        </p>
      </div>
    </>
  );
}

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

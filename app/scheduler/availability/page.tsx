import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { PageHead, Stat, Badge, Empty } from '@/components/ui';
import { DataTable } from '@/components/data-table';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toDisplayTime(value: string | null | undefined) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}

function availabilityTone(value: string | null | undefined) {
  if (value === 'preferred') return 'success';
  if (value === 'unavailable') return 'danger';
  return 'info';
}

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler']);
  const s = await createClient();

  const departmentsResult = await s
    .from('scheduler_departments')
    .select('department_id')
    .eq('profile_id', profile.id)
    .eq('active', true);

  const departmentIds = (departmentsResult.data ?? []).map((item: any) => item.department_id).filter(Boolean);

  const facultyQuery = departmentIds.length
    ? s
        .from('faculty_profiles')
        .select('id, employee_id, profiles(full_name), departments(code,name)')
        .in('department_id', departmentIds)
    : s
        .from('faculty_profiles')
        .select('id, employee_id, profiles(full_name), departments(code,name)');

  const facultyResult = await facultyQuery;
  const faculty = facultyResult.data ?? [];

  const facultyIds = faculty.map((item: any) => item.id).filter(Boolean);

  let availability: any[] = [];

  if (facultyIds.length) {
    const availabilityResult = await s
      .from('faculty_availability')
      .select('id, faculty_id, day_of_week, start_time, end_time, availability_type')
      .in('faculty_id', facultyIds)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    availability = availabilityResult.data ?? [];
  }

  const availabilityByFaculty = new Map<string, any[]>();
  for (const item of availability) {
    const current = availabilityByFaculty.get(item.faculty_id) ?? [];
    current.push(item);
    availabilityByFaculty.set(item.faculty_id, current);
  }

  const facultyWithAvailability = faculty.map((member: any) => {
    const records = availabilityByFaculty.get(member.id) ?? [];
    return {
      id: member.id,
      name: member.profiles?.[0]?.full_name || member.employee_id || 'Unknown faculty',
      employeeId: member.employee_id || '—',
      department: member.departments?.[0]?.code || '—',
      schedule: records
        .slice(0, 3)
        .map((record: any) => `${DAYS[(Number(record.day_of_week) || 1) - 1] || 'Day'} ${toDisplayTime(record.start_time)}-${toDisplayTime(record.end_time)}`)
        .join(', ') || 'No availability entered',
      type: records[0]?.availability_type || 'available',
    };
  });

  const availabilityCount = availability.length;
  const preferredCount = availability.filter((item) => item.availability_type === 'preferred').length;
  const unavailableCount = availability.filter((item) => item.availability_type === 'unavailable').length;

  return (
    <>
      <PageHead
        eyebrow="PLANNING"
        title="Availability Overview"
        description="Check faculty scheduling preferences and constraints across the scheduler’s assigned departments."
      />

      <div className="stats-grid">
        <Stat label="Faculty Tracked" value={faculty.length} hint="In assigned scope" />
        <Stat label="Availability Records" value={availabilityCount} hint="Current schedule windows" />
        <Stat label="Preferred Slots" value={preferredCount} hint="High-priority availability" />
        <Stat label="Unavailable Slots" value={unavailableCount} hint="Blocked periods" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Faculty availability summary</h3>
            <p>Quick check of the current availability signals recorded for faculty in your assigned scope.</p>
          </div>
        </div>

        {facultyWithAvailability.length ? (
          <DataTable minWidth={760}>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Department</th>
                <th>Employee ID</th>
                <th>Current Availability</th>
                <th>Primary Status</th>
              </tr>
            </thead>
            <tbody>
              {facultyWithAvailability.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.department}</td>
                  <td>{member.employeeId}</td>
                  <td>{member.schedule}</td>
                  <td><Badge tone={availabilityTone(member.type)}>{member.type}</Badge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No faculty availability has been recorded yet for this scheduler scope." />
        )}
      </div>
    </>
  );
}

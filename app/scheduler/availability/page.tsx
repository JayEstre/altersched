<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Badge, Empty } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { one } from '@/lib/relations'
import { DAY_NAMES, formatTime } from '@/lib/format'

function availabilityTone(value: string | null | undefined) {
  if (value === 'preferred') return 'success'
  if (value === 'unavailable') return 'danger'
  return 'info'
}

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler'])
  const s = await createClient()
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  const departmentsResult = await s
    .from('scheduler_departments')
    .select('department_id')
    .eq('profile_id', profile.id)
<<<<<<< HEAD
    .eq('active', true)

  const departmentIds = (departmentsResult.data ?? [])
    .map((item) => item.department_id)
    .filter(Boolean)
=======
    .eq('active', true);

  const departmentIds = (departmentsResult.data ?? []).map((item: any) => item.department_id).filter(Boolean);
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  const facultyQuery = departmentIds.length
    ? s
        .from('faculty_profiles')
        .select('id, employee_id, profiles(full_name), departments(code,name)')
        .in('department_id', departmentIds)
    : s
        .from('faculty_profiles')
<<<<<<< HEAD
        .select('id, employee_id, profiles(full_name), departments(code,name)')

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

  const facultyWithAvailability = faculty.map((member) => {
    const records = availabilityByFaculty.get(member.id) ?? []
    return {
      id: member.id,
      name: one(member.profiles)?.full_name || member.employee_id || 'Unknown faculty',
      employeeId: member.employee_id || '—',
      department: one(member.departments)?.code || '—',
      schedule:
        records
          .slice(0, 3)
          .map(
            (record) =>
              `${DAY_NAMES[Number(record.day_of_week)] || 'Day'} ${formatTime(record.start_time)}-${formatTime(record.end_time)}`
          )
          .join(', ') || 'No availability entered',
      type: records[0]?.availability_type || 'available',
    }
  })

  const availabilityCount = availability.length
  const preferredCount = availability.filter(
    (item) => item.availability_type === 'preferred'
  ).length
  const unavailableCount = availability.filter(
    (item) => item.availability_type === 'unavailable'
  ).length
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return (
    <>
      <PageHead
        eyebrow="PLANNING"
        title="Availability Overview"
        description="Check faculty scheduling preferences and constraints across the scheduler’s assigned departments."
      />
<<<<<<< HEAD
      <div className="stats-grid">
        <Stat label="Faculty Tracked" value={faculty.length} hint="In assigned scope" />
        <Stat
          label="Availability Records"
          value={availabilityCount}
          hint="Current schedule windows"
        />
        <Stat label="Preferred Slots" value={preferredCount} hint="High-priority availability" />
        <Stat label="Unavailable Slots" value={unavailableCount} hint="Blocked periods" />
      </div>
=======

      <div className="stats-grid">
        <Stat label="Faculty Tracked" value={faculty.length} hint="In assigned scope" />
        <Stat label="Availability Records" value={availabilityCount} hint="Current schedule windows" />
        <Stat label="Preferred Slots" value={preferredCount} hint="High-priority availability" />
        <Stat label="Unavailable Slots" value={unavailableCount} hint="Blocked periods" />
      </div>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Faculty availability summary</h3>
<<<<<<< HEAD
            <p>
              Quick check of the current availability signals recorded for faculty in your assigned
              scope.
            </p>
          </div>
        </div>
=======
            <p>Quick check of the current availability signals recorded for faculty in your assigned scope.</p>
          </div>
        </div>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
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
<<<<<<< HEAD
                  <td>
                    <Badge tone={availabilityTone(member.type)}>{member.type}</Badge>
                  </td>
=======
                  <td><Badge tone={availabilityTone(member.type)}>{member.type}</Badge></td>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No faculty availability has been recorded yet for this scheduler scope." />
        )}
      </div>
    </>
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

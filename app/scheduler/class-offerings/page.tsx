import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { DataTable } from '@/components/data-table';
import { PageHead, Stat, Empty, Badge } from '@/components/ui';

export default async function Page() {
  await requireRole(['department_scheduler']);

  const s = await createClient();

  const [offeringsResult, departmentsResult] = await Promise.all([
    s
      .from('class_offerings')
      .select(`
        id,
        status,
        expected_students,
        required_weekly_hours,
        faculty_id,
        subject_id,
        sections(code,capacity),
        subjects(code,name),
        faculty_profiles(employee_id,profiles(full_name))
      `)
      .order('created_at', { ascending: false }),
    s
      .from('scheduler_departments')
      .select('department_id,departments(code,name)')
      .eq('active', true),
  ]);

  const offerings = offeringsResult.data ?? [];
  const departments = departmentsResult.data ?? [];

  const unassigned = offerings.filter((offering: any) => !offering.faculty_id);
  const highLoad = offerings.filter((offering: any) => Number(offering.required_weekly_hours ?? 0) >= 18);
  const capacityRisks = offerings.filter((offering: any) => {
    const expected = Number(offering.expected_students ?? 0);
    const capacity = Number(offering.sections?.[0]?.capacity ?? 0);
    return capacity > 0 && expected > capacity;
  });

  const rows = offerings.map((offering: any) => {
    const facultyName = offering.faculty_profiles?.[0]?.profiles?.[0]?.full_name || 'Unassigned';
    const status = !offering.faculty_id ? 'Unassigned' : Number(offering.required_weekly_hours ?? 0) >= 18 ? 'Heavy load' : 'Ready';
    const tone = !offering.faculty_id ? 'warning' : capacityRisks.some((risk: any) => risk.id === offering.id) ? 'info' : 'success';

    return {
      ...offering,
      facultyName,
      status,
      tone,
    };
  });

  return (
    <>
      <PageHead
        eyebrow="INPUTS"
        title="Class Offerings"
        description="Review teaching requirements, load pressure, and assignment readiness before the schedule is finalized."
      />

      <div className="stats-grid">
        <Stat label="Offerings" value={offerings.length} hint="Current teaching inputs" />
        <Stat label="Unassigned" value={unassigned.length} hint="Waiting for faculty assignment" />
        <Stat label="High Load" value={highLoad.length} hint="18+ weekly hours" />
        <Stat label="Capacity Risks" value={capacityRisks.length} hint="Expected students exceed capacity" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Offering readiness</h3>
            <p>Operational view of the assigned teaching inputs that feed the draft schedule.</p>
          </div>
        </div>

        {rows.length ? (
          <DataTable minWidth={820}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Section</th>
                <th>Faculty</th>
                <th>Hours</th>
                <th>Expected</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((offering: any) => (
                <tr key={offering.id}>
                  <td>{offering.subjects?.[0]?.code || '—'}</td>
                  <td>{offering.sections?.[0]?.code || '—'}</td>
                  <td>{offering.facultyName}</td>
                  <td>{offering.required_weekly_hours ?? 0} hrs</td>
                  <td>{offering.expected_students ?? 0}</td>
                  <td><Badge tone={offering.tone}>{offering.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No class offerings are currently available for scheduling." />
        )}
      </div>

      <div className="panel">
        <h3>Department scope</h3>
        <p className="muted">
          {departments.map((item: any) => item.departments?.[0]?.code).filter(Boolean).join(', ') || 'No active department assignment.'}
        </p>
      </div>
    </>
  );
}


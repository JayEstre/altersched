import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { PageHead, Stat, Badge, Empty } from '@/components/ui';
import { DataTable } from '@/components/data-table';

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler']);
  const s = await createClient();

  const [
    departmentsResult,
    offeringsResult,
    facultyResult,
  ] = await Promise.all([
    s
      .from('scheduler_departments')
      .select('department_id,departments(code,name)')
      .eq('profile_id', profile.id)
      .eq('active', true),

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
      .from('faculty_profiles')
      .select(`
        id,
        employee_id,
        max_teaching_load,
        profiles(full_name),
        class_offerings(id,required_weekly_hours)
      `)
      .order('employee_id'),
  ]);

  const departments = departmentsResult.data ?? [];
  const offerings = offeringsResult.data ?? [];
  const facultyRecords = facultyResult.data ?? [];

  const unassigned = offerings.filter((offering: any) => !offering.faculty_id);

  const capacityRisks = offerings
    .filter((offering: any) => {
      const expected = Number(offering.expected_students ?? 0);
      const capacity = Number(offering.sections?.[0]?.capacity ?? 0);
      return capacity > 0 && expected > capacity;
    })
    .map((offering: any) => ({
      id: offering.id,
      subject: offering.subjects?.[0]?.code || 'Unknown subject',
      section: offering.sections?.[0]?.code || 'No section',
      expected: Number(offering.expected_students ?? 0),
      capacity: Number(offering.sections?.[0]?.capacity ?? 0),
    }));

  const loadRisks = facultyRecords
    .map((faculty: any) => {
      const totalLoad = (faculty.class_offerings ?? []).reduce(
        (sum: number, item: any) => sum + Number(item.required_weekly_hours ?? 0),
        0
      );

      return {
        id: faculty.id,
        name: faculty.profiles?.[0]?.full_name || faculty.employee_id || 'Unknown faculty',
        employeeId: faculty.employee_id || '—',
        maxLoad: Number(faculty.max_teaching_load ?? 0),
        totalLoad,
      };
    })
    .filter((faculty) => faculty.maxLoad > 0 && faculty.totalLoad > faculty.maxLoad)
    .sort((a, b) => b.totalLoad - a.totalLoad);

  const riskScore = unassigned.length * 3 + capacityRisks.length * 2 + loadRisks.length * 4;

  const priorityItems = [
    {
      label: 'Faculty overload',
      value: loadRisks.length,
      tone: 'danger' as const,
      detail: 'Assignments above approved teaching maximum',
    },
    {
      label: 'Unassigned offerings',
      value: unassigned.length,
      tone: 'warning' as const,
      detail: 'Courses waiting for faculty assignment',
    },
    {
      label: 'Capacity risks',
      value: capacityRisks.length,
      tone: 'info' as const,
      detail: 'Expected enrollment exceeds section capacity',
    },
  ];

  const decisionQueue = [
    ...loadRisks.slice(0, 3).map((faculty) => ({
      id: `faculty-${faculty.id}`,
      title: faculty.name,
      subtitle: `${faculty.totalLoad}h assigned vs ${faculty.maxLoad}h limit`,
      tone: 'danger' as const,
      kind: 'Faculty overload',
    })),
    ...unassigned.slice(0, 3).map((offering: any) => ({
      id: `offering-${offering.id}`,
      title: offering.subjects?.[0]?.code || 'Unassigned subject',
      subtitle: `${offering.sections?.[0]?.code || 'No section'} • ${offering.expected_students ?? 0} expected students`,
      tone: 'warning' as const,
      kind: 'Unassigned offering',
    })),
    ...capacityRisks.slice(0, 3).map((risk) => ({
      id: `capacity-${risk.id}`,
      title: risk.section,
      subtitle: `${risk.expected} students vs ${risk.capacity} capacity`,
      tone: 'info' as const,
      kind: 'Capacity risk',
    })),
  ];

  return (
    <>
      <PageHead
        eyebrow="VALIDATION"
        title="Conflict & Capacity Monitor"
        description="Review the current scheduling risk areas before a draft is submitted for review or publication."
      />

      <div className="stats-grid">
        <Stat label="Risk Score" value={riskScore} hint="Weighted operational pressure" />
        <Stat label="Unassigned Offerings" value={unassigned.length} hint="Need faculty assignment" />
        <Stat label="Capacity Risks" value={capacityRisks.length} hint="Enrollment exceeds capacity" />
        <Stat label="Faculty Overload" value={loadRisks.length} hint="Above max teaching load" />
        <Stat label="Assigned Departments" value={departments.length || 0} hint="Active scheduler scope" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Priority watchlist</h3>
            <p>These are the blocking issues most likely to delay a clean schedule review.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {priorityItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-soft)', marginBottom: '3px' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.detail}</div>
              </div>
              <Badge tone={item.tone}>{item.value}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Top blockers to resolve first</h3>
            <p>Highest-impact items that should be handled before review or publication.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {decisionQueue.length ? (
            decisionQueue.map((item) => (
              <div key={item.id} style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong>{item.title}</strong>
                  <Badge tone={item.tone}>{item.kind}</Badge>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.subtitle}</div>
              </div>
            ))
          ) : (
            <Empty text="No blockers found. The schedule is currently in a clean state." />
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Faculty load risks</h3>
            <p>Instructors currently above their approved teaching load.</p>
          </div>
        </div>

        {loadRisks.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Employee ID</th>
                <th>Assigned</th>
                <th>Max Load</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadRisks.map((faculty) => (
                <tr key={faculty.id}>
                  <td>{faculty.name}</td>
                  <td>{faculty.employeeId}</td>
                  <td>{faculty.totalLoad} hrs</td>
                  <td>{faculty.maxLoad} hrs</td>
                  <td><Badge tone="danger">Overloaded</Badge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No faculty teaching load issues detected at the moment." />
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Unassigned course offerings</h3>
            <p>Offerings waiting for faculty assignment before a draft is valid.</p>
          </div>
        </div>

        {unassigned.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Section</th>
                <th>Expected Students</th>
                <th>Assigned Faculty</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.slice(0, 10).map((offering: any) => (
                <tr key={offering.id}>
                  <td>{offering.subjects?.[0]?.code || '—'}</td>
                  <td>{offering.sections?.[0]?.code || '—'}</td>
                  <td>{offering.expected_students ?? 0}</td>
                  <td><Badge tone="warning">Unassigned</Badge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="All active offerings are assigned to faculty." />
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Capacity risks</h3>
            <p>Sections where expected enrollment exceeds the available capacity.</p>
          </div>
        </div>

        {capacityRisks.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Section</th>
                <th>Expected</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {capacityRisks.map((risk) => (
                <tr key={risk.id}>
                  <td>{risk.subject}</td>
                  <td>{risk.section}</td>
                  <td>{risk.expected}</td>
                  <td>{risk.capacity}</td>
                  <td><Badge tone="info">Over limit</Badge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <Empty text="No immediate room or section capacity risks found." />
        )}
      </div>
    </>
  );
}

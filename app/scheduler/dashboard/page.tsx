import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { PageHead, Stat, Badge, Empty } from '@/components/ui';

export const revalidate = 60;

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler']);
  const s = await createClient();

  const [
    departmentsResult,
    offeringsResult,
    schedulesResult,
    pendingRequestsResult,
    facultyResult,
  ] = await Promise.all([
    s
      .from('scheduler_departments')
      .select('department_id,departments(code,name)')
      .eq('profile_id', profile.id)
      .eq('active', true),

    s
      .from('class_offerings')
      .select('id,faculty_id,expected_students,required_weekly_hours,sections(code,capacity)')
      .order('created_at', { ascending: false }),

    s.from('schedules').select('id', { count: 'exact', head: true }),

    s
      .from('schedule_change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    s
      .from('faculty_profiles')
      .select('id,employee_id,max_teaching_load,profiles(full_name),class_offerings(id,required_weekly_hours)')
      .order('employee_id'),
  ]);

  const departments = departmentsResult.data ?? [];
  const offerings = offeringsResult.data ?? [];
  const schedulesCount = schedulesResult.count ?? 0;
  const pendingRequestsCount = pendingRequestsResult.count ?? 0;
  const facultyRecords = facultyResult.data ?? [];

  const unassignedOfferings = offerings.filter((offering: any) => !offering.faculty_id);

  const facultyOverloads = facultyRecords
    .map((faculty: any) => {
      const totalLoad = (faculty.class_offerings ?? []).reduce(
        (sum: number, item: any) => sum + Number(item.required_weekly_hours ?? 0),
        0
      );

      return {
        id: faculty.id,
        name: faculty.profiles?.[0]?.full_name || faculty.employee_id || 'Unknown faculty',
        totalLoad,
        maxLoad: Number(faculty.max_teaching_load ?? 0),
      };
    })
    .filter((item) => item.maxLoad > 0 && item.totalLoad > item.maxLoad)
    .sort((a, b) => b.totalLoad - a.totalLoad);

  const capacityRisks = offerings
    .filter((offering: any) => {
      const expected = Number(offering.expected_students ?? 0);
      const sectionCapacity = Number(offering.sections?.[0]?.capacity ?? 0);
      return sectionCapacity > 0 && expected > sectionCapacity;
    })
    .slice(0, 5);

  const priorityItems = [
    {
      label: 'Unassigned offerings',
      value: unassignedOfferings.length,
      tone: 'warning' as const,
      detail: 'Offerings still waiting for faculty assignment',
    },
    {
      label: 'Faculty overload risk',
      value: facultyOverloads.length,
      tone: 'danger' as const,
      detail: 'Faculty load exceeds allowed max teaching hours',
    },
    {
      label: 'Capacity risks',
      value: capacityRisks.length,
      tone: 'info' as const,
      detail: 'Section demand exceeds room/section capacity',
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="WORKSPACE"
        title="Scheduler Dashboard"
        description="Prepare department schedules, validate conflicts, and coordinate alteration requests."
      />

      <div className="stats-grid">
        <Stat label="Assigned Departments" value={departments.length || 0} />
        <Stat label="Class Offerings" value={offerings.length || 0} />
        <Stat label="Schedules" value={schedulesCount} />
        <Stat label="Pending Requests" value={pendingRequestsCount} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Conflict watch</h3>
            <p>Priority issues requiring review before publication.</p>
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
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-soft)', marginBottom: '3px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.detail}</div>
              </div>

              <Badge tone={item.tone}>{item.value}</Badge>
            </div>
          ))}
        </div>
      </section>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Most urgent flags</h3>
            <p>Current issues most likely to block a clean draft.</p>
          </div>
        </div>

        {facultyOverloads.length || unassignedOfferings.length || capacityRisks.length ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {facultyOverloads.slice(0, 3).map((item) => (
              <div key={item.id} style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong>{item.name}</strong>
                  <Badge tone="danger">{item.totalLoad}h / {item.maxLoad}h</Badge>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Faculty load exceeds approved maximum.
                </div>
              </div>
            ))}

            {unassignedOfferings.slice(0, 3).map((offering: any) => (
              <div key={offering.id} style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong>{offering.sections?.[0]?.code || 'Offering'}</strong>
                  <Badge tone="warning">Unassigned</Badge>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {offering.expected_students ?? 0} expected students waiting for assignment.
                </div>
              </div>
            ))}

            {capacityRisks.slice(0, 3).map((offering: any) => (
              <div key={offering.id} style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <strong>{offering.sections?.[0]?.code || 'Section'}</strong>
                  <Badge tone="info">{offering.expected_students ?? 0} / {offering.sections?.[0]?.capacity ?? 0}</Badge>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Enrollment exceeds section capacity and needs review.
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No conflict flags detected in the current scheduling data." />
        )}
      </div>

      <div className="panel">
        <h3>Assigned Scope</h3>
        <p className="muted">
          {departments.map((item: any) => item.departments?.[0]?.code).filter(Boolean).join(', ') || 'No active department assignment.'}
        </p>
      </div>
    </>
  );
}

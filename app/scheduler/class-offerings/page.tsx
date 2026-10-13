<<<<<<< HEAD
import {
  ASSIGNMENT_MESSAGES,
  InstructorAssignmentTable,
  parseAssignmentView,
} from '@/components/assignments/instructor-assignment-table'
import { ActionResult, PageHead, Stat } from '@/components/ui'
import { loadAssignmentRows } from '@/lib/assignments'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(['department_scheduler'])
  const params = await searchParams
  const supabase = await createClient()

  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, name, is_active')
    .order('start_date', { ascending: false })
  const activeSemester =
    (semesters ?? []).find((semester) => semester.is_active) ?? semesters?.[0] ?? null
  const rows = await loadAssignmentRows(supabase, activeSemester?.id ?? null)

  const unassigned = rows.filter((row) => !row.facultyId).length
  const overloaded = new Set(
    rows.flatMap((row) =>
      row.candidates
        .filter((c) => c.id === row.facultyId && c.maxLoad > 0 && c.load > c.maxLoad)
        .map((c) => c.id)
    )
  ).size
  const noQualified = rows.filter((row) => !row.candidates.length).length
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return (
    <>
      <PageHead
        eyebrow="INPUTS"
<<<<<<< HEAD
        title="Scheduling Inputs"
        description="Review the classes to be scheduled and the instructor assigned to each. Instructors are assigned automatically when you generate; change any of them here."
      />
      <div className="stats-grid">
        <Stat
          label="Classes"
          value={rows.length}
          hint={activeSemester?.name ?? 'No active semester'}
        />
        <Stat label="Unassigned" value={unassigned} hint="Assigned on the next generation" />
        <Stat label="Over Max Load" value={overloaded} hint="Instructors above their limit" />
        <Stat label="No Qualified Instructor" value={noQualified} hint="Ask the Admin to add one" />
      </div>

      <ActionResult
        params={params}
        successMessages={ASSIGNMENT_MESSAGES.success}
        errorMessages={ASSIGNMENT_MESSAGES.error}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Instructor assignments</h3>
            <p>
              A change applies to the lecture and lab sessions of the class and updates its draft
              schedule right away. Manual choices are kept when you generate again.
            </p>
          </div>
        </div>
        <InstructorAssignmentTable
          rows={rows}
          view={parseAssignmentView(params.view)}
          basePath="/scheduler/class-offerings"
        />
      </section>
    </>
  )
}
=======
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

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

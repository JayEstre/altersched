import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Badge, Empty } from '@/components/ui'
import { one } from '@/lib/relations'
import styles from './page.module.css'

export const revalidate = 60

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler'])
  const s = await createClient()

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
      .select(
        'id,employee_id,max_teaching_load,profiles(full_name),class_offerings(id,required_weekly_hours)'
      )
      .order('employee_id'),
  ])

  const departments = departmentsResult.data ?? []
  const offerings = offeringsResult.data ?? []
  const schedulesCount = schedulesResult.count ?? 0
  const pendingRequestsCount = pendingRequestsResult.count ?? 0
  const facultyRecords = facultyResult.data ?? []
  const unassignedOfferings = offerings.filter((offering) => !offering.faculty_id)

  const facultyOverloads = facultyRecords
    .map((faculty) => {
      const totalLoad = (faculty.class_offerings ?? []).reduce(
        (sum: number, item: { required_weekly_hours: number | string | null }) =>
          sum + Number(item.required_weekly_hours ?? 0),
        0
      )

      return {
        id: faculty.id,
        name: one(faculty.profiles)?.full_name || faculty.employee_id || 'Unknown faculty',
        totalLoad,
        maxLoad: Number(faculty.max_teaching_load ?? 0),
      }
    })
    .filter((item) => item.maxLoad > 0 && item.totalLoad > item.maxLoad)
    .sort((a, b) => b.totalLoad - a.totalLoad)

  const capacityRisks = offerings
    .filter((offering) => {
      const expected = Number(offering.expected_students ?? 0)
      const sectionCapacity = Number(one(offering.sections)?.capacity ?? 0)
      return sectionCapacity > 0 && expected > sectionCapacity
    })
    .slice(0, 5)

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
  ]

  return (
    <div className={styles.scope}>
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
          <div className="list-stack">
            {priorityItems.map((item) => (
              <div className="list-row" key={item.label}>
                <div>
                  <div className="list-row-title">{item.label}</div>
                  <div className="list-row-meta">{item.detail}</div>
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
            <div className="list-stack">
              {facultyOverloads.slice(0, 3).map((item) => (
                <div className="list-card" key={item.id}>
                  <div className="list-card-head">
                    <strong>{item.name}</strong>
                    <Badge tone="danger">
                      {item.totalLoad}h / {item.maxLoad}h
                    </Badge>
                  </div>
                  <div className="list-card-meta">Faculty load exceeds approved maximum.</div>
                </div>
              ))}
              {unassignedOfferings.slice(0, 3).map((offering) => (
                <div className="list-card" key={offering.id}>
                  <div className="list-card-head">
                    <strong>{one(offering.sections)?.code || 'Offering'}</strong>
                    <Badge tone="warning">Unassigned</Badge>
                  </div>
                  <div className="list-card-meta">
                    {offering.expected_students ?? 0} expected class size waiting for assignment.
                  </div>
                </div>
              ))}
              {capacityRisks.slice(0, 3).map((offering) => (
                <div className="list-card" key={offering.id}>
                  <div className="list-card-head">
                    <strong>{one(offering.sections)?.code || 'Section'}</strong>
                    <Badge tone="info">
                      {offering.expected_students ?? 0} / {one(offering.sections)?.capacity ?? 0}
                    </Badge>
                  </div>
                  <div className="list-card-meta">
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
            {departments
              .map((item) => one(item.departments)?.code)
              .filter(Boolean)
              .join(', ') || 'No active department assignment.'}
          </p>
        </div>
      </>
    </div>
  )
}

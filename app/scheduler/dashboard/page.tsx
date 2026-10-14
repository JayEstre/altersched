import Link from 'next/link'
import { CheckCircle2, CircleAlert, CircleDashed } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat } from '@/components/ui'
import { one } from '@/lib/relations'
import styles from './page.module.css'

type StepState = 'done' | 'todo' | 'attention'

type Step = {
  title: string
  detail: string
  state: StepState
  href: string
  action: string
}

const ICONS = { done: CheckCircle2, todo: CircleDashed, attention: CircleAlert }

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()

  const [departmentsResult, offeringsResult, schedulesResult, requestsResult, facultyResult] =
    await Promise.all([
      supabase
        .from('scheduler_departments')
        .select('department_id, departments(code, name)')
        .eq('profile_id', profile.id)
        .eq('active', true),
      supabase.from('class_offerings').select('id, faculty_id').eq('status', 'active'),
      supabase.from('schedules').select('id, status, current_version_id, published_version_id'),
      supabase
        .from('schedule_change_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('faculty_profiles')
        .select(
          'id, max_teaching_load, profiles!inner(full_name, account_status), faculty_availability(id), class_offerings(required_weekly_hours, status)'
        )
        .eq('profiles.account_status', 'approved'),
    ])

  const departments = (departmentsResult.data ?? [])
    .map((row) => one(row.departments))
    .filter(Boolean)
  const offerings = offeringsResult.data ?? []
  const schedules = (schedulesResult.data ?? []).filter((item) => item.status !== 'archived')
  const pendingRequests = requestsResult.count ?? 0
  const faculty = facultyResult.data ?? []

  const unassigned = offerings.filter((item) => !item.faculty_id).length
  const withoutAvailability = faculty.filter((item) => !(item.faculty_availability ?? []).length)
  const overloaded = faculty.filter((item) => {
    const max = Number(item.max_teaching_load ?? 0)
    const load = (item.class_offerings ?? [])
      .filter((offering) => offering.status === 'active')
      .reduce((total, offering) => total + Number(offering.required_weekly_hours ?? 0), 0)
    return max > 0 && load > max
  })
  const drafts = schedules.filter((item) => item.status === 'draft')
  const submitted = schedules.filter((item) => item.status === 'submitted').length
  const published = schedules.filter((item) => item.published_version_id).length

  const steps: Step[] = [
    {
      title: 'Check the classes and instructors',
      detail: offerings.length
        ? unassigned
          ? `${unassigned} of ${offerings.length} classes have no instructor yet. They are assigned automatically when you generate.`
          : `All ${offerings.length} classes have an instructor.`
        : 'No classes yet. The Administrator prepares them from the curriculum.',
      state: !offerings.length ? 'attention' : unassigned ? 'todo' : 'done',
      href: '/scheduler/class-offerings',
      action: 'Scheduling inputs',
    },
    {
      title: 'Confirm instructor availability',
      detail: withoutAvailability.length
        ? `${withoutAvailability.length} instructor${withoutAvailability.length === 1 ? ' has' : 's have'} not entered availability, so their classes may be placed at any time.`
        : 'Every instructor has entered their availability.',
      state: withoutAvailability.length ? 'todo' : 'done',
      href: '/scheduler/availability',
      action: 'Availability',
    },
    {
      title: 'Generate and review the timetable',
      detail: drafts.length
        ? `${drafts.length} draft schedule${drafts.length === 1 ? '' : 's'} ready to review and edit.`
        : 'No draft yet. Generate the schedule to create one per block.',
      state: drafts.length ? 'done' : 'todo',
      href: '/scheduler/schedule-builder',
      action: 'Schedule builder',
    },
    {
      title: 'Submit for the Administrator to publish',
      detail: submitted
        ? `${submitted} schedule${submitted === 1 ? ' is' : 's are'} waiting for the Administrator.`
        : drafts.length
          ? 'Submit each draft when it has no conflicts.'
          : 'Nothing to submit yet.',
      state: drafts.length ? 'todo' : submitted || published ? 'done' : 'todo',
      href: '/scheduler/schedules',
      action: 'Schedules',
    },
    {
      title: 'Answer schedule requests',
      detail: pendingRequests
        ? `${pendingRequests} request${pendingRequests === 1 ? '' : 's'} from instructors waiting for your decision.`
        : 'No requests waiting.',
      state: pendingRequests ? 'attention' : 'done',
      href: '/scheduler/alterations',
      action: 'Requests',
    },
  ]

  return (
    <>
      <PageHead
        title="Dashboard"
        description={`Scheduling for ${
          departments.map((item) => item!.name).join(', ') || 'your department'
        }.`}
        actions={
          <Link href="/scheduler/schedule-builder" className="btn btn-primary">
            Open schedule builder
          </Link>
        }
      />

      <div className="stats-grid">
        <Stat label="Classes" value={offerings.length} />
        <Stat label="Without instructor" value={unassigned} />
        <Stat label="Draft schedules" value={drafts.length} />
        <Stat label="Published schedules" value={published} />
        <Stat label="Pending requests" value={pendingRequests} />
      </div>

      <section className="panel">
        <h3>Next steps</h3>
        <ol className={styles.steps}>
          {steps.map((step) => {
            const Icon = ICONS[step.state]
            return (
              <li key={step.title} className={styles[step.state]}>
                <Icon className={styles.icon} size={22} strokeWidth={2} aria-hidden="true" />
                <div className={styles.copy}>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
                <Link href={step.href} className="btn btn-outline btn-sm">
                  {step.action}
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      {overloaded.length > 0 && (
        <section className="panel">
          <h3>Instructors over their maximum load</h3>
          <p className="muted">
            Their assigned class hours are above the limit the Administrator set. Move a class to
            another instructor in Scheduling inputs.
          </p>
          <ul className={styles.overload}>
            {overloaded.map((item) => {
              const load = (item.class_offerings ?? [])
                .filter((offering) => offering.status === 'active')
                .reduce((total, offering) => total + Number(offering.required_weekly_hours ?? 0), 0)
              return (
                <li key={item.id}>
                  <strong>{one(item.profiles)?.full_name ?? 'Instructor'}</strong>
                  <span>
                    {load} h assigned · maximum {Number(item.max_teaching_load)} h
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}

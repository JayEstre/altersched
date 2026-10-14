import Link from 'next/link'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Badge } from '@/components/ui'
import { formatDate } from '@/lib/format'
import styles from './page.module.css'

type Task = { label: string; detail: string; href: string; action: string; count: number }

const STAGES: Record<string, { label: string; tone: 'info' | 'warning' | 'success' | 'default' }> =
  {
    draft: { label: 'Draft', tone: 'info' },
    submitted: { label: 'Waiting for you', tone: 'warning' },
    approved: { label: 'Approved', tone: 'info' },
    published: { label: 'Published', tone: 'success' },
    archived: { label: 'Archived', tone: 'default' },
  }

export default async function Page() {
  const supabase = await createClient()

  const [
    pendingAccounts,
    instructors,
    rooms,
    offerings,
    unassigned,
    submitted,
    published,
    pendingRequests,
    activeYear,
    activeSemester,
    recentSchedules,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['faculty', 'department_scheduler'])
      .eq('account_status', 'pending'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['faculty', 'department_scheduler'])
      .eq('account_status', 'approved'),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('class_offerings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('class_offerings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('faculty_id', null),
    supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted'),
    supabase
      .from('schedules')
      .select('id', { count: 'exact', head: true })
      .not('published_version_id', 'is', null)
      .neq('status', 'archived'),
    supabase
      .from('schedule_change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('academic_years').select('id, name').eq('is_active', true).maybeSingle(),
    supabase.from('semesters').select('id, name').eq('is_active', true).maybeSingle(),
    supabase
      .from('schedules')
      .select('id, title, status, updated_at, sections(code)')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(6),
  ])

  const term = [activeYear.data?.name, activeSemester.data?.name].filter(Boolean).join(' · ')

  const tasks: Task[] = [
    {
      label: 'Approve instructor accounts',
      detail: 'New registrations cannot sign in until you approve them.',
      href: '/admin/users?status=pending',
      action: 'Review accounts',
      count: pendingAccounts.count ?? 0,
    },
    {
      label: 'Publish submitted schedules',
      detail: 'The Department Scheduler sent these for your final review.',
      href: '/admin/schedules',
      action: 'Review schedules',
      count: submitted.count ?? 0,
    },
    {
      label: 'Answer schedule requests',
      detail: 'Instructors asked to move a published class.',
      href: '/admin/change-requests',
      action: 'Open requests',
      count: pendingRequests.count ?? 0,
    },
    {
      label: 'Classes without an instructor',
      detail:
        'Assigned automatically when the schedule is generated, if a qualified instructor is free.',
      href: '/admin/class-offerings',
      action: 'Class offerings',
      count: unassigned.count ?? 0,
    },
  ]
  const open = tasks.filter((task) => task.count > 0)

  return (
    <>
      <PageHead
        title="Dashboard"
        description={
          term
            ? `Consolatrix College of Toledo City · ${term}`
            : 'Set the active school year and semester to start scheduling.'
        }
        actions={
          <Link className="btn btn-primary" href="/admin/schedules">
            Review schedules
          </Link>
        }
      />

      {!term && (
        <section className={`panel ${styles.setup}`}>
          <CircleAlert size={22} aria-hidden="true" />
          <div>
            <strong>No active semester</strong>
            <span>Classes and schedules are prepared for the active semester.</span>
          </div>
          <Link className="btn btn-outline btn-sm" href="/admin/academic">
            Set school year &amp; semester
          </Link>
        </section>
      )}

      <div className="stats-grid">
        <Stat label="Instructors" value={instructors.count ?? 0} />
        <Stat label="Rooms & labs" value={rooms.count ?? 0} />
        <Stat label="Classes this semester" value={offerings.count ?? 0} />
        <Stat label="Published schedules" value={published.count ?? 0} />
      </div>

      <div className={styles.columns}>
        <section className="panel">
          <h3>Needs your attention</h3>
          {open.length ? (
            <ul className={styles.tasks}>
              {open.map((task) => (
                <li key={task.label}>
                  <span className={styles.count}>{task.count}</span>
                  <div>
                    <strong>{task.label}</strong>
                    <span>{task.detail}</span>
                  </div>
                  <Link href={task.href} className="btn btn-outline btn-sm">
                    {task.action}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.clear}>
              <CheckCircle2 size={20} aria-hidden="true" /> Nothing is waiting for you.
            </p>
          )}
        </section>

        <section className="panel">
          <div className={styles.head}>
            <h3>Recent schedules</h3>
            <Link href="/admin/schedules">All schedules</Link>
          </div>
          {recentSchedules.data?.length ? (
            <ul className={styles.recent}>
              {recentSchedules.data.map((schedule) => {
                const stage = STAGES[schedule.status] ?? { label: schedule.status, tone: 'default' }
                return (
                  <li key={schedule.id}>
                    <Link href={`/admin/schedules/${schedule.id}`}>
                      {schedule.title || 'Untitled schedule'}
                    </Link>
                    <small>Updated {formatDate(schedule.updated_at)}</small>
                    <Badge tone={stage.tone}>{stage.label}</Badge>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted">
              No schedules yet. The Department Scheduler generates them in the Schedule builder.
            </p>
          )}
        </section>
      </div>
    </>
  )
}

import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Notice } from '@/components/ui'
import { one } from '@/lib/relations'
import { loadPublishedEntries, schoolToday } from '@/lib/faculty-schedule'
import { DAY_NAMES, formatDateTime, formatTime12, humanize } from '@/lib/format'
import { timeToMinutes } from '@/lib/time'
import styles from './page.module.css'

export default async function Page() {
  const { profile } = await requireRole(['faculty'])
  const supabase = await createClient()

  const { data: facultyProfile, error: facultyError } = await supabase
    .from('faculty_profiles')
    .select('id, employee_id, employment_type, max_teaching_load, departments(code, name)')
    .eq('profile_id', profile.id)
    .maybeSingle()

  const [published, availabilityResult, requestResult, notificationResult, unreadResult] =
    await Promise.all([
      loadPublishedEntries(supabase, facultyProfile?.id),
      facultyProfile?.id
        ? supabase
            .from('faculty_availability')
            .select('id', { count: 'exact', head: true })
            .eq('faculty_id', facultyProfile.id)
        : Promise.resolve({ count: 0 }),
      supabase
        .from('schedule_change_requests')
        .select('id', { count: 'exact', head: true })
        .eq('requested_by', profile.id)
        .eq('status', 'pending'),
      supabase
        .from('notifications')
        .select('id, title, message, read_at, created_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .is('read_at', null),
    ])

  const entries = published.entries
  const department = one(facultyProfile?.departments)
  const today = schoolToday()
  const todays = entries.filter((entry) => entry.day_of_week === today)
  const weeklyMinutes = entries.reduce(
    (total, entry) => total + (timeToMinutes(entry.end_time) - timeToMinutes(entry.start_time)),
    0
  )
  const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10
  const maxLoad = Number(facultyProfile?.max_teaching_load ?? 0)
  const availabilityCount = availabilityResult.count ?? 0
  const pendingRequests = requestResult.count ?? 0
  const notices = notificationResult.data ?? []
  const firstName = (profile.full_name || '').trim().split(/\s+/)[0]

  return (
    <>
      <PageHead
        title={firstName ? `Good day, ${firstName}` : 'Dashboard'}
        description={`${DAY_NAMES[today] ?? 'Today'} · ${department?.name ?? 'Instructor'}${
          facultyProfile?.employee_id ? ` · ${facultyProfile.employee_id}` : ''
        }`}
        actions={
          <Link href="/faculty/schedule" className="btn btn-primary">
            Open my schedule
          </Link>
        }
      />

      {facultyError && (
        <Notice tone="danger" title="Your instructor profile could not be loaded.">
          Try again in a moment.
        </Notice>
      )}
      {!facultyError && !facultyProfile && (
        <Notice tone="warning" title="Your instructor record is not set up yet.">
          The Administrator still needs to finish your record before classes can be assigned to you.
        </Notice>
      )}
      {facultyProfile && availabilityCount === 0 && (
        <Notice tone="warning" title="Add your availability.">
          The schedule generator only places your classes inside the times you are available.{' '}
          <Link href="/faculty/availability">Set your availability</Link>.
        </Notice>
      )}

      <div className="stats-grid">
        <Stat label="Classes this week" value={entries.length} />
        <Stat
          label="Teaching hours"
          value={maxLoad > 0 ? `${weeklyHours} / ${maxLoad} h` : `${weeklyHours} h`}
          hint={maxLoad > 0 ? 'Published hours against your maximum load' : undefined}
        />
        <Stat label="Pending requests" value={pendingRequests} />
        <Stat label="Unread notices" value={unreadResult.count ?? 0} />
      </div>

      <div className={styles.columns}>
        <section className="panel">
          <div className={styles.panelHead}>
            <h3>Today&apos;s classes</h3>
            <Link href="/faculty/schedule">Full week</Link>
          </div>
          {todays.length ? (
            <ol className={styles.today}>
              {todays.map((entry) => {
                const offering = one(entry.class_offerings)
                const subject = one(offering?.subjects)
                const section = one(offering?.sections)
                const room = one(entry.rooms)
                return (
                  <li key={entry.id}>
                    <span className={styles.time}>
                      {formatTime12(entry.start_time)}
                      <small>{formatTime12(entry.end_time)}</small>
                    </span>
                    <span className={styles.classInfo}>
                      <strong>
                        {subject?.code ?? 'Class'}
                        {subject?.name && <span> · {subject.name}</span>}
                      </strong>
                      <small>
                        Block {section?.code ?? '—'} · {room?.code ?? 'No room'} ·{' '}
                        {humanize(entry.session_type || 'lecture')}
                      </small>
                    </span>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className={styles.quiet}>
              {entries.length
                ? 'No classes today.'
                : 'No published classes yet. They appear here once the schedule is published.'}
            </p>
          )}
        </section>

        <section className="panel">
          <div className={styles.panelHead}>
            <h3>Latest notices</h3>
            <Link href="/faculty/notifications">All notices</Link>
          </div>
          {notices.length ? (
            <ul className={styles.notices}>
              {notices.map((notice) => (
                <li key={notice.id} className={notice.read_at ? undefined : styles.unread}>
                  <strong>{notice.title}</strong>
                  <span>{notice.message}</span>
                  <time dateTime={notice.created_at}>{formatDateTime(notice.created_at)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.quiet}>Nothing new.</p>
          )}
        </section>
      </div>

      <section className={`panel ${styles.profile}`}>
        <div>
          <span>Department</span>
          <strong>{department?.code ?? '—'}</strong>
        </div>
        <div>
          <span>Employment</span>
          <strong>{humanize(facultyProfile?.employment_type, 'Not specified')}</strong>
        </div>
        <div>
          <span>Maximum load</span>
          <strong>{maxLoad > 0 ? `${maxLoad} h / week` : 'Not set'}</strong>
        </div>
        <div>
          <span>Availability</span>
          <strong>
            {availabilityCount ? `${availabilityCount} time windows` : 'Not set'}{' '}
            <Link href="/faculty/availability">Edit</Link>
          </strong>
        </div>
      </section>
    </>
  )
}

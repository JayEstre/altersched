import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Badge } from '@/components/ui'
import { one } from '@/lib/relations'
import styles from './page.module.css'

export const revalidate = 60

export default async function Page() {
  const { profile } = await requireRole(['faculty'])
  const s = await createClient()

  /* =========================================================
     FACULTY PROFILE
     ========================================================= */

  const { data: facultyProfile, error: facultyError } = await s
    .from('faculty_profiles')
    .select(
      `
      id,
      employee_id,
      employment_type,
      max_teaching_load,
      department_id,
      departments(
        code,
        name
      )
    `
    )
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (facultyError) {
    console.error('Failed to load faculty profile:', facultyError)
  }

  const department = one(facultyProfile?.departments)

  /* =========================================================
     DASHBOARD COUNTS
     ========================================================= */

  const [offeringResult, availabilityResult, notificationResult] = await Promise.all([
    facultyProfile?.id
      ? s
          .from('class_offerings')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('faculty_id', facultyProfile.id)
          .eq('status', 'active')
      : Promise.resolve({
          count: 0,
          error: null,
        }),
    facultyProfile?.id
      ? s
          .from('faculty_availability')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('faculty_id', facultyProfile.id)
      : Promise.resolve({
          count: 0,
          error: null,
        }),
    s
      .from('notifications')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('profile_id', profile.id)
      .is('read_at', null),
  ])

  if (offeringResult.error) {
    console.error('Failed to count class offerings:', offeringResult.error)
  }

  if (availabilityResult.error) {
    console.error('Failed to count faculty availability:', availabilityResult.error)
  }

  if (notificationResult.error) {
    console.error('Failed to count notifications:', notificationResult.error)
  }

  const classOfferings = offeringResult.count ?? 0
  const availabilityRecords = availabilityResult.count ?? 0
  const unreadNotifications = notificationResult.count ?? 0

  const profileReady = Boolean(
    facultyProfile?.id && facultyProfile?.employee_id && facultyProfile?.department_id
  )

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <div className={styles.scope}>
      <PageHead
        eyebrow="FACULTY PORTAL"
        title="Faculty Dashboard"
        description="View your teaching assignments, class schedule, availability, notifications, and schedule-change workflow."
      />
      {/* =====================================================
          STATS
          ===================================================== */}
      <div className="stats-grid">
        <Stat label="Class Offerings" value={classOfferings} />
        <Stat label="Availability Records" value={availabilityRecords} />
        <Stat label="Unread Notifications" value={unreadNotifications} />
        <Stat label="Max Teaching Load" value={facultyProfile?.max_teaching_load ?? '—'} />
      </div>
      {/* =====================================================
          FACULTY PROFILE
          ===================================================== */}
      <section className="panel block-gap-y">
        <div className="split-head">
          <div>
            <span className="sched-kicker">FACULTY PROFILE</span>
            <h3 className="tight-text">{profile.full_name || 'Faculty'}</h3>
            <p className="muted flush">
              Employee ID: <strong>{facultyProfile?.employee_id || '—'}</strong>
            </p>
          </div>
          <Badge tone={profileReady ? 'success' : 'warning'}>
            {profileReady ? 'Profile Ready' : 'Incomplete Profile'}
          </Badge>
        </div>
        <div className="faculty-info-grid">
          <div className="faculty-info-card">
            <span>Department</span>
            <strong>{department?.code || '—'}</strong>
          </div>
          <div className="faculty-info-card">
            <span>Employment</span>
            <strong>{facultyProfile?.employment_type || '—'}</strong>
          </div>
          <div className="faculty-info-card">
            <span>Maximum Load</span>
            <strong>{facultyProfile?.max_teaching_load ?? '—'}</strong>
          </div>
        </div>
      </section>
      {/* =====================================================
          INCOMPLETE PROFILE
          ===================================================== */}
      {!profileReady && (
        <div className="portal-alert portal-alert-danger">
          <strong>Faculty profile incomplete.</strong>
          <span>
            Your faculty information must be completed before AlterSched can fully manage your
            teaching assignments and availability.
          </span>
        </div>
      )}
      {/* =====================================================
          MY TEACHING SCHEDULE
          ===================================================== */}
      <section className="panel block-gap">
        <div className="faculty-section-head">
          <div>
            <span className="sched-kicker">TEACHING</span>
            <h3>My Teaching Schedule</h3>
            <p className="muted">
              View your assigned published classes, rooms, days, and teaching times.
            </p>
          </div>
          <Badge tone={classOfferings > 0 ? 'success' : 'warning'}>
            {classOfferings} Offering
            {classOfferings === 1 ? '' : 's'}
          </Badge>
        </div>
        <div className="faculty-actions">
          <Link href="/faculty/schedule" className="user-btn user-btn-primary">
            View My Schedule
          </Link>
        </div>
      </section>
      {/* =====================================================
          AVAILABILITY
          ===================================================== */}
      <section className="panel block-gap">
        <div className="faculty-section-head">
          <div>
            <span className="sched-kicker">AVAILABILITY</span>
            <h3>Teaching Availability</h3>
            <p className="muted">
              Review the days and times used by AlterSched when assigning your classes.
            </p>
          </div>
          <Badge tone={availabilityRecords > 0 ? 'success' : 'warning'}>
            {availabilityRecords} Record
            {availabilityRecords === 1 ? '' : 's'}
          </Badge>
        </div>
        <div className="faculty-actions">
          <Link href="/faculty/availability" className="user-btn">
            Manage Availability
          </Link>
        </div>
      </section>
      {/* =====================================================
          CHANGE REQUEST
          ===================================================== */}
      <section className="panel block-gap">
        <div className="faculty-section-head">
          <div>
            <span className="sched-kicker">ALTERATIONS</span>
            <h3>Schedule Change Request</h3>
            <p className="muted">
              Request a controlled change when an assigned class schedule needs adjustment.
            </p>
          </div>
        </div>
        <div className="faculty-actions">
          <Link href="/faculty/alterations" className="user-btn">
            View Change Requests
          </Link>
        </div>
      </section>
      {/* =====================================================
          NOTIFICATIONS
          ===================================================== */}
      <section className="panel">
        <div className="faculty-section-head">
          <div>
            <span className="sched-kicker">NOTIFICATIONS</span>
            <h3>Schedule Updates</h3>
            <p className="muted">
              Check published schedule changes, alteration updates, and other notices.
            </p>
          </div>
          <Badge tone={unreadNotifications > 0 ? 'warning' : 'success'}>
            {unreadNotifications > 0 ? `${unreadNotifications} Unread` : 'Up to Date'}
          </Badge>
        </div>
        <div className="faculty-actions">
          <Link href="/faculty/notifications" className="user-btn">
            View Notifications
          </Link>
        </div>
      </section>
    </div>
  )
}

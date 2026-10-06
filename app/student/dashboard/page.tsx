import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Badge } from '@/components/ui'

export const revalidate = 60;

export default async function Page() {
  const { profile } = await requireRole(['student'])
  const s = await createClient()

  // =========================================================
  // STUDENT PROFILE
  // =========================================================

  const { data: studentProfile, error: studentError } = await s
    .from('student_profiles')
    .select(`
      id,
      student_id,
      program_id,
      year_level_id,
      section_id,
      programs(
        code,
        name
      ),
      year_levels(
        name
      ),
      sections(
        code
      )
    `)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (studentError) {
    console.error('Failed to load student profile:', studentError)
  }

  // Supabase relationships may return an object or array
  // depending on the generated relationship metadata.
  const rel = (value: any) =>
    Array.isArray(value) ? value[0] : value

  const program = rel((studentProfile as any)?.programs)
  const yearLevel = rel((studentProfile as any)?.year_levels)
  const section = rel((studentProfile as any)?.sections)

  // =========================================================
  // ACTIVE SCHEDULE + NOTIFICATIONS
  // =========================================================

  const [
    activeMembershipResult,
    notificationResult,
  ] = await Promise.all([
    studentProfile?.id
      ? s
          .from('schedule_memberships')
          .select(
            `
              id,
              schedule_id,
              active
            `,
            {
              count: 'exact',
            }
          )
          .eq('student_profile_id', studentProfile.id)
          .eq('active', true)
          .limit(1)
      : Promise.resolve({
          data: [],
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

  if (activeMembershipResult.error) {
    console.error(
      'Failed to load active schedule membership:',
      activeMembershipResult.error
    )
  }

  if (notificationResult.error) {
    console.error(
      'Failed to load notifications:',
      notificationResult.error
    )
  }

  const activeMembership =
    activeMembershipResult.data?.[0] ?? null

  const activeScheduleCount =
    activeMembershipResult.count ?? 0

  const unreadNotifications =
    notificationResult.count ?? 0

  // =========================================================
  // PROFILE COMPLETENESS
  // =========================================================

  const profileComplete = Boolean(
    studentProfile?.id &&
      studentProfile?.student_id &&
      studentProfile?.program_id &&
      studentProfile?.year_level_id &&
      studentProfile?.section_id
  )

  const hasSchedule = Boolean(activeMembership)

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <>
      <PageHead
        eyebrow="STUDENT PORTAL"
        title="Student Dashboard"
        description="View your academic profile, claim your published class schedule, and monitor schedule updates."
      />

      {/* =====================================================
          STATS
          ===================================================== */}

      <div className="stats-grid">
        <Stat
          label="Active Schedules"
          value={activeScheduleCount}
        />

        <Stat
          label="Unread Notifications"
          value={unreadNotifications}
        />

        <Stat
          label="Program"
          value={program?.code || '—'}
        />

        <Stat
          label="Block"
          value={section?.code || '—'}
        />
      </div>

      {/* =====================================================
          STUDENT PROFILE
          ===================================================== */}

      <section
        className="panel"
        style={{
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span className="sched-kicker">
              STUDENT PROFILE
            </span>

            <h3
              style={{
                marginTop: 6,
                marginBottom: 5,
              }}
            >
              {profile.full_name || 'Student'}
            </h3>

            <p
              className="muted"
              style={{
                margin: 0,
              }}
            >
              Student ID:{' '}
              <strong>
                {studentProfile?.student_id || '—'}
              </strong>
            </p>
          </div>

          <Badge
            tone={
              profileComplete
                ? 'success'
                : 'warning'
            }
          >
            {profileComplete
              ? 'Profile Ready'
              : 'Incomplete Profile'}
          </Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          <div className="student-info-card">
            <span>Program</span>
            <strong>
              {program?.code || '—'}
            </strong>
          </div>

          <div className="student-info-card">
            <span>Year Level</span>
            <strong>
              {yearLevel?.name || '—'}
            </strong>
          </div>

          <div className="student-info-card">
            <span>Block</span>
            <strong>
              {section?.code || '—'}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          INCOMPLETE PROFILE
          ===================================================== */}

      {!profileComplete && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Student profile incomplete.
          </strong>

          <span>
            Your Program, Year Level, and Block must be
            complete before you can claim a schedule.
          </span>
        </div>
      )}

      {/* =====================================================
          SCHEDULE ACCESS
          ===================================================== */}

      <section
        className="panel"
        style={{
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span className="sched-kicker">
              MY SCHEDULE
            </span>

            <h3
              style={{
                marginTop: 6,
                marginBottom: 5,
              }}
            >
              {hasSchedule
                ? 'Schedule Claimed'
                : 'Get Your Schedule'}
            </h3>

            <p
              className="muted"
              style={{
                margin: 0,
                maxWidth: 650,
              }}
            >
              {hasSchedule
                ? 'You already have an active published schedule assigned to your student account.'
                : 'Use the schedule access code provided for your Program, Year Level, and Block.'}
            </p>
          </div>

          <Badge
            tone={
              hasSchedule
                ? 'success'
                : 'warning'
            }
          >
            {hasSchedule
              ? 'Active'
              : 'Not Claimed'}
          </Badge>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 18,
          }}
        >
          {hasSchedule ? (
            <Link
              href="/student/schedule"
              className="user-btn user-btn-primary"
            >
              View My Schedule
            </Link>
          ) : (
            <Link
              href={
                profileComplete
                  ? '/student/schedule'
                  : '#'
              }
              className={
                profileComplete
                  ? 'user-btn user-btn-primary'
                  : 'user-btn'
              }
              aria-disabled={!profileComplete}
              style={
                !profileComplete
                  ? {
                      pointerEvents: 'none',
                      opacity: 0.55,
                    }
                  : undefined
              }
            >
              Get My Schedule
            </Link>
          )}

          <Link
            href="/student/notifications"
            className="user-btn"
          >
            Notifications
            {unreadNotifications > 0
              ? ` (${unreadNotifications})`
              : ''}
          </Link>
        </div>
      </section>

      {/* =====================================================
          QUICK STATUS
          ===================================================== */}

      <section className="panel">
        <span className="sched-kicker">
          STATUS
        </span>

        <h3
          style={{
            marginTop: 6,
            marginBottom: 12,
          }}
        >
          Schedule Access Status
        </h3>

        <div
          style={{
            display: 'grid',
            gap: 8,
          }}
        >
          <div className="student-status-row">
            <span>Account</span>

            <Badge tone="success">
              Approved
            </Badge>
          </div>

          <div className="student-status-row">
            <span>Student Profile</span>

            <Badge
              tone={
                profileComplete
                  ? 'success'
                  : 'warning'
              }
            >
              {profileComplete
                ? 'Complete'
                : 'Incomplete'}
            </Badge>
          </div>

          <div className="student-status-row">
            <span>Schedule</span>

            <Badge
              tone={
                hasSchedule
                  ? 'success'
                  : 'warning'
              }
            >
              {hasSchedule
                ? 'Claimed'
                : 'Not Claimed'}
            </Badge>
          </div>
        </div>
      </section>

      {/* =====================================================
          LOCAL STYLES
          ===================================================== */}

      <style>{`
        .student-info-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 14px;
          min-width: 0;
        }

        .student-info-card span {
          display: block;
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .student-info-card strong {
          display: block;
          font-size: 14px;
          word-break: break-word;
        }

        .student-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--line);
          padding: 9px 0;
        }

        .student-status-row:last-child {
          border-bottom: 0;
        }

        @media (max-width: 640px) {
          .student-info-card {
            padding: 10px 12px;
          }
        }
      `}</style>
    </>
  )
}
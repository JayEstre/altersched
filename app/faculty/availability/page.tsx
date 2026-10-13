import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { one } from '@/lib/relations'
import { DAY_NAMES, formatTime } from '@/lib/format'
import styles from './page.module.css'

function formatType(value: string | null | undefined) {
  if (!value) return '—'

  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function Page() {
  const { profile } = await requireRole(['faculty'])
  const s = await createClient()

  /* =======================================================
     FACULTY PROFILE
     ======================================================= */

  const { data: facultyProfile, error: facultyError } = await s
    .from('faculty_profiles')
    .select(
      `
      id,
      employee_id,
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

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const availabilityResult = facultyProfile?.id
    ? await s
        .from('faculty_availability')
        .select(
          `
      id,
      day_of_week,
      start_time,
      end_time,
      availability_type,
      semester_id,
      semesters(
        name
      )
    `
        )
        .eq('faculty_id', facultyProfile.id)
        .order('day_of_week', {
          ascending: true,
        })
        .order('start_time', {
          ascending: true,
        })
    : null
  const availability = availabilityResult?.data ?? []
  const availabilityError = availabilityResult?.error ?? null

  if (availabilityError) {
    console.error('Failed to load faculty availability:', availabilityError)
  }

  /* =======================================================
     SUMMARY
     ======================================================= */

  const daysCovered = new Set(availability.map((record) => record.day_of_week)).size

  const preferredCount = availability.filter(
    (record) => record.availability_type === 'preferred'
  ).length

  const unavailableCount = availability.filter(
    (record) => record.availability_type === 'unavailable'
  ).length

  return (
    <div className={styles.scope}>
      <PageHead
        eyebrow="TEACHING PREFERENCES"
        title="My Availability"
        description="Availability and scheduling constraints currently recorded for your faculty profile."
      />
      {/* ===================================================
          NAVIGATION
          =================================================== */}
      <div className="availability-nav">
        <Link href="/faculty/dashboard" className="user-btn">
          ← Dashboard
        </Link>
        <div className="availability-nav-actions">
          <Link href="/faculty/schedule" className="user-btn">
            My Schedule
          </Link>
          <Link href="/faculty/alterations" className="user-btn">
            Alterations
          </Link>
          <Badge tone={availability.length > 0 ? 'success' : 'warning'}>
            {availability.length > 0 ? 'Configured' : 'Not Configured'}
          </Badge>
        </div>
      </div>
      {/* ===================================================
          FACULTY INFO
          =================================================== */}
      <section className="panel availability-profile">
        <div className="availability-profile-head">
          <div>
            <span className="sched-kicker">FACULTY</span>
            <h3>{profile.full_name || 'Faculty'}</h3>
            <p className="muted">
              Employee ID: {facultyProfile?.employee_id || '—'}
              {' · '}
              {department?.code || 'No Department'}
            </p>
          </div>
          <Badge>Read Only</Badge>
        </div>
      </section>
      {/* ===================================================
          FACULTY PROFILE ERROR
          =================================================== */}
      {facultyError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Faculty profile unavailable.</strong>
          <span>AlterSched could not load your faculty profile.</span>
        </div>
      )}
      {!facultyError && !facultyProfile && (
        <div className="portal-alert portal-alert-danger">
          <strong>Faculty profile not found.</strong>
          <span>Your account does not currently have a faculty profile connected to it.</span>
        </div>
      )}
      {/* ===================================================
          SUMMARY
          =================================================== */}
      <div className="availability-summary">
        <div className="availability-stat">
          <span>Records</span>
          <strong>{availability.length}</strong>
        </div>
        <div className="availability-stat">
          <span>Days Covered</span>
          <strong>{daysCovered}</strong>
        </div>
        <div className="availability-stat">
          <span>Preferred</span>
          <strong>{preferredCount}</strong>
        </div>
        <div className="availability-stat">
          <span>Unavailable</span>
          <strong>{unavailableCount}</strong>
        </div>
      </div>
      {/* ===================================================
          QUERY ERROR
          =================================================== */}
      {availabilityError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Unable to load availability.</strong>
          <span>{availabilityError.message}</span>
        </div>
      )}
      {/* ===================================================
          AVAILABILITY TABLE
          =================================================== */}
      <section className="panel">
        <div className="availability-head">
          <div>
            <span className="sched-kicker">AVAILABILITY</span>
            <h3>Teaching Time Preferences</h3>
            <p className="muted">
              AlterSched uses these records during schedule generation and faculty conflict
              validation.
            </p>
          </div>
          {availability.length > 0 && (
            <Badge tone="success">
              {availability.length} Record
              {availability.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        {availability.length > 0 ? (
          <div className="availability-table-wrap">
            <DataTable>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Semester</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {availability.map((record) => {
                  const semester = one(record.semesters)
                  const type = record.availability_type

                  return (
                    <tr key={record.id}>
                      <td>
                        <strong>{DAY_NAMES[record.day_of_week] || '—'}</strong>
                      </td>
                      <td>
                        {formatTime(record.start_time)}
                        {' – '}
                        {formatTime(record.end_time)}
                      </td>
                      <td>{semester?.name || '—'}</td>
                      <td>
                        <Badge
                          tone={
                            type === 'unavailable'
                              ? 'danger'
                              : type === 'preferred'
                                ? 'success'
                                : undefined
                          }
                        >
                          {formatType(type)}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </DataTable>
          </div>
        ) : (
          <div className="availability-empty">
            <Empty text="No availability records have been configured for your faculty profile." />
          </div>
        )}
      </section>
      {/* ===================================================
          LEGEND
          =================================================== */}
      {availability.length > 0 && (
        <section className="panel availability-legend">
          <span className="sched-kicker">SCHEDULING MEANING</span>
          <div className="availability-legend-grid">
            <div>
              <Badge>Available</Badge>
              <p>The faculty member may be assigned during this time.</p>
            </div>
            <div>
              <Badge tone="success">Preferred</Badge>
              <p>A preferred teaching window when scheduling permits.</p>
            </div>
            <div>
              <Badge tone="danger">Unavailable</Badge>
              <p>Classes must not be assigned during this period.</p>
            </div>
          </div>
        </section>
      )}
      {/* ===================================================
          NOTICE
          =================================================== */}
      <div className="portal-alert availability-notice">
        <strong>Scheduling constraint.</strong>
        <span>
          These records are read-only from your faculty account and are used by AlterSched when
          checking class assignments.
        </span>
      </div>
    </div>
  )
}

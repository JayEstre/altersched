import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge, Notice, ActionResult } from '@/components/ui'
import { one } from '@/lib/relations'
import { DAY_NAMES, DAY_OPTIONS, formatTime12, humanize } from '@/lib/format'
import { addAvailability, removeAvailability } from './actions'
import styles from './page.module.css'

type Params = Record<string, string | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<Params> }) {
  const params: Params = searchParams ? await searchParams : {}
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

  const { data: semesters } = await s
    .from('semesters')
    .select('id, name, is_active, academic_years(name)')
    .order('start_date', { ascending: false })
  const activeSemester = (semesters ?? []).find((item) => item.is_active) ?? semesters?.[0]
  const showSemester = new Set(availability.map((record) => record.semester_id)).size > 1
  const byDay = new Map<number, typeof availability>()
  for (const record of availability) {
    byDay.set(record.day_of_week, [...(byDay.get(record.day_of_week) ?? []), record])
  }
  const days = [1, 2, 3, 4, 5, 6, 7].filter((day) => day <= 6 || byDay.has(day))

  return (
    <>
      <PageHead
        title="My Availability"
        description="The schedule generator places your classes only inside the times you are available. Add the hours you can teach each week."
      />
      <ActionResult
        params={params}
        successMessages={{
          added: 'Time window added.',
          added_weekdays: 'Time window added for Monday to Friday.',
          removed: 'Time window removed.',
        }}
        errorMessages={{
          missing_fields: 'Choose a semester, a day and both times.',
          invalid_time: 'The end time must be later than the start time.',
          too_short: 'A time window must be at least 30 minutes long.',
          invalid_type: 'Choose Available, Preferred or Unavailable.',
          invalid_day: 'Choose a day.',
          overlap: `That time overlaps a window you already have${
            params.day ? ` on ${DAY_NAMES[Number(params.day)] ?? 'that day'}` : ''
          }. Remove or change the existing one first.`,
          no_faculty_profile: 'Your instructor record is not set up yet. Ask the Administrator.',
          save_failed: 'The time window could not be saved. Try again.',
          remove_failed: 'The time window could not be removed. Try again.',
        }}
      />
      {facultyError && (
        <Notice tone="danger" title="Your instructor profile could not be loaded.">
          Try again in a moment.
        </Notice>
      )}
      {!facultyError && !facultyProfile && (
        <Notice tone="warning" title="Your instructor record is not set up yet.">
          The Administrator needs to finish your record before you can add availability.
        </Notice>
      )}
      {availabilityError && (
        <Notice tone="danger" title="Your availability could not be loaded.">
          {availabilityError.message}
        </Notice>
      )}

      {facultyProfile && (
        <section className="panel">
          <h3>Add a time window</h3>
          <p className="muted">
            Use Monday to Friday to add the same hours for every weekday at once.
          </p>
          <form action={addAvailability} className={styles.addForm}>
            <label className="field">
              <span className="field-label">Semester</span>
              <select name="semester_id" defaultValue={activeSemester?.id ?? ''} required>
                {(semesters ?? []).map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                    {one(semester.academic_years)?.name
                      ? ` · ${one(semester.academic_years)?.name}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Day</span>
              <select name="day_of_week" defaultValue="weekdays" required>
                <option value="weekdays">Monday to Friday</option>
                {DAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">From</span>
              <input type="time" name="start_time" defaultValue="07:30" required />
            </label>
            <label className="field">
              <span className="field-label">To</span>
              <input type="time" name="end_time" defaultValue="17:30" required />
            </label>
            <label className="field">
              <span className="field-label">Type</span>
              <select name="availability_type" defaultValue="available">
                <option value="available">Available</option>
                <option value="preferred">Preferred</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <div className={styles.weekHead}>
          <h3>Your week</h3>
          <span className={styles.legend}>
            <Badge tone="success">Available</Badge> classes may be placed ·{' '}
            <Badge tone="info">Preferred</Badge> placed here first ·{' '}
            <Badge tone="danger">Unavailable</Badge> never placed here
          </span>
        </div>
        {availability.length ? (
          <ul className={styles.week}>
            {days.map((day) => (
              <li key={day}>
                <span className={styles.day}>{DAY_NAMES[day]}</span>
                <span className={styles.windows}>
                  {(byDay.get(day) ?? []).length ? (
                    (byDay.get(day) ?? []).map((record) => (
                      <form
                        key={record.id}
                        action={removeAvailability}
                        className={`${styles.window} ${styles[record.availability_type] ?? ''}`}
                      >
                        <input type="hidden" name="availability_id" value={record.id} />
                        <span>
                          {formatTime12(record.start_time)} – {formatTime12(record.end_time)}
                          <small>
                            {humanize(record.availability_type)}
                            {showSemester && ` · ${one(record.semesters)?.name ?? ''}`}
                          </small>
                        </span>
                        <button
                          type="submit"
                          className={styles.remove}
                          aria-label={`Remove ${DAY_NAMES[day]} ${formatTime12(record.start_time)} to ${formatTime12(record.end_time)}`}
                          title="Remove"
                        >
                          ×
                        </button>
                      </form>
                    ))
                  ) : (
                    <span className={styles.none}>Not available</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No availability yet"
            text="Add the hours you can teach. Until you do, the generator may place your classes at any time."
          />
        )}
      </section>
    </>
  )
}

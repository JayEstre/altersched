import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import { ActionResult, PageHead, Panel, Empty } from '@/components/ui'
import { DAY_NAMES } from '@/lib/format'
import { SLOT_OPTIONS, loadSchedulingSettings } from '@/lib/scheduling/settings'
import { saveSchedulingSettings } from './actions'
import styles from './page.module.css'

type SearchParams = Promise<Record<string, string | undefined>>

const GENERATOR_ERRORS = {
  no_teaching_days: 'Choose at least one teaching day.',
  invalid_hours: 'Enter a valid start and end time.',
  day_too_short: 'The class day must be at least one hour long.',
  invalid_slot: 'Choose a start-time step of 15, 30 or 60 minutes.',
  save_failed: 'The settings could not be saved.',
}

const GENERATOR_SUCCESS = {
  generator_saved: 'Schedule generator settings saved. They apply to the next generated schedule.',
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const s = await createClient()
  const [{ data: institutions }, { data: years }, { data: semesters }, generator] =
    await Promise.all([
      s.from('institutions').select('id,name,short_name').order('name'),
      s
        .from('academic_years')
        .select('id,name,is_active')
        .order('start_date', { ascending: false }),
      s
        .from('semesters')
        .select('id,name,is_active,academic_years(name)')
        .order('start_date', { ascending: false }),
      loadSchedulingSettings(s),
    ])
  const activeYear = years?.find((x) => x.is_active)
  const activeTerm = semesters?.find((x) => x.is_active)

  return (
    <div className={styles.scope}>
      <div className="page-stack">
        <PageHead
          title="Settings"
          description="The days and hours the schedule generator may use, and the school records behind the system."
        />
        <ActionResult
          params={params}
          successMessages={GENERATOR_SUCCESS}
          errorMessages={GENERATOR_ERRORS}
        />

        <section id="generator">
          <Panel
            title="Schedule Generator"
            description="Days and hours the automatic generator may place classes in. Changes apply to the next generated schedule; existing schedules are not moved."
          >
            <form action={saveSchedulingSettings} className={styles.generatorForm}>
              <fieldset className={styles.days}>
                <legend>Teaching days</legend>
                <div className={styles.dayList}>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <label key={day} className={styles.dayOption}>
                      <input
                        type="checkbox"
                        name="teaching_days"
                        value={day}
                        defaultChecked={generator.days.includes(day)}
                      />
                      <span>{DAY_NAMES[day]?.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className={styles.hours}>
                <label className={styles.field}>
                  <span>Earliest start</span>
                  <input
                    type="time"
                    name="day_start"
                    defaultValue={generator.dayStart}
                    step={900}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Latest end</span>
                  <input
                    type="time"
                    name="day_end"
                    defaultValue={generator.dayEnd}
                    step={900}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Start-time step</span>
                  <select name="slot_minutes" defaultValue={String(generator.slotMinutes)}>
                    {SLOT_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        Every {minutes} minutes
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.actions}>
                <small className="muted">
                  Smaller steps give the generator more choices but take longer. Instructor and room
                  availability still apply inside these hours.
                </small>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save generator settings
                </button>
              </div>
            </form>
          </Panel>
        </section>

        <Panel title="Active Academic Context">
          {activeYear || activeTerm ? (
            <div className="schedule-grid">
              <div className="schedule-item">
                <strong>{activeYear?.name || 'No active academic year'}</strong>
                <span>{activeTerm?.name || 'No active semester'}</span>
              </div>
            </div>
          ) : (
            <Empty text="No active academic year or semester configured." />
          )}
        </Panel>
        <Panel title="Institution Records">
          {institutions?.length ? (
            <DataTable>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((x) => (
                  <tr key={x.id}>
                    <td>{x.short_name || '—'}</td>
                    <td>{x.name}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <Empty text="No institution configured." />
          )}
        </Panel>
      </div>
    </div>
  )
}

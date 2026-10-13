import Link from 'next/link'

import {
  InstructorAssignmentTable,
  parseAssignmentView,
} from '@/components/assignments/instructor-assignment-table'
import { OFFERING_MESSAGES, preparedMessage } from '@/components/assignments/offering-messages'
import { ActionResult, Badge, PageHead, Stat } from '@/components/ui'
import { loadAssignmentRows } from '@/lib/assignments'
import { requireRole } from '@/lib/auth/require-role'
import { one } from '@/lib/relations'
import { createClient } from '@/lib/supabase/server'
import { prepareClassOfferings } from './actions'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(['super_admin'])
  const params = await searchParams
  const supabase = await createClient()

  const [semestersResult, programsResult, curriculaResult, mappingsResult, sectionsResult] =
    await Promise.all([
      supabase
        .from('semesters')
        .select('id, name, is_active, academic_years(name)')
        .order('start_date', { ascending: false }),
      supabase.from('programs').select('id, code, name').eq('is_active', true).order('code'),
      supabase.from('curricula').select('id').eq('is_active', true),
      supabase.from('curriculum_subjects').select('id'),
      supabase.from('sections').select('id').eq('is_active', true),
    ])

  const semesters = semestersResult.data ?? []
  const programs = programsResult.data ?? []
  const activeSemester = semesters.find((semester) => semester.is_active) ?? semesters[0] ?? null
  const rows = await loadAssignmentRows(supabase, activeSemester?.id ?? null)

  const requirements = [
    ['Semesters', semesters.length],
    ['Programs', programs.length],
    ['Active Curricula', curriculaResult.data?.length ?? 0],
    ['Subject Mappings', mappingsResult.data?.length ?? 0],
    ['Active Blocks', sectionsResult.data?.length ?? 0],
  ] as const
  const preparationReady = requirements.every(([, count]) => count > 0)
  const assigned = rows.filter((row) => row.facultyId).length
  const manual = rows.filter((row) => row.mode === 'manual').length

  const successMessages = {
    ...OFFERING_MESSAGES.success,
    offerings_prepared: preparedMessage(params.created),
  }

  return (
    <>
      <PageHead
        eyebrow="SCHEDULING INPUT"
        title="Class Offerings"
        description="Prepare the teaching requirements for a semester and review the instructor assigned to each class."
      />

      <div className="stats-grid">
        <Stat
          label="Class Offerings"
          value={rows.length}
          hint={activeSemester?.name ?? 'No semester'}
        />
        <Stat label="Instructor Assigned" value={assigned} />
        <Stat label="Unassigned" value={rows.length - assigned} />
        <Stat label="Changed Manually" value={manual} />
      </div>

      <ActionResult
        params={params}
        successMessages={successMessages}
        errorMessages={OFFERING_MESSAGES.error}
      />

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">AUTOMATIC PREPARATION</span>
            <h3>Prepare Class Offerings</h3>
            <p>
              AlterSched reads the active Curriculum, Year Levels, Blocks and Subjects and creates
              one class offering per subject and block. The schedule generator also does this
              automatically.
            </p>
          </div>
          <Badge tone={preparationReady ? 'success' : 'warning'}>
            {preparationReady ? 'Ready to Prepare' : 'Setup Required'}
          </Badge>
        </div>
        <div className="sched-section-body">
          <div className="generator-layout">
            <form action={prepareClassOfferings} className="sched-form generator-main">
              <div className="sched-form-grid">
                <div className="sched-field">
                  <label htmlFor="semester_id">Semester</label>
                  <select
                    id="semester_id"
                    name="semester_id"
                    defaultValue={activeSemester?.id ?? ''}
                    required
                  >
                    {!semesters.length && <option value="">No Semesters Available</option>}
                    {semesters.map((semester) => {
                      const year = one<{ name: string }>(semester.academic_years)
                      return (
                        <option key={semester.id} value={semester.id}>
                          {semester.name}
                          {year?.name ? ` — ${year.name}` : ''}
                          {semester.is_active ? ' (Active)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  <small>Curriculum term used for preparation.</small>
                </div>
                <div className="sched-field">
                  <label htmlFor="program_id">Program Scope</label>
                  <select id="program_id" name="program_id" defaultValue="">
                    <option value="">All Programs</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.code} — {program.name}
                      </option>
                    ))}
                  </select>
                  <small>Prepare the whole school or one Program only.</small>
                </div>
              </div>
              <div className="sched-form-actions">
                <Link href="/admin/curriculum" className="sched-secondary-btn">
                  Review Curriculum
                </Link>
                <button type="submit" className="sched-primary-btn" disabled={!preparationReady}>
                  Prepare Class Offerings
                </button>
              </div>
              <small className="muted">
                {preparationReady
                  ? 'Existing Class Offerings and their instructors are kept; duplicates are skipped.'
                  : 'Complete the missing requirements on the right first.'}
              </small>
            </form>

            <aside className="generator-side">
              <div className="generator-card">
                <h4>Preparation Requirements</h4>
                <p>These records must exist before automatic preparation can run.</p>
                <div className="generator-status">
                  {requirements.map(([label, count]) => (
                    <div key={label} className="generator-status-row">
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">INSTRUCTOR ASSIGNMENTS</span>
            <h3>Who teaches each class</h3>
            <p>
              The schedule generator assigns a qualified instructor to every class automatically,
              keeping each instructor within their maximum teaching load. Change any assignment
              here; it applies to both the lecture and lab sessions and updates the class&apos;s
              draft schedule. Manual choices are kept when the schedule is generated again.
            </p>
          </div>
          <Badge>{activeSemester ? activeSemester.name : 'No active semester'}</Badge>
        </div>
        <div className="sched-section-body">
          <InstructorAssignmentTable
            rows={rows}
            view={parseAssignmentView(params.view)}
            basePath="/admin/class-offerings"
          />
        </div>
      </section>
    </>
  )
}

import {
  ASSIGNMENT_MESSAGES,
  InstructorAssignmentTable,
  parseAssignmentView,
} from '@/components/assignments/instructor-assignment-table'
import { ActionResult, PageHead, Stat } from '@/components/ui'
import { loadAssignmentRows } from '@/lib/assignments'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(['department_scheduler'])
  const params = await searchParams
  const supabase = await createClient()

  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, name, is_active')
    .order('start_date', { ascending: false })
  const activeSemester =
    (semesters ?? []).find((semester) => semester.is_active) ?? semesters?.[0] ?? null
  const rows = await loadAssignmentRows(supabase, activeSemester?.id ?? null)

  const unassigned = rows.filter((row) => !row.facultyId).length
  const overloaded = new Set(
    rows.flatMap((row) =>
      row.candidates
        .filter((c) => c.id === row.facultyId && c.maxLoad > 0 && c.load > c.maxLoad)
        .map((c) => c.id)
    )
  ).size
  const noQualified = rows.filter((row) => !row.candidates.length).length

  return (
    <>
      <PageHead
        eyebrow="INPUTS"
        title="Scheduling Inputs"
        description="Review the classes to be scheduled and the instructor assigned to each. Instructors are assigned automatically when you generate; change any of them here."
      />
      <div className="stats-grid">
        <Stat
          label="Classes"
          value={rows.length}
          hint={activeSemester?.name ?? 'No active semester'}
        />
        <Stat label="Unassigned" value={unassigned} hint="Assigned on the next generation" />
        <Stat label="Over Max Load" value={overloaded} hint="Instructors above their limit" />
        <Stat label="No Qualified Instructor" value={noQualified} hint="Ask the Admin to add one" />
      </div>

      <ActionResult
        params={params}
        successMessages={ASSIGNMENT_MESSAGES.success}
        errorMessages={ASSIGNMENT_MESSAGES.error}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Instructor assignments</h3>
            <p>
              A change applies to the lecture and lab sessions of the class and updates its draft
              schedule right away. Manual choices are kept when you generate again.
            </p>
          </div>
        </div>
        <InstructorAssignmentTable
          rows={rows}
          view={parseAssignmentView(params.view)}
          basePath="/scheduler/class-offerings"
        />
      </section>
    </>
  )
}

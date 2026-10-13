import Link from 'next/link'

import { Badge, Empty } from '@/components/ui'
import type { AssignmentRow } from '@/lib/assignments'
import { updateOfferingInstructor } from '@/lib/actions/assignments'

export type AssignmentView = 'all' | 'unassigned' | 'auto' | 'manual'

const VIEWS: { key: AssignmentView; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'auto', label: 'Auto-assigned' },
  { key: 'manual', label: 'Changed manually' },
]

export function parseAssignmentView(value: string | string[] | undefined): AssignmentView {
  const v = Array.isArray(value) ? value[0] : value
  return VIEWS.some((view) => view.key === v) ? (v as AssignmentView) : 'all'
}

function matches(row: AssignmentRow, view: AssignmentView) {
  if (view === 'unassigned') return !row.facultyId
  if (view === 'auto') return row.mode === 'auto'
  if (view === 'manual') return row.mode === 'manual'
  return true
}

function loadLabel(load: number, max: number) {
  return max > 0 ? `${load}/${max} h` : `${load} h`
}

/**
 * Review and change the instructor of each class offering.
 * Shared by the Super Admin (Class Offerings) and the Department Scheduler (Scheduling Inputs).
 */
export function InstructorAssignmentTable({
  rows,
  view,
  basePath,
}: {
  rows: AssignmentRow[]
  view: AssignmentView
  basePath: '/admin/class-offerings' | '/scheduler/class-offerings'
}) {
  const counts: Record<AssignmentView, number> = {
    all: rows.length,
    unassigned: rows.filter((row) => matches(row, 'unassigned')).length,
    auto: rows.filter((row) => matches(row, 'auto')).length,
    manual: rows.filter((row) => matches(row, 'manual')).length,
  }
  const visible = rows.filter((row) => matches(row, view))

  return (
    <div className="assignment-board">
      <nav className="filter-tabs" aria-label="Filter assignments">
        {VIEWS.map((item) => (
          <Link
            key={item.key}
            href={item.key === 'all' ? basePath : `${basePath}?view=${item.key}`}
            className={['filter-tab', item.key === view ? 'filter-tab-active' : ''].join(' ')}
            aria-current={item.key === view ? 'page' : undefined}
            scroll={false}
          >
            {item.label} <span className="filter-tab-count">{counts[item.key]}</span>
          </Link>
        ))}
      </nav>

      {visible.length ? (
        <div className="table-wrap">
          <table className="data-table assignment-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Block</th>
                <th>Hours</th>
                <th>Instructor</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const formId = `assign-${row.offeringId}`
                return (
                  <tr key={row.offeringId}>
                    <td data-label="Subject">
                      <strong>{row.subjectCode}</strong>
                      <small className="cell-note">{row.subjectName}</small>
                    </td>
                    <td data-label="Block">
                      {row.blockCode}
                      {row.yearLevel && <small className="cell-note">{row.yearLevel}</small>}
                    </td>
                    <td data-label="Hours">{row.hours}</td>
                    <td data-label="Instructor" className="assignment-instructor-cell">
                      {row.candidates.length ? (
                        <form
                          id={formId}
                          action={updateOfferingInstructor}
                          className="assignment-form"
                        >
                          <input type="hidden" name="offering_id" value={row.offeringId} />
                          <input type="hidden" name="return_to" value={basePath} />
                          <select
                            name="faculty_id"
                            defaultValue={row.facultyId ?? ''}
                            aria-label={`Instructor for ${row.subjectCode} block ${row.blockCode}`}
                          >
                            <option value="" disabled>
                              Select instructor
                            </option>
                            {row.candidates.map((candidate) => {
                              const current = candidate.id === row.facultyId
                              const projected = current
                                ? candidate.load
                                : candidate.load + row.hours
                              const over = candidate.maxLoad > 0 && projected > candidate.maxLoad
                              return (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name} · {loadLabel(candidate.load, candidate.maxLoad)}
                                  {over ? ' (over max load)' : ''}
                                </option>
                              )
                            })}
                          </select>
                          <button
                            type="submit"
                            name="intent"
                            value="assign"
                            className="btn btn-primary btn-sm"
                          >
                            Save
                          </button>
                          {row.facultyId && (
                            <button
                              type="submit"
                              name="intent"
                              value="clear"
                              className="btn btn-outline btn-sm"
                            >
                              Clear
                            </button>
                          )}
                        </form>
                      ) : (
                        <span className="muted">
                          No qualified instructor — add one under Instructors.
                        </span>
                      )}
                    </td>
                    <td data-label="Source">
                      {row.mode === 'manual' ? (
                        <Badge tone="info">Manual</Badge>
                      ) : row.mode === 'auto' ? (
                        <Badge tone="success">Auto</Badge>
                      ) : (
                        <Badge tone="warning">Unassigned</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={rows.length ? 'Nothing in this view' : 'No class offerings yet'}
          text={
            rows.length
              ? 'Choose another filter above.'
              : 'Prepare class offerings or generate a schedule; instructors are assigned automatically.'
          }
        />
      )}
    </div>
  )
}

export const ASSIGNMENT_MESSAGES = {
  success: {
    faculty_assigned:
      'Instructor updated. Draft sessions of this class now use the new instructor.',
    faculty_unassigned:
      'Instructor removed. The next schedule generation will assign one automatically.',
  },
  error: {
    assignment_required: 'Select an instructor first.',
    offering_not_found: 'The class offering was not found.',
    assignment_failed: 'The instructor could not be changed.',
    instructor_clash: 'That instructor has a time conflict:',
  },
}

'use client'

import { useMemo, useState } from 'react'
import { GlassModal } from './glass-modal'

type CurriculumRow = {
  id: string
  year: number
  term: number
  code: string
  name: string
  hours: number
  room: string
}

type CurriculumYearBrowserProps = {
  rows: CurriculumRow[]
  curriculumName: string
}

const YEAR_LEVELS = [1, 2, 3, 4] as const
const SEMESTERS = [1, 2] as const

function ordinal(value: number): string {
  if (value === 1) return '1st'
  if (value === 2) return '2nd'
  if (value === 3) return '3rd'
  return `${value}th`
}

export function CurriculumYearBrowser({ rows, curriculumName }: CurriculumYearBrowserProps) {
  const [year, setYear] = useState<number>(1)
  const [term, setTerm] = useState<number>(1)

  const yearCounts = useMemo(() => {
    const counts = new Map<number, number>()

    for (const row of rows) {
      counts.set(row.year, (counts.get(row.year) ?? 0) + 1)
    }

    return counts
  }, [rows])

  const visible = useMemo(
    () => rows.filter((row) => row.year === year && row.term === term),
    [rows, year, term]
  )

  return (
    <section className="panel as-browser">
      <div className="as-browser-header">
        <div>
          <h2>Browse Subjects</h2>
          <p className="muted">{curriculumName} · Select a year and semester</p>
        </div>
      </div>
      <div className="as-year-grid" role="group" aria-label="Year level">
        {YEAR_LEVELS.map((level) => (
          <button
            type="button"
            key={level}
            className={`as-year-card ${year === level ? 'as-selected' : ''}`}
            aria-pressed={year === level}
            onClick={() => setYear(level)}
          >
            <strong>{ordinal(level)} Year</strong>
            <small>{yearCounts.get(level) ?? 0} subject mappings</small>
          </button>
        ))}
      </div>
      <div className="as-browser-controls">
        <div className="as-term-tabs" role="group" aria-label="Semester">
          {SEMESTERS.map((semester) => (
            <button
              type="button"
              key={semester}
              className={term === semester ? 'as-selected' : ''}
              aria-pressed={term === semester}
              onClick={() => setTerm(semester)}
            >
              {ordinal(semester)} Semester
            </button>
          ))}
        </div>
        <GlassModal
          key={`${year}-${term}`}
          title={`${ordinal(year)} Year · ${ordinal(term)} Semester`}
          trigger={`View ${visible.length} Subjects`}
          wide
        >
          {visible.length > 0 ? (
            <div className="as-table-wrap">
              <table className="as-details-table">
                <thead>
                  <tr>
                    <th scope="col">Subject Code</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Weekly Hours</th>
                    <th scope="col">Room Requirement</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.code}</strong>
                      </td>
                      <td>{row.name}</td>
                      <td>{row.hours}</td>
                      <td>{row.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              No subjects assigned to this year and semester. Add them using the existing curriculum
              form below.
            </p>
          )}
        </GlassModal>
      </div>
    </section>
  )
}

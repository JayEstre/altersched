'use client'

import { useMemo, useState } from 'react'
import { GlassModal } from './glass-modal'
import { DAY_NAMES, ordinal } from '@/lib/format'

type Entry = {
  id: string
  year: number
  block: string
  subject: string
  faculty: string
  room: string
  day: number
  start: string
  end: string
}
export function BlockScheduleBrowser({ entries }: { entries: Entry[] }) {
  const [year, setYear] = useState(1)
  const [block, setBlock] = useState('')
  const blocks = useMemo(
    () => Array.from(new Set(entries.filter((e) => e.year === year).map((e) => e.block))).sort(),
    [entries, year]
  )
  const chosen = blocks.includes(block) ? block : (blocks[0] ?? '')
  const visible = entries
    .filter((e) => e.year === year && e.block === chosen)
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
  return (
    <section className="panel as-browser">
      <header className="as-browser-header">
        <span className="section-kicker">DRAFT TIMETABLE</span>
        <h2>Schedules by Year & Block</h2>
        <p className="muted">
          View the real entries in the selected draft. Blocks without entries are not shown as
          scheduled.
        </p>
      </header>
      <div className="as-year-grid" role="group" aria-label="Year level">
        {[1, 2, 3, 4].map((y) => (
          <button
            key={y}
            type="button"
            className={`as-year-card ${year === y ? 'as-selected' : ''}`}
            onClick={() => {
              setYear(y)
              setBlock('')
            }}
          >
            <strong>{ordinal(y)} Year</strong>
            <small>
              {new Set(entries.filter((e) => e.year === y).map((e) => e.block)).size} blocks with
              entries
            </small>
          </button>
        ))}
      </div>
      <div className="as-browser-controls">
        <label>
          Block{' '}
          <select
            value={chosen}
            onChange={(e) => setBlock(e.target.value)}
            disabled={!blocks.length}
          >
            {blocks.length ? (
              blocks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))
            ) : (
              <option value="">No blocks scheduled</option>
            )}
          </select>
        </label>
        {chosen && (
          <GlassModal
            key={`${year}-${chosen}`}
            title={`${ordinal(year)} Year · ${chosen}`}
            trigger={`View Block Schedule (${visible.length})`}
            wide
          >
            <div className="as-table-wrap">
              <table className="as-details-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Faculty</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.id}>
                      <td>{e.subject}</td>
                      <td>{e.faculty}</td>
                      <td>{DAY_NAMES[e.day] ?? `Day ${e.day}`}</td>
                      <td>
                        {e.start}–{e.end}
                      </td>
                      <td>{e.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassModal>
        )}
      </div>
    </section>
  )
}

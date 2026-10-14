'use client'

import { useMemo, useState } from 'react'
import { ordinal } from '@/lib/format'
import { WeeklyTimetable } from './weekly-timetable'
import styles from './block-schedule-browser.module.css'

type Entry = {
  id: string
  year: number
  block: string
  /** "CODE — Subject name" */
  subject: string
  faculty: string
  room: string
  day: number
  start: string
  end: string
}

/** Pick a year and a block; its draft week is drawn right below. */
export function BlockScheduleBrowser({ entries }: { entries: Entry[] }) {
  const years = [1, 2, 3, 4]
  const firstYear = years.find((y) => entries.some((e) => e.year === y)) ?? 1
  const [year, setYear] = useState(firstYear)
  const [block, setBlock] = useState('')

  const blocks = useMemo(
    () => Array.from(new Set(entries.filter((e) => e.year === year).map((e) => e.block))).sort(),
    [entries, year]
  )
  const chosen = blocks.includes(block) ? block : (blocks[0] ?? '')
  const visible = entries.filter((e) => e.year === year && e.block === chosen)

  return (
    <div className={styles.browser}>
      <div className={styles.controls}>
        <div className="view-switch-tabs" role="tablist" aria-label="Year level">
          {years.map((y) => {
            const count = new Set(entries.filter((e) => e.year === y).map((e) => e.block)).size
            return (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={year === y}
                className={`view-switch-tab ${year === y ? 'active' : ''}`}
                onClick={() => {
                  setYear(y)
                  setBlock('')
                }}
              >
                {ordinal(y)} Year
                <span className={styles.count}>{count}</span>
              </button>
            )
          })}
        </div>

        {blocks.length > 0 && (
          <div className={styles.blocks} role="group" aria-label="Block">
            {blocks.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={b === chosen}
                className={b === chosen ? `${styles.block} ${styles.blockActive}` : styles.block}
                onClick={() => setBlock(b)}
              >
                Block {b}
              </button>
            ))}
          </div>
        )}
      </div>

      {chosen ? (
        <>
          <p className={styles.caption}>
            BSIT {year}
            {chosen} · {visible.length} {visible.length === 1 ? 'class meeting' : 'class meetings'}
          </p>
          {/* Keyed so the week settles in again when another block is chosen. */}
          <WeeklyTimetable
            key={`${year}-${chosen}`}
            hourHeight={50}
            sessions={visible.map((e) => {
              const [code, ...name] = e.subject.split(' — ')
              return {
                id: e.id,
                day: e.day,
                start: e.start,
                end: e.end,
                title: code || e.subject,
                lines: [name.join(' — '), e.faculty, e.room].filter(Boolean),
              }
            })}
          />
        </>
      ) : (
        <p className={styles.empty}>No draft classes for {ordinal(year)} Year yet.</p>
      )}
    </div>
  )
}

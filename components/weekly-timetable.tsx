import { DAY_NAMES, formatTime12 } from '@/lib/format'
import { timeToMinutes } from '@/lib/time'
import styles from './weekly-timetable.module.css'

export type TimetableSession = {
  id: string
  /** 1 = Monday … 7 = Sunday */
  day: number
  /** "HH:MM" or "HH:MM:SS" */
  start: string
  end: string
  title: string
  /** Extra lines under the title, e.g. block, room, instructor. */
  lines?: string[]
  kind?: 'lecture' | 'lab' | 'other'
  /** Marks a session that needs attention (e.g. a conflict). */
  alert?: boolean
}

/** Maps an entry_type ("lecture", "lab", …) to a timetable colour. */
export function sessionKind(entryType: string | null | undefined): TimetableSession['kind'] {
  const value = String(entryType ?? '').toLowerCase()
  if (value.includes('lab')) return 'lab'
  if (value.includes('lec')) return 'lecture'
  return 'other'
}

type Props = {
  sessions: TimetableSession[]
  /** Days to show (default Monday–Saturday; Sunday is added when a session uses it). */
  days?: number[]
  /** Pixels per hour. */
  hourHeight?: number
  emptyText?: string
}

type Placed = TimetableSession & { startMin: number; endMin: number; lane: number; lanes: number }

/** Gives overlapping sessions of one day side-by-side lanes. */
function placeDay(sessions: TimetableSession[]): Placed[] {
  const items = sessions
    .map((s) => ({ ...s, startMin: timeToMinutes(s.start), endMin: timeToMinutes(s.end) }))
    .filter(
      (s) => Number.isFinite(s.startMin) && Number.isFinite(s.endMin) && s.endMin > s.startMin
    )
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const placed: Placed[] = []
  let cluster: Placed[] = []
  let clusterEnd = -1
  const laneEnds: number[] = []

  const closeCluster = () => {
    const lanes = Math.max(1, ...cluster.map((item) => item.lane + 1))
    for (const item of cluster) item.lanes = lanes
    cluster = []
    laneEnds.length = 0
  }

  for (const item of items) {
    if (item.startMin >= clusterEnd && cluster.length) closeCluster()
    let lane = laneEnds.findIndex((end) => end <= item.startMin)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = item.endMin
    const entry: Placed = { ...item, lane, lanes: 1 }
    cluster.push(entry)
    placed.push(entry)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }
  if (cluster.length) closeCluster()
  return placed
}

/** A Monday–Saturday week grid. Server-safe (no client state). */
export function WeeklyTimetable({
  sessions,
  days = [1, 2, 3, 4, 5, 6],
  hourHeight = 56,
  emptyText = 'No classes to show.',
}: Props) {
  const shownDays = [...new Set([...days, ...sessions.map((s) => s.day)])]
    .filter((day) => day >= 1 && day <= 7)
    .sort((a, b) => a - b)

  const minutes = sessions.flatMap((s) => [timeToMinutes(s.start), timeToMinutes(s.end)])
  const valid = minutes.filter(Number.isFinite)
  const firstHour = valid.length ? Math.min(7, Math.floor(Math.min(...valid) / 60)) : 7
  const lastHour = valid.length ? Math.max(17, Math.ceil(Math.max(...valid) / 60)) : 17
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i)
  const top = (min: number) => ((min - firstHour * 60) / 60) * hourHeight

  if (!sessions.length) return <div className={styles.empty}>{emptyText}</div>

  return (
    <div className={styles.scroller}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `56px repeat(${shownDays.length}, minmax(110px, 1fr))` }}
      >
        <div className={styles.corner} />
        {shownDays.map((day) => (
          <div key={day} className={styles.dayHead}>
            <strong>{DAY_NAMES[day]?.slice(0, 3)}</strong>
            <span>{DAY_NAMES[day]}</span>
          </div>
        ))}

        <div className={styles.times} style={{ height: hours.length * hourHeight }}>
          {hours.map((hour) => (
            <span key={hour} style={{ top: (hour - firstHour) * hourHeight }}>
              {formatTime12(`${String(hour).padStart(2, '0')}:00`)}
            </span>
          ))}
        </div>

        {shownDays.map((day) => (
          <div
            key={day}
            className={styles.dayColumn}
            style={{ height: hours.length * hourHeight, backgroundSize: `100% ${hourHeight}px` }}
          >
            {placeDay(sessions.filter((s) => s.day === day)).map((s) => {
              const height = top(s.endMin) - top(s.startMin)
              const kindClass =
                s.kind === 'lab' ? styles.lab : s.kind === 'lecture' ? styles.lecture : styles.other
              return (
                <div
                  key={s.id}
                  data-session-id={s.id}
                  className={[styles.session, kindClass, s.alert ? styles.alert : '']
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    top: top(s.startMin) + 1,
                    height: Math.max(height - 2, 22),
                    left: `calc(${(s.lane / s.lanes) * 100}% + 3px)`,
                    width: `calc(${100 / s.lanes}% - 6px)`,
                  }}
                  title={`${s.title} · ${formatTime12(s.start)} – ${formatTime12(s.end)}${
                    s.lines?.length ? ` · ${s.lines.join(' · ')}` : ''
                  }`}
                >
                  <strong>{s.title}</strong>
                  <span className={styles.time}>
                    {formatTime12(s.start)} – {formatTime12(s.end)}
                  </span>
                  {height >= 70 && s.lines?.map((line) => <span key={line}>{line}</span>)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

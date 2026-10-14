import styles from './brand-week.module.css'

/** A small, static sample week used as the illustration on the public pages. */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const CLASSES: {
  day: number
  start: number
  span: number
  code: string
  room: string
  tone: 'blue' | 'gold' | 'lab'
}[] = [
  { day: 0, start: 0, span: 2, code: 'IT101', room: 'CL1', tone: 'lab' },
  { day: 0, start: 3, span: 1, code: 'GE102', room: 'RM101', tone: 'blue' },
  { day: 1, start: 1, span: 1, code: 'MATH101', room: 'RM102', tone: 'gold' },
  { day: 1, start: 3, span: 2, code: 'IT102', room: 'CL2', tone: 'lab' },
  { day: 2, start: 0, span: 1, code: 'GE101', room: 'RM103', tone: 'blue' },
  { day: 2, start: 2, span: 1, code: 'IT101', room: 'RM101', tone: 'blue' },
  { day: 3, start: 1, span: 2, code: 'IT102', room: 'CL1', tone: 'lab' },
  { day: 3, start: 4, span: 1, code: 'GE102', room: 'RM102', tone: 'blue' },
  { day: 4, start: 0, span: 1, code: 'MATH101', room: 'RM103', tone: 'gold' },
  { day: 4, start: 2, span: 1, code: 'GE101', room: 'RM101', tone: 'blue' },
]

export function BrandWeek({ caption = 'BSIT 1st Year · Block A' }: { caption?: string }) {
  return (
    <figure className={styles.week} aria-hidden="true">
      <figcaption>{caption}</figcaption>
      <div className={styles.grid}>
        {DAYS.map((day, index) => (
          <span key={day} className={styles.day} style={{ gridColumn: index + 1 }}>
            {day}
          </span>
        ))}
        {CLASSES.map((item, index) => (
          <span
            key={index}
            className={`${styles.block} ${styles[item.tone]}`}
            style={{
              ['--i' as string]: index,
              gridColumn: item.day + 1,
              gridRow: `${item.start + 2} / span ${item.span}`,
            }}
          >
            <strong>{item.code}</strong>
            <small>{item.room}</small>
          </span>
        ))}
      </div>
    </figure>
  )
}

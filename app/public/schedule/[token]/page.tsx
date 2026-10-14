import Image from 'next/image'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DataTable } from '@/components/data-table'
import { ViewSwitch } from '@/components/view-switch'
import { WeeklyTimetable, sessionKind } from '@/components/weekly-timetable'
import { DAY_NAMES, formatTime12 } from '@/lib/format'
import { PrintButton } from '@/components/print-button'
import styles from './page.module.css'

/** Shape returned by the get_public_schedule_by_token() database function. */
type PublicEntry = {
  day_of_week: number
  start_time: string
  end_time: string
  subject_code: string | null
  subject: string | null
  room: string | null
  instructor: string | null
  session_type: string | null
}

type PublicSchedule = {
  title?: string | null
  program?: string | null
  block?: string | null
  academic_year?: string | null
  semester?: string | null
  entries?: PublicEntry[] | null
}

export default async function PublicSchedulePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const s = await createClient()
  const { data } = await s.rpc('get_public_schedule_by_token', { p_token: token })
  if (!data) notFound()
  const schedule = data as PublicSchedule
  const entries = schedule.entries ?? []
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const qr = await QRCode.toDataURL(`${base}/public/schedule/${token}`, { margin: 1, width: 220 })

  const table = (
    <DataTable>
      <thead>
        <tr>
          <th>Day</th>
          <th>Time</th>
          <th>Code</th>
          <th>Subject</th>
          <th>Room</th>
          <th>Instructor</th>
          <th>Session</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={index}>
            <td>{DAY_NAMES[entry.day_of_week] || entry.day_of_week}</td>
            <td>
              {formatTime12(entry.start_time)} – {formatTime12(entry.end_time)}
            </td>
            <td>{entry.subject_code}</td>
            <td>{entry.subject}</td>
            <td>{entry.room || '—'}</td>
            <td>{entry.instructor || 'TBA'}</td>
            <td>{entry.session_type === 'lab' ? 'Lab' : 'Lecture'}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  )

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <span className={styles.school}>
          <Image src="/cctc-logo.png" alt="" width={40} height={40} />
          <span>
            <strong>Consolatrix College of Toledo City</strong>
            <small>Published class schedule</small>
          </span>
        </span>
        <PrintButton />
      </header>
      <section className={styles.sheet}>
        <div className={styles.head}>
          <div>
            <h1>
              {schedule.title || `${schedule.program || 'BSIT'} ${schedule.block || ''} Schedule`}
            </h1>
            <p>
              {[
                schedule.academic_year,
                schedule.semester,
                schedule.block && `Block ${schedule.block}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <span className="pill pill-success">Official</span>
        </div>
        <ViewSwitch
          storageKey="public-schedule"
          week={
            <WeeklyTimetable
              sessions={entries.map((entry, index) => ({
                id: String(index),
                day: entry.day_of_week,
                start: entry.start_time,
                end: entry.end_time,
                title: entry.subject_code ?? 'Class',
                lines: [entry.room || 'No room', entry.instructor || 'TBA'],
                kind: sessionKind(entry.session_type),
              }))}
            />
          }
          list={table}
        />
        <div className={styles.share}>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL, nothing to optimise */}
          <img src={qr} alt="QR code for this schedule" width="140" height="140" />
          <p>
            Scan to open this schedule on your phone. It always shows the latest published version.
          </p>
        </div>
      </section>
      <footer className={styles.footer}>
        AlterSched · Consolatrix College of Toledo City, Inc.
      </footer>
    </main>
  )
}

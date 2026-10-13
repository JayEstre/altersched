import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DataTable } from '@/components/data-table'
<<<<<<< HEAD
import { ViewSwitch } from '@/components/view-switch'
import { WeeklyTimetable, sessionKind } from '@/components/weekly-timetable'
import { DAY_NAMES, formatTime12 } from '@/lib/format'

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
            <td>{entry.session_type || 'lecture'}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  )

  return (
    <main className="public-schedule-page">
      <section className="panel public-schedule-card">
        <p className="eyebrow">ALTERSCHED • PUBLISHED SCHEDULE</p>
        <h1>
          {schedule.title || `${schedule.program || 'BSIT'} ${schedule.block || ''} Schedule`}
        </h1>
        <p className="muted">
          {schedule.academic_year || ''} • {schedule.semester || ''} • Block {schedule.block || '—'}
        </p>
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
        <div className="qr-share">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL, nothing to optimise */}
          <img src={qr} alt="Schedule QR code" width="220" height="220" />
          <p className="muted">Scan this QR code to reopen this published schedule.</p>
        </div>
      </section>
    </main>
  )
=======

const days=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
export default async function PublicSchedule({params}:{params:Promise<{token:string}>}){
  const {token}=await params; const s=await createClient(); const {data}=await s.rpc('get_public_schedule_by_token',{p_token:token})
  if(!data) notFound(); const d:any=data
  const base=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; const qr=await QRCode.toDataURL(`${base}/public/schedule/${token}`,{margin:1,width:220})
  return <main className="public-schedule-page"><section className="panel public-schedule-card"><p className="eyebrow">ALTERSCHED • PUBLISHED SCHEDULE</p><h1>{d.title||`${d.program||'BSIT'} ${d.block||''} Schedule`}</h1><p className="muted">{d.academic_year||''} • {d.semester||''} • Block {d.block||'—'}</p><DataTable><thead><tr><th>Day</th><th>Time</th><th>Code</th><th>Subject</th><th>Room</th><th>Instructor</th><th>Session</th></tr></thead><tbody>{(d.entries||[]).map((e:any,i:number)=><tr key={i}><td>{days[e.day_of_week]||e.day_of_week}</td><td>{String(e.start_time).slice(0,5)}–{String(e.end_time).slice(0,5)}</td><td>{e.subject_code}</td><td>{e.subject}</td><td>{e.room||'—'}</td><td>{e.instructor||'TBA'}</td><td>{e.session_type||'lecture'}</td></tr>)}</tbody></DataTable><div className="qr-share"><img src={qr} alt="Schedule QR code" width="220" height="220"/><p className="muted">Scan this QR code to reopen this published schedule.</p></div></section></main>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

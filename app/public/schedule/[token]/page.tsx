import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DataTable } from '@/components/data-table'

const days=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
export default async function PublicSchedule({params}:{params:Promise<{token:string}>}){
  const {token}=await params; const s=await createClient(); const {data}=await s.rpc('get_public_schedule_by_token',{p_token:token})
  if(!data) notFound(); const d:any=data
  const base=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; const qr=await QRCode.toDataURL(`${base}/public/schedule/${token}`,{margin:1,width:220})
  return <main className="public-schedule-page"><section className="panel public-schedule-card"><p className="eyebrow">ALTERSCHED • PUBLISHED SCHEDULE</p><h1>{d.title||`${d.program||'BSIT'} ${d.block||''} Schedule`}</h1><p className="muted">{d.academic_year||''} • {d.semester||''} • Block {d.block||'—'}</p><DataTable><thead><tr><th>Day</th><th>Time</th><th>Code</th><th>Subject</th><th>Room</th><th>Instructor</th><th>Session</th></tr></thead><tbody>{(d.entries||[]).map((e:any,i:number)=><tr key={i}><td>{days[e.day_of_week]||e.day_of_week}</td><td>{String(e.start_time).slice(0,5)}–{String(e.end_time).slice(0,5)}</td><td>{e.subject_code}</td><td>{e.subject}</td><td>{e.room||'—'}</td><td>{e.instructor||'TBA'}</td><td>{e.session_type||'lecture'}</td></tr>)}</tbody></DataTable><div className="qr-share"><img src={qr} alt="Schedule QR code" width="220" height="220"/><p className="muted">Scan this QR code to reopen this published schedule.</p></div></section></main>
}

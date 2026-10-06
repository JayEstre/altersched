import * as XLSX from 'xlsx'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
const day=(n:number)=>['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][n]||String(n)
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  await requireRole(['department_scheduler','super_admin','faculty']); const {id}=await params; const s=await createClient()
  const {data:sch}=await s.from('schedules').select('id,title,current_version_id').eq('id',id).maybeSingle(); if(!sch?.current_version_id)return NextResponse.json({error:'Schedule not found'},{status:404})
  const {data}=await s.from('schedule_entries').select('day_of_week,start_time,end_time,session_type,rooms(code),class_offerings(subjects(code,name,units),sections(code,year_levels(name))),faculty_profiles(profiles(full_name))').eq('schedule_version_id',sch.current_version_id).order('day_of_week').order('start_time')
  const rows=(data||[]).map((e:any)=>{const o=Array.isArray(e.class_offerings)?e.class_offerings[0]:e.class_offerings; const sub=Array.isArray(o?.subjects)?o.subjects[0]:o?.subjects; const sec=Array.isArray(o?.sections)?o.sections[0]:o?.sections; const yl=Array.isArray(sec?.year_levels)?sec.year_levels[0]:sec?.year_levels; const room=Array.isArray(e.rooms)?e.rooms[0]:e.rooms; const fp=Array.isArray(e.faculty_profiles)?e.faculty_profiles[0]:e.faculty_profiles; const prof=Array.isArray(fp?.profiles)?fp.profiles[0]:fp?.profiles; return {Day:day(e.day_of_week),Time:`${String(e.start_time).slice(0,5)}-${String(e.end_time).slice(0,5)}`,'Subject Code':sub?.code||'',Subject:sub?.name||'',Year:yl?.name||'',Block:sec?.code||'',Room:room?.code||'',Instructor:prof?.full_name||'TBA',Units:sub?.units??'',Session:e.session_type||'lecture'}})
  const format=req.nextUrl.searchParams.get('format')||'xlsx'; const safe=(sch.title||'AlterSched-Schedule').replace(/[^a-z0-9-_]+/gi,'-')
  if(format==='csv'){const csv=XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${safe}.csv"`}})}
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Schedule'); const out=XLSX.write(wb,{type:'buffer',bookType:'xlsx'}); return new NextResponse(out,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${safe}.xlsx"`}})
}

import { createClient } from '@/lib/supabase/server'
import { PageHead, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { one } from '@/lib/relations'
import { DAY_NAMES } from '@/lib/format'

function time(v: string) {
  if (!v) return '—'
  const [h, m] = v.slice(0, 5).split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default async function Page() {
  const s = await createClient()
  const { data: bsit } = await s
    .from('programs')
    .select('id')
    .ilike('code', 'BSIT')
    .eq('is_active', true)
    .maybeSingle()
  const { data: schedules } = bsit
    ? await s
        .from('schedules')
        .select(
          'id,published_version_id,status,semester_id,section_id,year_level_id,sections(code),year_levels(name),semesters(name,academic_years(name))'
        )
        .eq('program_id', bsit.id)
        .neq('status', 'archived')
        .not('published_version_id', 'is', null)
    : { data: [] }
  const versions = (schedules ?? []).map((x) => x.published_version_id).filter(Boolean)
  const { data: entries } = versions.length
    ? await s
        .from('schedule_entries')
        .select(
          'id,schedule_version_id,day_of_week,start_time,end_time,session_type,delivery_mode,class_offerings(subjects(code,name,units)),rooms(code,name),faculty_profiles(employee_id,profiles(full_name))'
        )
        .in('schedule_version_id', versions)
    : { data: [] }
  const scheduleByVersion = new Map((schedules ?? []).map((x) => [x.published_version_id, x]))
  const rows = (entries ?? [])
    .flatMap((e) => {
      const sc = scheduleByVersion.get(e.schedule_version_id)
      return sc ? [{ e, sc }] : []
    })
    .sort(
      (a, b) =>
        Number(a.e.day_of_week) - Number(b.e.day_of_week) ||
        String(a.e.start_time).localeCompare(String(b.e.start_time))
    )
  return (
    <div className="page-stack">
      <PageHead
        eyebrow="COLLEGE OF COMPUTER STUDIES"
        title="General BSIT Class Program"
        description="Published BSIT timetable arranged in the same core fields used by the official class program."
      />
      {!rows.length ? (
        <Empty
          title="No published BSIT class program"
          text="Generate, validate and publish the BSIT schedule first."
        />
      ) : (
        <section className="panel">
          <DataTable>
            <thead>
              <tr>
                <th>Day</th>
                <th>Time</th>
                <th>Code</th>
                <th>Description / Block</th>
                <th>Year</th>
                <th>Room</th>
                <th>Teacher</th>
                <th>Units</th>
                <th>Session</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, sc }) => {
                const off = one(e.class_offerings)
                const sub = one(off?.subjects)
                const room = one(e.rooms)
                const fac = one(e.faculty_profiles)
                const prof = one(fac?.profiles)
                const sec = one(sc.sections)
                const yr = one(sc.year_levels)
                return (
                  <tr key={e.id}>
                    <td>
                      <strong>{DAY_NAMES[e.day_of_week] ?? e.day_of_week}</strong>
                    </td>
                    <td>
                      {time(e.start_time)} – {time(e.end_time)}
                    </td>
                    <td>{sub?.code ?? '—'}</td>
                    <td>
                      {sub?.name ?? '—'} {sec?.code ? `- ${sec.code}` : ''}
                    </td>
                    <td>{yr?.name ?? '—'}</td>
                    <td>{room?.code ?? room?.name ?? '—'}</td>
                    <td>{prof?.full_name ?? 'Unassigned'}</td>
                    <td>{sub?.units ?? '—'}</td>
                    <td>
                      <Badge tone={e.session_type === 'lab' ? 'warning' : 'info'}>
                        {String(e.session_type ?? 'lecture').toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </section>
      )}
    </div>
  )
}

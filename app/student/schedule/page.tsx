import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty} from '@/components/ui'
const days=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export default async function Page(){const {profile}=await requireRole(['student']);
const s=await createClient();
const {data:sp}=await s.from('student_profiles').select('id').eq('profile_id',profile.id).maybeSingle();
const {data:m}=await s.from('schedule_memberships').select('schedule_version_id').eq('student_profile_id',sp?.id||'').eq('active',true).maybeSingle();
const {data}=m?await s.from('schedule_entries').select('id,day_of_week,start_time,end_time,rooms(code,name),class_offerings(subjects(code,name),faculty_profiles(profiles(full_name)))').eq('schedule_version_id',m.schedule_version_id).order('day_of_week').order('start_time'):{data:[] as any[]};
return <><PageHead eyebrow="PUBLISHED SCHEDULE" title="My Schedule" description="The active schedule currently claimed for your section."/><div className="schedule-grid">{data?.length?data.map((x:any)=><div className="schedule-item" key={x.id}><strong>{days[x.day_of_week]} · {x.start_time.slice(0,5)}–{x.end_time.slice(0,5)} · {x.class_offerings?.[0]?.subjects?.[0]?.code||'Class'}</strong><span>{x.class_offerings?.[0]?.subjects?.[0]?.name||''} · {x.class_offerings?.[0]?.faculty_profiles?.[0]?.profiles?.[0]?.full_name||'TBA'} · Room {x.rooms?.[0]?.code||'—'}</span></div>):<Empty text="No active schedule claimed yet."/>}</div></>}

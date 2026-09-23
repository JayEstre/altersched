import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty} from '@/components/ui'
const days=['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export default async function Page(){const {profile}=await requireRole(['faculty']);
const s=await createClient();
const {data:f}=await s.from('faculty_profiles').select('id').eq('profile_id',profile.id).maybeSingle();
const {data}=await s.from('schedule_entries').select('id,day_of_week,start_time,end_time,rooms(code),class_offerings(subjects(code,name),sections(code)),schedule_versions!inner(status)').eq('faculty_id',f?.id||'').eq('schedule_versions.status','published').order('day_of_week').order('start_time');
return <><PageHead eyebrow="PUBLISHED SCHEDULE" title="My Schedule" description="Your currently published teaching schedule."/><div className="schedule-grid">{data?.length?data.map((x:any)=><div className="schedule-item" key={x.id}><strong>{days[x.day_of_week]} · {x.start_time.slice(0,5)}–{x.end_time.slice(0,5)} · {x.class_offerings?.[0]?.subjects?.[0]?.code||'Class'}</strong><span>{x.class_offerings?.[0]?.sections?.[0]?.code||'—'} · Room {x.rooms?.[0]?.code||'—'}</span></div>):<Empty text="No published schedule entries assigned to you."/>}</div></>}

import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty,Badge} from '@/components/ui'
const days=['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export default async function Page(){const {profile}=await requireRole(['faculty']);
const s=await createClient();
const {data:f}=await s.from('faculty_profiles').select('id').eq('profile_id',profile.id).maybeSingle();
const {data}=await s.from('faculty_availability').select('id,day_of_week,start_time,end_time,availability_type,semesters(name)').eq('faculty_id',f?.id||'').order('day_of_week');
return <><PageHead eyebrow="PREFERENCES" title="Availability" description="Availability records used by schedule conflict validation."/><div className="panel">{data?.length?<table className="data-table"><tbody>{data.map((x:any)=><tr key={x.id}><td>{days[x.day_of_week]}</td><td>{x.start_time.slice(0,5)}–{x.end_time.slice(0,5)}</td><td>{x.semesters?.[0]?.name}</td><td><Badge>{x.availability_type}</Badge></td></tr>)}</tbody></table>:<Empty text="No availability records."/>}</div></>}

import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Stat} from '@/components/ui'
export default async function Page(){const {profile}=await requireRole(['department_scheduler']);
const s=await createClient();
const [{data:a},{count:o},{count:sc},{count:cr}]=await Promise.all([s.from('scheduler_departments').select('department_id,departments(code,name)').eq('profile_id',profile.id).eq('active',true),s.from('class_offerings').select('*',{count:'exact',head:true}),s.from('schedules').select('*',{count:'exact',head:true}),s.from('schedule_change_requests').select('*',{count:'exact',head:true}).eq('status','pending')]);
return <><PageHead eyebrow="WORKSPACE" title="Scheduler Dashboard" description="Prepare department schedules, validate conflicts, and coordinate alteration requests."/><div className="stats-grid"><Stat label="Assigned Departments" value={a?.length||0}/><Stat label="Class Offerings" value={o||0}/><Stat label="Schedules" value={sc||0}/><Stat label="Pending Requests" value={cr||0}/></div><div className="panel"><h3>Assigned Scope</h3><p className="muted">{a?.map((x:any)=>x.departments?.[0]?.code).filter(Boolean).join(', ')||'No active department assignment.'}</p></div></>}

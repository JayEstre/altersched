import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty} from '@/components/ui'
export default async function Page(){const {profile}=await requireRole(['faculty']);
const s=await createClient();
const {data:f}=await s.from('faculty_profiles').select('id,max_teaching_load').eq('profile_id',profile.id).maybeSingle();
const {data}=await s.from('class_offerings').select('id,required_weekly_hours,subjects(code,name),sections(code)').eq('faculty_id',f?.id||'').eq('status','active');
const total=data?.reduce((n,x)=>n+Number(x.required_weekly_hours||0),0)||0;
return <><PageHead eyebrow="LOAD" title="Teaching Load" description="Active class offerings currently assigned to you."/><div className="panel"><h3>{total} / {f?.max_teaching_load??'—'} weekly hours</h3></div><div className="panel">{data?.length?<table className="data-table"><tbody>{data.map((x:any)=><tr key={x.id}><td>{x.subjects?.[0]?.code}</td><td>{x.subjects?.[0]?.name}</td><td>{x.sections?.[0]?.code}</td><td>{x.required_weekly_hours} hrs</td></tr>)}</tbody></table>:<Empty text="No active teaching assignments."/>}</div></>}

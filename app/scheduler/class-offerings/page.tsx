import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty,Badge} from '@/components/ui'
export default async function Page(){const s=await createClient();
const {data}=await s.from('class_offerings').select('id,status,required_weekly_hours,subjects(code,name),sections(code),faculty_profiles(employee_id,profiles(full_name))').order('created_at',{ascending:false});
return <><PageHead eyebrow="INPUTS" title="Class Offerings" description="Review class requirements before placing them into schedules."/><div className="panel">{data?.length?<table className="data-table"><tbody>{data.map((x:any)=><tr key={x.id}><td>{x.subjects?.[0]?.code}</td><td>{x.sections?.[0]?.code}</td><td>{x.faculty_profiles?.[0]?.profiles?.[0]?.full_name||'Unassigned'}</td><td>{x.required_weekly_hours} hrs</td><td><Badge>{x.status}</Badge></td></tr>)}</tbody></table>:<Empty text="No class offerings."/>}</div></>}

import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty} from '@/components/ui'
export default async function Page(){const s=await createClient();
const {data}=await s.from('faculty_profiles').select('id,employee_id,max_teaching_load,profiles(full_name),departments(code)').order('employee_id');
return <><PageHead eyebrow="RESOURCES" title="Faculty" description="Faculty reference for teaching assignments and schedule preparation."/><div className="panel">{data?.length?<table className="data-table"><tbody>{data.map((x:any)=><tr key={x.id}><td>{x.employee_id}</td><td>{x.profiles?.[0]?.full_name}</td><td>{x.departments?.[0]?.code}</td><td>{x.max_teaching_load??'—'}</td></tr>)}</tbody></table>:<Empty text="No faculty records."/>}</div></>}

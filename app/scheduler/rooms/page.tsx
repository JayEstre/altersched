import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty} from '@/components/ui'
export default async function Page(){const s=await createClient();
const {data}=await s.from('rooms').select('id,code,name,capacity,building').eq('is_active',true).order('code');
return <><PageHead eyebrow="RESOURCES" title="Rooms" description="Available room inventory for schedule placement."/><div className="panel">{data?.length?<table className="data-table"><tbody>{data.map(x=><tr key={x.id}><td>{x.code}</td><td>{x.name}</td><td>{x.building||'—'}</td><td>{x.capacity} seats</td></tr>)}</tbody></table>:<Empty text="No rooms configured."/>}</div></>}

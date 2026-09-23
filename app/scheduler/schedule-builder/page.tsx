import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Stat} from '@/components/ui'
export default async function Page(){const s=await createClient();
const [{count:d},{count:e}]=await Promise.all([s.from('schedules').select('*',{count:'exact',head:true}).eq('status','draft'),s.from('schedule_validation_logs').select('*',{count:'exact',head:true}).eq('resolved',false)]);
return <><PageHead eyebrow="BUILD & VALIDATE" title="Schedule Builder" description="Department scheduling workspace. Resolve all detected conflicts before forwarding a schedule for publication."/><div className="stats-grid"><Stat label="Draft Schedules" value={d||0}/><Stat label="Unresolved Conflicts" value={e||0}/></div><div className="panel"><div className="action-row"><Link href="/scheduler/class-offerings" className="action primary">Review Offerings</Link><Link href="/scheduler/schedules" className="action">Open Schedules</Link></div></div></>}

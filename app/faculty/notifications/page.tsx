import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Empty,Badge} from '@/components/ui'
export default async function Page(){const {profile}=await requireRole(['faculty']);
const s=await createClient();
const {data}=await s.from('notifications').select('id,title,message,priority,read_at,created_at').eq('profile_id',profile.id).order('created_at',{ascending:false});
return <><PageHead eyebrow="UPDATES" title="Notifications" description="Teaching schedule, alteration, and system notifications."/><div className="schedule-grid">{data?.length?data.map(x=><div className="schedule-item" key={x.id}><strong>{x.title} <Badge>{x.priority}</Badge></strong><span>{x.message}</span></div>):<Empty text="No notifications."/>}</div></>}

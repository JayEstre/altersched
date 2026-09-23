import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Stat} from '@/components/ui'
export default async function Page(){const {profile}=await requireRole(['faculty']);
const s=await createClient();
const {data:f}=await s.from('faculty_profiles').select('id,max_teaching_load').eq('profile_id',profile.id).maybeSingle();
const [{count:o},{count:a},{count:n}]=await Promise.all([s.from('class_offerings').select('*',{count:'exact',head:true}).eq('faculty_id',f?.id||''),s.from('faculty_availability').select('*',{count:'exact',head:true}).eq('faculty_id',f?.id||''),s.from('notifications').select('*',{count:'exact',head:true}).eq('profile_id',profile.id).is('read_at',null)]);
return <><PageHead eyebrow="OVERVIEW" title="Faculty Dashboard" description="Your teaching assignments, availability, schedule, and alteration workflow."/><div className="stats-grid"><Stat label="Class Offerings" value={o||0}/><Stat label="Availability Records" value={a||0}/><Stat label="Unread Notifications" value={n||0}/><Stat label="Max Teaching Load" value={f?.max_teaching_load??'—'}/></div></>}

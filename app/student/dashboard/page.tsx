import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead,Stat} from '@/components/ui'
export default async function Page(){const {profile}=await requireRole(['student']);
const s=await createClient();
const {data:sp}=await s.from('student_profiles').select('id,student_id,programs(code),year_levels(name),sections(code)').eq('profile_id',profile.id).maybeSingle();
const [{count:m},{count:n}]=await Promise.all([s.from('schedule_memberships').select('*',{count:'exact',head:true}).eq('student_profile_id',sp?.id||'').eq('active',true),s.from('notifications').select('*',{count:'exact',head:true}).eq('profile_id',profile.id).is('read_at',null)]);
return <><PageHead eyebrow="OVERVIEW" title="Student Dashboard" description="Your claimed published schedule and schedule-change notifications."/><div className="stats-grid"><Stat label="Active Schedules" value={m||0}/><Stat label="Unread Notifications" value={n||0}/><Stat label="Program" value={(sp as any)?.programs?.[0]?.code||'—'}/><Stat label="Block" value={(sp as any)?.sections?.[0]?.code||'—'}/></div><div className="panel"><h3>{profile.full_name}</h3><p className="muted">Student ID: {sp?.student_id||'—'} · {(sp as any)?.year_levels?.[0]?.name||'—'}</p></div></>}

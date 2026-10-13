import {requireRole} from '@/lib/auth/require-role';
import {createClient} from '@/lib/supabase/server';
import {PageHead} from '@/components/ui'
export default async function Page(){const {profile,user}=await requireRole(['student']);
const s=await createClient();
const {data}=await s.from('student_profiles').select('student_id,programs(code,name),year_levels(name),sections(code)').eq('profile_id',profile.id).maybeSingle();
return <><PageHead eyebrow="ACCOUNT" title="Profile" description="Your student account and schedule-eligibility information."/><div className="panel"><h3>{profile.full_name}</h3><p className="muted">{user.email}</p><p>Student ID: {data?.student_id||'—'}</p><p>Program: {(data as any)?.programs?.[0]?.name||'—'}</p><p>Year Level: {(data as any)?.year_levels?.[0]?.name||'—'}</p><p>Block: {(data as any)?.sections?.[0]?.code||'—'}</p></div></>}

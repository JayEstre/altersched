import {requireRole} from '@/lib/auth/require-role';
import {PageHead} from '@/components/ui'
export default async function Page(){const {profile,user}=await requireRole(['department_scheduler']);
return <><PageHead eyebrow="ACCOUNT" title="Profile" description="Your AlterSched scheduler account."/><div className="panel"><h3>{profile.full_name}</h3><p className="muted">{user.email}</p><p><span className="pill">{profile.role}</span></p></div></>}

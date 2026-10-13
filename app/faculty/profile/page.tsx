import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import { one } from '@/lib/relations'
export default async function Page() {
  const { profile, user } = await requireRole(['faculty'])
  const s = await createClient()
  const { data } = await s
    .from('faculty_profiles')
    .select('employee_id,employment_type,max_teaching_load,departments(code,name)')
    .eq('profile_id', profile.id)
    .maybeSingle()
  return (
    <>
      <PageHead
        eyebrow="ACCOUNT"
        title="Profile"
        description="Your faculty account and academic assignment."
      />
      <div className="panel">
        <h3>{profile.full_name}</h3>
        <p className="muted">{user.email}</p>
        <p>Employee ID: {data?.employee_id || '—'}</p>
        <p>Department: {one(data?.departments)?.name || '—'}</p>
        <p>Employment: {data?.employment_type || '—'}</p>
      </div>
    </>
  )
}

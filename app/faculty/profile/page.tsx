import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import { ProfileCard } from '@/components/profile-card'
import { one } from '@/lib/relations'
import { humanize } from '@/lib/format'

export default async function Page() {
  const { profile, user } = await requireRole(['faculty'])
  const supabase = await createClient()
  const { data } = await supabase
    .from('faculty_profiles')
    .select('employee_id, employment_type, max_teaching_load, departments(code, name)')
    .eq('profile_id', profile.id)
    .maybeSingle()
  const department = one(data?.departments)

  return (
    <>
      <PageHead title="Profile" description="Your account and teaching record." />
      <ProfileCard
        name={profile.full_name || 'Instructor'}
        email={user.email}
        role="Instructor"
        details={[
          { label: 'Employee ID', value: data?.employee_id || '—' },
          {
            label: 'Department',
            value: department ? `${department.name} (${department.code})` : '—',
          },
          { label: 'Employment', value: humanize(data?.employment_type, 'Not specified') },
          {
            label: 'Maximum teaching load',
            value: data?.max_teaching_load ? `${data.max_teaching_load} hours per week` : 'Not set',
          },
        ]}
      />
    </>
  )
}

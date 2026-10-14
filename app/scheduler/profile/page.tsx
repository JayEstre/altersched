import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import { ProfileCard } from '@/components/profile-card'
import { one } from '@/lib/relations'

export default async function Page() {
  const { profile, user } = await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const [{ data: departments }, { data: faculty }] = await Promise.all([
    supabase
      .from('scheduler_departments')
      .select('department_id, departments(code, name)')
      .eq('profile_id', profile.id)
      .eq('active', true),
    supabase
      .from('faculty_profiles')
      .select('employee_id')
      .eq('profile_id', profile.id)
      .maybeSingle(),
  ])
  const departmentNames = (departments ?? [])
    .map((row) => one(row.departments))
    .filter(Boolean)
    .map((department) => `${department!.name} (${department!.code})`)

  return (
    <>
      <PageHead title="Profile" description="Your account and the departments you schedule." />
      <ProfileCard
        name={profile.full_name || 'Department Scheduler'}
        email={user.email}
        role="Department Scheduler"
        details={[
          { label: 'Employee ID', value: faculty?.employee_id || '—' },
          {
            label: departmentNames.length > 1 ? 'Departments' : 'Department',
            value: departmentNames.join(', ') || 'None assigned yet',
          },
        ]}
      />
    </>
  )
}

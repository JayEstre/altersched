import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import { NotificationList } from '@/components/notification-list'

export default async function Page() {
  const { profile } = await requireRole(['department_scheduler'])
  const supabase = await createClient()
  const { data } = await supabase
    .from('notifications')
    .select('id, title, message, priority, read_at, created_at')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <>
      <PageHead
        title="Notifications"
        description="Schedule publications, request decisions and other updates for your account."
      />
      <NotificationList rows={data ?? []} returnTo="/scheduler/notifications" />
    </>
  )
}

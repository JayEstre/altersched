'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

/** Marks every unread notification of the signed-in user as read. */
export async function markAllNotificationsRead(formData: FormData) {
  const { profile } = await requireRole(['faculty', 'department_scheduler', 'super_admin'])
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', profile.id)
    .is('read_at', null)
  const back = String(formData.get('return_to') ?? '')
  if (back.startsWith('/')) revalidatePath(back)
  revalidatePath('/faculty/dashboard')
  revalidatePath('/scheduler/dashboard')
}

import type { SupabaseClient } from '@supabase/supabase-js'
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
import type { ProfileRecord } from './redirect'

export async function fetchProfileForUser(
  supabase: Pick<SupabaseClient, 'from'>,
  userId: string
): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, account_status')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    full_name: data.full_name ?? null,
    role: data.role ?? null,
    account_status: data.account_status ?? null,
  }
}

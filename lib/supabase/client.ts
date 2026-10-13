import { createBrowserClient } from '@supabase/ssr'
<<<<<<< HEAD
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
=======

export function createClient() {
  return createBrowserClient(
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

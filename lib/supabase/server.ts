import { createServerClient } from '@supabase/ssr'
<<<<<<< HEAD
import type { Database } from '@/lib/database.types'
=======
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

<<<<<<< HEAD
  return createServerClient<Database>(
=======
  return createServerClient(
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot always write cookies. proxy.ts handles refresh.
          }
        },
      },
    }
  )
}

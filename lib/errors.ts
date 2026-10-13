/** Readable message from anything thrown: Error, Supabase/PostgREST error objects, or strings. */
export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error) return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

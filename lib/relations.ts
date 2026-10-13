/**
 * Supabase returns a many-to-one embedded relation (e.g. class_offerings -> sections)
 * as a single object, and a one-to-many relation as an array. Some pages indexed
 * single relations with `[0]`, which always produced `undefined`. `one()` accepts
 * either shape and returns the first/only record.
 */
export function one<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

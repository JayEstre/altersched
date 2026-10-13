/** Small, typed readers for FormData in server actions. */

/** Trimmed string value, or '' when the field is missing or is a file. */
export function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/** Trimmed string value, or null when empty. */
export function getOptionalString(formData: FormData, key: string) {
  return getString(formData, key) || null
}

/** Finite number, or null when empty / not a number. */
export function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** Checkbox value ("on") → boolean. */
export function getCheckbox(formData: FormData, key: string) {
  return getString(formData, key) === 'on'
}

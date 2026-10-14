/** Small, typed readers for FormData in server actions. */

/** Trimmed string value, or '' when the field is missing or is a file. */
export function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

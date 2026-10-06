'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

type ImportRow = {
  subject_code?: unknown
  year_level?: unknown
  section?: unknown
  weekly_hours?: unknown
  expected_students?: unknown
}

function norm(value: unknown) { return String(value ?? '').trim() }
function upper(value: unknown) { return norm(value).toUpperCase() }

export async function importStudyLoad(formData: FormData) {
  const { user } = await requireRole(['super_admin'])
  const supabase = await createClient()
  const semesterId = norm(formData.get('semester_id'))
  const file = formData.get('file')

  if (!semesterId || !(file instanceof File) || file.size === 0) {
    redirect('/admin/study-load?error=semester_and_file_required')
  }
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    redirect('/admin/study-load?error=excel_required')
  }

  const { data: program } = await supabase
    .from('programs').select('id,department_id,code,name')
    .ilike('code', 'BSIT').eq('is_active', true).maybeSingle()
  if (!program) redirect('/admin/study-load?error=bsit_program_missing')

  let rows: ImportRow[] = []
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const workbook = XLSX.read(bytes, { type: 'array' })
    const first = workbook.SheetNames[0]
    if (!first) redirect('/admin/study-load?error=empty_workbook')
    rows = XLSX.utils.sheet_to_json<ImportRow>(workbook.Sheets[first], { defval: '' })
  } catch {
    redirect('/admin/study-load?error=invalid_workbook')
  }
  if (!rows.length) redirect('/admin/study-load?error=empty_workbook')

  const [{ data: subjects }, { data: years }] = await Promise.all([
    supabase.from('subjects').select('id,code,lecture_hours,lab_hours').eq('department_id', program.department_id).eq('is_active', true),
    supabase.from('year_levels').select('id,level_number').eq('program_id', program.id).eq('is_active', true),
  ])
  const yearIds = (years ?? []).map(y => y.id)
  const { data: sections } = yearIds.length
    ? await supabase.from('sections').select('id,year_level_id,code,capacity').in('year_level_id', yearIds).eq('is_active', true)
    : { data: [] as any[] }

  const subjectByCode = new Map((subjects ?? []).map(s => [upper(s.code), s]))
  const yearByNumber = new Map((years ?? []).map(y => [Number(y.level_number), y]))
  const errors: Array<{ row: number; message: string }> = []
  const valid: any[] = []

  rows.forEach((row, index) => {
    const n = index + 2
    const code = upper(row.subject_code)
    const level = Number(norm(row.year_level))
    const block = upper(row.section).replace(/^BLOCK\s+/i, '')
    const subject = subjectByCode.get(code)
    const year = yearByNumber.get(level)
    const section = (sections ?? []).find(s => s.year_level_id === year?.id && upper(s.code).replace(/^BLOCK\s+/i, '') === block)
    const suppliedHours = Number(norm(row.weekly_hours))
    const derivedHours = Number(subject?.lecture_hours ?? 0) + Number(subject?.lab_hours ?? 0)
    const hours = Number.isFinite(suppliedHours) && suppliedHours > 0 ? suppliedHours : derivedHours
    const expected = Number(norm(row.expected_students))

    if (!code || !subject) return errors.push({ row: n, message: `Unknown BSIT subject code: ${code || '(blank)'}` })
    if (!year || !Number.isInteger(level)) return errors.push({ row: n, message: `Invalid BSIT year level: ${norm(row.year_level)}` })
    if (!section) return errors.push({ row: n, message: `Block ${block || '(blank)'} not found under Year ${level}` })
    if (!Number.isFinite(hours) || hours <= 0) return errors.push({ row: n, message: `No valid weekly hours for ${code}` })

    valid.push({
      semester_id: semesterId,
      section_id: section.id,
      subject_id: subject.id,
      required_weekly_hours: hours,
      expected_students: Number.isFinite(expected) && expected > 0 ? Math.round(expected) : section.capacity ?? null,
      status: 'active',
    })
  })

  let imported = 0
  for (const item of valid) {
    const { data: existing } = await supabase.from('class_offerings')
      .select('id').eq('semester_id', item.semester_id).eq('section_id', item.section_id).eq('subject_id', item.subject_id).maybeSingle()
    const result = existing
      ? await supabase.from('class_offerings').update({ required_weekly_hours: item.required_weekly_hours, expected_students: item.expected_students, status: 'active' }).eq('id', existing.id)
      : await supabase.from('class_offerings').insert({ ...item, faculty_id: null })
    if (result.error) errors.push({ row: 0, message: result.error.message })
    else imported++
  }

  await supabase.from('study_load_imports').insert({
    semester_id: semesterId,
    program_id: program.id,
    file_name: file.name,
    total_rows: rows.length,
    imported_rows: imported,
    rejected_rows: errors.length,
    status: errors.length ? 'completed_with_errors' : 'completed',
    error_summary: errors.slice(0, 100),
    imported_by: user.id,
  })

  revalidatePath('/admin/study-load')
  revalidatePath('/admin/class-offerings')
  redirect(`/admin/study-load?success=imported&count=${imported}&rejected=${errors.length}`)
}

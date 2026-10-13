'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as XLSX from 'xlsx'
<<<<<<< HEAD
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { isAvailabilityType, isRoomAvailabilityStatus } from '@/lib/enums'
=======

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

type Row = Record<string, unknown>

type ImportSummary = {
  subjects: number
  curriculum: number
  blocks: number
  qualifications: number
  facultyAvailability: number
  rooms: number
  roomAvailability: number
}

/* =========================================================
   HELPERS
========================================================= */

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function upper(value: unknown) {
  return clean(value).toUpperCase()
}

<<<<<<< HEAD
function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function booleanValue(value: unknown, fallback = true) {
=======
function numberValue(
  value: unknown,
  fallback = 0
) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : fallback
}

function booleanValue(
  value: unknown,
  fallback = true
) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const raw = clean(value).toLowerCase()

  if (!raw) return fallback

<<<<<<< HEAD
  if (raw === 'true' || raw === 'yes' || raw === '1' || raw === 'active') {
    return true
  }

  if (raw === 'false' || raw === 'no' || raw === '0' || raw === 'inactive') {
=======
  if (
    raw === 'true' ||
    raw === 'yes' ||
    raw === '1' ||
    raw === 'active'
  ) {
    return true
  }

  if (
    raw === 'false' ||
    raw === 'no' ||
    raw === '0' ||
    raw === 'inactive'
  ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    return false
  }

  return fallback
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function normalizeRows(rows: Row[]) {
  return rows.map((row) => {
    const normalized: Row = {}

<<<<<<< HEAD
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeHeader(key)] = value
    })
=======
    Object.entries(row).forEach(
      ([key, value]) => {
        normalized[
          normalizeHeader(key)
        ] = value
      }
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    return normalized
  })
}

<<<<<<< HEAD
function sheetRows(workbook: XLSX.WorkBook, names: string[]) {
  const actualName = workbook.SheetNames.find((name) =>
    names.some((wanted) => name.trim().toLowerCase() === wanted.trim().toLowerCase())
  )
=======
function sheetRows(
  workbook: XLSX.WorkBook,
  names: string[]
) {
  const actualName =
    workbook.SheetNames.find((name) =>
      names.some(
        (wanted) =>
          name.trim().toLowerCase() ===
          wanted.trim().toLowerCase()
      )
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!actualName) {
    return [] as Row[]
  }

<<<<<<< HEAD
  const sheet = workbook.Sheets[actualName]

  const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
    defval: '',
    raw: false,
  })
=======
  const sheet =
    workbook.Sheets[actualName]

  const rows =
    XLSX.utils.sheet_to_json<Row>(
      sheet,
      {
        defval: '',
        raw: false,
      }
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return normalizeRows(rows)
}

<<<<<<< HEAD
function importError(message: string): never {
  console.error('AlterSched import error:', message)
  redirect(`/admin/import-export?error=${encodeURIComponent(message)}`)
}

function required(row: Row, key: string, sheet: string, rowNumber: number) {
  const value = clean(row[key])

  if (!value) {
    importError(`${sheet} row ${rowNumber}: ${key} is required.`)
=======
function importError(
  message: string
): never {
  console.error(
    'AlterSched import error:',
    message
  )

  redirect(
    `/admin/import-export?error=${encodeURIComponent(
      message
    )}`
  )
}

function required(
  row: Row,
  key: string,
  sheet: string,
  rowNumber: number
) {
  const value = clean(row[key])

  if (!value) {
    importError(
      `${sheet} row ${rowNumber}: ${key} is required.`
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  return value
}

<<<<<<< HEAD
function normalizeTime(value: unknown) {
=======
function normalizeTime(
  value: unknown
) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const raw = clean(value)

  if (!raw) return ''

<<<<<<< HEAD
  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)

  if (twelveHour) {
    let hour = Number(twelveHour[1])
    const minute = twelveHour[2]
    const period = twelveHour[3].toUpperCase()

    if (period === 'PM' && hour !== 12) {
      hour += 12
    }

    if (period === 'AM' && hour === 12) {
      hour = 0
    }

    return `${String(hour).padStart(2, '0')}:${minute}:00`
  }

  const twentyFour = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (twentyFour) {
    const hour = Number(twentyFour[1])
    const minute = Number(twentyFour[2])
    const second = Number(twentyFour[3] ?? 0)

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      return ''
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(
      second
    ).padStart(2, '0')}`
=======
  const twelveHour =
    raw.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    )

  if (twelveHour) {
    let hour =
      Number(twelveHour[1])

    const minute =
      twelveHour[2]

    const period =
      twelveHour[3].toUpperCase()

    if (
      period === 'PM' &&
      hour !== 12
    ) {
      hour += 12
    }

    if (
      period === 'AM' &&
      hour === 12
    ) {
      hour = 0
    }

    return `${String(hour).padStart(
      2,
      '0'
    )}:${minute}:00`
  }

  const twentyFour =
    raw.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    )

  if (twentyFour) {
    const hour =
      Number(twentyFour[1])

    const minute =
      Number(twentyFour[2])

    const second =
      Number(
        twentyFour[3] ?? 0
      )

    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      second < 0 ||
      second > 59
    ) {
      return ''
    }

    return `${String(hour).padStart(
      2,
      '0'
    )}:${String(minute).padStart(
      2,
      '0'
    )}:${String(second).padStart(
      2,
      '0'
    )}`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  return ''
}

<<<<<<< HEAD
function dayNumber(value: unknown) {
  const raw = clean(value).toLowerCase()

  const days: Record<string, number> = {
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
=======
function dayNumber(
  value: unknown
) {
  const raw =
    clean(value).toLowerCase()

  const days: Record<
    string,
    number
  > = {
    monday: 1,
    mon: 1,

    tuesday: 2,
    tue: 2,
    tues: 2,

    wednesday: 3,
    wed: 3,

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
<<<<<<< HEAD
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
=======

    friday: 5,
    fri: 5,

    saturday: 6,
    sat: 6,

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    sunday: 7,
    sun: 7,
  }

  if (days[raw]) {
    return days[raw]
  }

<<<<<<< HEAD
  const numeric = Number(raw)

  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 7) {
=======
  const numeric =
    Number(raw)

  if (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= 7
  ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    return numeric
  }

  return null
}

/* =========================================================
   MAIN IMPORT ACTION
========================================================= */

<<<<<<< HEAD
export async function importMasterData(formData: FormData) {
  await requireRole(['super_admin'])
  const supabase = await createClient()
  const file = formData.get('master_file')

  if (!file || !(file instanceof File)) {
    importError('Please select an Excel file.')
  }

  if (file.size <= 0) {
    importError('The selected file is empty.')
  }

  if (file.size > 10 * 1024 * 1024) {
    importError('Import file must not exceed 10 MB.')
  }

  const fileName = file.name.toLowerCase()

  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    importError('Please upload an Excel .xlsx file.')
=======
export async function importMasterData(
  formData: FormData
) {
  await requireRole([
    'super_admin',
  ])

  const supabase =
    await createClient()

  const file =
    formData.get('master_file')

  if (
    !file ||
    !(file instanceof File)
  ) {
    importError(
      'Please select an Excel file.'
    )
  }

  if (
    file.size <= 0
  ) {
    importError(
      'The selected file is empty.'
    )
  }

  if (
    file.size >
    10 * 1024 * 1024
  ) {
    importError(
      'Import file must not exceed 10 MB.'
    )
  }

  const fileName =
    file.name.toLowerCase()

  if (
    !fileName.endsWith('.xlsx') &&
    !fileName.endsWith('.xls')
  ) {
    importError(
      'Please upload an Excel .xlsx file.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  let workbook: XLSX.WorkBook

  try {
<<<<<<< HEAD
    const buffer = Buffer.from(await file.arrayBuffer())

    workbook = XLSX.read(buffer, {
      type: 'buffer',
    })
  } catch (error) {
    console.error(error)
    importError('Unable to read the Excel workbook.')
=======
    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      )

    workbook =
      XLSX.read(buffer, {
        type: 'buffer',
      })
  } catch (error) {
    console.error(error)

    importError(
      'Unable to read the Excel workbook.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =======================================================
     EXPECTED SHEETS
  ======================================================= */

<<<<<<< HEAD
  const subjectRows = sheetRows(workbook, ['Subjects'])
  const curriculumRows = sheetRows(workbook, ['Curriculum'])
  const blockRows = sheetRows(workbook, ['Blocks', 'Sections'])
  const qualificationRows = sheetRows(workbook, ['Qualifications', 'Faculty Qualifications'])

  const facultyAvailabilityRows = sheetRows(workbook, [
    'Faculty Availability',
    'Instructor Availability',
  ])

  const roomRows = sheetRows(workbook, ['Rooms'])
  const roomAvailabilityRows = sheetRows(workbook, ['Room Availability'])
=======
  const subjectRows =
    sheetRows(
      workbook,
      ['Subjects']
    )

  const curriculumRows =
    sheetRows(
      workbook,
      ['Curriculum']
    )

  const blockRows =
    sheetRows(
      workbook,
      [
        'Blocks',
        'Sections',
      ]
    )

  const qualificationRows =
    sheetRows(
      workbook,
      [
        'Qualifications',
        'Faculty Qualifications',
      ]
    )

  const facultyAvailabilityRows =
    sheetRows(
      workbook,
      [
        'Faculty Availability',
        'Instructor Availability',
      ]
    )

  const roomRows =
    sheetRows(
      workbook,
      ['Rooms']
    )

  const roomAvailabilityRows =
    sheetRows(
      workbook,
      ['Room Availability']
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  const totalRows =
    subjectRows.length +
    curriculumRows.length +
    blockRows.length +
    qualificationRows.length +
    facultyAvailabilityRows.length +
    roomRows.length +
    roomAvailabilityRows.length

  if (totalRows === 0) {
<<<<<<< HEAD
    importError('No supported AlterSched sheets were found.')
=======
    importError(
      'No supported AlterSched sheets were found.'
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* =======================================================
     LOAD BASE RECORDS
  ======================================================= */

  const [
    institutionResult,
    departmentResult,
    programsResult,
    yearLevelsResult,
    roomTypesResult,
    semestersResult,
    facultyResult,
  ] = await Promise.all([
<<<<<<< HEAD
    supabase.from('institutions').select('id, name').eq('is_active', true).limit(1),
    supabase
      .from('departments')
      .select('id, code, name')
      .eq('code', 'BSIT')
      .eq('is_active', true)
      .limit(1),
    supabase
      .from('programs')
      .select('id, department_id, code, name, is_active')
      .eq('is_active', true),
    supabase
      .from('year_levels')
      .select('id, program_id, level_number, name, is_active')
      .eq('is_active', true),
    supabase.from('room_types').select('id, name'),
    supabase.from('semesters').select(`
=======
    supabase
      .from('institutions')
      .select('id, name')
      .eq('is_active', true)
      .limit(1),

    supabase
      .from('departments')
      .select(
        'id, code, name'
      )
      .eq('code', 'BSIT')
      .eq('is_active', true)
      .limit(1),

    supabase
      .from('programs')
      .select(
        'id, department_id, code, name, is_active'
      )
      .eq('is_active', true),

    supabase
      .from('year_levels')
      .select(
        'id, program_id, level_number, name, is_active'
      )
      .eq('is_active', true),

    supabase
      .from('room_types')
      .select('id, name'),

    supabase
      .from('semesters')
      .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        id,
        name,
        term_order,
        is_active,
        academic_years (
          id,
          name
        )
      `),
<<<<<<< HEAD
    supabase.from('faculty_profiles').select(`
=======

    supabase
      .from('faculty_profiles')
      .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        id,
        employee_id,
        department_id,
        profiles (
          id,
          full_name,
          email
        )
      `),
  ])

<<<<<<< HEAD
  if (institutionResult.error) {
    importError(`Institution lookup failed: ${institutionResult.error.message}`)
  }

  if (departmentResult.error) {
    importError(`BSIT department lookup failed: ${departmentResult.error.message}`)
  }

  if (programsResult.error) {
    importError(`Program lookup failed: ${programsResult.error.message}`)
  }

  if (yearLevelsResult.error) {
    importError(`Year level lookup failed: ${yearLevelsResult.error.message}`)
  }

  if (roomTypesResult.error) {
    importError(`Room type lookup failed: ${roomTypesResult.error.message}`)
  }

  if (semestersResult.error) {
    importError(`Semester lookup failed: ${semestersResult.error.message}`)
  }

  if (facultyResult.error) {
    importError(`Faculty lookup failed: ${facultyResult.error.message}`)
  }

  const institution = institutionResult.data?.[0]
  const department = departmentResult.data?.[0]

  if (!institution) {
    importError('No active institution was found.')
  }

  if (!department) {
    importError('Active BSIT department was not found.')
  }

  const programs = programsResult.data ?? []
  const bsitPrograms = programs.filter((program) => program.department_id === department.id)

  if (bsitPrograms.length === 0) {
    importError('No active BSIT program was found.')
  }

  const yearLevels = yearLevelsResult.data ?? []
  const roomTypes = roomTypesResult.data ?? []
  const semesters = semestersResult.data ?? []
  const faculty = facultyResult.data ?? []
=======
  if (
    institutionResult.error
  ) {
    importError(
      `Institution lookup failed: ${institutionResult.error.message}`
    )
  }

  if (
    departmentResult.error
  ) {
    importError(
      `BSIT department lookup failed: ${departmentResult.error.message}`
    )
  }

  if (
    programsResult.error
  ) {
    importError(
      `Program lookup failed: ${programsResult.error.message}`
    )
  }

  if (
    yearLevelsResult.error
  ) {
    importError(
      `Year level lookup failed: ${yearLevelsResult.error.message}`
    )
  }

  if (
    roomTypesResult.error
  ) {
    importError(
      `Room type lookup failed: ${roomTypesResult.error.message}`
    )
  }

  if (
    semestersResult.error
  ) {
    importError(
      `Semester lookup failed: ${semestersResult.error.message}`
    )
  }

  if (
    facultyResult.error
  ) {
    importError(
      `Faculty lookup failed: ${facultyResult.error.message}`
    )
  }

  const institution =
    institutionResult.data?.[0]

  const department =
    departmentResult.data?.[0]

  if (!institution) {
    importError(
      'No active institution was found.'
    )
  }

  if (!department) {
    importError(
      'Active BSIT department was not found.'
    )
  }

  const programs =
    programsResult.data ?? []

  const bsitPrograms =
    programs.filter(
      (program: any) =>
        program.department_id ===
        department.id
    )

  if (
    bsitPrograms.length === 0
  ) {
    importError(
      'No active BSIT program was found.'
    )
  }

  const yearLevels =
    yearLevelsResult.data ?? []

  const roomTypes =
    roomTypesResult.data ?? []

  const semesters =
    semestersResult.data ?? []

  const faculty =
    facultyResult.data ?? []
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  const summary: ImportSummary = {
    subjects: 0,
    curriculum: 0,
    blocks: 0,
    qualifications: 0,
    facultyAvailability: 0,
    rooms: 0,
    roomAvailability: 0,
  }

  /* =======================================================
     LOOKUP HELPERS
  ======================================================= */

<<<<<<< HEAD
  function findProgram(value: unknown) {
    const search = upper(value)

    if (!search) {
      return bsitPrograms.length === 1 ? bsitPrograms[0] : null
=======
  function findProgram(
    value: unknown
  ) {
    const search =
      upper(value)

    if (!search) {
      return bsitPrograms.length ===
        1
        ? bsitPrograms[0]
        : null
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    return (
      bsitPrograms.find(
<<<<<<< HEAD
        (program) => upper(program.code) === search || upper(program.name) === search
=======
        (program: any) =>
          upper(program.code) ===
            search ||
          upper(program.name) ===
            search
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      ) ?? null
    )
  }

<<<<<<< HEAD
  function findYearLevel(programId: string, value: unknown) {
    const search = clean(value).toLowerCase()
=======
  function findYearLevel(
    programId: string,
    value: unknown
  ) {
    const search =
      clean(value)
        .toLowerCase()
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    if (!search) {
      return null
    }

<<<<<<< HEAD
    const numeric = Number(search)

    return (
      yearLevels.find((level) => {
        if (level.program_id !== programId) {
          return false
        }

        if (Number.isInteger(numeric) && Number(level.level_number) === numeric) {
          return true
        }

        return clean(level.name).toLowerCase() === search
      }) ?? null
    )
  }

  function findRoomType(value: unknown) {
    const search = clean(value).toLowerCase()
=======
    const numeric =
      Number(search)

    return (
      yearLevels.find(
        (level: any) => {
          if (
            level.program_id !==
            programId
          ) {
            return false
          }

          if (
            Number.isInteger(
              numeric
            ) &&
            Number(
              level.level_number
            ) === numeric
          ) {
            return true
          }

          return (
            clean(level.name)
              .toLowerCase() ===
            search
          )
        }
      ) ?? null
    )
  }

  function findRoomType(
    value: unknown
  ) {
    const search =
      clean(value)
        .toLowerCase()
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    if (!search) {
      return null
    }

<<<<<<< HEAD
    return roomTypes.find((type) => clean(type.name).toLowerCase() === search) ?? null
  }

  function findSemester(value: unknown) {
    const search = clean(value).toLowerCase()

    if (!search) {
      return null
    }

    const numeric = Number(search)

    return (
      semesters.find((semester) => {
        if (Number.isInteger(numeric) && Number(semester.term_order) === numeric) {
          return true
        }

        return clean(semester.name).toLowerCase() === search
      }) ?? null
    )
  }

  function findFaculty(value: unknown) {
    const search = clean(value).toLowerCase()
=======
    return (
      roomTypes.find(
        (type: any) =>
          clean(type.name)
            .toLowerCase() ===
          search
      ) ?? null
    )
  }

  function findSemester(
    value: unknown
  ) {
    const search =
      clean(value)
        .toLowerCase()

    if (!search) {
      return null
    }

    const numeric =
      Number(search)

    return (
      semesters.find(
        (semester: any) => {
          if (
            Number.isInteger(
              numeric
            ) &&
            Number(
              semester.term_order
            ) === numeric
          ) {
            return true
          }

          return (
            clean(
              semester.name
            ).toLowerCase() ===
            search
          )
        }
      ) ?? null
    )
  }

  function findFaculty(
    value: unknown
  ) {
    const search =
      clean(value)
        .toLowerCase()
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    if (!search) {
      return null
    }

    return (
<<<<<<< HEAD
      faculty.find((item) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles

        return (
          clean(item.employee_id).toLowerCase() === search ||
          clean(profile?.full_name).toLowerCase() === search ||
          clean(profile?.email).toLowerCase() === search
        )
      }) ?? null
=======
      faculty.find(
        (item: any) => {
          const profile =
            Array.isArray(
              item.profiles
            )
              ? item.profiles[0]
              : item.profiles

          return (
            clean(
              item.employee_id
            ).toLowerCase() ===
              search ||
            clean(
              profile?.full_name
            ).toLowerCase() ===
              search ||
            clean(
              profile?.email
            ).toLowerCase() ===
              search
          )
        }
      ) ?? null
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    )
  }

  /* =======================================================
     1. SUBJECTS
  ======================================================= */

<<<<<<< HEAD
  for (let index = 0; index < subjectRows.length; index++) {
    const row = subjectRows[index]
    const rowNumber = index + 2
    const code = upper(required(row, 'code', 'Subjects', rowNumber))
    const name = required(row, 'name', 'Subjects', rowNumber)
    const units = numberValue(row.units, 0)
    const lectureHours = numberValue(row.lecture_hours, 0)
    const labHours = numberValue(row.lab_hours, 0)

    if (units < 0 || lectureHours < 0 || labHours < 0) {
      importError(`Subjects row ${rowNumber}: hours and units cannot be negative.`)
    }

    const payload = {
      department_id: department.id,
      code,
      name,
      units,
      lecture_hours: lectureHours,
      lab_hours: labHours,
      description: clean(row.description) || null,
      is_active: booleanValue(row.is_active, true),
    }

    const { error } = await supabase.from('subjects').upsert(payload, {
      onConflict: 'department_id,code',
    })

    if (error) {
      importError(`Subjects row ${rowNumber}: ${error.message}`)
=======
  for (
    let index = 0;
    index < subjectRows.length;
    index++
  ) {
    const row =
      subjectRows[index]

    const rowNumber =
      index + 2

    const code =
      upper(
        required(
          row,
          'code',
          'Subjects',
          rowNumber
        )
      )

    const name =
      required(
        row,
        'name',
        'Subjects',
        rowNumber
      )

    const units =
      numberValue(
        row.units,
        0
      )

    const lectureHours =
      numberValue(
        row.lecture_hours,
        0
      )

    const labHours =
      numberValue(
        row.lab_hours,
        0
      )

    if (
      units < 0 ||
      lectureHours < 0 ||
      labHours < 0
    ) {
      importError(
        `Subjects row ${rowNumber}: hours and units cannot be negative.`
      )
    }

    const payload = {
      department_id:
        department.id,

      code,
      name,

      units,

      lecture_hours:
        lectureHours,

      lab_hours:
        labHours,

      description:
        clean(
          row.description
        ) || null,

      is_active:
        booleanValue(
          row.is_active,
          true
        ),
    }

    const {
      error,
    } = await supabase
      .from('subjects')
      .upsert(
        payload,
        {
          onConflict:
            'department_id,code',
        }
      )

    if (error) {
      importError(
        `Subjects row ${rowNumber}: ${error.message}`
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    summary.subjects++
  }

  /* =======================================================
     RELOAD SUBJECTS
  ======================================================= */

<<<<<<< HEAD
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, department_id, code, name')
    .eq('department_id', department.id)

  if (subjectsError) {
    importError(`Subject reload failed: ${subjectsError.message}`)
  }

  function findSubject(value: unknown) {
    const search = clean(value).toLowerCase()

    return (
      (subjects ?? []).find(
        (subject) =>
          clean(subject.code).toLowerCase() === search ||
          clean(subject.name).toLowerCase() === search
=======
  const {
    data: subjects,
    error: subjectsError,
  } = await supabase
    .from('subjects')
    .select(
      'id, department_id, code, name'
    )
    .eq(
      'department_id',
      department.id
    )

  if (subjectsError) {
    importError(
      `Subject reload failed: ${subjectsError.message}`
    )
  }

  function findSubject(
    value: unknown
  ) {
    const search =
      clean(value)
        .toLowerCase()

    return (
      (subjects ?? []).find(
        (subject: any) =>
          clean(
            subject.code
          ).toLowerCase() ===
            search ||
          clean(
            subject.name
          ).toLowerCase() ===
            search
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      ) ?? null
    )
  }

  /* =======================================================
     2. BLOCKS / SECTIONS
  ======================================================= */

<<<<<<< HEAD
  for (let index = 0; index < blockRows.length; index++) {
    const row = blockRows[index]
    const rowNumber = index + 2
    const program = findProgram(row.program)

    if (!program) {
      importError(`Blocks row ${rowNumber}: program was not found.`)
    }

    const yearValue = row.year_level ?? row.year
    const yearLevel = findYearLevel(program.id, yearValue)

    if (!yearLevel) {
      importError(`Blocks row ${rowNumber}: year level was not found.`)
    }

    const code = upper(required(row, 'code', 'Blocks', rowNumber))
    const name = clean(row.name) || code
    const capacityRaw = clean(row.capacity)
    const capacity = capacityRaw ? Number(capacityRaw) : null

    if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
      importError(`Blocks row ${rowNumber}: invalid capacity.`)
    }

    const { error } = await supabase.from('sections').upsert(
      {
        year_level_id: yearLevel.id,
        code,
        name,
        capacity,
        is_active: booleanValue(row.is_active, true),
      },
      {
        onConflict: 'year_level_id,code',
      }
    )

    if (error) {
      importError(`Blocks row ${rowNumber}: ${error.message}`)
=======
  for (
    let index = 0;
    index < blockRows.length;
    index++
  ) {
    const row =
      blockRows[index]

    const rowNumber =
      index + 2

    const program =
      findProgram(
        row.program
      )

    if (!program) {
      importError(
        `Blocks row ${rowNumber}: program was not found.`
      )
    }

    const yearValue =
      row.year_level ??
      row.year

    const yearLevel =
      findYearLevel(
        program.id,
        yearValue
      )

    if (!yearLevel) {
      importError(
        `Blocks row ${rowNumber}: year level was not found.`
      )
    }

    const code =
      upper(
        required(
          row,
          'code',
          'Blocks',
          rowNumber
        )
      )

    const name =
      clean(row.name) ||
      code

    const capacityRaw =
      clean(row.capacity)

    const capacity =
      capacityRaw
        ? Number(capacityRaw)
        : null

    if (
      capacity !== null &&
      (
        !Number.isInteger(
          capacity
        ) ||
        capacity <= 0
      )
    ) {
      importError(
        `Blocks row ${rowNumber}: invalid capacity.`
      )
    }

    const {
      error,
    } = await supabase
      .from('sections')
      .upsert(
        {
          year_level_id:
            yearLevel.id,

          code,
          name,
          capacity,

          is_active:
            booleanValue(
              row.is_active,
              true
            ),
        },
        {
          onConflict:
            'year_level_id,code',
        }
      )

    if (error) {
      importError(
        `Blocks row ${rowNumber}: ${error.message}`
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    summary.blocks++
  }

  /* =======================================================
     3. CURRICULUM
  ======================================================= */

<<<<<<< HEAD
  for (let index = 0; index < curriculumRows.length; index++) {
    const row = curriculumRows[index]
    const rowNumber = index + 2
    const program = findProgram(row.program)

    if (!program) {
      importError(`Curriculum row ${rowNumber}: program was not found.`)
    }

    const curriculumName = required(row, 'curriculum', 'Curriculum', rowNumber)
    const yearLevel = findYearLevel(program.id, row.year_level ?? row.year)

    if (!yearLevel) {
      importError(`Curriculum row ${rowNumber}: year level was not found.`)
    }

    const subject = findSubject(row.subject_code ?? row.subject)

    if (!subject) {
      importError(`Curriculum row ${rowNumber}: subject was not found.`)
    }

    const termOrder = Number(row.term_order ?? row.semester)

    if (!Number.isInteger(termOrder) || termOrder <= 0) {
      importError(`Curriculum row ${rowNumber}: invalid semester/term order.`)
    }

    const weeklyHours = numberValue(row.weekly_hours, 0)

    if (weeklyHours <= 0) {
      importError(`Curriculum row ${rowNumber}: weekly_hours must be greater than 0.`)
    }

    const roomTypeName = row.required_room_type ?? row.room_type
    const roomType = clean(roomTypeName) ? findRoomType(roomTypeName) : null

    if (clean(roomTypeName) && !roomType) {
      importError(`Curriculum row ${rowNumber}: room type "${clean(roomTypeName)}" was not found.`)
    }

    const { data: existingCurriculum, error: curriculumLookupError } = await supabase
      .from('curricula')
      .select('id')
      .eq('program_id', program.id)
      .eq('name', curriculumName)
      .maybeSingle()

    if (curriculumLookupError) {
      importError(`Curriculum row ${rowNumber}: ${curriculumLookupError.message}`)
    }

    let curriculumId = existingCurriculum?.id

    if (!curriculumId) {
      const { data: created, error: createError } = await supabase
        .from('curricula')
        .insert({
          program_id: program.id,
          name: curriculumName,
          effective_from_year: clean(row.effective_from_year)
            ? Number(row.effective_from_year)
            : null,
          effective_to_year: clean(row.effective_to_year) ? Number(row.effective_to_year) : null,
=======
  for (
    let index = 0;
    index <
    curriculumRows.length;
    index++
  ) {
    const row =
      curriculumRows[index]

    const rowNumber =
      index + 2

    const program =
      findProgram(
        row.program
      )

    if (!program) {
      importError(
        `Curriculum row ${rowNumber}: program was not found.`
      )
    }

    const curriculumName =
      required(
        row,
        'curriculum',
        'Curriculum',
        rowNumber
      )

    const yearLevel =
      findYearLevel(
        program.id,
        row.year_level ??
          row.year
      )

    if (!yearLevel) {
      importError(
        `Curriculum row ${rowNumber}: year level was not found.`
      )
    }

    const subject =
      findSubject(
        row.subject_code ??
          row.subject
      )

    if (!subject) {
      importError(
        `Curriculum row ${rowNumber}: subject was not found.`
      )
    }

    const termOrder =
      Number(
        row.term_order ??
          row.semester
      )

    if (
      !Number.isInteger(
        termOrder
      ) ||
      termOrder <= 0
    ) {
      importError(
        `Curriculum row ${rowNumber}: invalid semester/term order.`
      )
    }

    const weeklyHours =
      numberValue(
        row.weekly_hours,
        0
      )

    if (
      weeklyHours <= 0
    ) {
      importError(
        `Curriculum row ${rowNumber}: weekly_hours must be greater than 0.`
      )
    }

    const roomTypeName =
      row.required_room_type ??
      row.room_type

    const roomType =
      clean(roomTypeName)
        ? findRoomType(
            roomTypeName
          )
        : null

    if (
      clean(roomTypeName) &&
      !roomType
    ) {
      importError(
        `Curriculum row ${rowNumber}: room type "${clean(
          roomTypeName
        )}" was not found.`
      )
    }

    const {
      data: existingCurriculum,
      error:
        curriculumLookupError,
    } = await supabase
      .from('curricula')
      .select('id')
      .eq(
        'program_id',
        program.id
      )
      .eq(
        'name',
        curriculumName
      )
      .maybeSingle()

    if (
      curriculumLookupError
    ) {
      importError(
        `Curriculum row ${rowNumber}: ${curriculumLookupError.message}`
      )
    }

    let curriculumId =
      existingCurriculum?.id

    if (!curriculumId) {
      const {
        data: created,
        error: createError,
      } = await supabase
        .from('curricula')
        .insert({
          program_id:
            program.id,

          name:
            curriculumName,

          effective_from_year:
            clean(
              row.effective_from_year
            )
              ? Number(
                  row.effective_from_year
                )
              : null,

          effective_to_year:
            clean(
              row.effective_to_year
            )
              ? Number(
                  row.effective_to_year
                )
              : null,

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
          is_active: true,
        })
        .select('id')
        .single()

<<<<<<< HEAD
      if (createError || !created) {
        importError(
          `Curriculum row ${rowNumber}: ${createError?.message ?? 'Unable to create curriculum.'}`
        )
      }

      curriculumId = created.id
    }

    const { error: mappingError } = await supabase.from('curriculum_subjects').upsert(
      {
        curriculum_id: curriculumId,
        subject_id: subject.id,
        year_level_id: yearLevel.id,
        term_order: termOrder,
        required_room_type_id: roomType?.id ?? null,
        weekly_hours: weeklyHours,
      },
      {
        onConflict: 'curriculum_id,subject_id,year_level_id,term_order',
      }
    )

    if (mappingError) {
      importError(`Curriculum row ${rowNumber}: ${mappingError.message}`)
=======
      if (
        createError ||
        !created
      ) {
        importError(
          `Curriculum row ${rowNumber}: ${
            createError?.message ??
            'Unable to create curriculum.'
          }`
        )
      }

      curriculumId =
        created.id
    }

    const {
      error: mappingError,
    } = await supabase
      .from(
        'curriculum_subjects'
      )
      .upsert(
        {
          curriculum_id:
            curriculumId,

          subject_id:
            subject.id,

          year_level_id:
            yearLevel.id,

          term_order:
            termOrder,

          required_room_type_id:
            roomType?.id ??
            null,

          weekly_hours:
            weeklyHours,
        },
        {
          onConflict:
            'curriculum_id,subject_id,year_level_id,term_order',
        }
      )

    if (mappingError) {
      importError(
        `Curriculum row ${rowNumber}: ${mappingError.message}`
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    summary.curriculum++
  }

  /* =======================================================
     4. FACULTY QUALIFICATIONS
  ======================================================= */

<<<<<<< HEAD
  for (let index = 0; index < qualificationRows.length; index++) {
    const row = qualificationRows[index]
    const rowNumber = index + 2
    const facultyMember = findFaculty(row.employee_id ?? row.instructor ?? row.faculty)

    if (!facultyMember) {
      importError(`Qualifications row ${rowNumber}: instructor was not found.`)
    }

    if (facultyMember.department_id !== department.id) {
      importError(`Qualifications row ${rowNumber}: instructor is outside BSIT.`)
    }

    const subject = findSubject(row.subject_code ?? row.subject)

    if (!subject) {
      importError(`Qualifications row ${rowNumber}: subject was not found.`)
    }

    const { error } = await supabase.from('faculty_subjects').upsert(
      {
        faculty_id: facultyMember.id,
        subject_id: subject.id,
      },
      {
        onConflict: 'faculty_id,subject_id',
        ignoreDuplicates: true,
      }
    )

    if (error) {
      importError(`Qualifications row ${rowNumber}: ${error.message}`)
=======
  for (
    let index = 0;
    index <
    qualificationRows.length;
    index++
  ) {
    const row =
      qualificationRows[index]

    const rowNumber =
      index + 2

    const facultyMember =
      findFaculty(
        row.employee_id ??
          row.instructor ??
          row.faculty
      )

    if (!facultyMember) {
      importError(
        `Qualifications row ${rowNumber}: instructor was not found.`
      )
    }

    if (
      facultyMember.department_id !==
      department.id
    ) {
      importError(
        `Qualifications row ${rowNumber}: instructor is outside BSIT.`
      )
    }

    const subject =
      findSubject(
        row.subject_code ??
          row.subject
      )

    if (!subject) {
      importError(
        `Qualifications row ${rowNumber}: subject was not found.`
      )
    }

    const {
      error,
    } = await supabase
      .from('faculty_subjects')
      .upsert(
        {
          faculty_id:
            facultyMember.id,

          subject_id:
            subject.id,
        },
        {
          onConflict:
            'faculty_id,subject_id',
          ignoreDuplicates:
            true,
        }
      )

    if (error) {
      importError(
        `Qualifications row ${rowNumber}: ${error.message}`
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    summary.qualifications++
  }

  /* =======================================================
     5. FACULTY AVAILABILITY
  ======================================================= */

<<<<<<< HEAD
  for (let index = 0; index < facultyAvailabilityRows.length; index++) {
    const row = facultyAvailabilityRows[index]
    const rowNumber = index + 2
    const facultyMember = findFaculty(row.employee_id ?? row.instructor ?? row.faculty)

    if (!facultyMember) {
      importError(`Faculty Availability row ${rowNumber}: instructor was not found.`)
    }

    const semester = findSemester(row.semester ?? row.term_order)

    if (!semester) {
      importError(`Faculty Availability row ${rowNumber}: semester was not found.`)
    }

    const day = dayNumber(row.day ?? row.day_of_week)

    if (!day) {
      importError(`Faculty Availability row ${rowNumber}: invalid day.`)
    }

    const startTime = normalizeTime(row.start_time)
    const endTime = normalizeTime(row.end_time)

    if (!startTime || !endTime) {
      importError(`Faculty Availability row ${rowNumber}: invalid time.`)
    }

    if (endTime <= startTime) {
      importError(`Faculty Availability row ${rowNumber}: end time must be later than start time.`)
    }

    const availabilityType = clean(row.availability_type ?? row.type).toLowerCase() || 'available'

    if (!isAvailabilityType(availabilityType)) {
      importError(`Faculty Availability row ${rowNumber}: invalid availability type.`)
=======
  for (
    let index = 0;
    index <
    facultyAvailabilityRows.length;
    index++
  ) {
    const row =
      facultyAvailabilityRows[
        index
      ]

    const rowNumber =
      index + 2

    const facultyMember =
      findFaculty(
        row.employee_id ??
          row.instructor ??
          row.faculty
      )

    if (!facultyMember) {
      importError(
        `Faculty Availability row ${rowNumber}: instructor was not found.`
      )
    }

    const semester =
      findSemester(
        row.semester ??
          row.term_order
      )

    if (!semester) {
      importError(
        `Faculty Availability row ${rowNumber}: semester was not found.`
      )
    }

    const day =
      dayNumber(
        row.day ??
          row.day_of_week
      )

    if (!day) {
      importError(
        `Faculty Availability row ${rowNumber}: invalid day.`
      )
    }

    const startTime =
      normalizeTime(
        row.start_time
      )

    const endTime =
      normalizeTime(
        row.end_time
      )

    if (
      !startTime ||
      !endTime
    ) {
      importError(
        `Faculty Availability row ${rowNumber}: invalid time.`
      )
    }

    if (
      endTime <= startTime
    ) {
      importError(
        `Faculty Availability row ${rowNumber}: end time must be later than start time.`
      )
    }

    const availabilityType =
      clean(
        row.availability_type ??
          row.type
      ).toLowerCase() ||
      'available'

    if (
      ![
        'available',
        'preferred',
        'unavailable',
      ].includes(
        availabilityType
      )
    ) {
      importError(
        `Faculty Availability row ${rowNumber}: invalid availability type.`
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    /*
      Availability has no unique
      database constraint covering
      these fields, so check first.
    */

<<<<<<< HEAD
    const { data: existing, error: lookupError } = await supabase
      .from('faculty_availability')
      .select('id')
      .eq('faculty_id', facultyMember.id)
      .eq('semester_id', semester.id)
      .eq('day_of_week', day)
      .eq('start_time', startTime)
      .eq('end_time', endTime)
      .maybeSingle()

    if (lookupError) {
      importError(`Faculty Availability row ${rowNumber}: ${lookupError.message}`)
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('faculty_availability')
        .update({
          availability_type: availabilityType,
        })
        .eq('id', existing.id)

      if (updateError) {
        importError(`Faculty Availability row ${rowNumber}: ${updateError.message}`)
      }
    } else {
      const { error: insertError } = await supabase.from('faculty_availability').insert({
        faculty_id: facultyMember.id,
        semester_id: semester.id,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        availability_type: availabilityType,
      })

      if (insertError) {
        importError(`Faculty Availability row ${rowNumber}: ${insertError.message}`)
=======
    const {
      data: existing,
      error: lookupError,
    } = await supabase
      .from(
        'faculty_availability'
      )
      .select('id')
      .eq(
        'faculty_id',
        facultyMember.id
      )
      .eq(
        'semester_id',
        semester.id
      )
      .eq(
        'day_of_week',
        day
      )
      .eq(
        'start_time',
        startTime
      )
      .eq(
        'end_time',
        endTime
      )
      .maybeSingle()

    if (lookupError) {
      importError(
        `Faculty Availability row ${rowNumber}: ${lookupError.message}`
      )
    }

    if (existing) {
      const {
        error: updateError,
      } = await supabase
        .from(
          'faculty_availability'
        )
        .update({
          availability_type:
            availabilityType,
        })
        .eq(
          'id',
          existing.id
        )

      if (updateError) {
        importError(
          `Faculty Availability row ${rowNumber}: ${updateError.message}`
        )
      }
    } else {
      const {
        error: insertError,
      } = await supabase
        .from(
          'faculty_availability'
        )
        .insert({
          faculty_id:
            facultyMember.id,

          semester_id:
            semester.id,

          day_of_week:
            day,

          start_time:
            startTime,

          end_time:
            endTime,

          availability_type:
            availabilityType,
        })

      if (insertError) {
        importError(
          `Faculty Availability row ${rowNumber}: ${insertError.message}`
        )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      }
    }

    summary.facultyAvailability++
  }

  /* =======================================================
     6. ROOMS
  ======================================================= */

<<<<<<< HEAD
  for (let index = 0; index < roomRows.length; index++) {
    const row = roomRows[index]
    const rowNumber = index + 2
    const code = upper(required(row, 'code', 'Rooms', rowNumber))
    const name = clean(row.name) || code
    const capacity = Number(row.capacity)

    if (!Number.isInteger(capacity) || capacity <= 0) {
      importError(`Rooms row ${rowNumber}: capacity must be a positive whole number.`)
    }

    const roomTypeName = row.room_type ?? row.type
    const roomType = clean(roomTypeName) ? findRoomType(roomTypeName) : null

    if (clean(roomTypeName) && !roomType) {
      importError(`Rooms row ${rowNumber}: room type "${clean(roomTypeName)}" was not found.`)
    }

    const { error } = await supabase.from('rooms').upsert(
      {
        institution_id: institution.id,
        room_type_id: roomType?.id ?? null,
        code,
        name,
        building: clean(row.building) || null,
        floor: clean(row.floor) || null,
        capacity,
        is_active: booleanValue(row.is_active, true),
      },
      {
        onConflict: 'institution_id,code',
      }
    )

    if (error) {
      importError(`Rooms row ${rowNumber}: ${error.message}`)
=======
  for (
    let index = 0;
    index < roomRows.length;
    index++
  ) {
    const row =
      roomRows[index]

    const rowNumber =
      index + 2

    const code =
      upper(
        required(
          row,
          'code',
          'Rooms',
          rowNumber
        )
      )

    const name =
      clean(row.name) ||
      code

    const capacity =
      Number(
        row.capacity
      )

    if (
      !Number.isInteger(
        capacity
      ) ||
      capacity <= 0
    ) {
      importError(
        `Rooms row ${rowNumber}: capacity must be a positive whole number.`
      )
    }

    const roomTypeName =
      row.room_type ??
      row.type

    const roomType =
      clean(roomTypeName)
        ? findRoomType(
            roomTypeName
          )
        : null

    if (
      clean(roomTypeName) &&
      !roomType
    ) {
      importError(
        `Rooms row ${rowNumber}: room type "${clean(
          roomTypeName
        )}" was not found.`
      )
    }

    const {
      error,
    } = await supabase
      .from('rooms')
      .upsert(
        {
          institution_id:
            institution.id,

          room_type_id:
            roomType?.id ??
            null,

          code,
          name,

          building:
            clean(
              row.building
            ) || null,

          floor:
            clean(
              row.floor
            ) || null,

          capacity,

          is_active:
            booleanValue(
              row.is_active,
              true
            ),
        },
        {
          onConflict:
            'institution_id,code',
        }
      )

    if (error) {
      importError(
        `Rooms row ${rowNumber}: ${error.message}`
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    summary.rooms++
  }

  /* =======================================================
     RELOAD ROOMS
  ======================================================= */

<<<<<<< HEAD
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, code, name')
    .eq('institution_id', institution.id)

  if (roomsError) {
    importError(`Room reload failed: ${roomsError.message}`)
  }

  function findRoom(value: unknown) {
    const search = clean(value).toLowerCase()

    return (
      (rooms ?? []).find(
        (room) =>
          clean(room.code).toLowerCase() === search || clean(room.name).toLowerCase() === search
=======
  const {
    data: rooms,
    error: roomsError,
  } = await supabase
    .from('rooms')
    .select(
      'id, code, name'
    )
    .eq(
      'institution_id',
      institution.id
    )

  if (roomsError) {
    importError(
      `Room reload failed: ${roomsError.message}`
    )
  }

  function findRoom(
    value: unknown
  ) {
    const search =
      clean(value)
        .toLowerCase()

    return (
      (rooms ?? []).find(
        (room: any) =>
          clean(
            room.code
          ).toLowerCase() ===
            search ||
          clean(
            room.name
          ).toLowerCase() ===
            search
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      ) ?? null
    )
  }

  /* =======================================================
     7. ROOM AVAILABILITY
  ======================================================= */

<<<<<<< HEAD
  for (let index = 0; index < roomAvailabilityRows.length; index++) {
    const row = roomAvailabilityRows[index]
    const rowNumber = index + 2
    const room = findRoom(row.room_code ?? row.room)

    if (!room) {
      importError(`Room Availability row ${rowNumber}: room was not found.`)
    }

    const semester = findSemester(row.semester ?? row.term_order)

    if (!semester) {
      importError(`Room Availability row ${rowNumber}: semester was not found.`)
    }

    const day = dayNumber(row.day ?? row.day_of_week)

    if (!day) {
      importError(`Room Availability row ${rowNumber}: invalid day.`)
    }

    const startTime = normalizeTime(row.start_time)
    const endTime = normalizeTime(row.end_time)

    if (!startTime || !endTime) {
      importError(`Room Availability row ${rowNumber}: invalid time.`)
    }

    if (endTime <= startTime) {
      importError(`Room Availability row ${rowNumber}: end time must be later than start time.`)
    }

    // Database values are available / blocked / maintenance; "unavailable" and "reserved"
    // (used in older templates) mean blocked.
    const rawStatus = clean(row.status).toLowerCase() || 'available'
    const status = rawStatus === 'unavailable' || rawStatus === 'reserved' ? 'blocked' : rawStatus

    if (!isRoomAvailabilityStatus(status)) {
      importError(
        `Room Availability row ${rowNumber}: status must be available, blocked or maintenance.`
      )
    }

    const { data: existing, error: lookupError } = await supabase
      .from('room_availability')
      .select('id')
      .eq('room_id', room.id)
      .eq('semester_id', semester.id)
      .eq('day_of_week', day)
      .eq('start_time', startTime)
      .eq('end_time', endTime)
      .maybeSingle()

    if (lookupError) {
      importError(`Room Availability row ${rowNumber}: ${lookupError.message}`)
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('room_availability')
        .update({
          status,
          reason: clean(row.reason) || null,
        })
        .eq('id', existing.id)

      if (updateError) {
        importError(`Room Availability row ${rowNumber}: ${updateError.message}`)
      }
    } else {
      const { error: insertError } = await supabase.from('room_availability').insert({
        room_id: room.id,
        semester_id: semester.id,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        status,
        reason: clean(row.reason) || null,
      })

      if (insertError) {
        importError(`Room Availability row ${rowNumber}: ${insertError.message}`)
=======
  for (
    let index = 0;
    index <
    roomAvailabilityRows.length;
    index++
  ) {
    const row =
      roomAvailabilityRows[
        index
      ]

    const rowNumber =
      index + 2

    const room =
      findRoom(
        row.room_code ??
          row.room
      )

    if (!room) {
      importError(
        `Room Availability row ${rowNumber}: room was not found.`
      )
    }

    const semester =
      findSemester(
        row.semester ??
          row.term_order
      )

    if (!semester) {
      importError(
        `Room Availability row ${rowNumber}: semester was not found.`
      )
    }

    const day =
      dayNumber(
        row.day ??
          row.day_of_week
      )

    if (!day) {
      importError(
        `Room Availability row ${rowNumber}: invalid day.`
      )
    }

    const startTime =
      normalizeTime(
        row.start_time
      )

    const endTime =
      normalizeTime(
        row.end_time
      )

    if (
      !startTime ||
      !endTime
    ) {
      importError(
        `Room Availability row ${rowNumber}: invalid time.`
      )
    }

    if (
      endTime <= startTime
    ) {
      importError(
        `Room Availability row ${rowNumber}: end time must be later than start time.`
      )
    }

    const status =
      clean(
        row.status
      ).toLowerCase() ||
      'available'

    if (
      ![
        'available',
        'unavailable',
        'maintenance',
        'reserved',
      ].includes(status)
    ) {
      importError(
        `Room Availability row ${rowNumber}: invalid room status.`
      )
    }

    const {
      data: existing,
      error: lookupError,
    } = await supabase
      .from(
        'room_availability'
      )
      .select('id')
      .eq(
        'room_id',
        room.id
      )
      .eq(
        'semester_id',
        semester.id
      )
      .eq(
        'day_of_week',
        day
      )
      .eq(
        'start_time',
        startTime
      )
      .eq(
        'end_time',
        endTime
      )
      .maybeSingle()

    if (lookupError) {
      importError(
        `Room Availability row ${rowNumber}: ${lookupError.message}`
      )
    }

    if (existing) {
      const {
        error: updateError,
      } = await supabase
        .from(
          'room_availability'
        )
        .update({
          status,

          reason:
            clean(
              row.reason
            ) || null,
        })
        .eq(
          'id',
          existing.id
        )

      if (updateError) {
        importError(
          `Room Availability row ${rowNumber}: ${updateError.message}`
        )
      }
    } else {
      const {
        error: insertError,
      } = await supabase
        .from(
          'room_availability'
        )
        .insert({
          room_id:
            room.id,

          semester_id:
            semester.id,

          day_of_week:
            day,

          start_time:
            startTime,

          end_time:
            endTime,

          status,

          reason:
            clean(
              row.reason
            ) || null,
        })

      if (insertError) {
        importError(
          `Room Availability row ${rowNumber}: ${insertError.message}`
        )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      }
    }

    summary.roomAvailability++
  }

  /* =======================================================
     REVALIDATE ALTER SCHED
  ======================================================= */

<<<<<<< HEAD
  revalidatePath('/admin/import-export')
  revalidatePath('/admin/subjects')
  revalidatePath('/admin/curriculum')
  revalidatePath('/admin/rooms')
  revalidatePath('/admin/faculty')
  revalidatePath('/admin/academic')
  revalidatePath('/scheduler/schedule-builder')
  const imported = Object.values(summary).reduce((total, value) => total + value, 0)

  redirect(
    `/admin/import-export?success=master_import_complete&records=${imported}&subjects=${summary.subjects}&curriculum=${summary.curriculum}&blocks=${summary.blocks}&qualifications=${summary.qualifications}&facultyAvailability=${summary.facultyAvailability}&rooms=${summary.rooms}&roomAvailability=${summary.roomAvailability}`
  )
}
=======
  revalidatePath(
    '/admin/import-export'
  )

  revalidatePath(
    '/admin/subjects'
  )

  revalidatePath(
    '/admin/curriculum'
  )

  revalidatePath(
    '/admin/rooms'
  )

  revalidatePath(
    '/admin/faculty'
  )

  revalidatePath(
    '/admin/academic'
  )

  revalidatePath(
    '/scheduler/schedule-builder'
  )

  const imported =
    Object.values(
      summary
    ).reduce(
      (
        total,
        value
      ) =>
        total + value,
      0
    )

  redirect(
    `/admin/import-export?success=import_complete&records=${imported}&subjects=${summary.subjects}&curriculum=${summary.curriculum}&blocks=${summary.blocks}&qualifications=${summary.qualifications}&facultyAvailability=${summary.facultyAvailability}&rooms=${summary.rooms}&roomAvailability=${summary.roomAvailability}`
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

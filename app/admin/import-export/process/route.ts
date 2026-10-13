import { NextRequest, NextResponse } from 'next/server'
<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import { unstable_rethrow } from 'next/navigation'
=======

import { requireRole } from '@/lib/auth/require-role'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ExtractedSheet = {
  name: string
  rows: string[][]
}

type ConversionResult = {
  fileName: string
  fileType: string
  sheets: ExtractedSheet[]
  warnings: string[]
}

type StandardRecord = {
  rowNumber: number
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  subject_code: string
  subject_name: string
  units: string
  lecture_hours: string
  lab_hours: string
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  year_level: string
  section: string
  semester: string
  weekly_hours: string
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  faculty_name: string
  employee_id: string
  employment_type: string
  max_teaching_load: string
<<<<<<< HEAD
  room_code: string
  room_type: string
  room_capacity: string
  day: string
  start_time: string
  end_time: string
=======

  room_code: string
  room_type: string
  room_capacity: string

  day: string
  start_time: string
  end_time: string

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  status: 'ready' | 'incomplete'
  missingFields: string[]
}

type PreparedImport = {
  fileName: string
  fileType: string
  sourceSheet: string
  firstRowWasHeader: boolean
  records: StandardRecord[]
  warnings: string[]
  mapping: Record<string, string>
}

const VALID_FIELDS = new Set([
  'subject_code',
  'subject_name',
  'units',
  'lecture_hours',
  'lab_hours',
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  'year_level',
  'section',
  'semester',
  'weekly_hours',
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  'faculty_name',
  'employee_id',
  'employment_type',
  'max_teaching_load',
<<<<<<< HEAD
  'room_code',
  'room_type',
  'room_capacity',
=======

  'room_code',
  'room_type',
  'room_capacity',

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  'day',
  'start_time',
  'end_time',
])

function clean(value: unknown) {
<<<<<<< HEAD
  if (value === null || value === undefined) {
=======
  if (
    value === null ||
    value === undefined
  ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    return ''
  }

  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .trim()
}

<<<<<<< HEAD
function decodeData(encoded: string): ConversionResult | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8')
    const parsed = JSON.parse(json)

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sheets)) {
=======
function decodeData(
  encoded: string
): ConversionResult | null {
  try {
    const json = Buffer.from(
      encoded,
      'base64url'
    ).toString('utf8')

    const parsed = JSON.parse(json)

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.sheets)
    ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      return null
    }

    return parsed as ConversionResult
  } catch {
    return null
  }
}

<<<<<<< HEAD
function encodeData(data: PreparedImport) {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')
}

function blankRecord(rowNumber: number): StandardRecord {
  return {
    rowNumber,
=======
function encodeData(
  data: PreparedImport
) {
  return Buffer.from(
    JSON.stringify(data),
    'utf8'
  ).toString('base64url')
}

function blankRecord(
  rowNumber: number
): StandardRecord {
  return {
    rowNumber,

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    subject_code: '',
    subject_name: '',
    units: '',
    lecture_hours: '',
    lab_hours: '',
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    year_level: '',
    section: '',
    semester: '',
    weekly_hours: '',
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    faculty_name: '',
    employee_id: '',
    employment_type: '',
    max_teaching_load: '',
<<<<<<< HEAD
    room_code: '',
    room_type: '',
    room_capacity: '',
    day: '',
    start_time: '',
    end_time: '',
=======

    room_code: '',
    room_type: '',
    room_capacity: '',

    day: '',
    start_time: '',
    end_time: '',

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    status: 'ready',
    missingFields: [],
  }
}

<<<<<<< HEAD
function isEmptyRecord(record: StandardRecord) {
=======
function isEmptyRecord(
  record: StandardRecord
) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  return (
    !record.subject_code &&
    !record.subject_name &&
    !record.units &&
    !record.lecture_hours &&
    !record.lab_hours &&
    !record.year_level &&
    !record.section &&
    !record.semester &&
    !record.weekly_hours &&
    !record.faculty_name &&
    !record.employee_id &&
    !record.employment_type &&
    !record.max_teaching_load &&
    !record.room_code &&
    !record.room_type &&
    !record.room_capacity &&
    !record.day &&
    !record.start_time &&
    !record.end_time
  )
}

<<<<<<< HEAD
function inspectRecord(record: StandardRecord) {
=======
function inspectRecord(
  record: StandardRecord
) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const missing: string[] = []

  /*
   * These are review indicators only.
   *
   * Missing values are NOT generated,
   * guessed or replaced.
   */

<<<<<<< HEAD
  if (!record.subject_code && !record.subject_name) {
=======
  if (
    !record.subject_code &&
    !record.subject_name
  ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    missing.push('Subject')
  }

  if (!record.year_level) {
    missing.push('Year Level')
  }

  if (!record.section) {
    missing.push('Block / Section')
  }

  if (!record.faculty_name) {
    missing.push('Instructor')
  }

  if (!record.room_code) {
    missing.push('Room')
  }

  record.missingFields = missing
<<<<<<< HEAD
  record.status = missing.length > 0 ? 'incomplete' : 'ready'
=======

  record.status =
    missing.length > 0
      ? 'incomplete'
      : 'ready'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  return record
}

<<<<<<< HEAD
export async function POST(request: NextRequest) {
  try {
    await requireRole(['super_admin'])
    const formData = await request.formData()
    const encoded = clean(formData.get('data'))

    if (!encoded) {
      return NextResponse.redirect(
        new URL('/admin/import-export?error=missing_conversion_data', request.url),
=======
export async function POST(
  request: NextRequest
) {
  try {
    await requireRole(['super_admin'])

    const formData =
      await request.formData()

    const encoded =
      clean(formData.get('data'))

    if (!encoded) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=missing_conversion_data',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const conversion = decodeData(encoded)

    if (!conversion) {
      return NextResponse.redirect(
        new URL('/admin/import-export?error=invalid_conversion_data', request.url),
=======
    const conversion =
      decodeData(encoded)

    if (!conversion) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=invalid_conversion_data',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const rawSheetIndex = Number(clean(formData.get('sheet_index')))
=======
    const rawSheetIndex =
      Number(
        clean(
          formData.get('sheet_index')
        )
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    const sheetIndex =
      Number.isInteger(rawSheetIndex) &&
      rawSheetIndex >= 0 &&
<<<<<<< HEAD
      rawSheetIndex < conversion.sheets.length
        ? rawSheetIndex
        : 0

    const sheet = conversion.sheets[sheetIndex]

    if (!sheet) {
      return NextResponse.redirect(
        new URL('/admin/import-export?error=missing_sheet', request.url),
=======
      rawSheetIndex <
        conversion.sheets.length
        ? rawSheetIndex
        : 0

    const sheet =
      conversion.sheets[sheetIndex]

    if (!sheet) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=missing_sheet',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const firstRowWasHeader = formData.get('first_row_header') === 'true'
    const trimValues = formData.get('trim_values') === 'true'
    const flagIncomplete = formData.get('flag_incomplete') === 'true'
=======
    const firstRowWasHeader =
      formData.get(
        'first_row_header'
      ) === 'true'

    const trimValues =
      formData.get(
        'trim_values'
      ) === 'true'

    const flagIncomplete =
      formData.get(
        'flag_incomplete'
      ) === 'true'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    /*
     * Determine how many source columns
     * exist in the converted table.
     */
<<<<<<< HEAD
    const columnCount = sheet.rows.reduce((largest, row) => Math.max(largest, row.length), 0)
=======
    const columnCount =
      sheet.rows.reduce(
        (largest, row) =>
          Math.max(
            largest,
            row.length
          ),
        0
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    /*
     * Build:
     *
     * source column index
     * ->
     * AlterSched field
     */
<<<<<<< HEAD
    const mapping: Record<string, string> = {}
    const usedFields = new Set<string>()

    for (let index = 0; index < columnCount; index++) {
      const selected = clean(formData.get(`column_${index}`))
=======
    const mapping: Record<
      string,
      string
    > = {}

    const usedFields =
      new Set<string>()

    for (
      let index = 0;
      index < columnCount;
      index++
    ) {
      const selected =
        clean(
          formData.get(
            `column_${index}`
          )
        )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

      if (!selected) {
        continue
      }

<<<<<<< HEAD
      if (!VALID_FIELDS.has(selected)) {
=======
      if (
        !VALID_FIELDS.has(selected)
      ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        continue
      }

      /*
       * Prevent two source columns from
       * accidentally writing to the same
       * AlterSched field.
       */
      if (usedFields.has(selected)) {
        continue
      }

      usedFields.add(selected)
<<<<<<< HEAD
      mapping[String(index)] = selected
    }

    if (Object.keys(mapping).length === 0) {
=======

      mapping[String(index)] =
        selected
    }

    if (
      Object.keys(mapping).length === 0
    ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      return NextResponse.redirect(
        new URL(
          `/admin/import-export/map?data=${encodeURIComponent(
            encoded
          )}&sheet=${sheetIndex}&error=no_mapping`,
          request.url
        ),
        303
      )
    }

    /*
     * Skip first row when Admin says
     * it contains headers.
     */
<<<<<<< HEAD
    const sourceRows = firstRowWasHeader ? sheet.rows.slice(1) : sheet.rows
    const records: StandardRecord[] = []

    sourceRows.forEach((sourceRow, index) => {
      const originalRowNumber = firstRowWasHeader ? index + 2 : index + 1
      let record = blankRecord(originalRowNumber)

      for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        const targetField = mapping[String(columnIndex)]

        if (!targetField) {
          continue
        }

        const rawValue = sourceRow[columnIndex] ?? ''

        const value = trimValues ? clean(rawValue) : String(rawValue ?? '')
        /*
         * targetField has already been
         * validated against VALID_FIELDS.
         */
        ;(record as unknown as Record<string, unknown>)[targetField] = value
      }

      /*
       * Ignore rows where every mapped
       * field is blank.
       */
      if (isEmptyRecord(record)) {
        return
      }

      if (flagIncomplete) {
        record = inspectRecord(record)
      }

      records.push(record)
    })
=======
    const sourceRows =
      firstRowWasHeader
        ? sheet.rows.slice(1)
        : sheet.rows

    const records: StandardRecord[] =
      []

    sourceRows.forEach(
      (sourceRow, index) => {
        const originalRowNumber =
          firstRowWasHeader
            ? index + 2
            : index + 1

        let record =
          blankRecord(
            originalRowNumber
          )

        for (
          let columnIndex = 0;
          columnIndex <
          columnCount;
          columnIndex++
        ) {
          const targetField =
            mapping[
              String(columnIndex)
            ]

          if (!targetField) {
            continue
          }

          const rawValue =
            sourceRow[
              columnIndex
            ] ?? ''

          const value =
            trimValues
              ? clean(rawValue)
              : String(
                  rawValue ?? ''
                )

          /*
           * targetField has already been
           * validated against VALID_FIELDS.
           */
          ;(
            record as unknown as Record<
              string,
              unknown
            >
          )[targetField] = value
        }

        /*
         * Ignore rows where every mapped
         * field is blank.
         */
        if (isEmptyRecord(record)) {
          return
        }

        if (flagIncomplete) {
          record =
            inspectRecord(record)
        }

        records.push(record)
      }
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    if (records.length === 0) {
      return NextResponse.redirect(
        new URL(
          `/admin/import-export/map?data=${encodeURIComponent(
            encoded
          )}&sheet=${sheetIndex}&error=no_records`,
          request.url
        ),
        303
      )
    }

<<<<<<< HEAD
    const warnings = [...(conversion.warnings ?? [])]
    const incompleteCount = records.filter((record) => record.status === 'incomplete').length
=======
    const warnings = [
      ...(conversion.warnings ?? []),
    ]

    const incompleteCount =
      records.filter(
        (record) =>
          record.status ===
          'incomplete'
      ).length
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    if (incompleteCount > 0) {
      warnings.push(
        `${incompleteCount} record${
<<<<<<< HEAD
          incompleteCount === 1 ? '' : 's'
=======
          incompleteCount === 1
            ? ''
            : 's'
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        } contain missing information. Missing values were left blank.`
      )
    }

    const prepared: PreparedImport = {
<<<<<<< HEAD
      fileName: conversion.fileName,
      fileType: conversion.fileType,
      sourceSheet: sheet.name,
      firstRowWasHeader,
      records,
      warnings,
      mapping,
    }

    const preparedEncoded = encodeData(prepared)
=======
      fileName:
        conversion.fileName,

      fileType:
        conversion.fileType,

      sourceSheet:
        sheet.name,

      firstRowWasHeader,

      records,

      warnings,

      mapping,
    }

    const preparedEncoded =
      encodeData(prepared)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    /*
     * Still no database insert here.
     *
     * Next page = FINAL REVIEW.
     */
<<<<<<< HEAD
    if (preparedEncoded.length > 500_000) {
      return NextResponse.redirect(
        new URL('/admin/import-export?error=prepared_data_too_large', request.url),
=======
    if (
      preparedEncoded.length >
      500_000
    ) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=prepared_data_too_large',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const reviewUrl = new URL('/admin/import-export/review', request.url)
    reviewUrl.searchParams.set('data', preparedEncoded)

    return NextResponse.redirect(reviewUrl, 303)
  } catch (error) {
    unstable_rethrow(error)
    console.error('AlterSched import preparation failed:', error)

    return NextResponse.redirect(
      new URL('/admin/import-export?error=prepare_failed', request.url),
      303
    )
  }
}
=======
    const reviewUrl =
      new URL(
        '/admin/import-export/review',
        request.url
      )

    reviewUrl.searchParams.set(
      'data',
      preparedEncoded
    )

    return NextResponse.redirect(
      reviewUrl,
      303
    )
  } catch (error) {
    console.error(
      'AlterSched import preparation failed:',
      error
    )

    return NextResponse.redirect(
      new URL(
        '/admin/import-export?error=prepare_failed',
        request.url
      ),
      303
    )
  }
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

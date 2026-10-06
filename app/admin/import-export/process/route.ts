import { NextRequest, NextResponse } from 'next/server'

import { requireRole } from '@/lib/auth/require-role'

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

  subject_code: string
  subject_name: string
  units: string
  lecture_hours: string
  lab_hours: string

  year_level: string
  section: string
  semester: string
  weekly_hours: string

  faculty_name: string
  employee_id: string
  employment_type: string
  max_teaching_load: string

  room_code: string
  room_type: string
  room_capacity: string

  day: string
  start_time: string
  end_time: string

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

  'year_level',
  'section',
  'semester',
  'weekly_hours',

  'faculty_name',
  'employee_id',
  'employment_type',
  'max_teaching_load',

  'room_code',
  'room_type',
  'room_capacity',

  'day',
  'start_time',
  'end_time',
])

function clean(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .trim()
}

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
      return null
    }

    return parsed as ConversionResult
  } catch {
    return null
  }
}

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

    subject_code: '',
    subject_name: '',
    units: '',
    lecture_hours: '',
    lab_hours: '',

    year_level: '',
    section: '',
    semester: '',
    weekly_hours: '',

    faculty_name: '',
    employee_id: '',
    employment_type: '',
    max_teaching_load: '',

    room_code: '',
    room_type: '',
    room_capacity: '',

    day: '',
    start_time: '',
    end_time: '',

    status: 'ready',
    missingFields: [],
  }
}

function isEmptyRecord(
  record: StandardRecord
) {
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

function inspectRecord(
  record: StandardRecord
) {
  const missing: string[] = []

  /*
   * These are review indicators only.
   *
   * Missing values are NOT generated,
   * guessed or replaced.
   */

  if (
    !record.subject_code &&
    !record.subject_name
  ) {
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

  record.status =
    missing.length > 0
      ? 'incomplete'
      : 'ready'

  return record
}

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
        303
      )
    }

    const conversion =
      decodeData(encoded)

    if (!conversion) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=invalid_conversion_data',
          request.url
        ),
        303
      )
    }

    const rawSheetIndex =
      Number(
        clean(
          formData.get('sheet_index')
        )
      )

    const sheetIndex =
      Number.isInteger(rawSheetIndex) &&
      rawSheetIndex >= 0 &&
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
        303
      )
    }

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

    /*
     * Determine how many source columns
     * exist in the converted table.
     */
    const columnCount =
      sheet.rows.reduce(
        (largest, row) =>
          Math.max(
            largest,
            row.length
          ),
        0
      )

    /*
     * Build:
     *
     * source column index
     * ->
     * AlterSched field
     */
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

      if (!selected) {
        continue
      }

      if (
        !VALID_FIELDS.has(selected)
      ) {
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

      mapping[String(index)] =
        selected
    }

    if (
      Object.keys(mapping).length === 0
    ) {
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

    const warnings = [
      ...(conversion.warnings ?? []),
    ]

    const incompleteCount =
      records.filter(
        (record) =>
          record.status ===
          'incomplete'
      ).length

    if (incompleteCount > 0) {
      warnings.push(
        `${incompleteCount} record${
          incompleteCount === 1
            ? ''
            : 's'
        } contain missing information. Missing values were left blank.`
      )
    }

    const prepared: PreparedImport = {
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

    /*
     * Still no database insert here.
     *
     * Next page = FINAL REVIEW.
     */
    if (
      preparedEncoded.length >
      500_000
    ) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=prepared_data_too_large',
          request.url
        ),
        303
      )
    }

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
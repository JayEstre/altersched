import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

import { requireRole } from '@/lib/auth/require-role'

export async function GET() {
  await requireRole(['super_admin'])

  const workbook = XLSX.utils.book_new()

  /* =========================================================
     1. SUBJECTS
  ========================================================= */

  const subjects = [
    [
      'code',
      'name',
      'units',
      'lecture_hours',
      'lab_hours',
      'description',
      'is_active',
    ],
    [
      'ITEC 101',
      'Introduction to Computing',
      3,
      2,
      1,
      'BSIT core subject',
      'TRUE',
    ],
  ]

  addSheet(
    workbook,
    'Subjects',
    subjects
  )

  /* =========================================================
     2. CURRICULUM
  ========================================================= */

  const curriculum = [
    [
      'curriculum',
      'program',
      'subject_code',
      'year_level',
      'semester',
      'weekly_hours',
      'required_room_type',
      'effective_from_year',
      'effective_to_year',
    ],
    [
      'BSIT CURRICULUM',
      'BSIT',
      'ITEC 101',
      1,
      1,
      3,
      'Computer Laboratory',
      2026,
      '',
    ],
  ]

  addSheet(
    workbook,
    'Curriculum',
    curriculum
  )

  /* =========================================================
     3. BLOCKS
  ========================================================= */

  const blocks = [
    [
      'program',
      'year_level',
      'code',
      'name',
      'capacity',
      'is_active',
    ],
    [
      'BSIT',
      1,
      'A',
      'BSIT 1A',
      40,
      'TRUE',
    ],
  ]

  addSheet(
    workbook,
    'Blocks',
    blocks
  )

  /* =========================================================
     4. QUALIFICATIONS
  ========================================================= */

  const qualifications = [
    [
      'employee_id',
      'subject_code',
    ],
    [
      'IT-000',
      'ITEC 101',
    ],
  ]

  addSheet(
    workbook,
    'Qualifications',
    qualifications
  )

  /* =========================================================
     5. FACULTY AVAILABILITY
  ========================================================= */

  const facultyAvailability = [
    [
      'employee_id',
      'semester',
      'day',
      'start_time',
      'end_time',
      'availability_type',
    ],
    [
      'IT-000',
      1,
      'Monday',
      '08:00',
      '17:00',
      'available',
    ],
  ]

  addSheet(
    workbook,
    'Faculty Availability',
    facultyAvailability
  )

  /* =========================================================
     6. ROOMS
  ========================================================= */

  const rooms = [
    [
      'code',
      'name',
      'room_type',
      'building',
      'floor',
      'capacity',
      'is_active',
    ],
    [
      'CCS LAB 101',
      'CCS Laboratory 101',
      'Computer Laboratory',
      'CCS',
      '1',
      40,
      'TRUE',
    ],
  ]

  addSheet(
    workbook,
    'Rooms',
    rooms
  )

  /* =========================================================
     7. ROOM AVAILABILITY
  ========================================================= */

  const roomAvailability = [
    [
      'room_code',
      'semester',
      'day',
      'start_time',
      'end_time',
      'status',
      'reason',
    ],
    [
      'CCS LAB 101',
      1,
      'Monday',
      '07:00',
      '18:00',
      'available',
      '',
    ],
  ]

  addSheet(
    workbook,
    'Room Availability',
    roomAvailability
  )

  /* =========================================================
     GENERATE XLSX
  ========================================================= */

  const buffer = XLSX.write(
    workbook,
    {
      type: 'buffer',
      bookType: 'xlsx',
    }
  )

  return new NextResponse(buffer, {
    status: 200,

    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      'Content-Disposition':
        'attachment; filename="AlterSched_Import_Template.xlsx"',

      'Cache-Control':
        'no-store',
    },
  })
}

/* =========================================================
   SHEET HELPER
========================================================= */

function addSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: unknown[][]
) {
  const worksheet =
    XLSX.utils.aoa_to_sheet(
      rows
    )

  /*
   * Column widths.
   * This only affects presentation.
   */

  const columnCount =
    rows[0]?.length ?? 0

  worksheet['!cols'] =
    Array.from(
      {
        length: columnCount,
      },
      (_, index) => {
        const longest =
          rows.reduce(
            (
              max,
              row
            ) => {
              const value =
                String(
                  row[index] ?? ''
                )

              return Math.max(
                max,
                value.length
              )
            },
            10
          )

        return {
          wch: Math.min(
            Math.max(
              longest + 2,
              12
            ),
            32
          ),
        }
      }
    )

  /*
   * Autofilter on headers.
   */

  if (
    rows.length > 0 &&
    columnCount > 0
  ) {
    const lastColumn =
      XLSX.utils.encode_col(
        columnCount - 1
      )

    worksheet['!autofilter'] = {
      ref: `A1:${lastColumn}1`,
    }
  }

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    name
  )
}
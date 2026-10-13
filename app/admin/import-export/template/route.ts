import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
import { requireRole } from '@/lib/auth/require-role'

export async function GET() {
  await requireRole(['super_admin'])
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const workbook = XLSX.utils.book_new()

  /* =========================================================
     1. SUBJECTS
  ========================================================= */

  const subjects = [
<<<<<<< HEAD
    ['code', 'name', 'units', 'lecture_hours', 'lab_hours', 'description', 'is_active'],
    ['ITEC 101', 'Introduction to Computing', 3, 2, 1, 'BSIT core subject', 'TRUE'],
  ]

  addSheet(workbook, 'Subjects', subjects)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

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
<<<<<<< HEAD
    ['BSIT CURRICULUM', 'BSIT', 'ITEC 101', 1, 1, 3, 'Computer Laboratory', 2026, ''],
  ]

  addSheet(workbook, 'Curriculum', curriculum)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =========================================================
     3. BLOCKS
  ========================================================= */

  const blocks = [
<<<<<<< HEAD
    ['program', 'year_level', 'code', 'name', 'capacity', 'is_active'],
    ['BSIT', 1, 'A', 'BSIT 1A', 40, 'TRUE'],
  ]

  addSheet(workbook, 'Blocks', blocks)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =========================================================
     4. QUALIFICATIONS
  ========================================================= */

  const qualifications = [
<<<<<<< HEAD
    ['employee_id', 'subject_code'],
    ['IT-000', 'ITEC 101'],
  ]

  addSheet(workbook, 'Qualifications', qualifications)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =========================================================
     5. FACULTY AVAILABILITY
  ========================================================= */

  const facultyAvailability = [
<<<<<<< HEAD
    ['employee_id', 'semester', 'day', 'start_time', 'end_time', 'availability_type'],
    ['IT-000', 1, 'Monday', '08:00', '17:00', 'available'],
  ]

  addSheet(workbook, 'Faculty Availability', facultyAvailability)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =========================================================
     6. ROOMS
  ========================================================= */

  const rooms = [
<<<<<<< HEAD
    ['code', 'name', 'room_type', 'building', 'floor', 'capacity', 'is_active'],
    ['CCS LAB 101', 'CCS Laboratory 101', 'Computer Laboratory', 'CCS', '1', 40, 'TRUE'],
  ]

  addSheet(workbook, 'Rooms', rooms)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =========================================================
     7. ROOM AVAILABILITY
  ========================================================= */

  const roomAvailability = [
<<<<<<< HEAD
    ['room_code', 'semester', 'day', 'start_time', 'end_time', 'status', 'reason'],
    ['CCS LAB 101', 1, 'Monday', '07:00', '18:00', 'available', ''],
  ]

  addSheet(workbook, 'Room Availability', roomAvailability)
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* =========================================================
     GENERATE XLSX
  ========================================================= */

<<<<<<< HEAD
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="AlterSched_Import_Template.xlsx"',
      'Cache-Control': 'no-store',
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    },
  })
}

/* =========================================================
   SHEET HELPER
========================================================= */

<<<<<<< HEAD
function addSheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
=======
function addSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: unknown[][]
) {
  const worksheet =
    XLSX.utils.aoa_to_sheet(
      rows
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /*
   * Column widths.
   * This only affects presentation.
   */

<<<<<<< HEAD
  const columnCount = rows[0]?.length ?? 0

  worksheet['!cols'] = Array.from(
    {
      length: columnCount,
    },
    (_, index) => {
      const longest = rows.reduce((max, row) => {
        const value = String(row[index] ?? '')

        return Math.max(max, value.length)
      }, 10)

      return {
        wch: Math.min(Math.max(longest + 2, 12), 32),
      }
    }
  )
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /*
   * Autofilter on headers.
   */

<<<<<<< HEAD
  if (rows.length > 0 && columnCount > 0) {
    const lastColumn = XLSX.utils.encode_col(columnCount - 1)
=======
  if (
    rows.length > 0 &&
    columnCount > 0
  ) {
    const lastColumn =
      XLSX.utils.encode_col(
        columnCount - 1
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    worksheet['!autofilter'] = {
      ref: `A1:${lastColumn}1`,
    }
  }

<<<<<<< HEAD
  XLSX.utils.book_append_sheet(workbook, worksheet, name)
}
=======
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    name
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

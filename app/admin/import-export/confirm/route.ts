import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

type ImportStats = {
  subjectsCreated: number
  subjectsUpdated: number

  sectionsCreated: number

  facultyUpdated: number
  facultyQualificationsCreated: number

  roomsCreated: number
  roomsUpdated: number

  curriculumLinksCreated: number

  skipped: number
  needsReview: number
}

function clean(value: unknown) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function normalize(value: unknown) {
  return clean(value).toLowerCase()
}

function decodePreparedData(
  encoded: string
): PreparedImport | null {
  try {
    const json = Buffer.from(
      encoded,
      'base64url'
    ).toString('utf8')

    const parsed = JSON.parse(json)

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.records)
    ) {
      return null
    }

    return parsed as PreparedImport
  } catch {
    return null
  }
}

function positiveNumber(
  value: string
): number | null {
  const cleaned = clean(value)

  if (!cleaned) {
    return null
  }

  const parsed = Number(cleaned)

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null
  }

  return parsed
}

function positiveInteger(
  value: string
): number | null {
  const number = positiveNumber(value)

  if (
    number === null ||
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return null
  }

  return number
}

function detectYearLevel(
  value: string
): number | null {
  const normalized = normalize(value)

  if (!normalized) {
    return null
  }

  if (
    normalized.includes('1st') ||
    normalized.includes('first') ||
    normalized === '1'
  ) {
    return 1
  }

  if (
    normalized.includes('2nd') ||
    normalized.includes('second') ||
    normalized === '2'
  ) {
    return 2
  }

  if (
    normalized.includes('3rd') ||
    normalized.includes('third') ||
    normalized === '3'
  ) {
    return 3
  }

  if (
    normalized.includes('4th') ||
    normalized.includes('fourth') ||
    normalized === '4'
  ) {
    return 4
  }

  const match =
    normalized.match(/\b([1-9])\b/)

  if (!match) {
    return null
  }

  return Number(match[1])
}

function detectTermOrder(
  value: string
): number | null {
  const normalized = normalize(value)

  if (!normalized) {
    return null
  }

  if (
    normalized.includes('1st') ||
    normalized.includes('first') ||
    normalized === '1'
  ) {
    return 1
  }

  if (
    normalized.includes('2nd') ||
    normalized.includes('second') ||
    normalized === '2'
  ) {
    return 2
  }

  if (
    normalized.includes('3rd') ||
    normalized.includes('third') ||
    normalized === '3'
  ) {
    return 3
  }

  const match =
    normalized.match(/\b([1-9])\b/)

  return match
    ? Number(match[1])
    : null
}

function makeSectionCode(
  value: string
) {
  return clean(value)
    .toUpperCase()
    .replace(/\s+/g, '-')
}

function redirectResult(
  request: NextRequest,
  params: Record<string, string | number>
) {
  const url = new URL(
    '/admin/import-export',
    request.url
  )

  for (
    const [key, value] of
    Object.entries(params)
  ) {
    url.searchParams.set(
      key,
      String(value)
    )
  }

  return NextResponse.redirect(
    url,
    303
  )
}

export async function POST(
  request: NextRequest
) {
  try {
    await requireRole(['super_admin'])

    const supabase =
      await createClient()

    const formData =
      await request.formData()

    const encoded =
      clean(formData.get('data'))

    if (!encoded) {
      return redirectResult(
        request,
        {
          error:
            'missing_import_data',
        }
      )
    }

    const prepared =
      decodePreparedData(encoded)

    if (
      !prepared ||
      prepared.records.length === 0
    ) {
      return redirectResult(
        request,
        {
          error:
            'invalid_import_data',
        }
      )
    }

    /*
     * -------------------------------------------------------
     * LOAD ALTERSched MASTER REFERENCES
     * -------------------------------------------------------
     */

    const [
      departmentsResult,
      programsResult,
      yearLevelsResult,
      roomTypesResult,
      curriculaResult,
      semestersResult,
      facultyResult,
      institutionsResult,
    ] = await Promise.all([
      supabase
        .from('departments')
        .select(
          'id, code, name, institution_id, is_active'
        )
        .eq('is_active', true),

      supabase
        .from('programs')
        .select(
          'id, code, name, department_id, is_active'
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
        .select(
          'id, name'
        ),

      supabase
        .from('curricula')
        .select(
          'id, program_id, name, is_active'
        )
        .eq('is_active', true),

      supabase
        .from('semesters')
        .select(
          'id, name, term_order, is_active'
        ),

      supabase
        .from('faculty_profiles')
        .select(`
          id,
          profile_id,
          employee_id,
          department_id,
          employment_type,
          max_teaching_load,
          profiles (
            full_name
          )
        `),

      supabase
        .from('institutions')
        .select('id, name'),
    ])

    const referenceError =
      departmentsResult.error ||
      programsResult.error ||
      yearLevelsResult.error ||
      roomTypesResult.error ||
      curriculaResult.error ||
      semestersResult.error ||
      facultyResult.error ||
      institutionsResult.error

    if (referenceError) {
      console.error(
        'Import reference load failed:',
        referenceError
      )

      return redirectResult(
        request,
        {
          error:
            'reference_load_failed',
        }
      )
    }

    /*
     * Current demo scope:
     * BSIT department only.
     */

    const bsitDepartment =
      (
        departmentsResult.data ?? []
      ).find((department) => {
        const code =
          normalize(department.code)

        const name =
          normalize(department.name)

        return (
          code === 'bsit' ||
          name.includes(
            'information technology'
          ) ||
          name === 'bsit'
        )
      })

    if (!bsitDepartment) {
      return redirectResult(
        request,
        {
          error:
            'bsit_department_not_found',
        }
      )
    }

    const bsitProgram =
      (
        programsResult.data ?? []
      ).find((program) => {
        if (
          program.department_id !==
          bsitDepartment.id
        ) {
          return false
        }

        const code =
          normalize(program.code)

        const name =
          normalize(program.name)

        return (
          code === 'bsit' ||
          name.includes(
            'information technology'
          )
        )
      }) ??
      (
        programsResult.data ?? []
      ).find(
        (program) =>
          program.department_id ===
          bsitDepartment.id
      )

    if (!bsitProgram) {
      return redirectResult(
        request,
        {
          error:
            'bsit_program_not_found',
        }
      )
    }

    const institutionId =
      bsitDepartment.institution_id ||
      institutionsResult.data?.[0]?.id

    if (!institutionId) {
      return redirectResult(
        request,
        {
          error:
            'institution_not_found',
        }
      )
    }

    const yearLevels =
      (
        yearLevelsResult.data ?? []
      ).filter(
        (year) =>
          year.program_id ===
          bsitProgram.id
      )

    const activeCurricula =
      (
        curriculaResult.data ?? []
      ).filter(
        (curriculum) =>
          curriculum.program_id ===
          bsitProgram.id
      )

    /*
     * Generator requires one active
     * curriculum for the program.
     */
    const activeCurriculum =
      activeCurricula.length === 1
        ? activeCurricula[0]
        : null

    const roomTypes =
      roomTypesResult.data ?? []

    const semesters =
      semestersResult.data ?? []

    const faculty =
      facultyResult.data ?? []

    /*
     * -------------------------------------------------------
     * EXISTING DATA
     * -------------------------------------------------------
     */

    const [
      subjectsResult,
      sectionsResult,
      roomsResult,
      facultySubjectsResult,
      curriculumSubjectsResult,
    ] = await Promise.all([
      supabase
        .from('subjects')
        .select(
          'id, department_id, code, name, units, lecture_hours, lab_hours'
        )
        .eq(
          'department_id',
          bsitDepartment.id
        ),

      supabase
        .from('sections')
        .select(
          'id, year_level_id, code, name, capacity, is_active'
        ),

      supabase
        .from('rooms')
        .select(
          'id, institution_id, room_type_id, code, name, capacity, is_active'
        )
        .eq(
          'institution_id',
          institutionId
        ),

      supabase
        .from('faculty_subjects')
        .select(
          'id, faculty_id, subject_id'
        ),

      supabase
        .from('curriculum_subjects')
        .select(`
          id,
          curriculum_id,
          subject_id,
          year_level_id,
          term_order,
          required_room_type_id,
          weekly_hours
        `),
    ])

    const existingError =
      subjectsResult.error ||
      sectionsResult.error ||
      roomsResult.error ||
      facultySubjectsResult.error ||
      curriculumSubjectsResult.error

    if (existingError) {
      console.error(
        'Existing import data load failed:',
        existingError
      )

      return redirectResult(
        request,
        {
          error:
            'existing_data_load_failed',
        }
      )
    }

    const subjects =
      [...(subjectsResult.data ?? [])]

    const sections =
      [...(sectionsResult.data ?? [])]

    const rooms =
      [...(roomsResult.data ?? [])]

    const facultySubjects =
      [
        ...(facultySubjectsResult.data ??
          []),
      ]

    const curriculumSubjects =
      [
        ...(curriculumSubjectsResult.data ??
          []),
      ]

    const stats: ImportStats = {
      subjectsCreated: 0,
      subjectsUpdated: 0,

      sectionsCreated: 0,

      facultyUpdated: 0,
      facultyQualificationsCreated: 0,

      roomsCreated: 0,
      roomsUpdated: 0,

      curriculumLinksCreated: 0,

      skipped: 0,
      needsReview: 0,
    }

    /*
     * -------------------------------------------------------
     * PROCESS EACH STANDARDIZED RECORD
     * -------------------------------------------------------
     */

    for (
      const record of prepared.records
    ) {
      try {
        /*
         * ---------------------------------------
         * SUBJECT
         * ---------------------------------------
         */

        let subject:
          | (typeof subjects)[number]
          | undefined

        const subjectCode =
          clean(record.subject_code)

        const subjectName =
          clean(record.subject_name)

        if (subjectCode) {
          subject =
            subjects.find(
              (item) =>
                normalize(item.code) ===
                normalize(subjectCode)
            )
        }

        if (
          !subject &&
          subjectName
        ) {
          subject =
            subjects.find(
              (item) =>
                normalize(item.name) ===
                normalize(subjectName)
            )
        }

        if (
          !subject &&
          subjectCode &&
          subjectName
        ) {
          const units =
            positiveNumber(
              record.units
            ) ?? 0

          const lectureHours =
            positiveNumber(
              record.lecture_hours
            ) ?? 0

          const labHours =
            positiveNumber(
              record.lab_hours
            ) ?? 0

          const {
            data,
            error,
          } = await supabase
            .from('subjects')
            .insert({
              department_id:
                bsitDepartment.id,

              code: subjectCode,
              name: subjectName,

              units,
              lecture_hours:
                lectureHours,

              lab_hours:
                labHours,

              is_active: true,
            })
            .select(
              'id, department_id, code, name, units, lecture_hours, lab_hours'
            )
            .single()

          if (error) {
            console.error(
              `Subject import failed at row ${record.rowNumber}:`,
              error
            )

            stats.skipped++
            continue
          }

          subject = data
          subjects.push(data)

          stats.subjectsCreated++
        } else if (subject) {
          /*
           * Only update fields that actually
           * exist in the imported source.
           * Blank values never overwrite
           * existing information.
           */

          const updates: {
            name?: string
            units?: number
            lecture_hours?: number
            lab_hours?: number
            is_active?: boolean
          } = {}

          if (
            subjectName &&
            subjectName !==
              subject.name
          ) {
            updates.name =
              subjectName
          }

          const units =
            positiveNumber(
              record.units
            )

          if (units !== null) {
            updates.units = units
          }

          const lectureHours =
            positiveNumber(
              record.lecture_hours
            )

          if (
            lectureHours !== null
          ) {
            updates.lecture_hours =
              lectureHours
          }

          const labHours =
            positiveNumber(
              record.lab_hours
            )

          if (labHours !== null) {
            updates.lab_hours =
              labHours
          }

          if (
            Object.keys(updates)
              .length > 0
          ) {
            const {
              data,
              error,
            } = await supabase
              .from('subjects')
              .update(updates)
              .eq('id', subject.id)
              .select(
                'id, department_id, code, name, units, lecture_hours, lab_hours'
              )
              .single()

            if (error) {
              console.error(
                `Subject update failed at row ${record.rowNumber}:`,
                error
              )
            } else {
              Object.assign(
                subject,
                data
              )

              stats.subjectsUpdated++
            }
          }
        }

        /*
         * ---------------------------------------
         * YEAR LEVEL
         * ---------------------------------------
         */

        const yearNumber =
          detectYearLevel(
            record.year_level
          )

        const yearLevel =
          yearNumber
            ? yearLevels.find(
                (year) =>
                  year.level_number ===
                  yearNumber
              )
            : undefined

        /*
         * ---------------------------------------
         * SECTION / BLOCK
         * ---------------------------------------
         */

        let section:
          | (typeof sections)[number]
          | undefined

        const sectionValue =
          clean(record.section)

        if (
          yearLevel &&
          sectionValue
        ) {
          const sectionCode =
            makeSectionCode(
              sectionValue
            )

          section =
            sections.find(
              (item) =>
                item.year_level_id ===
                  yearLevel.id &&
                (
                  normalize(
                    item.code
                  ) ===
                    normalize(
                      sectionCode
                    ) ||
                  normalize(
                    item.name
                  ) ===
                    normalize(
                      sectionValue
                    )
                )
            )

          if (!section) {
            const {
              data,
              error,
            } = await supabase
              .from('sections')
              .insert({
                year_level_id:
                  yearLevel.id,

                code:
                  sectionCode,

                name:
                  sectionValue,

                is_active: true,
              })
              .select(
                'id, year_level_id, code, name, capacity, is_active'
              )
              .single()

            if (error) {
              console.error(
                `Section import failed at row ${record.rowNumber}:`,
                error
              )
            } else {
              section = data
              sections.push(data)

              stats.sectionsCreated++
            }
          }
        }

        /*
         * ---------------------------------------
         * ROOM TYPE
         * ---------------------------------------
         */

        const roomTypeName =
          clean(record.room_type)

        const roomType =
          roomTypeName
            ? roomTypes.find(
                (item) =>
                  normalize(
                    item.name
                  ) ===
                  normalize(
                    roomTypeName
                  )
              )
            : undefined

        /*
         * We do not automatically invent a
         * new room type from an unknown name.
         */

        /*
         * ---------------------------------------
         * ROOM
         * ---------------------------------------
         */

        const roomCode =
          clean(record.room_code)

        let room:
          | (typeof rooms)[number]
          | undefined

        if (roomCode) {
          room =
            rooms.find(
              (item) =>
                normalize(item.code) ===
                normalize(roomCode)
            )

          const roomCapacity =
            positiveInteger(
              record.room_capacity
            )

          if (!room) {
            /*
             * Database V2 requires capacity > 0.
             * Therefore a new room cannot be
             * created safely when capacity is
             * missing.
             */
            if (
              roomCapacity !== null
            ) {
              const {
                data,
                error,
              } = await supabase
                .from('rooms')
                .insert({
                  institution_id:
                    institutionId,

                  room_type_id:
                    roomType?.id ??
                    null,

                  code:
                    roomCode,

                  name:
                    roomCode,

                  capacity:
                    roomCapacity,

                  is_active: true,
                })
                .select(
                  'id, institution_id, room_type_id, code, name, capacity, is_active'
                )
                .single()

              if (error) {
                console.error(
                  `Room import failed at row ${record.rowNumber}:`,
                  error
                )
              } else {
                room = data
                rooms.push(data)

                stats.roomsCreated++
              }
            }
          } else {
            const roomUpdates: {
              room_type_id?: string
              capacity?: number
              is_active?: boolean
            } = {}

            if (
              roomType &&
              room.room_type_id !==
                roomType.id
            ) {
              roomUpdates.room_type_id =
                roomType.id
            }

            if (
              roomCapacity !== null &&
              room.capacity !==
                roomCapacity
            ) {
              roomUpdates.capacity =
                roomCapacity
            }

            if (
              Object.keys(
                roomUpdates
              ).length > 0
            ) {
              const {
                data,
                error,
              } = await supabase
                .from('rooms')
                .update(roomUpdates)
                .eq('id', room.id)
                .select(
                  'id, institution_id, room_type_id, code, name, capacity, is_active'
                )
                .single()

              if (error) {
                console.error(
                  `Room update failed at row ${record.rowNumber}:`,
                  error
                )
              } else {
                Object.assign(
                  room,
                  data
                )

                stats.roomsUpdated++
              }
            }
          }
        }

        /*
         * ---------------------------------------
         * FACULTY
         * ---------------------------------------
         *
         * We NEVER create login accounts from
         * imported schedule/reference files.
         *
         * Faculty must already exist through
         * the normal AlterSched registration
         * and approval workflow.
         */

        const employeeId =
          clean(record.employee_id)

        const facultyName =
          clean(record.faculty_name)

        let facultyProfile:
          | (typeof faculty)[number]
          | undefined

        if (employeeId) {
          facultyProfile =
            faculty.find(
              (item) =>
                normalize(
                  item.employee_id
                ) ===
                normalize(employeeId)
            )
        }

        if (
          !facultyProfile &&
          facultyName
        ) {
          facultyProfile =
            faculty.find(
              (item) => {
                const relation =
                  item.profiles

                const profile =
                  Array.isArray(
                    relation
                  )
                    ? relation[0]
                    : relation

                return (
                  normalize(
                    profile?.full_name
                  ) ===
                  normalize(
                    facultyName
                  )
                )
              }
            )
        }

        if (
          facultyProfile &&
          facultyProfile.department_id ===
            bsitDepartment.id
        ) {
          const facultyUpdates: {
            employment_type?: string
            max_teaching_load?: number
          } = {}

          const employmentType =
            clean(
              record.employment_type
            )

          if (employmentType) {
            facultyUpdates.employment_type =
              employmentType
          }

          const maxLoad =
            positiveNumber(
              record.max_teaching_load
            )

          if (maxLoad !== null) {
            facultyUpdates.max_teaching_load =
              maxLoad
          }

          if (
            Object.keys(
              facultyUpdates
            ).length > 0
          ) {
            const {
              error,
            } = await supabase
              .from('faculty_profiles')
              .update(
                facultyUpdates
              )
              .eq(
                'id',
                facultyProfile.id
              )

            if (error) {
              console.error(
                `Faculty update failed at row ${record.rowNumber}:`,
                error
              )
            } else {
              Object.assign(
                facultyProfile,
                facultyUpdates
              )

              stats.facultyUpdated++
            }
          }

          /*
           * Qualification:
           * Existing faculty + existing/imported
           * subject = safe faculty_subject link.
           */

          if (subject) {
            const existingQualification =
              facultySubjects.find(
                (item) =>
                  item.faculty_id ===
                    facultyProfile!.id &&
                  item.subject_id ===
                    subject!.id
              )

            if (
              !existingQualification
            ) {
              const {
                data,
                error,
              } = await supabase
                .from(
                  'faculty_subjects'
                )
                .insert({
                  faculty_id:
                    facultyProfile.id,

                  subject_id:
                    subject.id,
                })
                .select(
                  'id, faculty_id, subject_id'
                )
                .single()

              if (error) {
                console.error(
                  `Qualification import failed at row ${record.rowNumber}:`,
                  error
                )
              } else {
                facultySubjects.push(
                  data
                )

                stats.facultyQualificationsCreated++
              }
            }
          }
        }

        /*
         * ---------------------------------------
         * CURRICULUM SUBJECT
         * ---------------------------------------
         */

        const termOrder =
          detectTermOrder(
            record.semester
          )

        const weeklyHours =
          positiveNumber(
            record.weekly_hours
          )

        /*
         * If the imported row does not provide
         * weekly hours, lecture + lab hours may
         * safely describe the total subject
         * weekly requirement.
         */
        const subjectHours =
          subject
            ? Number(
                subject.lecture_hours ??
                  0
              ) +
              Number(
                subject.lab_hours ??
                  0
              )
            : 0

        const requiredWeeklyHours =
          weeklyHours !== null &&
          weeklyHours > 0
            ? weeklyHours
            : subjectHours > 0
              ? subjectHours
              : null

        if (
          activeCurriculum &&
          subject &&
          yearLevel &&
          termOrder &&
          requiredWeeklyHours
        ) {
          const existingLink =
            curriculumSubjects.find(
              (item) =>
                item.curriculum_id ===
                  activeCurriculum.id &&
                item.subject_id ===
                  subject!.id &&
                item.year_level_id ===
                  yearLevel.id &&
                item.term_order ===
                  termOrder
            )

          if (!existingLink) {
            const {
              data,
              error,
            } = await supabase
              .from(
                'curriculum_subjects'
              )
              .insert({
                curriculum_id:
                  activeCurriculum.id,

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
                  requiredWeeklyHours,
              })
              .select(`
                id,
                curriculum_id,
                subject_id,
                year_level_id,
                term_order,
                required_room_type_id,
                weekly_hours
              `)
              .single()

            if (error) {
              console.error(
                `Curriculum import failed at row ${record.rowNumber}:`,
                error
              )
            } else {
              curriculumSubjects.push(
                data
              )

              stats.curriculumLinksCreated++
            }
          }
        }

        /*
         * ---------------------------------------
         * NEEDS REVIEW COUNT
         * ---------------------------------------
         */

        let needsReview = false

        if (
          !subject ||
          !yearLevel ||
          !section
        ) {
          needsReview = true
        }

        if (
          facultyName &&
          !facultyProfile
        ) {
          needsReview = true
        }

        if (
          roomCode &&
          !room
        ) {
          needsReview = true
        }

        if (
          record.room_type &&
          !roomType
        ) {
          needsReview = true
        }

        if (
          !activeCurriculum &&
          (
            record.year_level ||
            record.semester
          )
        ) {
          needsReview = true
        }

        if (
          record.status ===
          'incomplete'
        ) {
          needsReview = true
        }

        if (needsReview) {
          stats.needsReview++
        }
      } catch (rowError) {
        console.error(
          `Import row ${record.rowNumber} failed:`,
          rowError
        )

        stats.skipped++
      }
    }

    /*
     * -------------------------------------------------------
     * RESULT
     * -------------------------------------------------------
     */

    return redirectResult(
      request,
      {
        success: 'import_complete',

        subjects_created:
          stats.subjectsCreated,

        subjects_updated:
          stats.subjectsUpdated,

        sections_created:
          stats.sectionsCreated,

        faculty_updated:
          stats.facultyUpdated,

        qualifications_created:
          stats.facultyQualificationsCreated,

        rooms_created:
          stats.roomsCreated,

        rooms_updated:
          stats.roomsUpdated,

        curriculum_links:
          stats.curriculumLinksCreated,

        needs_review:
          stats.needsReview,

        skipped:
          stats.skipped,
      }
    )
  } catch (error) {
    console.error(
      'AlterSched confirm import failed:',
      error
    )

    return redirectResult(
      request,
      {
        error:
          'database_import_failed',
      }
    )
  }
}
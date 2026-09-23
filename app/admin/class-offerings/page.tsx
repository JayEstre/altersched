import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

import {
  PageHead,
  Stat,
  Empty,
  Badge,
} from '@/components/ui'

import {
  prepareClassOfferings,
  assignFacultyToOffering,
  unassignFacultyFromOffering,
} from './actions'

type SearchParams = Promise<{
  success?: string
  error?: string
  created?: string
}>

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const s = await createClient()
  const params = await searchParams

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const [
    offeringsResult,
    semestersResult,
    programsResult,
    curriculaResult,
    mappingsResult,
    sectionsResult,
    facultyResult,
    facultySubjectsResult,
  ] = await Promise.all([
    s
      .from('class_offerings')
      .select(`
        id,
        semester_id,
        section_id,
        subject_id,
        required_weekly_hours,
        expected_students,
        status,
        faculty_id,
        subjects (
          code,
          name
        ),
        sections (
          code
        ),
        faculty_profiles (
          employee_id,
          profiles (
            full_name
          )
        )
      `)
      .order('created_at', {
        ascending: false,
      }),

    s
      .from('semesters')
      .select(`
        id,
        name,
        is_active,
        academic_years (
          name
        )
      `)
      .order('start_date', {
        ascending: false,
      }),

    s
      .from('programs')
      .select(`
        id,
        code,
        name,
        is_active
      `)
      .eq('is_active', true)
      .order('code'),

    s
      .from('curricula')
      .select(`
        id,
        program_id,
        name,
        is_active
      `)
      .eq('is_active', true),

    s
      .from('curriculum_subjects')
      .select(`
        id,
        curriculum_id,
        subject_id,
        year_level_id,
        term_order,
        weekly_hours
      `),

    s
      .from('sections')
      .select(`
        id,
        year_level_id,
        code,
        is_active
      `)
      .eq('is_active', true),

    s.from('faculty_profiles').select(`id,employee_id,department_id,profiles(full_name),departments(code)`),
    s.from('faculty_subjects').select(`id,faculty_id,subject_id`),
  ])

  /* =====================================================
     NORMALIZE DATA
  ===================================================== */

  const offerings =
    offeringsResult.data ?? []

  const semesters =
    semestersResult.data ?? []

  const programs =
    programsResult.data ?? []

  const curricula =
    curriculaResult.data ?? []

  const mappings =
    mappingsResult.data ?? []

  const sections =
    sectionsResult.data ?? []

  const facultyRecords = facultyResult.data ?? []
  const facultySubjects = facultySubjectsResult.data ?? []

  /* =====================================================
     STATS
  ===================================================== */

  const assignedCount =
    offerings.filter(
      (offering: any) =>
        Boolean(
          offering.faculty_id
        )
    ).length

  const unassignedCount =
    offerings.length -
    assignedCount

  const draftCount =
    offerings.filter(
      (offering: any) =>
        String(
          offering.status
        ).toLowerCase() ===
        'draft'
    ).length

  /* =====================================================
     ACTIVE SEMESTER
  ===================================================== */

  const activeSemester =
    semesters.find(
      (semester: any) =>
        semester.is_active
    ) ?? null

  /* =====================================================
     PREPARATION READINESS
  ===================================================== */

  const hasSemester =
    semesters.length > 0

  const hasPrograms =
    programs.length > 0

  const hasCurricula =
    curricula.length > 0

  const hasMappings =
    mappings.length > 0

  const hasSections =
    sections.length > 0

  const preparationReady =
    hasSemester &&
    hasPrograms &&
    hasCurricula &&
    hasMappings &&
    hasSections

  /* =====================================================
     SUCCESS MESSAGES
  ===================================================== */

  const successMessages: Record<
    string,
    string
  > = {
    offerings_prepared:
      params.created
        ? `${params.created} Class Offering${
            Number(
              params.created
            ) === 1
              ? ''
              : 's'
          } prepared successfully.`
        : 'Class Offerings prepared successfully.',

    offerings_already_prepared:
      'The required Class Offerings are already prepared. No duplicate records were created.',
    faculty_assigned: 'Faculty assigned successfully.',
    faculty_unassigned: 'Faculty assignment removed successfully.',
  }

  /* =====================================================
     ERROR MESSAGES
  ===================================================== */

  const errorMessages: Record<
    string,
    string
  > = {
    semester_required:
      'Please select a Semester.',

    semester_not_found:
      'The selected Semester could not be found.',

    semester_term_unknown:
      'AlterSched could not determine whether the selected Semester is the 1st or 2nd Semester.',

    curricula_load_failed:
      'AlterSched could not load the active curricula.',

    no_active_curricula:
      'No active curriculum is available for the selected Program scope.',

    mappings_load_failed:
      'AlterSched could not load the Curriculum Subject mappings.',

    no_curriculum_subjects:
      'No Subjects are mapped to the selected Semester and Program scope.',

    sections_load_failed:
      'AlterSched could not load the active Blocks.',

    no_active_sections:
      'No active Blocks exist for the Year Levels included in the selected curriculum.',

    invalid_mapping_hours:
      'One or more Curriculum Subject mappings have invalid Weekly Hours.',

    no_offerings_required:
      'No Class Offerings are required for the selected Semester and Program scope.',

    existing_offerings_load_failed:
      'AlterSched could not check the existing Class Offerings.',

    offerings_create_failed:
      'The Class Offerings could not be created.',
    assignment_required: 'Select an offering and Faculty member.',
    offering_not_found: 'The Class Offering was not found.',
    faculty_not_qualified: 'That Faculty member is not qualified for this Subject.',
    assignment_failed: 'Faculty assignment could not be saved.',
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <>
      <PageHead
        eyebrow="SCHEDULING INPUT"
        title="Class Offerings"
        description="Automatically prepare the teaching requirements AlterSched will use to generate the Master Schedule."
      />

      {/* =================================================
          STATS
      ================================================== */}

      <div className="stats-grid">
        <Stat
          label="Class Offerings"
          value={offerings.length}
        />

        <Stat
          label="Faculty Assigned"
          value={assignedCount}
        />

        <Stat
          label="Unassigned"
          value={unassignedCount}
        />

        <Stat
          label="Draft"
          value={draftCount}
        />
      </div>

      {/* =================================================
          SUCCESS
      ================================================== */}

      {params.success && (
        <div className="sched-alert sched-alert-success">
          <div>
            <strong>
              Success
            </strong>

            <span>
              {successMessages[
                params.success
              ] ??
                'Operation completed successfully.'}
            </span>
          </div>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================== */}

      {params.error && (
        <div className="sched-alert sched-alert-danger">
          <div>
            <strong>
              Action failed
            </strong>

            <span>
              {errorMessages[
                params.error
              ] ??
                'The requested operation could not be completed.'}
            </span>
          </div>
        </div>
      )}

      {/* =================================================
          AUTOMATIC PREPARATION
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              AUTOMATIC PREPARATION
            </span>

            <h3>
              Prepare Class Offerings
            </h3>

            <p>
              AlterSched reads the active
              Curriculum, Year Levels,
              Blocks, and Subjects and
              creates the required teaching
              requirements automatically.
            </p>
          </div>

          <Badge
            tone={
              offerings.length
                ? 'success'
                : preparationReady
                  ? 'success'
                  : 'warning'
            }
          >
            {offerings.length
              ? `${offerings.length} Ready`
              : preparationReady
                ? 'Ready to Prepare'
                : 'Setup Required'}
          </Badge>
        </div>

        <div className="sched-section-body">
          <div className="generator-layout">
            {/* =============================================
                GENERATOR MAIN
            ============================================== */}

            <div className="generator-main">
              <div className="sched-info">
                <div className="sched-info-icon">
                  A
                </div>

                <div>
                  <strong>
                    Automatic preparation
                  </strong>

                  <p>
                    Choose the Semester and
                    Program scope. AlterSched
                    will read the matching
                    Curriculum and create the
                    required Subject × Block
                    Class Offerings.
                  </p>
                </div>
              </div>

              {/* ===========================================
                  REAL PREPARATION FORM
              ============================================ */}

              <form
                action={
                  prepareClassOfferings
                }
                className="sched-form"
                style={{
                  marginTop: 18,
                }}
              >
                <div className="sched-form-grid">
                  {/* =======================================
                      SEMESTER
                  ======================================== */}

                  <div className="sched-field">
                    <label htmlFor="semester_id">
                      Semester
                    </label>

                    <select
                      id="semester_id"
                      name="semester_id"
                      defaultValue={
                        activeSemester?.id ??
                        ''
                      }
                      required
                    >
                      {!semesters.length && (
                        <option value="">
                          No Semesters Available
                        </option>
                      )}

                      {semesters.map(
                        (
                          semester: any
                        ) => {
                          const ay =
                            Array.isArray(
                              semester.academic_years
                            )
                              ? semester
                                  .academic_years[0]
                              : semester.academic_years

                          return (
                            <option
                              key={
                                semester.id
                              }
                              value={
                                semester.id
                              }
                            >
                              {
                                semester.name
                              }

                              {ay?.name
                                ? ` — ${ay.name}`
                                : ''}

                              {semester.is_active
                                ? ' (Active)'
                                : ''}
                            </option>
                          )
                        }
                      )}
                    </select>

                    <small>
                      Curriculum term used
                      for preparation.
                    </small>
                  </div>

                  {/* =======================================
                      PROGRAM SCOPE
                  ======================================== */}

                  <div className="sched-field">
                    <label htmlFor="program_id">
                      Program Scope
                    </label>

                    <select
                      id="program_id"
                      name="program_id"
                      defaultValue=""
                    >
                      <option value="">
                        All Programs
                      </option>

                      {programs.map(
                        (
                          program: any
                        ) => (
                          <option
                            key={
                              program.id
                            }
                            value={
                              program.id
                            }
                          >
                            {program.code}
                            {' — '}
                            {program.name}
                          </option>
                        )
                      )}
                    </select>

                    <small>
                      Prepare the whole
                      school or one Program
                      only.
                    </small>
                  </div>
                </div>

                <div className="sched-form-actions">
                  <button
                    type="submit"
                    className="sched-primary-btn"
                    disabled={
                      !preparationReady
                    }
                  >
                    Prepare Class Offerings
                  </button>

                  <Link
                    href="/admin/subjects"
                    className="sched-secondary-btn"
                  >
                    Review Curriculum
                  </Link>
                </div>

                {!preparationReady && (
                  <small className="muted">
                    Complete the missing
                    preparation requirements
                    before generating Class
                    Offerings.
                  </small>
                )}

                {preparationReady && (
                  <small className="muted">
                    Preparation is ready.
                    Existing Class Offerings
                    will be preserved and
                    duplicates will be
                    skipped automatically.
                  </small>
                )}
              </form>
            </div>

            {/* =============================================
                REQUIREMENTS
            ============================================== */}

            <aside className="generator-side">
              <div className="generator-card">
                <h4>
                  Preparation Requirements
                </h4>

                <p>
                  These records must exist
                  before automatic
                  preparation can run.
                </p>

                <div className="generator-status">
                  <div className="generator-status-row">
                    <span>
                      Semesters
                    </span>

                    <strong>
                      {semesters.length}
                    </strong>
                  </div>

                  <div className="generator-status-row">
                    <span>
                      Programs
                    </span>

                    <strong>
                      {programs.length}
                    </strong>
                  </div>

                  <div className="generator-status-row">
                    <span>
                      Active Curricula
                    </span>

                    <strong>
                      {curricula.length}
                    </strong>
                  </div>

                  <div className="generator-status-row">
                    <span>
                      Subject Mappings
                    </span>

                    <strong>
                      {mappings.length}
                    </strong>
                  </div>

                  <div className="generator-status-row">
                    <span>
                      Active Blocks
                    </span>

                    <strong>
                      {sections.length}
                    </strong>
                  </div>

                  <div className="generator-status-row">
                    <span>
                      Class Offerings
                    </span>

                    <strong>
                      {offerings.length}
                    </strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* ===============================================
              FLOW
          ================================================ */}

          <div className="sched-steps">
            <div className="sched-step">
              <div className="sched-step-number">
                01
              </div>

              <h4>
                Curriculum
              </h4>

              <p>
                Reads Subjects assigned
                to each Year Level and
                Semester.
              </p>
            </div>

            <div className="sched-step">
              <div className="sched-step-number">
                02
              </div>

              <h4>
                Blocks
              </h4>

              <p>
                Finds every active Block
                belonging to the
                applicable Year Level.
              </p>
            </div>

            <div className="sched-step">
              <div className="sched-step-number">
                03
              </div>

              <h4>
                Offerings
              </h4>

              <p>
                Creates Subject × Block
                teaching requirements
                automatically.
              </p>
            </div>

            <div className="sched-step">
              <div className="sched-step-number">
                04
              </div>

              <h4>
                Scheduling
              </h4>

              <p>
                Prepared offerings become
                inputs for the Master
                Generator.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          OFFERINGS DIRECTORY
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              TEACHING REQUIREMENTS
            </span>

            <h3>
              Prepared Class Offerings
            </h3>

            <p>
              These are the actual
              scheduling inputs that will
              later receive a Faculty
              member, Room, day, and time.
            </p>
          </div>

          <Badge>
            {offerings.length}
            {' Total'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {offerings.length ? (
            <div className="offering-table-wrap">
              <table className="offering-table">
                <thead>
                  <tr>
                    <th>
                      Subject
                    </th>

                    <th>
                      Block
                    </th>

                    <th>
                      Faculty
                    </th>

                    <th>
                      Weekly Hours
                    </th>

                    <th>
                      Students
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {offerings.map(
                    (
                      offering: any
                    ) => {
                      const subject =
                        Array.isArray(
                          offering.subjects
                        )
                          ? offering
                              .subjects[0]
                          : offering.subjects

                      const section =
                        Array.isArray(
                          offering.sections
                        )
                          ? offering
                              .sections[0]
                          : offering.sections

                      const faculty =
                        Array.isArray(
                          offering
                            .faculty_profiles
                        )
                          ? offering
                              .faculty_profiles[0]
                          : offering
                              .faculty_profiles

                      const profile =
                        Array.isArray(
                          faculty?.profiles
                        )
                          ? faculty
                              ?.profiles[0]
                          : faculty?.profiles

                      return (
                        <tr
                          key={
                            offering.id
                          }
                        >
                          <td>
                            <strong>
                              {subject?.code ??
                                '—'}
                            </strong>

                            {subject?.name && (
                              <div
                                className="muted"
                                style={{
                                  marginTop: 3,
                                  fontSize: 9,
                                }}
                              >
                                {
                                  subject.name
                                }
                              </div>
                            )}
                          </td>

                          <td>
                            {section?.code ??
                              '—'}
                          </td>

                          <td>
                            <form action={assignFacultyToOffering} style={{display:'flex',gap:8,alignItems:'center',minWidth:260}}>
                              <input type="hidden" name="offering_id" value={offering.id} />
                              <select name="faculty_id" defaultValue={offering.faculty_id ?? ''} required style={{minWidth:160}}>
                                <option value="">Select Faculty</option>
                                {facultyRecords
                                  .filter((f:any) => facultySubjects.some((q:any) => q.faculty_id === f.id && q.subject_id === offering.subject_id))
                                  .map((f:any) => {
                                    const fp = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
                                    return <option key={f.id} value={f.id}>{fp?.full_name || f.employee_id}</option>
                                  })}
                              </select>
                              <button className="sched-primary-btn" type="submit">Save</button>
                            </form>
                            {offering.faculty_id && (
                              <form action={unassignFacultyFromOffering} style={{marginTop:6}}>
                                <input type="hidden" name="offering_id" value={offering.id} />
                                <button className="sched-secondary-btn" type="submit">Unassign</button>
                              </form>
                            )}
                            {!offering.faculty_id && !facultyRecords.some((f:any) => facultySubjects.some((q:any) => q.faculty_id === f.id && q.subject_id === offering.subject_id)) && (
                              <small className="muted">No qualified Faculty yet</small>
                            )}
                          </td>

                          <td>
                            {
                              offering.required_weekly_hours
                            }
                          </td>

                          <td>
                            {offering.expected_students ??
                              '—'}
                          </td>

                          <td>
                            <Badge>
                              {
                                offering.status
                              }
                            </Badge>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No Class Offerings have been prepared yet." />
          )}
        </div>
      </section>
    </>
  )
}
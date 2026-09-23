import { createClient } from '@/lib/supabase/server'

import {
  PageHead,
  Stat,
  Empty,
  Badge,
} from '@/components/ui'

import CurriculumSubjectMappingForm from '@/components/curriculum-subject-mapping-form'

import {
  createSubject,
  createCurriculum,
  addCurriculumSubject,
} from './actions'

type SearchParams = Promise<{
  success?: string
  error?: string
  details?: string
}>

function firstRelation(value: any) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const params = await searchParams

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const [
    subjectsResult,
    curriculaResult,
    curriculumSubjectsResult,
    programsResult,
    yearLevelsResult,
    roomTypesResult,
    departmentsResult,
  ] = await Promise.all([
    supabase
      .from('subjects')
      .select(`
        id,
        department_id,
        code,
        name,
        units,
        lecture_hours,
        lab_hours,
        description,
        is_active
      `)
      .eq('is_active', true)
      .order('code'),

    supabase
      .from('curricula')
      .select(`
        id,
        program_id,
        name,
        effective_from_year,
        effective_to_year,
        is_active,
        programs (
          id,
          code,
          name
        )
      `)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('curriculum_subjects')
      .select(`
        id,
        curriculum_id,
        subject_id,
        year_level_id,
        term_order,
        required_room_type_id,
        weekly_hours,
        subjects (
          id,
          code,
          name,
          units
        ),
        year_levels (
          id,
          name
        ),
        room_types (
          id,
          name
        )
      `)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('programs')
      .select(`
        id,
        code,
        name,
        is_active
      `)
      .eq('is_active', true)
      .order('code'),

    supabase
      .from('year_levels')
      .select(`
        id,
        program_id,
        name
      `)
      .order('name'),

    supabase
      .from('room_types')
      .select(`
        id,
        name
      `)
      .order('name'),

    supabase
      .from('departments')
      .select(`
        id,
        code,
        name,
        is_active
      `)
      .eq('is_active', true)
      .order('code'),
  ])

  /* =====================================================
     NORMALIZE DATA
  ===================================================== */

  const subjects =
    subjectsResult.data ?? []

  const curricula =
    curriculaResult.data ?? []

  const curriculumSubjects =
    curriculumSubjectsResult.data ?? []

  const programs =
    programsResult.data ?? []

  const yearLevels =
    yearLevelsResult.data ?? []

  const roomTypes =
    roomTypesResult.data ?? []

  const departments =
    departmentsResult.data ?? []

  const activeCurricula =
    curricula.filter(
      (curriculum: any) =>
        curriculum.is_active
    )

  const activeCurriculumProgramIds =
    new Set(
      activeCurricula.map(
        (curriculum: any) =>
          curriculum.program_id
      )
    )

  const programsMissingCurriculum =
    programs.filter(
      (program: any) =>
        !activeCurriculumProgramIds.has(
          program.id
        )
    )

  /* =====================================================
     PREPARE CLIENT MAPPING DATA
  ===================================================== */

  const mappingCurricula =
    activeCurricula.map(
      (curriculum: any) => {
        const program =
          firstRelation(
            curriculum.programs
          )

        return {
          id: curriculum.id,
          program_id:
            curriculum.program_id,
          name: curriculum.name,
          is_active:
            curriculum.is_active,
          program: program
            ? {
                id: program.id,
                code: program.code,
                name: program.name,
              }
            : null,
        }
      }
    )

  const mappingYearLevels =
    yearLevels.map(
      (yearLevel: any) => ({
        id: yearLevel.id,
        program_id:
          yearLevel.program_id,
        name: yearLevel.name,
      })
    )

  const mappingSubjects =
    subjects.map(
      (subject: any) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        is_active:
          subject.is_active,
      })
    )

  const mappingRoomTypes =
    roomTypes.map(
      (roomType: any) => ({
        id: roomType.id,
        name: roomType.name,
      })
    )

  /* =====================================================
     MESSAGES
  ===================================================== */

  const successMessages: Record<
    string,
    string
  > = {
    subject_created:
      'Subject created successfully.',

    curriculum_created:
      'Curriculum created successfully.',

    subject_mapped:
      'Subject successfully added to the curriculum.',
  }

  const errorMessages: Record<
    string,
    string
  > = {
    subject_fields_required:
      'Please complete all required Subject fields.',

    invalid_subject_units:
      'Please enter valid Subject units.',

    invalid_lecture_hours:
      'Please enter valid lecture hours.',

    invalid_lab_hours:
      'Please enter valid laboratory hours.',

    subject_hours_required:
      'A Subject must have at least Lecture Hours or Laboratory Hours.',

    department_not_found:
      'The selected Department could not be found.',

    department_inactive:
      'The selected Department is inactive.',

    department_lookup_failed:
      'AlterSched could not verify the selected Department.',

    subject_check_failed:
      'AlterSched could not check the existing Subject.',

    duplicate_subject_code:
      'A Subject with this code already exists in the selected Department.',

    subject_create_failed:
      'The Subject could not be created.',

    missing_fields:
      'Please complete all required curriculum fields.',

    invalid_year:
      'Please enter a valid effective year.',

    invalid_year_range:
      'Effective Until cannot be earlier than Effective From.',

    program_not_found:
      'The selected Program could not be found.',

    program_inactive:
      'The selected Program is inactive.',

    program_lookup_failed:
      'AlterSched could not verify the selected Program.',

    duplicate_curriculum:
      'The selected Program already has an active curriculum.',

    curriculum_check_failed:
      'AlterSched could not check the existing curriculum.',

    curriculum_create_failed:
      'The curriculum could not be created.',

    mapping_fields_required:
      'Please complete all required Subject Mapping fields.',

    invalid_term:
      'Please select a valid Semester.',

    invalid_weekly_hours:
      'Please enter valid weekly hours.',

    curriculum_not_found:
      'The selected Curriculum could not be found.',

    curriculum_inactive:
      'The selected Curriculum is inactive.',

    curriculum_lookup_failed:
      'AlterSched could not verify the selected Curriculum.',

    subject_not_found:
      'The selected Subject could not be found.',

    subject_inactive:
      'The selected Subject is inactive.',

    subject_lookup_failed:
      'AlterSched could not verify the selected Subject.',

    year_level_not_found:
      'The selected Year Level could not be found.',

    year_level_lookup_failed:
      'AlterSched could not verify the selected Year Level.',

    year_level_program_mismatch:
      'The selected Year Level does not belong to the Curriculum Program.',

    room_type_not_found:
      'The selected Room Type could not be found.',

    room_type_lookup_failed:
      'AlterSched could not verify the selected Room Type.',

    mapping_check_failed:
      'AlterSched could not check the existing Subject Mapping.',

    subject_already_mapped:
      'This Subject is already mapped to that Year Level and Semester.',

    mapping_create_failed:
      'The Subject Mapping could not be saved.',
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <>
      <PageHead
        eyebrow="CURRICULUM"
        title="Subjects & Curriculum"
        description="Create Subjects, define Program curricula, and map Subjects by Year Level and Semester for automatic Class Offering preparation."
      />

      {/* =================================================
          STATS
      ================================================== */}

      <div className="stats-grid">
        <Stat
          label="Subjects"
          value={subjects.length}
        />

        <Stat
          label="Curricula"
          value={curricula.length}
        />

        <Stat
          label="Subject Mappings"
          value={curriculumSubjects.length}
        />

        <Stat
          label="Programs Missing Curriculum"
          value={programsMissingCurriculum.length}
        />
      </div>

      {/* =================================================
          SUCCESS MESSAGE
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
          ERROR MESSAGE
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

            {params.details && (
              <span
                style={{
                  marginTop: 6,
                  display: 'block',
                  opacity: 0.8,
                  fontSize: 12,
                }}
              >
                Database details:{' '}
                {params.details}
              </span>
            )}
          </div>
        </div>
      )}

      {/* =================================================
          CREATE SUBJECT
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              SUBJECT CATALOG
            </span>

            <h3>
              Create Subject
            </h3>

            <p>
              Add Subjects to the AlterSched
              catalog before assigning them
              to a Program curriculum.
            </p>
          </div>

          <Badge
            tone={
              departments.length
                ? 'success'
                : 'warning'
            }
          >
            {departments.length
              ? `${departments.length} Departments`
              : 'Setup Required'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {departments.length === 0 ? (
            <Empty text="Create an active Department in Academic Setup before creating Subjects." />
          ) : (
            <>
              <div className="sched-info">
                <div className="sched-info-icon">
                  S
                </div>

                <div>
                  <strong>
                    Subject information
                  </strong>

                  <p>
                    Create the Subject first.
                    Afterward, assign it to a
                    curriculum, Year Level,
                    and Semester below.
                  </p>
                </div>
              </div>

              <form
                action={createSubject}
                className="sched-form"
                style={{
                  marginTop: 18,
                }}
              >
                <div className="sched-form-grid">
                  <div className="sched-field">
                    <label htmlFor="department_id">
                      Department
                    </label>

                    <select
                      id="department_id"
                      name="department_id"
                      defaultValue=""
                      required
                    >
                      <option
                        value=""
                        disabled
                      >
                        Select Department
                      </option>

                      {departments.map(
                        (department: any) => (
                          <option
                            key={department.id}
                            value={department.id}
                          >
                            {department.code}
                            {' — '}
                            {department.name}
                          </option>
                        )
                      )}
                    </select>

                    <small>
                      Department responsible
                      for this Subject.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="code">
                      Subject Code
                    </label>

                    <input
                      id="code"
                      name="code"
                      type="text"
                      placeholder="Subject code"
                      autoComplete="off"
                      required
                    />

                    <small>
                      Official Subject code.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="subject_name">
                      Subject Name
                    </label>

                    <input
                      id="subject_name"
                      name="subject_name"
                      type="text"
                      placeholder="Subject name"
                      autoComplete="off"
                      required
                    />

                    <small>
                      Official Subject title.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="units">
                      Units
                    </label>

                    <input
                      id="units"
                      name="units"
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      placeholder="Example: 3"
                      required
                    />

                    <small>
                      Academic units of the
                      Subject.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="lecture_hours">
                      Lecture Hours
                    </label>

                    <input
                      id="lecture_hours"
                      name="lecture_hours"
                      type="number"
                      min="0"
                      max="40"
                      step="0.5"
                      placeholder="Example: 3"
                      required
                    />

                    <small>
                      Enter the required
                      lecture hours per week.
                      Use 0 if the Subject has
                      no lecture component.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="lab_hours">
                      Laboratory Hours
                    </label>

                    <input
                      id="lab_hours"
                      name="lab_hours"
                      type="number"
                      min="0"
                      max="40"
                      step="0.5"
                      placeholder="Example: 3"
                      required
                    />

                    <small>
                      Enter the required
                      laboratory hours per
                      week. Use 0 if the
                      Subject has no
                      laboratory component.
                    </small>
                  </div>

                  <div
                    className="sched-field"
                    style={{
                      gridColumn: '1 / -1',
                    }}
                  >
                    <label htmlFor="description">
                      Description
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      placeholder="Optional Subject description"
                    />

                    <small>
                      Optional additional
                      information about the
                      Subject.
                    </small>
                  </div>
                </div>

                <div className="sched-form-actions">
                  <button
                    type="submit"
                    className="sched-primary-btn"
                  >
                    Create Subject
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      {/* =================================================
          CREATE CURRICULUM
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              PROGRAM CURRICULUM
            </span>

            <h3>
              Create Curriculum
            </h3>

            <p>
              Create one active curriculum
              for every Program before
              preparing its Class Offerings.
            </p>
          </div>

          <Badge
            tone={
              programsMissingCurriculum.length
                ? 'warning'
                : 'success'
            }
          >
            {programsMissingCurriculum.length
              ? `${programsMissingCurriculum.length} Missing`
              : 'Complete'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {programsMissingCurriculum.length >
          0 ? (
            <>
              <div className="sched-info">
                <div className="sched-info-icon">
                  A
                </div>

                <div>
                  <strong>
                    Curriculum setup
                  </strong>

                  <p>
                    Select a Program and
                    define the curriculum
                    that AlterSched will use
                    for scheduling.
                  </p>
                </div>
              </div>

              <form
                action={createCurriculum}
                className="sched-form"
                style={{
                  marginTop: 18,
                }}
              >
                <div className="sched-form-grid">
                  <div className="sched-field">
                    <label htmlFor="program_id">
                      Program
                    </label>

                    <select
                      id="program_id"
                      name="program_id"
                      defaultValue=""
                      required
                    >
                      <option
                        value=""
                        disabled
                      >
                        Select Program
                      </option>

                      {programsMissingCurriculum.map(
                        (program: any) => (
                          <option
                            key={program.id}
                            value={program.id}
                          >
                            {program.code}
                            {' — '}
                            {program.name}
                          </option>
                        )
                      )}
                    </select>

                    <small>
                      Program that owns this
                      curriculum.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="name">
                      Curriculum Name
                    </label>

                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Example: Program Curriculum"
                      required
                    />

                    <small>
                      Use a clear curriculum
                      version name.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="effective_from_year">
                      Effective From
                    </label>

                    <input
                      id="effective_from_year"
                      name="effective_from_year"
                      type="number"
                      min="2000"
                      max="2100"
                      step="1"
                      placeholder="Effective year"
                      required
                    />

                    <small>
                      Starting academic year.
                    </small>
                  </div>

                  <div className="sched-field">
                    <label htmlFor="effective_to_year">
                      Effective Until
                    </label>

                    <input
                      id="effective_to_year"
                      name="effective_to_year"
                      type="number"
                      min="2000"
                      max="2100"
                      step="1"
                      placeholder="Optional"
                    />

                    <small>
                      Leave empty for the
                      current curriculum.
                    </small>
                  </div>
                </div>

                <div className="sched-form-actions">
                  <button
                    type="submit"
                    className="sched-primary-btn"
                  >
                    Create Curriculum
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="sched-info">
              <div className="sched-info-icon">
                ✓
              </div>

              <div>
                <strong>
                  Curriculum setup complete
                </strong>

                <p>
                  All active Programs have
                  an active curriculum.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          ADD SUBJECT TO CURRICULUM
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              SUBJECT MAPPING
            </span>

            <h3>
              Add Subject to Curriculum
            </h3>

            <p>
              Assign a Subject to its
              Curriculum, Year Level and
              Semester. This mapping becomes
              an input for automatic Class
              Offering preparation.
            </p>
          </div>

          <Badge
            tone={
              activeCurricula.length
                ? 'success'
                : 'warning'
            }
          >
            {activeCurricula.length}
            {' Active'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {activeCurricula.length === 0 ? (
            <Empty text="Create an active curriculum before adding Subject mappings." />
          ) : subjects.length === 0 ? (
            <Empty text="No active Subjects are available for mapping." />
          ) : yearLevels.length === 0 ? (
            <Empty text="No Year Levels are available for mapping." />
          ) : (
            <>
              <div className="sched-info">
                <div className="sched-info-icon">
                  M
                </div>

                <div>
                  <strong>
                    Curriculum Subject Mapping
                  </strong>

                  <p>
                    Select a Curriculum first.
                    AlterSched will then show
                    only the Year Levels that
                    belong to that Program.
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                }}
              >
                <CurriculumSubjectMappingForm
                  curricula={
                    mappingCurricula
                  }
                  yearLevels={
                    mappingYearLevels
                  }
                  subjects={
                    mappingSubjects
                  }
                  roomTypes={
                    mappingRoomTypes
                  }
                  action={
                    addCurriculumSubject
                  }
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* =================================================
          CURRENT SUBJECT MAPPINGS
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              CURRICULUM CONTENT
            </span>

            <h3>
              Current Subject Mappings
            </h3>

            <p>
              Subjects currently assigned
              to curricula by Year Level and
              Semester.
            </p>
          </div>

          <Badge>
            {curriculumSubjects.length}
            {' Mapped'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {curriculumSubjects.length ? (
            <div className="offering-table-wrap">
              <table className="offering-table">
                <thead>
                  <tr>
                    <th>
                      Curriculum
                    </th>

                    <th>
                      Subject
                    </th>

                    <th>
                      Year Level
                    </th>

                    <th>
                      Semester
                    </th>

                    <th>
                      Weekly Hours
                    </th>

                    <th>
                      Room Type
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {curriculumSubjects.map(
                    (mapping: any) => {
                      const curriculum =
                        curricula.find(
                          (
                            item: any
                          ) =>
                            item.id ===
                            mapping.curriculum_id
                        )

                      const program =
                        firstRelation(
                          curriculum?.programs
                        )

                      const subject =
                        firstRelation(
                          mapping.subjects
                        )

                      const yearLevel =
                        firstRelation(
                          mapping.year_levels
                        )

                      const roomType =
                        firstRelation(
                          mapping.room_types
                        )

                      return (
                        <tr
                          key={
                            mapping.id
                          }
                        >
                          <td>
                            <strong>
                              {program?.code ??
                                '—'}
                            </strong>

                            <div
                              className="muted"
                              style={{
                                marginTop: 3,
                                fontSize: 11,
                              }}
                            >
                              {curriculum?.name ??
                                'Unknown Curriculum'}
                            </div>
                          </td>

                          <td>
                            <strong>
                              {subject?.code ??
                                '—'}
                            </strong>

                            <div
                              className="muted"
                              style={{
                                marginTop: 3,
                                fontSize: 11,
                              }}
                            >
                              {subject?.name ??
                                'Unknown Subject'}
                            </div>
                          </td>

                          <td>
                            {yearLevel?.name ??
                              '—'}
                          </td>

                          <td>
                            {mapping.term_order ===
                            1
                              ? '1st Semester'
                              : mapping.term_order ===
                                  2
                                ? '2nd Semester'
                                : `Term ${mapping.term_order}`}
                          </td>

                          <td>
                            {
                              mapping.weekly_hours
                            }
                          </td>

                          <td>
                            {roomType?.name ??
                              'Any'}
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No Subjects have been mapped to a curriculum yet." />
          )}
        </div>
      </section>

      {/* =================================================
          PROGRAM CURRICULA
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              CURRICULUM DIRECTORY
            </span>

            <h3>
              Program Curricula
            </h3>

            <p>
              Active and historical
              curricula configured in
              AlterSched.
            </p>
          </div>

          <Badge>
            {curricula.length}
            {' Total'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {curricula.length ? (
            <div className="curriculum-grid">
              {curricula.map(
                (curriculum: any) => {
                  const program =
                    firstRelation(
                      curriculum.programs
                    )

                  const mappingCount =
                    curriculumSubjects.filter(
                      (mapping: any) =>
                        mapping.curriculum_id ===
                        curriculum.id
                    ).length

                  return (
                    <article
                      key={
                        curriculum.id
                      }
                      className="curriculum-card"
                    >
                      <div className="curriculum-card-top">
                        <span className="curriculum-program">
                          {program?.code ??
                            'PROGRAM'}
                        </span>

                        <Badge
                          tone={
                            curriculum.is_active
                              ? 'success'
                              : 'default'
                          }
                        >
                          {curriculum.is_active
                            ? 'Active'
                            : 'Inactive'}
                        </Badge>
                      </div>

                      <h4>
                        {curriculum.name}
                      </h4>

                      <p>
                        {program?.name ??
                          'Program unavailable'}
                      </p>

                      <div className="curriculum-meta">
                        <span>
                          Effective

                          <strong
                            style={{
                              display:
                                'block',
                              marginTop: 4,
                            }}
                          >
                            {curriculum.effective_from_year ??
                              '—'}
                            {' — '}
                            {curriculum.effective_to_year ??
                              'Present'}
                          </strong>
                        </span>

                        <span>
                          Subjects

                          <strong
                            style={{
                              display:
                                'block',
                              marginTop: 4,
                            }}
                          >
                            {mappingCount}
                          </strong>
                        </span>
                      </div>
                    </article>
                  )
                }
              )}
            </div>
          ) : (
            <Empty text="No curricula have been created yet." />
          )}
        </div>
      </section>

      {/* =================================================
          SUBJECT CATALOG
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              SUBJECT DIRECTORY
            </span>

            <h3>
              Subject Catalog
            </h3>

            <p>
              Active Subjects available
              for curriculum mapping.
            </p>
          </div>

          <Badge>
            {subjects.length}
            {' Subjects'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {subjects.length ? (
            <div className="offering-table-wrap">
              <table className="offering-table">
                <thead>
                  <tr>
                    <th>
                      Department
                    </th>

                    <th>
                      Code
                    </th>

                    <th>
                      Subject
                    </th>

                    <th>
                      Units
                    </th>

                    <th>
                      Lecture
                    </th>

                    <th>
                      Laboratory
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {subjects.map(
                    (subject: any) => {
                      const department =
                        departments.find(
                          (
                            item: any
                          ) =>
                            item.id ===
                            subject.department_id
                        )

                      return (
                        <tr
                          key={
                            subject.id
                          }
                        >
                          <td>
                            <strong>
                              {department?.code ??
                                '—'}
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {subject.code}
                            </strong>
                          </td>

                          <td>
                            {subject.name}
                          </td>

                          <td>
                            {subject.units ??
                              '—'}
                          </td>

                          <td>
                            {subject.lecture_hours ??
                              '—'}
                          </td>

                          <td>
                            {subject.lab_hours ??
                              '—'}
                          </td>

                          <td>
                            <Badge tone="success">
                              Active
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
            <Empty text="No active Subjects are available." />
          )}
        </div>
      </section>

      {/* =================================================
          DATA FLOW
      ================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              AUTOMATIC SCHEDULING
            </span>

            <h3>
              AlterSched Data Flow
            </h3>

            <p>
              Subject and curriculum
              configuration becomes the
              foundation of the automatic
              Master Schedule.
            </p>
          </div>
        </div>

        <div className="sched-section-body">
          <div className="sched-steps">
            <div className="sched-step">
              <div className="sched-step-number">
                01
              </div>

              <h4>
                Subjects
              </h4>

              <p>
                Create the academic
                Subject catalog.
              </p>
            </div>

            <div className="sched-step">
              <div className="sched-step-number">
                02
              </div>

              <h4>
                Curriculum
              </h4>

              <p>
                Define the active
                curriculum for each
                Program.
              </p>
            </div>

            <div className="sched-step">
              <div className="sched-step-number">
                03
              </div>

              <h4>
                Subject Mapping
              </h4>

              <p>
                Assign Subjects by Year
                Level and Semester.
              </p>
            </div>

            <div className="sched-step">
              <div className="sched-step-number">
                04
              </div>

              <h4>
                Class Offerings
              </h4>

              <p>
                Prepare scheduling
                requirements for Program
                blocks.
              </p>
            </div>

            <div className="sched-step">
              <div className="sched-step-number">
                05
              </div>

              <h4>
                Master Schedule
              </h4>

              <p>
                Assign Faculty, Rooms,
                days, and times without
                conflicts.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
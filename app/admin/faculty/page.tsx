import { createClient } from '@/lib/supabase/server'
import {
  PageHead,
  Stat,
  Empty,
  Badge,
} from '@/components/ui'

import {
  createFacultyProfile,
  assignFacultySubject,
  removeFacultySubject,
  addFacultyAvailability,
  removeFacultyAvailability,
} from './actions'

/* =========================================================
   TYPES
========================================================= */

type SearchParams = {
  success?: string
  error?: string
  details?: string
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  account_status: string
}

type Department = {
  id: string
  code: string | null
  name: string
}

type Subject = {
  id: string
  department_id: string
  code: string
  name: string
  units: number
  lecture_hours: number
  lab_hours: number
  is_active: boolean
}

type FacultyProfile = {
  id: string
  profile_id: string
  employee_id: string
  department_id: string
  employment_type: string | null
  max_teaching_load: number | null
}

type FacultySubject = {
  id: string
  faculty_id: string
  subject_id: string
}

type Semester = {
  id: string
  name: string
  academic_year_id: string
  is_active: boolean
}

type AcademicYear = {
  id: string
  name: string
  is_active: boolean
}

type FacultyAvailability = {
  id: string
  faculty_id: string
  semester_id: string
  day_of_week: number
  start_time: string
  end_time: string
  availability_type:
    | 'available'
    | 'preferred'
    | 'unavailable'
}

/* =========================================================
   PAGE
========================================================= */

export default async function FacultyPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const supabase = await createClient()

  const params = searchParams
    ? await searchParams
    : {}

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const [
    profilesResult,
    departmentsResult,
    facultyResult,
    subjectsResult,
    facultySubjectsResult,
    semestersResult,
    academicYearsResult,
    availabilityResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        account_status
      `)
      .in('role', [
        'faculty',
        'department_scheduler',
      ])
      .eq('account_status', 'approved')
      .order('full_name'),

    supabase
      .from('departments')
      .select(`
        id,
        code,
        name
      `)
      .eq('is_active', true)
      .order('code'),

    supabase
      .from('faculty_profiles')
      .select(`
        id,
        profile_id,
        employee_id,
        department_id,
        employment_type,
        max_teaching_load
      `)
      .order('employee_id'),

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
        is_active
      `)
      .eq('is_active', true)
      .order('code'),

    supabase
      .from('faculty_subjects')
      .select(`
        id,
        faculty_id,
        subject_id
      `),

    supabase
      .from('semesters')
      .select(`
        id,
        name,
        academic_year_id,
        is_active
      `)
      .order('is_active', {
        ascending: false,
      }),

    supabase
      .from('academic_years')
      .select(`
        id,
        name,
        is_active
      `),

    supabase
      .from('faculty_availability')
      .select(`
        id,
        faculty_id,
        semester_id,
        day_of_week,
        start_time,
        end_time,
        availability_type
      `)
      .order('day_of_week')
      .order('start_time'),
  ])

  /* =======================================================
     NORMALIZE
  ======================================================= */

  const profiles =
    (profilesResult.data ??
      []) as Profile[]

  const departments =
    (departmentsResult.data ??
      []) as Department[]

  const faculty =
    (facultyResult.data ??
      []) as FacultyProfile[]

  const subjects =
    (subjectsResult.data ??
      []) as Subject[]

  const facultySubjects =
    (facultySubjectsResult.data ??
      []) as FacultySubject[]

  const semesters =
    (semestersResult.data ??
      []) as Semester[]

  const academicYears =
    (academicYearsResult.data ??
      []) as AcademicYear[]

  const availability =
    (availabilityResult.data ??
      []) as FacultyAvailability[]

  /* =======================================================
     AVAILABLE FACULTY ACCOUNTS

     Only approved Faculty/Schedulers without an existing
     faculty_profiles record should appear here.
  ======================================================= */

  const existingProfileIds =
    new Set(
      faculty.map(
        (item) => item.profile_id
      )
    )

  const facultyAccountsWithoutProfile =
    profiles.filter(
      (profile) =>
        !existingProfileIds.has(
          profile.id
        )
    )

  /* =======================================================
     COUNTS
  ======================================================= */

  const qualifiedCount =
    facultySubjects.length

  const availabilityCount =
    availability.length

  const activeSemester =
    semesters.find(
      (semester) =>
        semester.is_active
    ) ?? null

  /* =======================================================
     MESSAGES
  ======================================================= */

  const successMessages: Record<
    string,
    string
  > = {
    faculty_created:
      'Faculty profile created successfully.',

    faculty_subject_added:
      'Subject qualification added successfully.',

    faculty_subject_removed:
      'Subject qualification removed successfully.',

    availability_added:
      'Faculty availability added successfully.',

    availability_removed:
      'Faculty availability removed successfully.',
  }

  const errorMessages: Record<
    string,
    string
  > = {
    faculty_fields_required:
      'Faculty account, Employee ID, and Department are required.',

    invalid_teaching_load:
      'Enter a valid maximum teaching load.',

    faculty_account_lookup_failed:
      'The Faculty account could not be checked.',

    faculty_account_not_found:
      'The selected Faculty account was not found.',

    account_not_faculty:
      'The selected account is not a Faculty account.',

    faculty_not_approved:
      'The Faculty account must be approved first.',

    department_lookup_failed:
      'The selected Department could not be checked.',

    department_not_found:
      'The selected Department was not found.',

    department_inactive:
      'The selected Department is inactive.',

    faculty_check_failed:
      'AlterSched could not verify the Faculty record.',

    faculty_profile_exists:
      'This account already has a Faculty profile.',

    employee_check_failed:
      'AlterSched could not verify the Employee ID.',

    duplicate_employee_id:
      'That Employee ID is already assigned to another Faculty member.',

    faculty_create_failed:
      'The Faculty profile could not be created.',

    faculty_subject_required:
      'Select both a Faculty member and Subject.',

    faculty_lookup_failed:
      'The Faculty record could not be checked.',

    faculty_not_found:
      'The selected Faculty record was not found.',

    subject_lookup_failed:
      'The Subject could not be checked.',

    subject_not_found:
      'The selected Subject was not found.',

    subject_inactive:
      'The selected Subject is inactive.',

    subject_department_mismatch:
      'The Subject must belong to the same Department as the Faculty member.',

    faculty_subject_check_failed:
      'AlterSched could not check the Subject qualification.',

    faculty_subject_exists:
      'This Faculty member is already qualified for that Subject.',

    faculty_subject_create_failed:
      'The Subject qualification could not be added.',

    faculty_subject_id_required:
      'The Subject qualification is missing.',

    faculty_subject_lookup_failed:
      'The Subject qualification could not be checked.',

    faculty_subject_not_found:
      'The Subject qualification was not found.',

    faculty_subject_remove_failed:
      'The Subject qualification could not be removed.',

    availability_fields_required:
      'Complete all Faculty availability fields.',

    invalid_day:
      'Select a valid day of the week.',

    invalid_availability_type:
      'Select a valid availability type.',

    invalid_availability_time:
      'End time must be later than start time.',

    semester_lookup_failed:
      'The Semester could not be checked.',

    semester_not_found:
      'The selected Semester was not found.',

    availability_check_failed:
      'AlterSched could not check the availability record.',

    availability_exists:
      'That exact availability record already exists.',

    availability_create_failed:
      'The availability record could not be created.',

    availability_id_required:
      'The availability record is missing.',

    availability_lookup_failed:
      'The availability record could not be checked.',

    availability_not_found:
      'The availability record was not found.',

    availability_remove_failed:
      'The availability record could not be removed.',
  }

  /* =======================================================
     LOAD ERROR
  ======================================================= */

  const loadError =
    profilesResult.error ||
    departmentsResult.error ||
    facultyResult.error ||
    subjectsResult.error ||
    facultySubjectsResult.error ||
    semestersResult.error ||
    academicYearsResult.error ||
    availabilityResult.error

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <>
      <PageHead
        eyebrow="PEOPLE"
        title="Faculty"
        description="Manage Faculty records, teaching qualifications, availability, and teaching-load limits for automatic scheduling."
      />

      {/* ===================================================
          STATISTICS
      =================================================== */}

      <div className="stats-grid">
        <Stat
          label="Faculty Records"
          value={faculty.length}
        />

        <Stat
          label="Qualified Subjects"
          value={qualifiedCount}
        />

        <Stat
          label="Availability Records"
          value={availabilityCount}
        />

        <Stat
          label="Pending Faculty Setup"
          value={
            facultyAccountsWithoutProfile.length
          }
        />
      </div>

      {/* ===================================================
          SUCCESS
      =================================================== */}

      {params.success &&
        successMessages[
          params.success
        ] && (
          <div className="portal-alert portal-alert-success">
            <strong>
              Success
            </strong>

            <span>
              {
                successMessages[
                  params.success
                ]
              }
            </span>
          </div>
        )}

      {/* ===================================================
          ERROR
      =================================================== */}

      {params.error && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Action failed
          </strong>

          <span>
            {errorMessages[
              params.error
            ] ??
              'The requested Faculty action could not be completed.'}
          </span>

          {params.details && (
            <small
              style={{
                display: 'block',
                marginTop: 6,
                opacity: 0.75,
              }}
            >
              Database: {
                params.details
              }
            </small>
          )}
        </div>
      )}

      {/* ===================================================
          LOAD ERROR
      =================================================== */}

      {loadError && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Unable to load Faculty data
          </strong>

          <span>
            One or more Faculty resources
            could not be retrieved.
          </span>
        </div>
      )}

      {/* ===================================================
          CREATE FACULTY PROFILE
      =================================================== */}

      <section className="sched-section">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              FACULTY SETUP
            </span>

            <h3>
              Create Faculty Profile
            </h3>

            <p>
              Convert an approved Faculty
              account into a scheduling
              Faculty record.
            </p>
          </div>

          <Badge
            tone={
              facultyAccountsWithoutProfile.length
                ? 'warning'
                : 'success'
            }
          >
            {
              facultyAccountsWithoutProfile.length
            }{' '}
            Awaiting Setup
          </Badge>
        </div>

        <div className="sched-section-body">
          <div className="sched-info">
            <div className="sched-info-icon">
              F
            </div>

            <div>
              <strong>
                Approved Faculty Accounts
              </strong>

              <p>
                Faculty must register and
                receive Super Admin approval
                before a Faculty scheduling
                profile can be created.
              </p>
            </div>
          </div>

          {facultyAccountsWithoutProfile.length ===
          0 ? (
            <div
              style={{
                marginTop: 18,
              }}
            >
              <Empty
                title="No Faculty awaiting setup"
                text="Approve a Faculty registration in User Management first. Approved Faculty without a Faculty Profile will appear here."
              />
            </div>
          ) : (
            <form
              action={
                createFacultyProfile
              }
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 16,
                marginTop: 20,
              }}
            >
              <div className="field-group">
                <label
                  htmlFor="profile_id"
                >
                  Faculty Account
                </label>

                <select
                  id="profile_id"
                  name="profile_id"
                  required
                >
                  <option value="">
                    Select Faculty
                  </option>

                  {facultyAccountsWithoutProfile.map(
                    (profile) => (
                      <option
                        key={
                          profile.id
                        }
                        value={
                          profile.id
                        }
                      >
                        {profile.full_name ||
                          profile.email ||
                          'Unnamed Faculty'}
                      </option>
                    )
                  )}
                </select>

                <small>
                  Approved Faculty account.
                </small>
              </div>

              <div className="field-group">
                <label
                  htmlFor="employee_id"
                >
                  Employee ID
                </label>

                <input
                  id="employee_id"
                  name="employee_id"
                  type="text"
                  placeholder="Employee ID"
                  required
                />

                <small>
                  Official Faculty employee
                  identifier.
                </small>
              </div>

              <div className="field-group">
                <label
                  htmlFor="department_id"
                >
                  Department
                </label>

                <select
                  id="department_id"
                  name="department_id"
                  required
                >
                  <option value="">
                    Select Department
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {department.code
                          ? `${department.code} — ${department.name}`
                          : department.name}
                      </option>
                    )
                  )}
                </select>

                <small>
                  Primary teaching
                  Department.
                </small>
              </div>

              <div className="field-group">
                <label
                  htmlFor="employment_type"
                >
                  Employment Type
                </label>

                <select
                  id="employment_type"
                  name="employment_type"
                  defaultValue=""
                >
                  <option value="">
                    Not specified
                  </option>

                  <option value="full_time">
                    Full Time
                  </option>

                  <option value="part_time">
                    Part Time
                  </option>
                </select>

                <small>
                  Faculty employment
                  classification.
                </small>
              </div>

              <div className="field-group">
                <label
                  htmlFor="max_teaching_load"
                >
                  Maximum Teaching Load
                </label>

                <input
                  id="max_teaching_load"
                  name="max_teaching_load"
                  type="number"
                  min="1"
                  max="60"
                  step="0.5"
                  placeholder="Maximum teaching load"
                />

                <small>
                  Maximum weekly teaching
                  hours/load.
                </small>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'end',
                }}
              >
                <button
                  type="submit"
                  className="user-btn user-btn-primary"
                  style={{
                    minHeight: 42,
                  }}
                >
                  Create Faculty Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ===================================================
          FACULTY RECORDS
      =================================================== */}

      <section
        className="sched-section"
        style={{
          marginTop: 20,
        }}
      >
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              FACULTY DIRECTORY
            </span>

            <h3>
              Faculty Records
            </h3>

            <p>
              Active Faculty scheduling
              records and teaching-load
              reference.
            </p>
          </div>

          <Badge tone="info">
            {faculty.length} Total
          </Badge>
        </div>

        <div className="sched-section-body">
          {faculty.length === 0 ? (
            <Empty
              title="No Faculty records"
              text="Create a Faculty Profile from an approved Faculty account first."
            />
          ) : (
            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      Employee ID
                    </th>

                    <th>
                      Faculty
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Employment
                    </th>

                    <th>
                      Max Load
                    </th>

                    <th>
                      Subjects
                    </th>

                    <th>
                      Availability
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {faculty.map(
                    (item) => {
                      const profile =
                        profiles.find(
                          (profile) =>
                            profile.id ===
                            item.profile_id
                        )

                      const department =
                        departments.find(
                          (department) =>
                            department.id ===
                            item.department_id
                        )

                      const subjectCount =
                        facultySubjects.filter(
                          (qualification) =>
                            qualification.faculty_id ===
                            item.id
                        ).length

                      const availabilityRecordCount =
                        availability.filter(
                          (record) =>
                            record.faculty_id ===
                            item.id
                        ).length

                      return (
                        <tr
                          key={
                            item.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                item.employee_id
                              }
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {profile?.full_name ||
                                'Unnamed Faculty'}
                            </strong>

                            <div
                              className="muted"
                              style={{
                                marginTop: 3,
                                fontSize: 10,
                              }}
                            >
                              {profile?.email ||
                                'No email'}
                            </div>
                          </td>

                          <td>
                            {department?.code ||
                              department?.name ||
                              '—'}
                          </td>

                          <td>
                            {formatEmploymentType(
                              item.employment_type
                            )}
                          </td>

                          <td>
                            {item.max_teaching_load ??
                              '—'}
                          </td>

                          <td>
                            <Badge
                              tone={
                                subjectCount
                                  ? 'success'
                                  : 'warning'
                              }
                            >
                              {
                                subjectCount
                              }{' '}
                              Qualified
                            </Badge>
                          </td>

                          <td>
                            <Badge
                              tone={
                                availabilityRecordCount
                                  ? 'success'
                                  : 'warning'
                              }
                            >
                              {
                                availabilityRecordCount
                              }{' '}
                              Records
                            </Badge>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          SUBJECT QUALIFICATIONS
      =================================================== */}

      <section
        className="sched-section"
        style={{
          marginTop: 20,
        }}
      >
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              TEACHING QUALIFICATIONS
            </span>

            <h3>
              Qualified Subjects
            </h3>

            <p>
              Define which Subjects each
              Faculty member is qualified
              to teach.
            </p>
          </div>

          <Badge tone="info">
            {facultySubjects.length}{' '}
            Assignments
          </Badge>
        </div>

        <div className="sched-section-body">
          {faculty.length === 0 ? (
            <Empty
              title="Faculty Profile required"
              text="Create at least one Faculty Profile before assigning Subjects."
            />
          ) : (
            <>
              <div className="sched-info">
                <div className="sched-info-icon">
                  Q
                </div>

                <div>
                  <strong>
                    Subject Qualification
                  </strong>

                  <p>
                    For V1, a Faculty
                    member can only be
                    assigned Subjects
                    belonging to the same
                    Department.
                  </p>
                </div>
              </div>

              <form
                action={
                  assignFacultySubject
                }
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <div className="field-group">
                  <label
                    htmlFor="qualification_faculty_id"
                  >
                    Faculty
                  </label>

                  <select
                    id="qualification_faculty_id"
                    name="faculty_id"
                    required
                  >
                    <option value="">
                      Select Faculty
                    </option>

                    {faculty.map(
                      (item) => {
                        const profile =
                          profiles.find(
                            (profile) =>
                              profile.id ===
                              item.profile_id
                          )

                        const department =
                          departments.find(
                            (department) =>
                              department.id ===
                              item.department_id
                          )

                        return (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {profile?.full_name ||
                              item.employee_id}
                            {' — '}
                            {department?.code ||
                              department?.name ||
                              'Department'}
                          </option>
                        )
                      }
                    )}
                  </select>
                </div>

                <div className="field-group">
                  <label
                    htmlFor="qualification_subject_id"
                  >
                    Subject
                  </label>

                  <select
                    id="qualification_subject_id"
                    name="subject_id"
                    required
                  >
                    <option value="">
                      Select Subject
                    </option>

                    {departments.map(
                      (department) => {
                        const departmentSubjects =
                          subjects.filter(
                            (subject) =>
                              subject.department_id ===
                              department.id
                          )

                        if (
                          departmentSubjects.length ===
                          0
                        ) {
                          return null
                        }

                        return (
                          <optgroup
                            key={
                              department.id
                            }
                            label={
                              department.code
                                ? `${department.code} — ${department.name}`
                                : department.name
                            }
                          >
                            {departmentSubjects.map(
                              (subject) => (
                                <option
                                  key={
                                    subject.id
                                  }
                                  value={
                                    subject.id
                                  }
                                >
                                  {
                                    subject.code
                                  }
                                  {' — '}
                                  {
                                    subject.name
                                  }
                                </option>
                              )
                            )}
                          </optgroup>
                        )
                      }
                    )}
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    className="user-btn user-btn-primary"
                  >
                    Add Qualified Subject
                  </button>
                </div>
              </form>

              {/* ===========================================
                  CURRENT QUALIFICATIONS
              =========================================== */}

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  marginTop: 22,
                }}
              >
                {faculty.map(
                  (item) => {
                    const profile =
                      profiles.find(
                        (profile) =>
                          profile.id ===
                          item.profile_id
                      )

                    const qualifications =
                      facultySubjects.filter(
                        (qualification) =>
                          qualification.faculty_id ===
                          item.id
                      )

                    return (
                      <div
                        key={
                          item.id
                        }
                        style={{
                          border:
                            '1px solid var(--line)',
                          borderRadius: 12,
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            alignItems:
                              'center',
                            gap: 12,
                          }}
                        >
                          <div>
                            <strong>
                              {profile?.full_name ||
                                item.employee_id}
                            </strong>

                            <div
                              className="muted"
                              style={{
                                fontSize: 10,
                                marginTop: 3,
                              }}
                            >
                              {
                                item.employee_id
                              }
                            </div>
                          </div>

                          <Badge>
                            {
                              qualifications.length
                            }{' '}
                            Subjects
                          </Badge>
                        </div>

                        {qualifications.length ===
                        0 ? (
                          <p
                            className="muted"
                            style={{
                              margin:
                                '12px 0 0',
                              fontSize: 11,
                            }}
                          >
                            No qualified
                            Subjects assigned
                            yet.
                          </p>
                        ) : (
                          <div
                            style={{
                              display:
                                'flex',
                              flexWrap:
                                'wrap',
                              gap: 8,
                              marginTop: 12,
                            }}
                          >
                            {qualifications.map(
                              (
                                qualification
                              ) => {
                                const subject =
                                  subjects.find(
                                    (
                                      subject
                                    ) =>
                                      subject.id ===
                                      qualification.subject_id
                                  )

                                return (
                                  <form
                                    key={
                                      qualification.id
                                    }
                                    action={
                                      removeFacultySubject
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="faculty_subject_id"
                                      value={
                                        qualification.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      className="department-tag"
                                      title="Remove qualification"
                                    >
                                      <span>
                                        {subject
                                          ? `${subject.code} — ${subject.name}`
                                          : 'Subject'}
                                      </span>

                                      <b>
                                        ×
                                      </b>
                                    </button>
                                  </form>
                                )
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===================================================
          FACULTY AVAILABILITY
      =================================================== */}

      <section
        className="sched-section"
        style={{
          marginTop: 20,
        }}
      >
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              AVAILABILITY
            </span>

            <h3>
              Faculty Availability
            </h3>

            <p>
              Define when Faculty members
              are available, preferred, or
              unavailable for scheduling.
            </p>
          </div>

          <Badge
            tone={
              activeSemester
                ? 'success'
                : 'warning'
            }
          >
            {activeSemester
              ? 'Active Semester Available'
              : 'No Active Semester'}
          </Badge>
        </div>

        <div className="sched-section-body">
          {faculty.length === 0 ? (
            <Empty
              title="Faculty Profile required"
              text="Create a Faculty Profile before configuring availability."
            />
          ) : (
            <>
              <div className="sched-info">
                <div className="sched-info-icon">
                  A
                </div>

                <div>
                  <strong>
                    Scheduling Availability
                  </strong>

                  <p>
                    AlterSched will use
                    these records during
                    automatic schedule
                    generation and conflict
                    validation.
                  </p>
                </div>
              </div>

              <form
                action={
                  addFacultyAvailability
                }
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, minmax(0, 1fr))',
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <div className="field-group">
                  <label
                    htmlFor="availability_faculty_id"
                  >
                    Faculty
                  </label>

                  <select
                    id="availability_faculty_id"
                    name="faculty_id"
                    required
                  >
                    <option value="">
                      Select Faculty
                    </option>

                    {faculty.map(
                      (item) => {
                        const profile =
                          profiles.find(
                            (profile) =>
                              profile.id ===
                              item.profile_id
                          )

                        return (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {profile?.full_name ||
                              item.employee_id}
                          </option>
                        )
                      }
                    )}
                  </select>
                </div>

                <div className="field-group">
                  <label
                    htmlFor="semester_id"
                  >
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
                    <option value="">
                      Select Semester
                    </option>

                    {semesters.map(
                      (semester) => {
                        const academicYear =
                          academicYears.find(
                            (year) =>
                              year.id ===
                              semester.academic_year_id
                          )

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
                            {academicYear
                              ? ` — ${academicYear.name}`
                              : ''}
                            {semester.is_active
                              ? ' (Active)'
                              : ''}
                          </option>
                        )
                      }
                    )}
                  </select>
                </div>

                <div className="field-group">
                  <label
                    htmlFor="day_of_week"
                  >
                    Day
                  </label>

                  <select
                    id="day_of_week"
                    name="day_of_week"
                    required
                  >
                    <option value="">
                      Select Day
                    </option>

                    <option value="1">
                      Monday
                    </option>

                    <option value="2">
                      Tuesday
                    </option>

                    <option value="3">
                      Wednesday
                    </option>

                    <option value="4">
                      Thursday
                    </option>

                    <option value="5">
                      Friday
                    </option>

                    <option value="6">
                      Saturday
                    </option>

                    <option value="7">
                      Sunday
                    </option>
                  </select>
                </div>

                <div className="field-group">
                  <label
                    htmlFor="start_time"
                  >
                    Start Time
                  </label>

                  <input
                    id="start_time"
                    name="start_time"
                    type="time"
                    required
                  />
                </div>

                <div className="field-group">
                  <label
                    htmlFor="end_time"
                  >
                    End Time
                  </label>

                  <input
                    id="end_time"
                    name="end_time"
                    type="time"
                    required
                  />
                </div>

                <div className="field-group">
                  <label
                    htmlFor="availability_type"
                  >
                    Availability
                  </label>

                  <select
                    id="availability_type"
                    name="availability_type"
                    defaultValue="available"
                    required
                  >
                    <option value="available">
                      Available
                    </option>

                    <option value="preferred">
                      Preferred
                    </option>

                    <option value="unavailable">
                      Unavailable
                    </option>
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    className="user-btn user-btn-primary"
                  >
                    Add Availability
                  </button>
                </div>
              </form>

              {/* ===========================================
                  AVAILABILITY DIRECTORY
              =========================================== */}

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  marginTop: 22,
                }}
              >
                {faculty.map(
                  (item) => {
                    const profile =
                      profiles.find(
                        (profile) =>
                          profile.id ===
                          item.profile_id
                      )

                    const facultyAvailability =
                      availability.filter(
                        (record) =>
                          record.faculty_id ===
                          item.id
                      )

                    return (
                      <div
                        key={
                          item.id
                        }
                        style={{
                          border:
                            '1px solid var(--line)',
                          borderRadius: 12,
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'space-between',
                            gap: 12,
                          }}
                        >
                          <div>
                            <strong>
                              {profile?.full_name ||
                                item.employee_id}
                            </strong>

                            <div
                              className="muted"
                              style={{
                                marginTop: 3,
                                fontSize: 10,
                              }}
                            >
                              {
                                item.employee_id
                              }
                            </div>
                          </div>

                          <Badge>
                            {
                              facultyAvailability.length
                            }{' '}
                            Records
                          </Badge>
                        </div>

                        {facultyAvailability.length ===
                        0 ? (
                          <p
                            className="muted"
                            style={{
                              margin:
                                '12px 0 0',
                              fontSize: 11,
                            }}
                          >
                            No availability
                            configured yet.
                          </p>
                        ) : (
                          <div
                            style={{
                              display:
                                'grid',
                              gap: 8,
                              marginTop: 12,
                            }}
                          >
                            {facultyAvailability.map(
                              (record) => {
                                const semester =
                                  semesters.find(
                                    (
                                      semester
                                    ) =>
                                      semester.id ===
                                      record.semester_id
                                  )

                                const academicYear =
                                  semester
                                    ? academicYears.find(
                                        (
                                          year
                                        ) =>
                                          year.id ===
                                          semester.academic_year_id
                                      )
                                    : null

                                return (
                                  <div
                                    key={
                                      record.id
                                    }
                                    style={{
                                      border:
                                        '1px solid var(--line)',
                                      borderRadius: 9,
                                      padding:
                                        '10px 12px',
                                      display:
                                        'flex',
                                      alignItems:
                                        'center',
                                      justifyContent:
                                        'space-between',
                                      gap: 12,
                                    }}
                                  >
                                    <div>
                                      <strong>
                                        {getDayName(
                                          record.day_of_week
                                        )}
                                      </strong>

                                      <div
                                        className="muted"
                                        style={{
                                          fontSize: 10,
                                          marginTop: 3,
                                        }}
                                      >
                                        {formatTime(
                                          record.start_time
                                        )}
                                        {' – '}
                                        {formatTime(
                                          record.end_time
                                        )}
                                        {' • '}
                                        {semester?.name ||
                                          'Semester'}
                                        {academicYear
                                          ? ` — ${academicYear.name}`
                                          : ''}
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        display:
                                          'flex',
                                        alignItems:
                                          'center',
                                        gap: 8,
                                      }}
                                    >
                                      <Badge
                                        tone={
                                          record.availability_type ===
                                          'available'
                                            ? 'success'
                                            : record.availability_type ===
                                                'preferred'
                                              ? 'info'
                                              : 'danger'
                                        }
                                      >
                                        {formatAvailabilityType(
                                          record.availability_type
                                        )}
                                      </Badge>

                                      <form
                                        action={
                                          removeFacultyAvailability
                                        }
                                      >
                                        <input
                                          type="hidden"
                                          name="availability_id"
                                          value={
                                            record.id
                                          }
                                        />

                                        <button
                                          type="submit"
                                          className="user-btn user-btn-danger-soft"
                                        >
                                          Remove
                                        </button>
                                      </form>
                                    </div>
                                  </div>
                                )
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===================================================
          ALTERSched FLOW
      =================================================== */}

      <section
        className="sched-section"
        style={{
          marginTop: 20,
        }}
      >
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <span className="sched-kicker">
              AUTOMATIC SCHEDULING
            </span>

            <h3>
              Faculty Data Flow
            </h3>

            <p>
              Faculty configuration becomes
              an input to Class Offering
              assignment and Master Schedule
              generation.
            </p>
          </div>
        </div>

        <div className="sched-section-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <FlowCard
              number="01"
              title="Faculty Profile"
              text="Create the approved Faculty scheduling record."
            />

            <FlowCard
              number="02"
              title="Qualified Subjects"
              text="Define which Subjects the Faculty member can teach."
            />

            <FlowCard
              number="03"
              title="Availability"
              text="Define valid and preferred teaching periods."
            />

            <FlowCard
              number="04"
              title="Class Offerings"
              text="Faculty becomes eligible for assignment to prepared teaching requirements."
            />
          </div>
        </div>
      </section>
    </>
  )
}

/* =========================================================
   FLOW CARD
========================================================= */

function FlowCard({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div
      style={{
        border:
          '1px solid var(--line)',
        borderRadius: 12,
        padding: 15,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background:
            'rgba(88,166,255,.10)',
          marginBottom: 12,
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {number}
      </div>

      <strong>
        {title}
      </strong>

      <p
        className="muted"
        style={{
          margin:
            '7px 0 0',
          fontSize: 10,
          lineHeight: 1.6,
        }}
      >
        {text}
      </p>
    </div>
  )
}

/* =========================================================
   HELPERS
========================================================= */

function getDayName(
  day: number
) {
  const days: Record<
    number,
    string
  > = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  }

  return days[day] ?? 'Unknown Day'
}

function formatEmploymentType(
  value: string | null
) {
  if (!value) {
    return '—'
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function formatAvailabilityType(
  value: string
) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function formatTime(
  value: string
) {
  if (!value) {
    return '—'
  }

  const parts =
    value.split(':')

  const hour =
    Number(parts[0])

  const minute =
    Number(parts[1] ?? 0)

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value
  }

  const suffix =
    hour >= 12
      ? 'PM'
      : 'AM'

  const displayHour =
    hour % 12 || 12

  return `${displayHour}:${String(
    minute
  ).padStart(2, '0')} ${suffix}`
}
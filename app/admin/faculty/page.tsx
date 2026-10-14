import { createClient } from '@/lib/supabase/server'
import { FacultyDirectory } from '@/components/faculty/faculty-directory'
import { PageHead, Stat, Empty, Badge } from '@/components/ui'
import {
  createFacultyProfile,
  updateFacultyProfile,
  assignFacultySubject,
  removeFacultySubject,
  addFacultyAvailability,
  removeFacultyAvailability,
} from './actions'
import styles from './page.module.css'

/* =========================================================
   TYPES
\========================================================= */

type SearchParams = {
  success?: string
  error?: string
  details?: string
  /** "subjects:<id>" or "availability:<id>": reopen that instructor's window. */
  open?: string
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
  availability_type: 'available' | 'preferred' | 'unavailable'
}

/* =========================================================
   PAGE
\========================================================= */

export default async function FacultyPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const params = searchParams ? await searchParams : {}

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
      .select(
        `
        id,
        full_name,
        email,
        role,
        account_status
      `
      )
      .in('role', ['faculty', 'department_scheduler'])
      .eq('account_status', 'approved')
      .order('full_name'),
    supabase
      .from('departments')
      .select(
        `
        id,
        code,
        name
      `
      )
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('faculty_profiles')
      .select(
        `
        id,
        profile_id,
        employee_id,
        department_id,
        employment_type,
        max_teaching_load
      `
      )
      .order('employee_id'),
    supabase
      .from('subjects')
      .select(
        `
        id,
        department_id,
        code,
        name,
        units,
        lecture_hours,
        lab_hours,
        is_active
      `
      )
      .eq('is_active', true)
      .order('code'),
    supabase.from('faculty_subjects').select(`
        id,
        faculty_id,
        subject_id
      `),
    supabase
      .from('semesters')
      .select(
        `
        id,
        name,
        academic_year_id,
        is_active
      `
      )
      .order('is_active', {
        ascending: false,
      }),
    supabase.from('academic_years').select(`
        id,
        name,
        is_active
      `),
    supabase
      .from('faculty_availability')
      .select(
        `
        id,
        faculty_id,
        semester_id,
        day_of_week,
        start_time,
        end_time,
        availability_type
      `
      )
      .order('day_of_week')
      .order('start_time'),
  ])

  /* =======================================================
     NORMALIZE
  ======================================================= */

  const profiles = (profilesResult.data ?? []) as Profile[]
  const departments = (departmentsResult.data ?? []) as Department[]
  // Only instructors whose account is approved; pending or rejected registrants are not listed.
  const approvedProfileIds = new Set(profiles.map((p) => p.id))
  const faculty = ((facultyResult.data ?? []) as FacultyProfile[]).filter((item) =>
    approvedProfileIds.has(item.profile_id)
  )
  const subjects = (subjectsResult.data ?? []) as Subject[]
  const facultySubjects = (facultySubjectsResult.data ?? []) as FacultySubject[]
  const semesters = (semestersResult.data ?? []) as Semester[]
  const academicYears = (academicYearsResult.data ?? []) as AcademicYear[]
  const availability = (availabilityResult.data ?? []) as FacultyAvailability[]

  /* =======================================================
     AVAILABLE FACULTY ACCOUNTS
     Only approved Faculty/Schedulers without an existing
     faculty_profiles record should appear here.
  ======================================================= */

  const existingProfileIds = new Set(faculty.map((item) => item.profile_id))

  const facultyAccountsWithoutProfile = profiles.filter(
    (profile) => !existingProfileIds.has(profile.id)
  )

  /* =======================================================
     COUNTS
  ======================================================= */

  const qualifiedCount = facultySubjects.length
  const availabilityCount = availability.length

  /* =======================================================
     MESSAGES
  ======================================================= */

  const successMessages: Record<string, string> = {
    faculty_created: 'Faculty profile created successfully.',
    faculty_updated: 'Faculty profile updated successfully.',
    faculty_subject_added: 'Subject qualification added successfully.',
    faculty_subject_removed: 'Subject qualification removed successfully.',
    availability_added: 'Faculty availability added successfully.',
    availability_removed: 'Faculty availability removed successfully.',
  }

  const errorMessages: Record<string, string> = {
    faculty_fields_required: 'Faculty account, Employee ID, and Department are required.',
    invalid_teaching_load: 'Enter a valid maximum teaching load.',
    faculty_update_fields_required: 'Employee ID and Department are required.',
    invalid_employment_type: 'Select a valid employment type.',
    faculty_department_has_qualifications:
      'Remove existing Subject qualifications before changing Department.',
    faculty_update_failed: 'The Faculty profile could not be updated.',
    faculty_account_lookup_failed: 'The Faculty account could not be checked.',
    faculty_account_not_found: 'The selected Faculty account was not found.',
    account_not_faculty: 'The selected account is not a Faculty account.',
    faculty_not_approved: 'The Faculty account must be approved first.',
    department_lookup_failed: 'The selected Department could not be checked.',
    department_not_found: 'The selected Department was not found.',
    department_inactive: 'The selected Department is inactive.',
    faculty_check_failed: 'AlterSched could not verify the Faculty record.',
    faculty_profile_exists: 'This account already has a Faculty profile.',
    employee_check_failed: 'AlterSched could not verify the Employee ID.',
    duplicate_employee_id: 'That Employee ID is already assigned to another Faculty member.',
    faculty_create_failed: 'The Faculty profile could not be created.',
    faculty_subject_required: 'Select both a Faculty member and Subject.',
    faculty_lookup_failed: 'The Faculty record could not be checked.',
    faculty_not_found: 'The selected Faculty record was not found.',
    subject_lookup_failed: 'The Subject could not be checked.',
    subject_not_found: 'The selected Subject was not found.',
    subject_inactive: 'The selected Subject is inactive.',
    subject_department_mismatch:
      'The Subject must belong to the same Department as the Faculty member.',
    faculty_subject_check_failed: 'AlterSched could not check the Subject qualification.',
    faculty_subject_exists: 'This Faculty member is already qualified for that Subject.',
    faculty_subject_create_failed: 'The Subject qualification could not be added.',
    faculty_subject_id_required: 'The Subject qualification is missing.',
    faculty_subject_lookup_failed: 'The Subject qualification could not be checked.',
    faculty_subject_not_found: 'The Subject qualification was not found.',
    faculty_subject_remove_failed: 'The Subject qualification could not be removed.',
    availability_fields_required: 'Complete all Faculty availability fields.',
    invalid_day: 'Select a valid day of the week.',
    invalid_availability_type: 'Select a valid availability type.',
    invalid_availability_time: 'End time must be later than start time.',
    semester_lookup_failed: 'The Semester could not be checked.',
    semester_not_found: 'The selected Semester was not found.',
    availability_check_failed: 'AlterSched could not check the availability record.',
    availability_exists: 'That exact availability record already exists.',
    availability_create_failed: 'The availability record could not be created.',
    availability_id_required: 'The availability record is missing.',
    availability_lookup_failed: 'The availability record could not be checked.',
    availability_not_found: 'The availability record was not found.',
    availability_remove_failed: 'The availability record could not be removed.',
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

  // A save made from an instructor's window is reported inside that window when it reopens.
  const fromWindow = Boolean(params.open)
  const windowFlash = !fromWindow
    ? null
    : params.success && successMessages[params.success]
      ? { tone: 'success' as const, text: successMessages[params.success] }
      : params.error
        ? {
            tone: 'danger' as const,
            text: errorMessages[params.error] ?? 'That change could not be saved.',
          }
        : null

  return (
    <div className={styles.scope}>
      <PageHead
        title="Instructors"
        description="Every instructor in one list. Open a row to edit details, or use its subjects and availability buttons to change what they teach and when."
      />
      {/* ===================================================
          STATISTICS
      =================================================== */}
      <div className="stats-grid">
        <Stat label="Instructors" value={faculty.length} />
        <Stat label="Subject qualifications" value={qualifiedCount} />
        <Stat label="Availability windows" value={availabilityCount} />
        <Stat label="Waiting for a record" value={facultyAccountsWithoutProfile.length} />
      </div>
      {/* ===================================================
          SUCCESS
      =================================================== */}
      {!fromWindow && params.success && successMessages[params.success] && (
        <div className="portal-alert portal-alert-success">
          <strong>Success</strong>
          <span>{successMessages[params.success]}</span>
        </div>
      )}
      {/* ===================================================
          ERROR
      =================================================== */}
      {!fromWindow && params.error && (
        <div className="portal-alert portal-alert-danger">
          <strong>Action failed</strong>
          <span>
            {errorMessages[params.error] ?? 'The requested Faculty action could not be completed.'}
          </span>
          {params.details && <small className="field-help">Database: {params.details}</small>}
        </div>
      )}
      {/* ===================================================
          LOAD ERROR
      =================================================== */}
      {loadError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Unable to load Faculty data</strong>
          <span>One or more Faculty resources could not be retrieved.</span>
        </div>
      )}
      {/* ===================================================
          CREATE FACULTY PROFILE
      =================================================== */}
      {facultyAccountsWithoutProfile.length > 0 && (
        <section className="sched-section">
          <div className="sched-section-head">
            <div className="sched-section-copy">
              <h3>Finish instructor records</h3>
              <p>
                These approved accounts need an instructor record before classes can be assigned to
                them.
              </p>
            </div>
            <Badge tone="warning">{facultyAccountsWithoutProfile.length} waiting</Badge>
          </div>
          <div className="sched-section-body">
            {
              <form className="form-grid-2" action={createFacultyProfile}>
                <div className="field-group">
                  <label htmlFor="profile_id">Faculty Account</label>
                  <select id="profile_id" name="profile_id" required>
                    <option value="">Select Faculty</option>
                    {facultyAccountsWithoutProfile.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email || 'Unnamed Faculty'}
                      </option>
                    ))}
                  </select>
                  <small>Approved Faculty account.</small>
                </div>
                <div className="field-group">
                  <label htmlFor="employee_id">Employee ID</label>
                  <input
                    id="employee_id"
                    name="employee_id"
                    type="text"
                    placeholder="Employee ID"
                    required
                  />
                  <small>Official Faculty employee identifier.</small>
                </div>
                <div className="field-group">
                  <label htmlFor="department_id">Department</label>
                  <select id="department_id" name="department_id" required>
                    <option value="">Select Department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.code
                          ? `${department.code} — ${department.name}`
                          : department.name}
                      </option>
                    ))}
                  </select>
                  <small>Primary teaching Department.</small>
                </div>
                <div className="field-group">
                  <label htmlFor="employment_type">Employment Type</label>
                  <select id="employment_type" name="employment_type" defaultValue="">
                    <option value="">Not specified</option>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                  </select>
                  <small>Faculty employment classification.</small>
                </div>
                <div className="field-group">
                  <label htmlFor="max_teaching_load">Maximum Teaching Load</label>
                  <input
                    id="max_teaching_load"
                    name="max_teaching_load"
                    type="number"
                    min="1"
                    max="60"
                    step="0.5"
                    placeholder="Maximum teaching load"
                  />
                  <small>Maximum weekly teaching hours/load.</small>
                </div>
                <div className="align-end">
                  <button type="submit" className="btn btn-primary">
                    Create Faculty Profile
                  </button>
                </div>
              </form>
            }
          </div>
        </section>
      )}
      {/* ===================================================
          FACULTY RECORDS
      =================================================== */}
      <section className="sched-section section-gap" id="faculty-directory">
        <div className="sched-section-head">
          <div className="sched-section-copy">
            <h3>Instructor records</h3>
            <p>Search, filter and edit instructors. Click a row to change its details.</p>
          </div>
          <Badge tone="info">{faculty.length} Total</Badge>
        </div>
        <div className="sched-section-body">
          {faculty.length === 0 ? (
            <Empty
              title="No Faculty records"
              text="Create a Faculty Profile from an approved Faculty account first."
            />
          ) : (
            <FacultyDirectory
              rows={faculty.map((item) => {
                const profile = profiles.find((p) => p.id === item.profile_id)
                return {
                  id: item.id,
                  name: profile?.full_name || profile?.email || item.employee_id,
                  email: profile?.email ?? '',
                  employeeId: item.employee_id,
                  departmentId: item.department_id,
                  employmentType: item.employment_type,
                  maxLoad: item.max_teaching_load,
                  subjects: facultySubjects.filter((q) => q.faculty_id === item.id).length,
                  availability: availability.filter((r) => r.faculty_id === item.id).length,
                }
              })}
              departments={departments}
              updateAction={updateFacultyProfile}
              setup={{
                subjects: subjects.map((subject) => ({
                  id: subject.id,
                  code: subject.code,
                  name: subject.name,
                  departmentId: subject.department_id,
                })),
                qualifications: facultySubjects.map((item) => ({
                  id: item.id,
                  facultyId: item.faculty_id,
                  subjectId: item.subject_id,
                })),
                availability: availability.map((item) => ({
                  id: item.id,
                  facultyId: item.faculty_id,
                  semesterId: item.semester_id,
                  day: item.day_of_week,
                  start: item.start_time,
                  end: item.end_time,
                  type: item.availability_type,
                })),
                semesters: semesters.map((semester) => {
                  const year = academicYears.find((item) => item.id === semester.academic_year_id)
                  return {
                    id: semester.id,
                    label: year ? `${semester.name} ${year.name}` : semester.name,
                    active: Boolean(semester.is_active),
                  }
                }),
                actions: {
                  assignSubject: assignFacultySubject,
                  removeSubject: removeFacultySubject,
                  addAvailability: addFacultyAvailability,
                  removeAvailability: removeFacultyAvailability,
                },
              }}
              initialOpen={params.open}
              flash={windowFlash}
            />
          )}
        </div>
      </section>
    </div>
  )
}

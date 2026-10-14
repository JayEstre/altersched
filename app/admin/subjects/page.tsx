import { SubjectYearBrowser } from '@/components/subject-year-browser'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Notice } from '@/components/ui'
import { OFFERING_MESSAGES, preparedMessage } from '@/components/assignments/offering-messages'
import { updateOfferingInstructor } from '@/lib/actions/assignments'
import { loadAssignmentRows } from '@/lib/assignments'
import { one } from '@/lib/relations'
import { prepareClassOfferings } from '../class-offerings/actions'
import { createSubject, deleteSubject, setSubjectStatus, updateSubject } from './actions'
import styles from './page.module.css'

type SearchParams = Promise<{
  success?: string
  error?: string
  details?: string
  created?: string
}>

function getSuccessMessage(success?: string, created?: string) {
  if (success === 'offerings_prepared') return preparedMessage(created)
  if (success && success in OFFERING_MESSAGES.success) return OFFERING_MESSAGES.success[success]
  switch (success) {
    case 'subject_created':
      return 'Subject added successfully.'

    case 'subject_updated':
      return 'Subject updated successfully.'

    case 'subject_deactivated':
      return 'Subject deactivated.'

    case 'subject_reactivated':
      return 'Subject activated again.'

    case 'subject_deleted':
      return 'Subject deleted.'

    default:
      return 'Changes saved successfully.'
  }
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams

  const [{ data: programs }, { data: subjects }, { data: roomTypes }] = await Promise.all([
    supabase
      .from('programs')
      .select('id,department_id,code,name')
      .ilike('code', 'BSIT')
      .eq('is_active', true),
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
          description,
          is_active,
          default_year_level,
          default_room_type_id,
          default_faculty_id
        `
      )
      .order('code'),
    supabase.from('room_types').select('id,name').order('name'),
  ])

  const bsit = programs?.[0] ?? null

  // Approved BSIT instructors and their subject qualifications.

  const { data: facultyProfiles } = bsit
    ? await supabase
        .from('faculty_profiles')
        .select('id,profile_id,employee_id,department_id')
        .eq('department_id', bsit.department_id)
    : { data: [] }

  const profileIds = (facultyProfiles ?? []).map((faculty) => faculty.profile_id).filter(Boolean)

  const { data: instructorProfiles } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id,full_name,email,role,account_status')
        .in('id', profileIds)
        .eq('role', 'faculty')
        .eq('account_status', 'approved')
    : { data: [] }

  const approvedProfileMap = new Map(
    (instructorProfiles ?? []).map((profile) => [profile.id, profile])
  )

  const approvedFaculty = (facultyProfiles ?? [])
    .filter((faculty) => approvedProfileMap.has(faculty.profile_id))
    .map((faculty) => ({
      ...faculty,
      profile: approvedProfileMap.get(faculty.profile_id),
    }))
    .sort((a, b) =>
      String(a.profile?.full_name ?? a.profile?.email ?? '').localeCompare(
        String(b.profile?.full_name ?? b.profile?.email ?? '')
      )
    )

  const approvedFacultyIds = approvedFaculty.map((faculty) => faculty.id)

  const { data: facultySubjects } = approvedFacultyIds.length
    ? await supabase
        .from('faculty_subjects')
        .select('faculty_id,subject_id')
        .in('faculty_id', approvedFacultyIds)
    : { data: [] }

  const qualifiedFacultyBySubject = new Map<string, Set<string>>()

  for (const row of facultySubjects ?? []) {
    const subjectId = String(row.subject_id)
    const facultyId = String(row.faculty_id)

    if (!qualifiedFacultyBySubject.has(subjectId)) {
      qualifiedFacultyBySubject.set(subjectId, new Set())
    }

    qualifiedFacultyBySubject.get(subjectId)!.add(facultyId)
  }

  const list = (subjects ?? []).filter((subject) => subject.department_id === bsit?.department_id)

  // Blocks of each BSIT year level, who teaches each subject in each block this semester,
  // and the year level each subject has in the active curriculum (what the generator uses).
  const [{ data: activeSemester }, { data: sectionRows }, { data: curriculumRows }] =
    await Promise.all([
      supabase.from('semesters').select('id,name').eq('is_active', true).maybeSingle(),
      bsit
        ? supabase
            .from('sections')
            .select('id,code,year_levels!inner(level_number,program_id)')
            .eq('year_levels.program_id', bsit.id)
            .eq('is_active', true)
            .order('code')
        : Promise.resolve({ data: [] }),
      bsit
        ? supabase
            .from('curriculum_subjects')
            .select(
              'subject_id,term_order,curricula!inner(is_active,program_id),year_levels(level_number)'
            )
            .eq('curricula.is_active', true)
            .eq('curricula.program_id', bsit.id)
        : Promise.resolve({ data: [] }),
    ])
  const curriculumYear = new Map<string, number>()
  const curriculumTerms = new Map<string, Set<number>>()
  for (const row of curriculumRows ?? []) {
    const level = Number(one(row.year_levels)?.level_number ?? 0)
    if (level >= 1 && !curriculumYear.has(row.subject_id)) curriculumYear.set(row.subject_id, level)
    const terms = curriculumTerms.get(row.subject_id) ?? new Set<number>()
    terms.add(Number(row.term_order))
    curriculumTerms.set(row.subject_id, terms)
  }
  const blocks = (sectionRows ?? [])
    .map((section) => ({
      id: section.id,
      code: section.code,
      year: Number(one(section.year_levels)?.level_number ?? 0),
    }))
    .filter((block) => block.year >= 1)
  const assignmentRows = await loadAssignmentRows(supabase, activeSemester?.id ?? null)

  // Outcome of the last action; also shown inside the catalog dialog when it reopens.
  const assignmentError =
    params.error && params.error in OFFERING_MESSAGES.error
      ? OFFERING_MESSAGES.error[params.error]
      : null
  const details = params.details ? decodeURIComponent(params.details) : ''
  const errorTitle = assignmentError ?? 'Unable to save subject.'
  const errorText = assignmentError
    ? details
    : `${
        params.error === 'subject_in_use'
          ? 'This subject is already used in a curriculum, class offering or schedule. Deactivate it instead.'
          : (params.error?.replaceAll('_', ' ') ?? '')
      }${details ? `: ${details}` : ''}`
  const flash = params.error
    ? { tone: 'danger' as const, title: errorTitle, text: errorText }
    : params.success
      ? {
          tone: 'success' as const,
          title: getSuccessMessage(params.success, params.created),
          text: '',
        }
      : null

  return (
    <div className={styles.scope}>
      <div className="page-stack">
        {/* ================================================
          HEADER
      ================================================= */}
        <PageHead
          title="Subjects"
          description="The BSIT subject catalog: units, lecture and lab hours, room type, and who teaches each subject per block."
        />
        {/* ================================================
          ALERTS
      ================================================= */}
        {params.error && (
          <Notice tone="danger" title={errorTitle}>
            {errorText}
          </Notice>
        )}
        {params.success && (
          <Notice tone="success" title={getSuccessMessage(params.success, params.created)}>
            The updated information is now available to AlterSched.
          </Notice>
        )}
        {/* ================================================
          SUMMARY
      ================================================= */}
        {/* ================================================
          SUBJECT CATALOG
      ================================================= */}
        <SubjectYearBrowser
          subjects={list.map((subject) => ({
            id: String(subject.id),
            departmentId: String(subject.department_id),
            year: Number(subject.default_year_level ?? 0),
            curriculumYear: curriculumYear.get(String(subject.id)) ?? null,
            curriculumTerms: [...(curriculumTerms.get(String(subject.id)) ?? [])].sort(),
            code: String(subject.code ?? ''),
            name: String(subject.name ?? ''),
            description: String(subject.description ?? ''),
            units: Number(subject.units ?? 0),
            lecture: Number(subject.lecture_hours ?? 0),
            lab: Number(subject.lab_hours ?? 0),
            roomTypeId: String(subject.default_room_type_id ?? ''),
            facultyId: String(subject.default_faculty_id ?? ''),
            isActive: Boolean(subject.is_active),
          }))}
          roomTypes={(roomTypes ?? []).map((room) => ({
            id: String(room.id),
            name: String(room.name),
          }))}
          instructors={approvedFaculty.map((faculty) => ({
            id: String(faculty.id),
            name: String(
              faculty.profile?.full_name ??
                faculty.profile?.email ??
                faculty.employee_id ??
                'Instructor'
            ),
          }))}
          qualifications={Object.fromEntries(
            [...qualifiedFacultyBySubject.entries()].map(([subjectId, ids]) => [
              subjectId,
              [...ids],
            ])
          )}
          blocks={blocks}
          semesterName={activeSemester?.name ?? null}
          classes={assignmentRows.map((row) => ({
            offeringId: row.offeringId,
            sectionId: row.sectionId,
            subjectId: row.subjectId,
            facultyId: row.facultyId,
            facultyName: row.facultyName,
            mode: row.mode,
            hours: row.hours,
            candidates: row.candidates.map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              load: candidate.load,
              maxLoad: candidate.maxLoad,
            })),
          }))}
          flash={flash}
          prepare={
            bsit && activeSemester
              ? { semesterId: activeSemester.id, programId: bsit.id, action: prepareClassOfferings }
              : null
          }
          updateAction={updateSubject}
          statusAction={setSubjectStatus}
          deleteAction={deleteSubject}
          assignAction={updateOfferingInstructor}
        />
        {/* ================================================
          ADD SUBJECT
      ================================================= */}
        <section className="panel subject-add-panel">
          <div className="subject-section-header">
            <div>
              <h3>Add a subject</h3>
              <p>Lecture and lab hours decide how many sessions the generator places each week.</p>
            </div>
          </div>
          {!bsit ? (
            <Notice tone="danger" title="BSIT program unavailable.">
              An active BSIT program must exist before subjects can be registered.
            </Notice>
          ) : (
            <form action={createSubject} className="subject-create-form">
              <input type="hidden" name="department_id" value={bsit.department_id} />
              {/* ROW 1 */}
              <div className="subject-create-row subject-create-row-main">
                <label className="field">
                  <span className="field-label">
                    Subject Code
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input name="code" required autoComplete="off" placeholder="e.g. PROG1" />
                </label>
                <label className="field subject-name-field">
                  <span className="field-label">
                    Subject Name
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    name="subject_name"
                    required
                    autoComplete="off"
                    placeholder="e.g. Computer Programming 1"
                  />
                </label>
                <label className="field">
                  <span className="field-label">
                    Units
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    name="units"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    required
                    placeholder="3"
                  />
                </label>
              </div>
              {/* ROW 2 */}
              <div className="subject-create-row subject-create-row-details">
                <label className="field">
                  <span className="field-label">
                    Lecture Hours
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    name="lecture_hours"
                    type="number"
                    min="0"
                    max="40"
                    step="0.5"
                    defaultValue="0"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">
                    Laboratory Hours
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    name="lab_hours"
                    type="number"
                    min="0"
                    max="40"
                    step="0.5"
                    defaultValue="0"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">
                    Year Level
                    <span className="required" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <select name="default_year_level" required defaultValue="">
                    <option value="" disabled>
                      Select year level
                    </option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Room Type</span>
                  <select name="default_room_type_id" defaultValue="">
                    <option value="">Any compatible room</option>
                    {(roomTypes ?? []).map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {/* ROW 3 */}
              <div className="subject-create-row subject-create-row-bottom">
                <label className="field">
                  <span className="field-label">Description</span>
                  <input
                    name="description"
                    autoComplete="off"
                    placeholder="Optional subject notes or description"
                  />
                </label>
                <button type="submit" className="btn btn-primary">
                  Add Subject
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

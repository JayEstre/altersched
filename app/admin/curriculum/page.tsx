import { GlassModal } from '@/components/glass-modal'
import { CurriculumYearBrowser } from '@/components/curriculum-year-browser'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { Badge, Empty, PageHead, Stat } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import {
  addCurriculumSubject,
  createCurriculum,
  removeCurriculumSubject,
  setCurriculumActive,
  updateCurriculum,
  updateCurriculumSubject,
} from './actions'
import styles from './page.module.css'

type SP = Promise<{
  success?: string
  error?: string
  curriculum?: string
}>

function successMessage(value?: string) {
  switch (value) {
    case 'curriculum_created':
      return 'Curriculum created successfully.'
    case 'curriculum_updated':
      return 'Curriculum updated successfully.'
    case 'curriculum_status_updated':
      return 'Curriculum status updated.'
    case 'subject_added':
      return 'Subject added to the curriculum.'
    case 'subject_updated':
      return 'Curriculum subject updated.'
    case 'subject_removed':
      return 'Subject removed from the curriculum.'
    default:
      return value ? 'Saved successfully.' : ''
  }
}

function errorMessage(value?: string) {
  switch (value) {
    case 'invalid_name':
      return 'Enter a valid curriculum name.'
    case 'invalid_year_range':
      return 'The ending year cannot be earlier than the starting year.'
    case 'duplicate_curriculum':
      return 'A curriculum with this name already exists for the selected program.'
    case 'curriculum_not_found':
      return 'The selected curriculum could not be found.'
    case 'program_not_found':
      return 'The selected program could not be found.'
    case 'year_level_program_mismatch':
      return 'The selected Year Level does not belong to this curriculum program.'
    case 'subject_department_mismatch':
      return 'The selected subject does not belong to the curriculum department.'
    case 'room_type_not_found':
      return 'The selected room type could not be found.'
    case 'duplicate_curriculum_subject':
      return 'That subject is already assigned to the same Year Level and Semester.'
    case 'invalid_term_order':
      return 'Semester / term order must be 1 or higher.'
    case 'invalid_weekly_hours':
      return 'Weekly hours must be greater than zero.'
    case 'curriculum_subject_not_found':
      return 'The selected curriculum subject could not be found.'
    default:
      return value ? `Unable to save: ${decodeURIComponent(value)}` : ''
  }
}

export default async function CurriculumPage({ searchParams }: { searchParams: SP }) {
  await requireRole(['super_admin'])
  const q = await searchParams
  const s = await createClient()

  const [
    { data: programs },
    { data: yearLevels },
    { data: subjects },
    { data: roomTypes },
    { data: curricula },
    { data: mappings },
  ] = await Promise.all([
    s
      .from('programs')
      .select(
        `
        id,
        department_id,
        code,
        name,
        is_active,
        departments (
          id,
          code,
          name
        )
      `
      )
      .eq('is_active', true)
      .order('name'),
    s
      .from('year_levels')
      .select('id, program_id, name, level_number, is_active')
      .eq('is_active', true)
      .order('level_number'),
    s
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
    s.from('room_types').select('id, name').order('name'),
    s
      .from('curricula')
      .select(
        `
        id,
        program_id,
        name,
        effective_from_year,
        effective_to_year,
        is_active,
        created_at
      `
      )
      .order('created_at', { ascending: false }),
    s
      .from('curriculum_subjects')
      .select(
        `
        id,
        curriculum_id,
        subject_id,
        year_level_id,
        term_order,
        required_room_type_id,
        weekly_hours
      `
      )
      .order('term_order'),
  ])

  const allPrograms = programs || []

  // Demo scope: CCS / BSIT only.
  const bsitPrograms = allPrograms.filter((program) => {
    const programCode = String(program.code || '').toUpperCase()
    const programName = String(program.name || '').toUpperCase()
    const departmentCode = String(program.departments?.code || '').toUpperCase()
    const departmentName = String(program.departments?.name || '').toUpperCase()

    return (
      programCode === 'BSIT' ||
      programName.includes('INFORMATION TECHNOLOGY') ||
      departmentCode === 'CCS' ||
      departmentName.includes('COMPUTER')
    )
  })

  const bsitProgramIds = new Set(bsitPrograms.map((item) => item.id))
  const bsitDepartmentIds = new Set(bsitPrograms.map((item) => item.department_id))

  const filteredYearLevels = (yearLevels || []).filter((item) =>
    bsitProgramIds.has(item.program_id)
  )

  const filteredSubjects = (subjects || []).filter((item) =>
    bsitDepartmentIds.has(item.department_id)
  )

  const filteredCurricula = (curricula || []).filter((item) => bsitProgramIds.has(item.program_id))

  const curriculumIds = new Set(filteredCurricula.map((item) => item.id))

  const filteredMappings = (mappings || []).filter((item) => curriculumIds.has(item.curriculum_id))

  const selectedCurriculum =
    filteredCurricula.find((item) => item.id === q.curriculum) ||
    filteredCurricula.find((item) => item.is_active) ||
    filteredCurricula[0] ||
    null

  const selectedProgram = selectedCurriculum
    ? bsitPrograms.find((item) => item.id === selectedCurriculum.program_id)
    : null

  const selectedYearLevels = selectedProgram
    ? filteredYearLevels.filter((item) => item.program_id === selectedProgram.id)
    : []

  const selectedSubjects = selectedProgram
    ? filteredSubjects.filter((item) => item.department_id === selectedProgram.department_id)
    : []

  const selectedMappings = selectedCurriculum
    ? filteredMappings.filter((item) => item.curriculum_id === selectedCurriculum.id)
    : []

  const activeCurricula = filteredCurricula.filter((item) => item.is_active).length
  const term1Count = selectedMappings.filter((item) => Number(item.term_order) === 1).length
  const term2Count = selectedMappings.filter((item) => Number(item.term_order) === 2).length

  function programLabel(programId: string) {
    const program = bsitPrograms.find((item) => item.id === programId)

    return program ? `${program.code || 'BSIT'} — ${program.name}` : 'Unknown program'
  }

  function yearLevelLabel(yearLevelId: string) {
    const item = filteredYearLevels.find((row) => row.id === yearLevelId)

    return item?.name || `Year ${item?.level_number || '—'}`
  }

  function subjectFor(subjectId: string) {
    return filteredSubjects.find((item) => item.id === subjectId)
  }

  function roomTypeLabel(roomTypeId?: string | null) {
    if (!roomTypeId) return 'Any suitable room'

    return (roomTypes || []).find((item) => item.id === roomTypeId)?.name || 'Room type'
  }

  return (
    <div className={styles.scope}>
      <PageHead
        eyebrow="ADMIN MASTER DATA"
        title="Curriculum Management"
        description="Define the official BSIT subjects per Year Level and Semester. AlterSched uses this curriculum as the source for automatic class preparation and schedule generation."
      />
      <div className="stats-grid">
        <Stat label="BSIT Curricula" value={filteredCurricula.length} />
        <Stat label="Active Curricula" value={activeCurricula} />
        <Stat label="Selected Subjects" value={selectedMappings.length} />
        <Stat label="1st / 2nd Semester" value={`${term1Count} / ${term2Count}`} />
      </div>
      {q.success && <div className="form-alert success">{successMessage(q.success)}</div>}
      {q.error && <div className="form-alert error">{errorMessage(q.error)}</div>}
      {!bsitPrograms.length && (
        <div className="form-alert error">
          No active BSIT / CCS program was found. Configure the BSIT program before creating a
          curriculum.
        </div>
      )}
      {selectedCurriculum && (
        <CurriculumYearBrowser
          curriculumName={selectedCurriculum.name}
          rows={selectedMappings.map((item) => {
            const subject = selectedSubjects.find((x) => x.id === item.subject_id)
            const level = selectedYearLevels.find((x) => x.id === item.year_level_id)
            return {
              id: String(item.id),
              year: Number(level?.level_number ?? 0),
              term: Number(item.term_order ?? 0),
              code: String(subject?.code ?? '—'),
              name: String(subject?.name ?? 'Unknown subject'),
              hours: Number(item.weekly_hours ?? 0),
              room: roomTypeLabel(item.required_room_type_id),
            }
          })}
        />
      )}
      <details className="panel curriculum-management-workspace" open={!(curricula ?? []).length}>
        <summary className="curriculum-management-summary">
          <span>
            <strong>Curriculum Management Tools</strong>
            <small>Manage versions, update curriculum details, and assign or edit subjects</small>
          </span>
          <span className="curriculum-management-toggle">Open tools</span>
        </summary>
        <div className="curriculum-management-content">
          <div className="curriculum-layout">
            <section className="panel as-browser">
              <p className="eyebrow">CURRICULUM SETUP</p>
              <h2>Curriculum Setup</h2>
              <p className="muted">
                Create a curriculum using the floating form. Existing curriculum actions are
                unchanged.
              </p>
              <GlassModal title="Create Curriculum" trigger="+ Create Curriculum">
                <form className="form" action={createCurriculum}>
                  <label>
                    Program
                    <select name="program_id" required defaultValue="">
                      <option value="" disabled>
                        Select BSIT program
                      </option>
                      {bsitPrograms.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Curriculum Name
                    <input
                      name="name"
                      required
                      maxLength={120}
                      placeholder="BSIT Curriculum 2026"
                    />
                  </label>
                  <div className="curriculum-two">
                    <label>
                      Effective From
                      <input
                        type="number"
                        name="effective_from_year"
                        min="1900"
                        placeholder="2026"
                      />
                    </label>
                    <label>
                      Effective To
                      <input
                        type="number"
                        name="effective_to_year"
                        min="1900"
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                  <label className="check-row">
                    <input type="checkbox" name="is_active" defaultChecked />
                    Set curriculum as active
                  </label>
                  <button className="btn btn-primary" disabled={!bsitPrograms.length}>
                    Create Curriculum
                  </button>
                </form>
              </GlassModal>
            </section>
            <section className="panel">
              <p className="eyebrow">AUTOMATIC GENERATION SOURCE</p>
              <h2>How AlterSched Uses This</h2>
              <div className="curriculum-flow">
                <div>
                  <strong>1. Curriculum</strong>
                  <span>Reads the required subjects for each Year Level and Semester.</span>
                </div>
                <b>→</b>
                <div>
                  <strong>2. Blocks</strong>
                  <span>Applies those subjects to active BSIT sections / blocks.</span>
                </div>
                <b>→</b>
                <div>
                  <strong>3. Auto Preparation</strong>
                  <span>Creates the required class instances internally.</span>
                </div>
                <b>→</b>
                <div>
                  <strong>4. Scheduling</strong>
                  <span>Assigns qualified faculty, rooms, days, and times without conflicts.</span>
                </div>
              </div>
              <div className="portal-alert">
                <strong>Important</strong>
                <span>
                  Class Offerings remain an internal scheduling record. The Department Scheduler
                  should not need to manually create every offering before generation.
                </span>
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="curriculum-section-head">
              <div>
                <p className="eyebrow">AVAILABLE CURRICULA</p>
                <h2>BSIT Curriculum Versions</h2>
              </div>
              {selectedCurriculum && (
                <Badge tone={selectedCurriculum.is_active ? 'success' : 'default'}>
                  {selectedCurriculum.is_active ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
            {filteredCurricula.length ? (
              <div className="curriculum-cards">
                {filteredCurricula.map((item) => {
                  const selected = selectedCurriculum?.id === item.id

                  const subjectCount = filteredMappings.filter(
                    (row) => row.curriculum_id === item.id
                  ).length

                  return (
                    <div key={item.id} className={`curriculum-card ${selected ? 'selected' : ''}`}>
                      <div>
                        <div className="curriculum-card-top">
                          <strong>{item.name}</strong>
                          <Badge tone={item.is_active ? 'success' : 'default'}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <span className="muted">{programLabel(item.program_id)}</span>
                        <span className="muted">
                          {item.effective_from_year || 'No start year'}
                          {' — '}
                          {item.effective_to_year || 'Present'}
                        </span>
                        <span className="muted">
                          {subjectCount} curriculum subject
                          {subjectCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="curriculum-card-actions">
                        <a
                          className="btn btn-outline"
                          href={`/admin/curriculum?curriculum=${item.id}`}
                        >
                          {selected ? 'Selected' : 'Manage'}
                        </a>
                        <form action={setCurriculumActive}>
                          <input type="hidden" name="curriculum_id" value={item.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={item.is_active ? 'false' : 'true'}
                          />
                          <button className="btn btn-outline">
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty text="No BSIT curriculum configured yet." />
            )}
          </section>
          {selectedCurriculum && (
            <>
              <section className="panel">
                <div className="curriculum-section-head">
                  <div>
                    <p className="eyebrow">SELECTED CURRICULUM</p>
                    <h2>{selectedCurriculum.name}</h2>
                    <p className="muted">{programLabel(selectedCurriculum.program_id)}</p>
                  </div>
                  <Badge tone={selectedCurriculum.is_active ? 'success' : 'default'}>
                    {selectedCurriculum.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <form className="form curriculum-edit-form" action={updateCurriculum}>
                  <input type="hidden" name="curriculum_id" value={selectedCurriculum.id} />
                  <label>
                    Curriculum Name
                    <input
                      name="name"
                      required
                      maxLength={120}
                      defaultValue={selectedCurriculum.name}
                    />
                  </label>
                  <label>
                    Effective From
                    <input
                      type="number"
                      name="effective_from_year"
                      min="1900"
                      defaultValue={selectedCurriculum.effective_from_year ?? ''}
                    />
                  </label>
                  <label>
                    Effective To
                    <input
                      type="number"
                      name="effective_to_year"
                      min="1900"
                      defaultValue={selectedCurriculum.effective_to_year ?? ''}
                    />
                  </label>
                  <button className="btn btn-primary">Save Curriculum</button>
                </form>
              </section>
              <section className="panel">
                <p className="eyebrow">SUBJECT MAPPING</p>
                <h2>Add Required Subject</h2>
                <p className="muted">
                  Assign each subject to the correct BSIT Year Level and Semester. Weekly hours are
                  used by the automatic scheduler when creating class sessions.
                </p>
                <form className="form curriculum-subject-form" action={addCurriculumSubject}>
                  <input type="hidden" name="curriculum_id" value={selectedCurriculum.id} />
                  <label>
                    Subject
                    <select name="subject_id" required defaultValue="">
                      <option value="" disabled>
                        Select subject
                      </option>
                      {selectedSubjects.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Year Level
                    <select name="year_level_id" required defaultValue="">
                      <option value="" disabled>
                        Select Year Level
                      </option>
                      {selectedYearLevels.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name || `Year ${item.level_number}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Semester
                    <select name="term_order" required defaultValue="1">
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                    </select>
                  </label>
                  <label>
                    Weekly Hours
                    <input
                      type="number"
                      name="weekly_hours"
                      required
                      min="0.5"
                      step="0.5"
                      defaultValue="3"
                    />
                  </label>
                  <label>
                    Required Room Type
                    <select name="required_room_type_id" defaultValue="">
                      <option value="">Any suitable room</option>
                      {(roomTypes || []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="btn btn-primary">Add Subject</button>
                </form>
              </section>
              <section className="panel">
                <div className="curriculum-section-head">
                  <div>
                    <p className="eyebrow">CURRICULUM SUBJECTS</p>
                    <h2>Required Subjects</h2>
                  </div>
                  <Badge tone="default">{selectedMappings.length} Subjects</Badge>
                </div>
                {selectedMappings.length ? (
                  <DataTable>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Year Level</th>
                        <th>Semester</th>
                        <th>Hours</th>
                        <th>Room Type</th>
                        <th>Update</th>
                        <th>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMappings
                        .slice()
                        .sort((a, b) => {
                          const ay =
                            filteredYearLevels.find((item) => item.id === a.year_level_id)
                              ?.level_number || 0

                          const by =
                            filteredYearLevels.find((item) => item.id === b.year_level_id)
                              ?.level_number || 0

                          return ay - by || Number(a.term_order) - Number(b.term_order)
                        })
                        .map((item) => {
                          const subject = subjectFor(item.subject_id)

                          return (
                            <tr key={item.id}>
                              <td>
                                <strong>{subject?.code || 'Subject'}</strong>
                                <div className="muted">{subject?.name || '—'}</div>
                              </td>
                              <td>{yearLevelLabel(item.year_level_id)}</td>
                              <td>
                                {Number(item.term_order) === 1
                                  ? '1st Semester'
                                  : Number(item.term_order) === 2
                                    ? '2nd Semester'
                                    : `Term ${item.term_order}`}
                              </td>
                              <td>{Number(item.weekly_hours).toFixed(1)}</td>
                              <td>{roomTypeLabel(item.required_room_type_id)}</td>
                              <td>
                                <details className="curriculum-edit">
                                  <summary>Edit</summary>
                                  <form className="form" action={updateCurriculumSubject}>
                                    <input
                                      type="hidden"
                                      name="curriculum_subject_id"
                                      value={item.id}
                                    />
                                    <label>
                                      Year Level
                                      <select
                                        name="year_level_id"
                                        required
                                        defaultValue={item.year_level_id}
                                      >
                                        {selectedYearLevels.map((year) => (
                                          <option key={year.id} value={year.id}>
                                            {year.name || `Year ${year.level_number}`}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label>
                                      Semester
                                      <select
                                        name="term_order"
                                        required
                                        defaultValue={String(item.term_order)}
                                      >
                                        <option value="1">1st Semester</option>
                                        <option value="2">2nd Semester</option>
                                      </select>
                                    </label>
                                    <label>
                                      Weekly Hours
                                      <input
                                        type="number"
                                        name="weekly_hours"
                                        min="0.5"
                                        step="0.5"
                                        required
                                        defaultValue={item.weekly_hours}
                                      />
                                    </label>
                                    <label>
                                      Required Room Type
                                      <select
                                        name="required_room_type_id"
                                        defaultValue={item.required_room_type_id || ''}
                                      >
                                        <option value="">Any suitable room</option>
                                        {(roomTypes || []).map((room) => (
                                          <option key={room.id} value={room.id}>
                                            {room.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <button className="btn btn-primary">Save</button>
                                  </form>
                                </details>
                              </td>
                              <td>
                                <form action={removeCurriculumSubject}>
                                  <input
                                    type="hidden"
                                    name="curriculum_subject_id"
                                    value={item.id}
                                  />
                                  <button className="btn btn-outline">Remove</button>
                                </form>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </DataTable>
                ) : (
                  <Empty text="No subjects assigned to this curriculum yet." />
                )}
              </section>
            </>
          )}
        </div>
      </details>
    </div>
  )
}

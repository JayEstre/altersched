'use client'

import Link from 'next/link'
import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { GlassModal } from './glass-modal'
import { ordinal } from '@/lib/format'
import styles from './subject-year-browser.module.css'

type Subject = {
  id: string
  departmentId: string
  year: number
  code: string
  name: string
  description: string
  units: number
  lecture: number
  lab: number
  roomTypeId: string
  facultyId: string
  isActive: boolean
  /** Year level in the active curriculum (what the generator uses); null when not mapped. */
  curriculumYear: number | null
  /** Curriculum terms (1 = 1st Semester, 2 = 2nd Semester) the subject is mapped to. */
  curriculumTerms: number[]
}

type Option = { id: string; name: string }

type Block = { id: string; code: string; year: number }

type Candidate = { id: string; name: string; load: number; maxLoad: number }

/** One subject taught in one block this semester (a class offering). */
type BlockClass = {
  offeringId: string
  sectionId: string
  subjectId: string
  facultyId: string | null
  facultyName: string | null
  mode: 'auto' | 'manual' | null
  hours: number
  candidates: Candidate[]
}

type Flash = { tone: 'success' | 'danger'; title: string; text: string } | null

type ServerAction = (formData: FormData) => void | Promise<void>

type Prepare = { semesterId: string; programId: string; action: ServerAction } | null

type Props = {
  subjects: Subject[]
  roomTypes: Option[]
  instructors: Option[]
  qualifications: Record<string, string[]>
  blocks: Block[]
  classes: BlockClass[]
  semesterName: string | null
  /** Result of the last action, shown when the dialog reopens after a save. */
  flash: Flash
  /** Creates the missing classes (class offerings) of the active semester. */
  prepare: Prepare
  updateAction: ServerAction
  statusAction: ServerAction
  deleteAction: ServerAction
  assignAction: ServerAction
}

/** Remembers the open year and subject across the page reload that follows a save. */
const VIEW_KEY = 'altersched:subject-catalog-view'

type SavedView = { year: number; subject: string | null }

function readSavedRaw(): string | null {
  try {
    return window.sessionStorage.getItem(VIEW_KEY)
  } catch {
    return null
  }
}

function parseView(raw: string | null): SavedView | null {
  try {
    const value = raw ? JSON.parse(raw) : null
    return value && typeof value.year === 'number' ? value : null
  } catch {
    return null
  }
}

function forgetView() {
  try {
    window.sessionStorage.removeItem(VIEW_KEY)
  } catch {
    // ignore
  }
}

const noSubscription = () => () => {}

function saveView(year: number, subject: string | null) {
  try {
    window.sessionStorage.setItem(VIEW_KEY, JSON.stringify({ year, subject }))
  } catch {
    // Storage unavailable (private mode): the dialog simply stays closed after saving.
  }
}

const YEARS = [1, 2, 3, 4]
const yearLabel = (year: number) => `${ordinal(year)} Year`
const termLabel = (term: number) => `${ordinal(term)} Sem`

/** The curriculum decides a subject's year level; the subject's own setting is the fallback. */
const yearOf = (subject: Subject) => subject.curriculumYear ?? subject.year

function PrepareButton({ prepare, label }: { prepare: Prepare; label: string }) {
  if (!prepare) return null
  return (
    <form action={prepare.action} className={styles.prepareForm}>
      <input type="hidden" name="semester_id" value={prepare.semesterId} />
      <input type="hidden" name="program_id" value={prepare.programId} />
      <input type="hidden" name="return_to" value="/admin/subjects" />
      <button type="submit" className="btn btn-primary btn-sm">
        {label}
      </button>
    </form>
  )
}

export function SubjectYearBrowser({
  subjects,
  roomTypes,
  instructors,
  qualifications,
  blocks,
  classes,
  semesterName,
  flash,
  prepare,
  updateAction,
  statusAction,
  deleteAction,
  assignAction,
}: Props) {
  // After a save the page reloads; reopen the same year and block so the user can carry on.
  // The saved view is only used together with that save's result message (flash).
  const savedRaw = useSyncExternalStore(noSubscription, readSavedRaw, () => null)
  const saved = flash ? parseView(savedRaw) : null
  const [picked, setPicked] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const year = picked ?? saved?.year ?? 1
  const reopen = picked === null && Boolean(saved)
  const reopenSubject = reopen ? (saved?.subject ?? null) : null

  const inYear = subjects.filter((subject) => yearOf(subject) === year)
  const yearBlocks = blocks.filter((block) => block.year === year)
  const yearBlockIds = new Set(yearBlocks.map((block) => block.id))
  const yearClasses = classes.filter((item) => yearBlockIds.has(item.sectionId))
  const assignedCount = yearClasses.filter((item) => item.facultyId).length
  const blocksWithoutClasses = yearBlocks.filter(
    (block) => !yearClasses.some((item) => item.sectionId === block.id)
  )
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? inYear.filter((subject) =>
        `${subject.code} ${subject.name} ${subject.description}`.toLowerCase().includes(needle)
      )
    : inYear

  function chooseYear(value: number) {
    forgetView()
    setQuery('')
    setPicked(value)
  }

  /** Remember which subject was being edited so it reopens after the save. */
  function rememberSubject(event: FormEvent<HTMLDivElement>) {
    const card = (event.target as HTMLElement).closest('[data-subject-id]')
    saveView(year, card?.getAttribute('data-subject-id') ?? null)
  }

  return (
    <section className="panel as-browser">
      <header className="as-browser-header">
        <h2>Browse Subjects by Year</h2>
        <p className="muted">Select a year level to view and edit its official subjects.</p>
      </header>
      <div className="as-year-grid" role="group" aria-label="Subject year level">
        {YEARS.map((value) => {
          const subjectCount = subjects.filter((subject) => yearOf(subject) === value).length
          const blockCount = blocks.filter((item) => item.year === value).length
          return (
            <button
              key={value}
              type="button"
              className={year === value ? 'as-year-card as-selected' : 'as-year-card'}
              onClick={() => chooseYear(value)}
              aria-pressed={year === value}
            >
              <strong>{yearLabel(value)}</strong>
              <small>
                {subjectCount} {subjectCount === 1 ? 'subject' : 'subjects'} · {blockCount}{' '}
                {blockCount === 1 ? 'block' : 'blocks'}
              </small>
            </button>
          )
        })}
      </div>
      <div className="as-browser-controls">
        <span className="muted">
          {inYear.length} {inYear.length === 1 ? 'subject' : 'subjects'} · {yearBlocks.length}{' '}
          {yearBlocks.length === 1 ? 'block' : 'blocks'} in {yearLabel(year)}
        </span>
        <GlassModal
          key={year}
          defaultOpen={reopen}
          onClose={forgetView}
          title={`${yearLabel(year)} Subjects`}
          description={`Click a subject to see its instructor in each block and to edit it${
            semesterName ? ` · ${semesterName}` : ''
          }`}
          trigger="View Subjects"
          wide
        >
          <div className={styles.body} onSubmitCapture={rememberSubject}>
            {saved && flash && (
              <div
                className={flash.tone === 'success' ? styles.flashSuccess : styles.flashDanger}
                role={flash.tone === 'success' ? 'status' : 'alert'}
              >
                <strong>{flash.title}</strong>
                {flash.text && <span>{flash.text}</span>}
              </div>
            )}

            <div className={styles.toolbar}>
              <div className={styles.searchRow}>
                <input
                  type="search"
                  className={styles.search}
                  placeholder="Search code, name or description"
                  aria-label="Search subjects"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <span className={styles.count}>
                  {visible.length} of {inYear.length} {inYear.length === 1 ? 'subject' : 'subjects'}
                  {yearClasses.length > 0 &&
                    ` · ${assignedCount} of ${yearClasses.length} classes have an instructor`}
                </span>
              </div>
            </div>

            {yearBlocks.length > 0 && blocksWithoutClasses.length > 0 && (
              <div className={styles.blockNotice}>
                <div>
                  <strong>
                    {blocksWithoutClasses.length === yearBlocks.length
                      ? `No classes yet for ${yearLabel(year)}`
                      : `Block ${blocksWithoutClasses.map((block) => block.code).join(', ')} ${
                          blocksWithoutClasses.length === 1 ? 'has' : 'have'
                        } no classes yet`}
                  </strong>
                  <span>
                    Instructors are assigned per class. Create this semester&apos;s classes from the
                    curriculum{semesterName ? ` (${semesterName})` : ''}; existing classes and their
                    instructors are kept.
                  </span>
                </div>
                {prepare ? (
                  <PrepareButton prepare={prepare} label="Prepare classes now" />
                ) : (
                  <Link href="/admin/class-offerings">Open Class Offerings</Link>
                )}
              </div>
            )}

            {visible.length === 0 ? (
              <div className={styles.empty}>
                <strong>{inYear.length ? 'No matching subjects' : 'No subjects yet'}</strong>
                <span>
                  {inYear.length
                    ? 'Try a different search.'
                    : 'Add a subject for this year level using the form on the main page.'}
                </span>
              </div>
            ) : (
              <div className={styles.list}>
                {visible.map((subject) => (
                  <SubjectCard
                    // Remount after a successful save so the "Unsaved" state resets.
                    key={`${subject.id}:${subject.code}:${subject.name}:${subject.description}:${subject.units}:${subject.lecture}:${subject.lab}:${subject.year}:${subject.roomTypeId}:${subject.facultyId}:${subject.isActive}`}
                    subject={subject}
                    roomTypes={roomTypes}
                    instructors={instructors}
                    qualifiedIds={qualifications[subject.id] ?? []}
                    blocks={yearBlocks}
                    classes={yearClasses.filter((item) => item.subjectId === subject.id)}
                    startOpen={subject.id === reopenSubject}
                    updateAction={updateAction}
                    statusAction={statusAction}
                    deleteAction={deleteAction}
                    assignAction={assignAction}
                  />
                ))}
              </div>
            )}
          </div>
        </GlassModal>
      </div>
    </section>
  )
}

function SubjectCard({
  subject,
  roomTypes,
  instructors,
  qualifiedIds,
  blocks,
  classes,
  startOpen,
  updateAction,
  statusAction,
  deleteAction,
  assignAction,
}: {
  subject: Subject
  roomTypes: Option[]
  instructors: Option[]
  qualifiedIds: string[]
  /** Blocks of this year level. */
  blocks: Block[]
  /** This subject's classes (one per block) this semester. */
  classes: BlockClass[]
  /** Open after a save, so the user carries on where they were. */
  startOpen: boolean
  updateAction: ServerAction
  statusAction: ServerAction
  deleteAction: ServerAction
  assignAction: ServerAction
}) {
  const [dirty, setDirty] = useState(false)
  const [hours, setHours] = useState({ lecture: subject.lecture, lab: subject.lab })
  const formId = `subject-edit-${subject.id}`
  const field = (name: string) => `${formId}-${name}`

  const roomName = roomTypes.find((room) => room.id === subject.roomTypeId)?.name ?? 'Any room'
  const qualified = new Set(qualifiedIds)
  const allowed = instructors.filter((instructor) => qualified.has(instructor.id))
  const assigned = instructors.find((instructor) => instructor.id === subject.facultyId)
  const assignedNotAllowed =
    Boolean(subject.facultyId) && !allowed.some((instructor) => instructor.id === subject.facultyId)

  function trackHours(event: FormEvent<HTMLFormElement>) {
    setDirty(true)
    const target = event.target as HTMLInputElement
    if (target.name === 'lecture_hours' || target.name === 'lab_hours') {
      const value = Number(target.value) || 0
      setHours((current) => ({
        ...current,
        [target.name === 'lecture_hours' ? 'lecture' : 'lab']: value,
      }))
    }
  }

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    const ok = window.confirm(
      `Delete ${subject.code} permanently? This cannot be undone. Subjects already used in a curriculum or schedule cannot be deleted. Deactivate them instead.`
    )
    if (!ok) event.preventDefault()
  }

  return (
    <details
      className={subject.isActive ? styles.card : `${styles.card} ${styles.cardInactive}`}
      open={dirty || startOpen || undefined}
      data-subject-id={subject.id}
    >
      <summary className={styles.summaryRow}>
        <span className={styles.code}>{subject.code}</span>
        <span className={styles.titleCell}>
          <strong>{subject.name}</strong>
          <small>
            {subject.units} units · {hours.lecture} lec{hours.lab > 0 ? ` + ${hours.lab} lab` : ''}{' '}
            h · {roomName}
            {subject.curriculumTerms.length > 0 &&
              ` · ${subject.curriculumTerms.map(termLabel).join(' & ')}`}
          </small>
        </span>
        <span className={styles.badges}>
          {subject.curriculumYear === null ? (
            <span
              className={styles.badgeDirty}
              title="The generator only schedules curriculum subjects"
            >
              Not in curriculum
            </span>
          ) : (
            subject.year >= 1 &&
            subject.curriculumYear !== subject.year && (
              <span
                className={styles.badgeDirty}
                title={`Subject says ${yearLabel(subject.year)}; the curriculum (used by the generator) says ${yearLabel(subject.curriculumYear)}`}
              >
                Year differs
              </span>
            )
          )}
          {blocks.length > 0 && <TeacherSummary blocks={blocks} classes={classes} />}
          {dirty && <span className={styles.badgeDirty}>Unsaved</span>}
          <span className={subject.isActive ? styles.badgeActive : styles.badgeInactive}>
            {subject.isActive ? 'Active' : 'Inactive'}
          </span>
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      {blocks.length > 0 && (
        <BlockInstructors
          blocks={blocks}
          classes={classes}
          subjectCode={subject.code}
          assignAction={assignAction}
        />
      )}

      <form id={formId} action={updateAction} onInput={trackHours} className={styles.form}>
        <input type="hidden" name="subject_id" value={subject.id} />
        <input type="hidden" name="department_id" value={subject.departmentId} />

        <h4 className={styles.sectionTitle}>Subject details</h4>
        <div className={styles.titleRow}>
          <div className={styles.codeField}>
            <label htmlFor={field('code')}>Code</label>
            <input id={field('code')} name="code" defaultValue={subject.code} required />
          </div>
          <div className={styles.nameField}>
            <label htmlFor={field('name')}>Subject name</label>
            <input id={field('name')} name="subject_name" defaultValue={subject.name} required />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={field('description')}>Description</label>
          <input
            id={field('description')}
            name="description"
            defaultValue={subject.description}
            placeholder="Optional short description"
          />
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor={field('units')}>Units</label>
            <input
              id={field('units')}
              name="units"
              type="number"
              min="0"
              max="20"
              step="0.5"
              defaultValue={subject.units}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={field('lecture')}>Lecture hrs / week</label>
            <input
              id={field('lecture')}
              name="lecture_hours"
              type="number"
              min="0"
              max="40"
              step="0.5"
              defaultValue={subject.lecture}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={field('lab')}>Lab hrs / week</label>
            <input
              id={field('lab')}
              name="lab_hours"
              type="number"
              min="0"
              max="40"
              step="0.5"
              defaultValue={subject.lab}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={field('year')}>Year level</label>
            <select
              id={field('year')}
              name="default_year_level"
              defaultValue={String(
                subject.year >= 1 ? subject.year : (subject.curriculumYear ?? '')
              )}
              required
            >
              <option value="" disabled>
                Select year level
              </option>
              {YEARS.map((value) => (
                <option key={value} value={value}>
                  {yearLabel(value)}
                </option>
              ))}
            </select>
            {subject.curriculumYear !== null &&
              subject.year >= 1 &&
              subject.curriculumYear !== subject.year && (
                <small className={styles.warn}>
                  Curriculum says {yearLabel(subject.curriculumYear)}. The generator follows the
                  curriculum; set {yearLabel(subject.curriculumYear)} here to match.
                </small>
              )}
            {subject.curriculumYear === null && (
              <small className={styles.warn}>
                Not in the active curriculum, so it is not scheduled.
              </small>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor={field('room')}>Room type</label>
            <select
              id={field('room')}
              name="default_room_type_id"
              defaultValue={subject.roomTypeId}
            >
              <option value="">Any room</option>
              {roomTypes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor={field('faculty')}>Preferred instructor</label>
            <select
              id={field('faculty')}
              name="default_faculty_id"
              defaultValue={subject.facultyId}
            >
              <option value="">Auto assign</option>
              {assignedNotAllowed && (
                <option value={subject.facultyId} disabled>
                  {assigned?.name ?? 'Previous instructor'} (not qualified)
                </option>
              )}
              {allowed.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
            {allowed.length === 0 && (
              <small className={styles.warn}>No qualified instructor yet</small>
            )}
          </div>
        </div>
      </form>

      <footer className={styles.footer}>
        <span className={styles.summary}>
          {hours.lecture + hours.lab} h per week
          {hours.lab > 0 ? ` · ${hours.lecture} lecture + ${hours.lab} lab` : ' · lecture only'}
        </span>
        <div className={styles.actions}>
          <form action={deleteAction} onSubmit={confirmDelete}>
            <input type="hidden" name="subject_id" value={subject.id} />
            <button type="submit" className={styles.dangerButton}>
              Delete
            </button>
          </form>
          <form action={statusAction}>
            <input type="hidden" name="subject_id" value={subject.id} />
            <input type="hidden" name="is_active" value={subject.isActive ? 'false' : 'true'} />
            <button type="submit" className="btn btn-outline btn-sm">
              {subject.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </form>
          <button type="submit" form={formId} className="btn btn-primary btn-sm">
            Save changes
          </button>
        </div>
      </footer>
    </details>
  )
}

/** One-line instructor summary on the closed card, e.g. "Art Dakay · all 6 blocks". */
function TeacherSummary({ blocks, classes }: { blocks: Block[]; classes: BlockClass[] }) {
  if (!classes.length) return <span className={styles.teacherMuted}>No classes yet</span>
  const assigned = classes.filter((item) => item.facultyId)
  const names = [...new Set(assigned.map((item) => item.facultyName ?? 'Instructor'))]
  if (assigned.length < blocks.length) {
    return (
      <span className={styles.teacherMissing}>
        {assigned.length} of {blocks.length} blocks have an instructor
      </span>
    )
  }
  return (
    <span className={styles.teacher}>
      {names.length === 1 ? names[0] : `${names.length} instructors`}
      <em>{blocks.length === 1 ? '1 block' : `all ${blocks.length} blocks`}</em>
    </span>
  )
}

/** Who teaches this subject in each block; each row saves on its own (lecture and lab together). */
function BlockInstructors({
  blocks,
  classes,
  subjectCode,
  assignAction,
}: {
  blocks: Block[]
  classes: BlockClass[]
  subjectCode: string
  assignAction: ServerAction
}) {
  const bySection = new Map(classes.map((item) => [item.sectionId, item]))
  return (
    <section className={styles.blockSection} aria-label={`Instructors for ${subjectCode}`}>
      <div className={styles.blockSectionHead}>
        <h4 className={styles.sectionTitle}>Instructor per block</h4>
        <span>Applies to the lecture and lab of that block. Saved changes are marked Manual.</span>
      </div>
      <ul className={styles.blockRows}>
        {blocks.map((block) => {
          const blockClass = bySection.get(block.id)
          return (
            <li key={block.id} className={styles.blockRow}>
              <span className={styles.blockCode}>{block.code}</span>
              {!blockClass ? (
                <span className={styles.blockEmpty}>No class yet for Block {block.code}</span>
              ) : !blockClass.candidates.length ? (
                <span className={styles.warn}>
                  No qualified instructor. Add one under Instructors → Qualified Subjects.
                </span>
              ) : (
                <form action={assignAction} className={styles.blockAssign}>
                  <input type="hidden" name="offering_id" value={blockClass.offeringId} />
                  <input type="hidden" name="return_to" value="/admin/subjects" />
                  <select
                    name="faculty_id"
                    defaultValue={blockClass.facultyId ?? ''}
                    aria-label={`Instructor for ${subjectCode} block ${block.code}`}
                  >
                    <option value="" disabled>
                      Select instructor
                    </option>
                    {blockClass.candidates.map((candidate) => {
                      const current = candidate.id === blockClass.facultyId
                      const projected = current ? candidate.load : candidate.load + blockClass.hours
                      const over = candidate.maxLoad > 0 && projected > candidate.maxLoad
                      return (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} ·{' '}
                          {candidate.maxLoad > 0
                            ? `${candidate.load}/${candidate.maxLoad} h`
                            : `${candidate.load} h`}
                          {over ? ' (over max load)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  <span
                    className={
                      !blockClass.facultyId
                        ? styles.modeMissing
                        : blockClass.mode === 'manual'
                          ? styles.modeManual
                          : styles.modeAuto
                    }
                  >
                    {!blockClass.facultyId
                      ? 'None'
                      : blockClass.mode === 'manual'
                        ? 'Manual'
                        : 'Auto'}
                  </span>
                  <button
                    type="submit"
                    name="intent"
                    value="assign"
                    className="btn btn-primary btn-sm"
                  >
                    Save
                  </button>
                  {blockClass.facultyId && (
                    <button
                      type="submit"
                      name="intent"
                      value="clear"
                      className="btn btn-outline btn-sm"
                      title="Hand this class back to automatic assignment"
                    >
                      Clear
                    </button>
                  )}
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

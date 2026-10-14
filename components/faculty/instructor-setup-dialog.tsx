'use client'

import { useEffect, useId, useRef, type MouseEvent } from 'react'
import { DAY_NAMES, formatTime12 } from '@/lib/format'
import styles from './instructor-setup-dialog.module.css'

export type SetupSubject = { id: string; code: string; name: string; departmentId: string | null }
export type SetupQualification = { id: string; facultyId: string; subjectId: string }
export type SetupAvailability = {
  id: string
  facultyId: string
  semesterId: string
  day: number
  start: string
  end: string
  type: 'available' | 'preferred' | 'unavailable'
}
export type SetupSemester = { id: string; label: string; active: boolean }
export type SetupKind = 'subjects' | 'availability'

type Action = (formData: FormData) => void | Promise<void>

type Props = {
  kind: SetupKind
  instructor: { id: string; name: string; employeeId: string; departmentId: string }
  subjects: SetupSubject[]
  qualifications: SetupQualification[]
  availability: SetupAvailability[]
  semesters: SetupSemester[]
  actions: {
    assignSubject: Action
    removeSubject: Action
    addAvailability: Action
    removeAvailability: Action
  }
  /** Result of the last save, shown at the top of the window. */
  flash?: { tone: 'success' | 'danger'; text: string } | null
  onClose: () => void
}

const TYPE_LABELS: Record<SetupAvailability['type'], string> = {
  available: 'Available',
  preferred: 'Preferred',
  unavailable: 'Unavailable',
}

const WEEK = [1, 2, 3, 4, 5, 6, 7]

/** Subjects or availability of one instructor, edited in a window over the list. */
export function InstructorSetupDialog({
  kind,
  instructor,
  subjects,
  qualifications,
  availability,
  semesters,
  actions,
  flash,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const open = `${kind}:${instructor.id}`

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const close = () => ref.current?.close()
  const onBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) close()
  }

  const title = kind === 'subjects' ? 'Subjects' : 'Availability'
  const description =
    kind === 'subjects'
      ? 'The generator only assigns this instructor to the subjects listed here.'
      : 'When this instructor can teach. With no windows at all, any time is allowed.'

  return (
    <dialog
      ref={ref}
      className="as-glass-dialog"
      aria-labelledby={titleId}
      onClick={onBackdrop}
      onClose={onClose}
      data-setup-dialog={kind}
    >
      <div className="as-glass-dialog-head">
        <div>
          <h2 id={titleId}>
            {title} · {instructor.name}
          </h2>
          <p>{description}</p>
        </div>
        <button type="button" className="as-glass-close" aria-label="Close window" onClick={close}>
          ×
        </button>
      </div>
      <div className="as-glass-dialog-body">
        {flash && (
          <p className={flash.tone === 'success' ? styles.flashOk : styles.flashBad} role="status">
            {flash.text}
          </p>
        )}
        {kind === 'subjects' ? (
          <SubjectsPanel
            open={open}
            instructor={instructor}
            subjects={subjects}
            qualifications={qualifications}
            actions={actions}
          />
        ) : (
          <AvailabilityPanel
            open={open}
            instructor={instructor}
            availability={availability}
            semesters={semesters}
            actions={actions}
          />
        )}
      </div>
    </dialog>
  )
}

function SubjectsPanel({
  open,
  instructor,
  subjects,
  qualifications,
  actions,
}: Pick<Props, 'instructor' | 'subjects' | 'qualifications' | 'actions'> & { open: string }) {
  const mine = qualifications.filter((item) => item.facultyId === instructor.id)
  const subjectById = new Map(subjects.map((item) => [item.id, item]))
  const taken = new Set(mine.map((item) => item.subjectId))
  const sameDepartment = subjects.filter((item) => item.departmentId === instructor.departmentId)
  const choices = (sameDepartment.length ? sameDepartment : subjects).filter(
    (item) => !taken.has(item.id)
  )

  return (
    <div className={styles.stack}>
      <section>
        <h3 className={styles.heading}>
          Can teach <span>{mine.length}</span>
        </h3>
        {mine.length === 0 ? (
          <p className={styles.none}>No subjects yet. Add the first one below.</p>
        ) : (
          <ul className={styles.chips}>
            {mine
              .map((item) => ({ item, subject: subjectById.get(item.subjectId) }))
              .sort((a, b) => (a.subject?.code ?? '').localeCompare(b.subject?.code ?? ''))
              .map(({ item, subject }) => (
                <li key={item.id}>
                  <form action={actions.removeSubject} className={styles.chip}>
                    <input type="hidden" name="faculty_subject_id" value={item.id} />
                    <input type="hidden" name="open" value={open} />
                    <span>
                      <strong>{subject?.code ?? 'Subject'}</strong> {subject?.name}
                    </span>
                    <button
                      type="submit"
                      aria-label={`Remove ${subject?.code ?? 'subject'}`}
                      title="Remove"
                      data-no-busy
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        )}
      </section>

      <form action={actions.assignSubject} className={styles.addRow}>
        <input type="hidden" name="faculty_id" value={instructor.id} />
        <input type="hidden" name="open" value={open} />
        <label className={styles.grow}>
          <span>Add a subject</span>
          <select name="subject_id" required defaultValue="">
            <option value="" disabled>
              {choices.length ? 'Choose a subject' : 'Every subject is already added'}
            </option>
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!choices.length}>
          Add subject
        </button>
      </form>
    </div>
  )
}

function AvailabilityPanel({
  open,
  instructor,
  availability,
  semesters,
  actions,
}: Pick<Props, 'instructor' | 'availability' | 'semesters' | 'actions'> & { open: string }) {
  const active = semesters.find((item) => item.active) ?? semesters[0]
  const semesterLabel = new Map(semesters.map((item) => [item.id, item.label]))
  const mine = availability
    .filter((item) => item.facultyId === instructor.id)
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
  // Suggest the first weekday that has no window yet, so a week is filled day after day.
  const nextDay = [1, 2, 3, 4, 5, 6].find((day) => !mine.some((item) => item.day === day)) ?? 1

  return (
    <div className={styles.stack}>
      <section>
        <h3 className={styles.heading}>
          Weekly windows <span>{mine.length}</span>
        </h3>
        <ol className={styles.week}>
          {WEEK.map((day) => {
            const windows = mine.filter((item) => item.day === day)
            if (day === 7 && !windows.length) return null
            return (
              <li key={day} className={styles.day}>
                <span className={styles.dayName}>{DAY_NAMES[day]}</span>
                {windows.length === 0 ? (
                  <span className={styles.none}>No window</span>
                ) : (
                  <span className={styles.windows}>
                    {windows.map((item) => (
                      <form
                        key={item.id}
                        action={actions.removeAvailability}
                        className={`${styles.window} ${styles[item.type]}`}
                      >
                        <input type="hidden" name="availability_id" value={item.id} />
                        <input type="hidden" name="open" value={open} />
                        <span>
                          {formatTime12(item.start)} – {formatTime12(item.end)}
                          <small>
                            {TYPE_LABELS[item.type]}
                            {item.semesterId !== active?.id &&
                              ` · ${semesterLabel.get(item.semesterId) ?? 'Other semester'}`}
                          </small>
                        </span>
                        <button
                          type="submit"
                          aria-label={`Remove ${DAY_NAMES[day]} ${formatTime12(item.start)}`}
                          title="Remove"
                          data-no-busy
                        >
                          ×
                        </button>
                      </form>
                    ))}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <form
        // Re-created after each save so the suggested day moves on.
        key={mine.length}
        action={actions.addAvailability}
        className={styles.addGrid}
      >
        <input type="hidden" name="faculty_id" value={instructor.id} />
        <input type="hidden" name="open" value={open} />
        <label>
          <span>Day</span>
          <select name="day_of_week" required defaultValue={String(nextDay)}>
            {WEEK.map((day) => (
              <option key={day} value={day}>
                {DAY_NAMES[day]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>From</span>
          <input name="start_time" type="time" required defaultValue="08:00" />
        </label>
        <label>
          <span>Until</span>
          <input name="end_time" type="time" required defaultValue="17:00" />
        </label>
        <label>
          <span>Type</span>
          <select name="availability_type" defaultValue="available">
            <option value="available">Available</option>
            <option value="preferred">Preferred</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label className={styles.wide}>
          <span>Semester</span>
          <select name="semester_id" required defaultValue={active?.id ?? ''}>
            {semesters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.active ? ' (active)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.addActions}>
          <button type="submit" className="btn btn-primary">
            Add window
          </button>
        </div>
      </form>
    </div>
  )
}

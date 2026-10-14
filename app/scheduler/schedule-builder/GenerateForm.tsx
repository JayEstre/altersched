'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, type ReactNode, type Ref } from 'react'
import { useFormStatus } from 'react-dom'
import { PROBLEM_LABELS, type GenerationReport } from '@/lib/scheduling/diagnose'
import { generateMasterSchedule, type GenerateState } from './actions'
import styles from './GenerateForm.module.css'

/** Number of problems shown before "Show more". */
const FIRST = 6
/** Number of affected classes listed per problem before "Show more classes". */
const ROWS = 8

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
      {pending ? 'Generating…' : 'Generate Schedule'}
    </button>
  )
}

/** Shown while the generator runs: placing a whole semester can take a few seconds. */
function PendingNote() {
  const { pending } = useFormStatus()
  if (!pending) return null
  return (
    <div className={styles.pending} role="status" data-pending>
      <span className={styles.pendingTrack} aria-hidden="true">
        <span />
      </span>
      Placing every class without block, instructor or room clashes…
    </div>
  )
}

/** The generator form; when classes cannot be placed it explains why, right below. */
export function GenerateForm({ children }: { children: ReactNode }) {
  const [state, formAction] = useActionState<GenerateState, FormData>(generateMasterSchedule, null)
  const reportRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (state) reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [state])

  return (
    <>
      <form action={formAction} className="generator-form" data-no-progress>
        {children}
        <div className="generator-actions">
          <Link href="/scheduler/class-offerings" className="btn btn-outline">
            Review Class Offerings
          </Link>
          <SubmitButton />
        </div>
        <PendingNote />
      </form>
      {state && <PlacementReport ref={reportRef} report={state.report} key={state.createdAt} />}
    </>
  )
}

function PlacementReport({ report, ref }: { report: GenerationReport; ref: Ref<HTMLElement> }) {
  const stuck = report.totalSessions - report.placedSessions
  const percent = report.totalSessions
    ? Math.round((report.placedSessions / report.totalSessions) * 100)
    : 0
  const first = report.problems.slice(0, FIRST)
  const rest = report.problems.slice(FIRST)

  return (
    <section
      ref={ref}
      className={styles.report}
      role="alert"
      aria-labelledby="placement-report-title"
      data-placement-report
    >
      <header className={styles.head}>
        <div>
          <span className={styles.kicker}>Nothing was saved</span>
          <h4 id="placement-report-title">
            {stuck} of {report.totalSessions} class{' '}
            {report.totalSessions === 1 ? 'session' : 'sessions'} could not be placed
          </h4>
          <p>
            Every session must fit without a block, instructor or room clash, so no schedule was
            created. Fix the items below, then generate again. Teaching week used:{' '}
            <strong>{report.window}</strong>.
          </p>
        </div>
        <div className={styles.meter} aria-label={`${report.placedSessions} sessions fit`}>
          <span className={styles.meterValue}>
            {report.placedSessions}/{report.totalSessions}
          </span>
          <span className={styles.meterLabel}>sessions fit</span>
          <span className={styles.meterTrack} aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        </div>
      </header>

      {report.shortages.length > 0 && (
        <div className={styles.shortages}>
          <h5>Not enough hours in the week</h5>
          <ul>
            {report.shortages.map((item) => (
              <li key={`${item.kind}:${item.name}`}>{item.text}</li>
            ))}
          </ul>
        </div>
      )}

      <ol className={styles.problems}>
        {first.map((problem) => (
          <Problem key={`${problem.code}:${problem.title}`} problem={problem} />
        ))}
      </ol>
      {rest.length > 0 && (
        <details className={styles.more}>
          <summary>Show {rest.length} more</summary>
          <ol className={styles.problems}>
            {rest.map((problem) => (
              <Problem key={`${problem.code}:${problem.title}`} problem={problem} />
            ))}
          </ol>
        </details>
      )}
    </section>
  )
}

function Problem({ problem }: { problem: GenerationReport['problems'][number] }) {
  return (
    <li className={styles.problem} data-problem={problem.code}>
      <div className={styles.problemHead}>
        <strong>{problem.title}</strong>
        <span className={styles.badge}>{PROBLEM_LABELS[problem.code]}</span>
      </div>
      <p className={styles.reason}>{problem.reason}</p>
      <div className={styles.classes}>
        <span className={styles.classesLabel}>
          {problem.sessions} {problem.sessions === 1 ? 'session' : 'sessions'} affected
        </span>
        <ClassList classes={problem.classes.slice(0, ROWS)} />
        {problem.classes.length > ROWS && (
          <details className={styles.moreClasses}>
            <summary>Show {problem.classes.length - ROWS} more classes</summary>
            <ClassList classes={problem.classes.slice(ROWS)} />
          </details>
        )}
      </div>
      <p className={styles.fix}>
        <span>How to fix</span>
        {problem.fix}
      </p>
    </li>
  )
}

function ClassList({ classes }: { classes: GenerationReport['problems'][number]['classes'] }) {
  return (
    <ul>
      {classes.map((item) => (
        <li key={`${item.offeringId}:${item.session}`}>
          <strong>{item.subjectCode}</strong>
          <span className={styles.className}>{item.subjectName}</span>
          <span className={styles.classMeta}>
            {item.block} · {item.session} · {item.instructor ?? 'No instructor yet'}
          </span>
        </li>
      ))}
    </ul>
  )
}

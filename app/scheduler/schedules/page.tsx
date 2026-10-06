import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'

import { submitScheduleForAdminReview } from './actions'

type SP = Promise<{
  success?: string
  error?: string
  details?: string
  count?: string
  schedule?: string
}>

function rel(value: any) {
  return Array.isArray(value)
    ? value[0] ?? null
    : value ?? null
}

function errorMessage(
  error?: string,
  details?: string,
  count?: string
) {
  if (!error) return ''

  const messages: Record<string, string> = {
    schedule_required:
      'Select a schedule first.',

    schedule_not_found:
      'The selected schedule could not be found or you are not authorized to manage it.',

    no_current_version:
      'This schedule does not have a valid current version yet.',

    schedule_read_only:
      'Published or archived schedules are read-only. Revisions must use the controlled alteration workflow.',

    already_submitted:
      'This schedule has already been submitted and is awaiting Super Admin review.',

    invalid_schedule_status:
      'This schedule is not currently in a state that can be submitted for review.',

    invalid_version_status:
      'Only a draft schedule version can be submitted for Super Admin review.',

    empty_schedule:
      'The schedule has no timetable entries. Complete the draft before submitting it for review.',

    entry_lookup_failed:
      'AlterSched could not verify the timetable entries.',

    validation_lookup_failed:
      'AlterSched could not verify the schedule validation results.',

    unresolved_conflicts: `Resolve the blocking conflict${
      Number(count || 0) === 1 ? '' : 's'
    } before submitting this schedule for Admin review.`,

    version_submit_failed:
      'AlterSched could not submit the current schedule version for review.',

    schedule_submit_failed:
      'AlterSched could not update the schedule review status.',
  }

  const base =
    messages[error] ||
    'Unable to process the schedule.'

  return details
    ? `${base} ${details}`
    : base
}

export default async function Page({
  searchParams,
}: {
  searchParams?: SP
}) {
  await requireRole([
    'department_scheduler',
  ])

  const p = searchParams
    ? await searchParams
    : {}

  const s =
    await createClient()

  /* =========================================================
     LOAD SCHEDULES
     ========================================================= */

  const {
    data,
    error: loadError,
  } = await s
    .from('schedules')
    .select(`
      id,
      title,
      status,
      updated_at,
      current_version_id,

      sections(
        code
      ),

      programs(
        code
      ),

      semesters(
        name
      ),

      schedule_versions(
        id,
        version_number,
        status,
        change_reason,
        created_at,
        published_at
      )
    `)
    .order(
      'updated_at',
      {
        ascending: false,
      }
    )

  const schedules: any[] =
    data || []

  const versionIds =
    schedules
      .map((item) => item.current_version_id)
      .filter(Boolean)

  const validationResult =
    versionIds.length
      ? await s
          .from('schedule_validation_logs')
          .select('id, schedule_version_id, severity, resolved, message')
          .in('schedule_version_id', versionIds)
          .eq('resolved', false)
      : { data: [] as any[] }

  const unresolvedLogs = validationResult.data ?? []
  const unresolvedByVersion = new Map<string, any[]>()

  for (const log of unresolvedLogs) {
    const list = unresolvedByVersion.get(log.schedule_version_id) ?? []
    list.push(log)
    unresolvedByVersion.set(log.schedule_version_id, list)
  }

  /* =========================================================
     STATS
     ========================================================= */

  const draftCount =
    schedules.filter(
      (item) =>
        item.status === 'draft'
    ).length

  const submittedCount =
    schedules.filter(
      (item) =>
        item.status === 'submitted'
    ).length

  const publishedCount =
    schedules.filter(
      (item) =>
        item.status === 'published'
    ).length

  const revisedDraftCount =
    schedules.filter((item) => {
      if (
        item.status !== 'draft' ||
        !item.current_version_id
      ) {
        return false
      }

      const versions =
        item.schedule_versions || []

      const currentVersion =
        versions.find(
          (version: any) =>
            version.id ===
            item.current_version_id
        )

      return Boolean(
        currentVersion?.change_reason
      )
    }).length

  const blockingIssues =
    unresolvedLogs.length

  const message =
    errorMessage(
      p.error,
      p.details,
      p.count
    )

  return (
    <>
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <PageHead
        eyebrow="REVIEW • VALIDATE • SUBMIT"
        title="Schedules"
        description="Review generated and revised department schedules before submitting them for Super Admin review. Final publication and student Code/QR distribution remain under the Super Admin."
      />

      {/* =====================================================
          STATS
      ====================================================== */}

      <div className="stats-grid">
        <Stat
          label="Schedule Records"
          value={schedules.length}
        />

        <Stat
          label="Drafts"
          value={draftCount}
        />

        <Stat
          label="Revised Drafts"
          value={revisedDraftCount}
        />

        <Stat
          label="Blocking Issues"
          value={blockingIssues}
          hint="Unresolved validation blockers"
        />

        <Stat
          label="Submitted"
          value={submittedCount}
        />

        <Stat
          label="Published"
          value={publishedCount}
        />
      </div>

      {/* =====================================================
          ERRORS
      ====================================================== */}

      {loadError && (
        <div className="form-alert error">
          Unable to load schedules:{' '}
          {loadError.message}
        </div>
      )}

      {message && (
        <div className="form-alert error">
          {message}
        </div>
      )}

      {/* =====================================================
          SUCCESS
      ====================================================== */}

      {p.success ===
        'submitted_for_review' && (
        <div className="form-alert success">
          Schedule submitted for Super
          Admin review. The Department
          Scheduler can no longer edit the
          submitted version unless it
          returns to the controlled revision
          workflow.
        </div>
      )}

      {/* =====================================================
          WORKFLOW NOTE
      ====================================================== */}

      <section className="panel scheduler-note">
        <div>
          <p className="eyebrow">
            DEPARTMENT WORKFLOW
          </p>

          <h2>
            Review before submission
          </h2>

          <p className="muted">
            Generated schedules and
            approved faculty alterations
            remain working drafts while
            being reviewed by the
            Department Scheduler. Resolve
            all blocking conflicts before
            submitting the current version
            for Super Admin review.
          </p>
        </div>

        <div className="top-actions">
          <Link
            className="btn btn-outline"
            href="/scheduler/alterations"
          >
            Alteration Requests
          </Link>

          <Link
            className="btn btn-outline"
            href="/scheduler/schedule-builder"
          >
            Schedule Builder
          </Link>
        </div>
      </section>

      <section className="panel summary-panel">
        <div className="panel-header">
          <div>
            <h3>Schedule readiness</h3>
            <p>Current blockers reported by the schedule validation system.</p>
          </div>
        </div>

        <div className="readiness-grid">
          {schedules.length ? (
            schedules.slice(0, 5).map((item) => {
              const currentVersionId = item.current_version_id;
              const logs = currentVersionId ? unresolvedByVersion.get(currentVersionId) ?? [] : [];
              const blockerCount = logs.length;
              const severity = logs.some((log) => log.severity === 'critical') ? 'critical' : logs.some((log) => log.severity === 'warning') ? 'warning' : 'info';

              return (
                <div key={item.id} className="readiness-item">
                  <div>
                    <strong>{item.title || 'Untitled Schedule'}</strong>
                    <div className="schedule-meta">
                      {item.programs?.[0]?.code || 'BSIT'} / {item.sections?.[0]?.code || '—'}
                    </div>
                  </div>

                  <div className="readiness-status">
                    <Badge tone={blockerCount > 0 ? 'danger' : 'success'}>
                      {blockerCount > 0 ? `${blockerCount} blocker${blockerCount === 1 ? '' : 's'}` : 'Ready'}
                    </Badge>
                    {blockerCount > 0 && (
                      <span className="readiness-copy">
                        {logs[0]?.message || 'Unresolved validation issue'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="readiness-empty">No schedules available for validation.</div>
          )}
        </div>
      </section>

      {/* =====================================================
          SCHEDULE TABLE
      ====================================================== */}

      <section className="panel">
        {schedules.length ? (
          <div className="table-wrap">
            <DataTable>
              <thead>
                <tr>
                  <th>Schedule</th>
                  <th>Block</th>
                  <th>Term</th>
                  <th>Current Version</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {schedules.map(
                  (item) => {
                    const program =
                      rel(
                        item.programs
                      )

                    const section =
                      rel(
                        item.sections
                      )

                    const semester =
                      rel(
                        item.semesters
                      )

                    const versions:
                      any[] =
                      item.schedule_versions ||
                      []

                    const currentVersion =
                      versions.find(
                        (version) =>
                          version.id ===
                          item.current_version_id
                      )

                    const editable =
                      item.status ===
                      'draft'

                    const isRevision =
                      Boolean(
                        currentVersion?.change_reason
                      )

                    const validationEntries =
                      currentVersion?.id
                        ? unresolvedByVersion.get(currentVersion.id) ?? []
                        : []

                    const readinessTone =
                      validationEntries.length > 0
                        ? 'danger'
                        : 'success'

                    return (
                      <tr
                        key={
                          item.id
                        }
                      >
                        {/* ===============================
                            SCHEDULE
                        =============================== */}

                        <td>
                          <strong>
                            {item.title ||
                              'Untitled Schedule'}
                          </strong>

                          <div className="schedule-meta">
                            Updated{' '}
                            {item.updated_at
                              ? new Date(
                                  item.updated_at
                                ).toLocaleDateString(
                                  'en-PH'
                                )
                              : '—'}
                          </div>
                        </td>

                        {/* ===============================
                            BLOCK
                        =============================== */}

                        <td>
                          {program?.code ||
                            'BSIT'}{' '}
                          /{' '}
                          {section?.code ||
                            '—'}
                        </td>

                        {/* ===============================
                            TERM
                        =============================== */}

                        <td>
                          {semester?.name ||
                            '—'}
                        </td>

                        {/* ===============================
                            CURRENT VERSION
                        =============================== */}

                        <td>
                          {currentVersion ? (
                            <div className="version-cell">
                              <strong>
                                V
                                {
                                  currentVersion.version_number
                                }
                              </strong>

                              <span>
                                {
                                  currentVersion.status
                                }
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* ===============================
                            WORKFLOW
                        =============================== */}

                        <td>
                          {item.status ===
                          'submitted' ? (
                            <div className="workflow-cell">
                              <Badge>
                                Admin Review
                              </Badge>

                              <span>
                                Awaiting final
                                review
                              </span>
                            </div>
                          ) : item.status ===
                            'published' ? (
                            <div className="workflow-cell">
                              <Badge>
                                Official
                              </Badge>

                              <span>
                                Published
                                schedule
                              </span>
                            </div>
                          ) : item.status ===
                            'archived' ? (
                            <div className="workflow-cell">
                              <Badge>
                                Archived
                              </Badge>

                              <span>
                                Historical
                                record
                              </span>
                            </div>
                          ) : isRevision ? (
                            <div className="workflow-cell">
                              <Badge>
                                Revised Draft
                              </Badge>

                              <span>
                                {currentVersion?.change_reason ||
                                  'Approved alteration'}
                              </span>
                            </div>
                          ) : (
                            <div className="workflow-cell">
                              <Badge>
                                Generated Draft
                              </Badge>

                              <span>
                                Initial working
                                schedule
                              </span>
                            </div>
                          )}
                        </td>

                        {/* ===============================
                            STATUS
                        =============================== */}

                        <td>
                          <div className="workflow-cell">
                            <Badge tone={readinessTone}>
                              {validationEntries.length > 0 ? `${validationEntries.length} blocker${validationEntries.length === 1 ? '' : 's'}` : 'Ready'}
                            </Badge>
                            <span>
                              {validationEntries.length > 0
                                ? validationEntries[0]?.message || 'Unresolved validation issue'
                                : 'No open validation blockers'}
                            </span>
                          </div>
                        </td>

                        {/* ===============================
                            ACTIONS
                        =============================== */}

                        <td>
                          <div className="action-row">

                            {/* REVIEW DRAFT */}

                            {editable && (
                              <Link
                                className="btn btn-outline"
                                href={`/scheduler/schedule-builder?schedule=${item.id}`}
                              >
                                Review
                              </Link>
                            )}

                            {/* EXCEL */}

                            <a
                              className="btn btn-outline"
                              href={`/api/export/schedule/${item.id}?format=xlsx`}
                            >
                              Excel
                            </a>

                            {/* CSV */}

                            <a
                              className="btn btn-outline"
                              href={`/api/export/schedule/${item.id}?format=csv`}
                            >
                              CSV
                            </a>

                            {/* SUBMIT */}

                            {item.status ===
                            'draft' ? (
                              <form
                                action={
                                  submitScheduleForAdminReview
                                }
                              >
                                <input
                                  type="hidden"
                                  name="schedule_id"
                                  value={
                                    item.id
                                  }
                                />

                                <button
                                  className="btn btn-primary"
                                  type="submit"
                                >
                                  Submit for
                                  Admin Review
                                </button>
                              </form>
                            ) : item.status ===
                              'submitted' ? (
                              <span className="schedule-readonly submitted">
                                Awaiting Admin
                                Review
                              </span>
                            ) : item.status ===
                              'published' ? (
                              <span className="schedule-readonly">
                                Published
                              </span>
                            ) : item.status ===
                              'archived' ? (
                              <span className="schedule-readonly">
                                Archived
                              </span>
                            ) : (
                              <span className="schedule-readonly">
                                {
                                  item.status
                                }
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </DataTable>
          </div>
        ) : (
          <Empty text="No schedules found. Generate a draft from Schedule Builder first." />
        )}
      </section>

      {/* =====================================================
          LOCAL STYLES
      ====================================================== */}

      <style>{`
        .scheduler-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .scheduler-note h2 {
          margin: 3px 0 4px;
          font-size: 17px;
        }

        .scheduler-note p {
          margin: 0;
          max-width: 760px;
          font-size: 12px;
          line-height: 1.5;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
        }

        .data-table th,
        .data-table td {
          padding-top: 9px;
          padding-bottom: 9px;
          vertical-align: middle;
        }

        .schedule-meta {
          margin-top: 3px;
          font-size: 10px;
          color: var(--muted);
        }

        .version-cell {
          display: grid;
          gap: 2px;
        }

        .version-cell strong {
          font-size: 12px;
        }

        .version-cell span {
          font-size: 10px;
          color: var(--muted);
          text-transform: capitalize;
        }

        .workflow-cell {
          display: grid;
          gap: 5px;
          max-width: 220px;
        }

        .workflow-cell span {
          font-size: 10px;
          line-height: 1.35;
          color: var(--muted);
        }

        .summary-panel {
          margin-bottom: 18px;
        }

        .readiness-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .readiness-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
        }

        .readiness-status {
          display: grid;
          gap: 6px;
          justify-items: end;
          text-align: right;
        }

        .readiness-copy {
          font-size: 10px;
          line-height: 1.4;
          color: var(--muted);
          max-width: 180px;
        }

        .readiness-empty {
          font-size: 12px;
          color: var(--muted);
          padding: 8px 0;
        }

        .action-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .action-row form {
          margin: 0;
        }

        .action-row .btn,
        .top-actions .btn {
          min-height: 32px;
          padding: 6px 10px;
          font-size: 11px;
          white-space: nowrap;
        }

        .schedule-readonly {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 5px 9px;
          border: 1px solid var(--line);
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
          white-space: nowrap;
        }

        .schedule-readonly.submitted {
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .data-table {
            min-width: 920px;
          }
        }

        @media (max-width: 760px) {
          .scheduler-note {
            align-items: stretch;
            flex-direction: column;
          }

          .top-actions {
            width: 100%;
          }

          .top-actions .btn {
            width: fit-content;
          }

          .action-row {
            min-width: 190px;
          }
        }
      `}</style>
    </>
  )
}
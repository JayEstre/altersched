import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Empty, Badge, Notice } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { submitScheduleForAdminReview } from './actions'
import { one } from '@/lib/relations'
import { isRevisionNote } from '@/lib/format'
import styles from './page.module.css'

type SP = Promise<{
  success?: string
  error?: string
  details?: string
  count?: string
  schedule?: string
}>

function errorMessage(error?: string, details?: string, count?: string) {
  if (!error) return ''

  const messages: Record<string, string> = {
    schedule_required: 'Select a schedule first.',
    schedule_not_found:
      'The selected schedule could not be found or you are not authorized to manage it.',
    no_current_version: 'This schedule does not have a valid current version yet.',
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
    entry_lookup_failed: 'AlterSched could not verify the timetable entries.',
    validation_lookup_failed: 'AlterSched could not verify the schedule validation results.',
    unresolved_conflicts: `Resolve the blocking conflict${
      Number(count || 0) === 1 ? '' : 's'
    } before submitting this schedule for Admin review.`,
    version_submit_failed: 'AlterSched could not submit the current schedule version for review.',
    schedule_submit_failed: 'AlterSched could not update the schedule review status.',
  }

  const base = messages[error] || 'Unable to process the schedule.'

  return details ? `${base} ${details}` : base
}

export default async function Page({ searchParams }: { searchParams?: SP }) {
  await requireRole(['department_scheduler'])
  const p = searchParams ? await searchParams : {}
  const s = await createClient()

  /* =========================================================
     LOAD SCHEDULES
     ========================================================= */

  const { data, error: loadError } = await s
    .from('schedules')
    .select(
      `
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
      schedule_versions!schedule_versions_schedule_id_fkey(
        id,
        version_number,
        status,
        change_reason,
        created_at,
        published_at
      )
    `
    )
    .order('updated_at', {
      ascending: false,
    })

  const schedules = data ?? []
  const versionIds = schedules
    .map((item) => item.current_version_id)
    .filter((id): id is string => Boolean(id))

  const validationResult = versionIds.length
    ? await s
        .from('schedule_validation_logs')
        .select('id, schedule_version_id, severity, resolved, message')
        .in('schedule_version_id', versionIds)
        .eq('resolved', false)
    : { data: [] }

  const unresolvedLogs = validationResult.data ?? []
  const unresolvedByVersion = new Map<string, typeof unresolvedLogs>()

  for (const log of unresolvedLogs) {
    const list = unresolvedByVersion.get(log.schedule_version_id) ?? []
    list.push(log)
    unresolvedByVersion.set(log.schedule_version_id, list)
  }

  /* =========================================================
     STATS
     ========================================================= */

  const draftCount = schedules.filter((item) => item.status === 'draft').length
  const submittedCount = schedules.filter((item) => item.status === 'submitted').length
  const publishedCount = schedules.filter((item) => item.status === 'published').length

  const revisedDraftCount = schedules.filter((item) => {
    if (item.status !== 'draft' || !item.current_version_id) {
      return false
    }

    const versions = item.schedule_versions || []
    const currentVersion = versions.find((version) => version.id === item.current_version_id)

    return isRevisionNote(currentVersion?.change_reason)
  }).length

  const blockingIssues = unresolvedLogs.length
  const message = errorMessage(p.error, p.details, p.count)

  return (
    <>
      <PageHead
        title="Schedules"
        description="One schedule per block. Fix any problems, then submit each draft; the Administrator reviews and publishes it."
        actions={
          <Link className="btn btn-primary" href="/scheduler/schedule-builder">
            Open schedule builder
          </Link>
        }
      />
      {loadError && (
        <Notice tone="danger" title="Schedules could not be loaded.">
          {loadError.message}
        </Notice>
      )}
      {message && <Notice tone="danger">{message}</Notice>}
      {p.success === 'submitted_for_review' && (
        <Notice tone="success" title="Submitted.">
          The Administrator can now review and publish this schedule. It can no longer be edited
          here.
        </Notice>
      )}

      <div className="stats-grid">
        <Stat
          label="Drafts"
          value={draftCount}
          hint={revisedDraftCount ? `${revisedDraftCount} revised after a request` : undefined}
        />
        <Stat label="With problems" value={blockingIssues} />
        <Stat label="Waiting for Administrator" value={submittedCount} />
        <Stat label="Published" value={publishedCount} />
      </div>

      <section className="panel">
        {schedules.length ? (
          <DataTable minWidth={900}>
            <thead>
              <tr>
                <th>Schedule</th>
                <th>Version</th>
                <th>Stage</th>
                <th>Check</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {schedules.map((item) => {
                const program = one(item.programs)
                const section = one(item.sections)
                const semester = one(item.semesters)
                const versions = item.schedule_versions ?? []
                const currentVersion = versions.find(
                  (version) => version.id === item.current_version_id
                )
                const isRevision = isRevisionNote(currentVersion?.change_reason)
                const problems = currentVersion?.id
                  ? (unresolvedByVersion.get(currentVersion.id) ?? [])
                  : []

                const stage =
                  item.status === 'submitted'
                    ? { label: 'Waiting for Administrator', tone: 'warning' as const, note: '' }
                    : item.status === 'published'
                      ? { label: 'Published', tone: 'success' as const, note: '' }
                      : item.status === 'archived'
                        ? { label: 'Archived', tone: 'default' as const, note: '' }
                        : isRevision
                          ? {
                              label: 'Revised draft',
                              tone: 'info' as const,
                              note: currentVersion?.change_reason ?? '',
                            }
                          : { label: 'Draft', tone: 'info' as const, note: '' }

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title || 'Untitled schedule'}</strong>
                      <small>
                        {program?.code || 'BSIT'} · Block {section?.code || '—'} ·{' '}
                        {semester?.name || '—'}
                      </small>
                    </td>
                    <td>
                      {currentVersion ? `Version ${currentVersion.version_number}` : '—'}
                      {item.updated_at && (
                        <small>
                          Updated {new Date(item.updated_at).toLocaleDateString('en-PH')}
                        </small>
                      )}
                    </td>
                    <td>
                      <Badge tone={stage.tone}>{stage.label}</Badge>
                      {stage.note && <small className={styles.note}>{stage.note}</small>}
                    </td>
                    <td>
                      <Badge tone={problems.length ? 'danger' : 'success'}>
                        {problems.length
                          ? `${problems.length} problem${problems.length === 1 ? '' : 's'}`
                          : 'No problems'}
                      </Badge>
                      {problems.length > 0 && (
                        <small className={styles.note}>
                          {problems[0]?.message || 'Unresolved validation issue'}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {item.status === 'draft' && (
                          <>
                            <Link
                              className="btn btn-outline btn-sm"
                              href={`/scheduler/schedule-builder?schedule=${item.id}`}
                            >
                              Review
                            </Link>
                            <form action={submitScheduleForAdminReview}>
                              <input type="hidden" name="schedule_id" value={item.id} />
                              <button className="btn btn-primary btn-sm" type="submit">
                                Submit for Admin Review
                              </button>
                            </form>
                          </>
                        )}
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`/api/export/schedule/${item.id}?format=xlsx`}
                        >
                          Excel
                        </a>
                        <a
                          className="btn btn-ghost btn-sm"
                          href={`/api/export/schedule/${item.id}?format=csv`}
                        >
                          CSV
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        ) : (
          <Empty
            title="No schedules yet"
            text="Generate the schedule in the Schedule builder; it creates one draft per block."
          />
        )}
      </section>
    </>
  )
}

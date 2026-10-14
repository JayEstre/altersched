import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import type { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { archiveSchedule } from './actions'
import { one } from '@/lib/relations'
import { isRevisionNote } from '@/lib/format'
import styles from './page.module.css'

type SearchParams = Record<string, string | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireRole(['super_admin'])
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()

  /* ============================================================
     LOAD SCHEDULES
     ============================================================ */

  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedules')
    .select(
      `
      id,
      title,
      status,
      updated_at,
      current_version_id,
      section_id,
      program_id,
      semester_id,
      sections(
        code
      ),
      programs(
        code
      ),
      semesters(
        name
      )
    `
    )
    .order('updated_at', {
      ascending: false,
    })

  const rows = scheduleData ?? []

  /* ============================================================
     LOAD VERSION RECORDS SEPARATELY
     schedules <-> schedule_versions has multiple relationships,
     therefore versions are intentionally loaded separately.
     ============================================================ */

  const scheduleIds = rows.map((row) => row.id)
  type VersionRow = Pick<
    Tables<'schedule_versions'>,
    | 'id'
    | 'schedule_id'
    | 'version_number'
    | 'status'
    | 'change_reason'
    | 'created_at'
    | 'published_at'
  >
  let versions: VersionRow[] = []
  let versionError: { message: string } | null = null

  if (scheduleIds.length > 0) {
    const result = await supabase
      .from('schedule_versions')
      .select(
        `
          id,
          schedule_id,
          version_number,
          status,
          change_reason,
          created_at,
          published_at
        `
      )
      .in('schedule_id', scheduleIds)

    versions = result.data ?? []
    versionError = result.error
  }

  /* ============================================================
     VERSION INFORMATION
     ============================================================ */

  const versionCount = new Map<string, number>()
  const currentVersions = new Map<string, VersionRow>()

  for (const version of versions) {
    const count = versionCount.get(version.schedule_id) ?? 0
    versionCount.set(version.schedule_id, count + 1)
  }

  for (const schedule of rows) {
    if (!schedule.current_version_id) {
      continue
    }

    const currentVersion = versions.find((version) => version.id === schedule.current_version_id)

    if (currentVersion) {
      currentVersions.set(schedule.id, currentVersion)
    }
  }

  /* ============================================================
     PAGE ERROR
     ============================================================ */

  const pageError =
    params.details || scheduleError?.message || versionError?.message || params.error

  /* ============================================================
     STATS
     ============================================================ */

  const draftCount = rows.filter((row) => row.status === 'draft').length
  const submittedCount = rows.filter((row) => row.status === 'submitted').length
  const publishedCount = rows.filter((row) => row.status === 'published').length
  const archivedCount = rows.filter((row) => row.status === 'archived').length

  /* ============================================================
     PAGE
     ============================================================ */

  return (
    <div className={styles.scope}>
      <PageHead
        title="Schedules"
        description="Review what the Department Scheduler submitted, then publish. Publishing notifies the instructors and creates the public link and QR code."
      />
      {/* ======================================================
          STATS
      ====================================================== */}
      <div className="stats-grid">
        <Stat label="Waiting for you" value={submittedCount} />
        <Stat label="Drafts (Scheduler)" value={draftCount} />
        <Stat label="Published" value={publishedCount} />
        <Stat label="Archived" value={archivedCount} />
      </div>
      {/* ======================================================
          WORKFLOW
      ====================================================== */}
      {/* ======================================================
          SUCCESS: PUBLISHED
      ====================================================== */}
      {params.success === 'published' && (
        <div className="portal-alert portal-alert-success">
          <strong>Schedule published.</strong>
          <span>
            Public access code: <b>{params.code ?? '—'}</b>
            {' — '}
            distribute this only to the correct block.
            {params.qr && (
              <>
                {' '}
                QR token: <b>{params.qr}</b>
              </>
            )}
          </span>
        </div>
      )}
      {/* ======================================================
          SUCCESS: ARCHIVED
      ====================================================== */}
      {params.success === 'archived' && (
        <div className="portal-alert portal-alert-success">
          <strong>Schedule archived.</strong>
          <span>Its active access codes were revoked.</span>
        </div>
      )}
      {/* ======================================================
          ERROR
      ====================================================== */}
      {pageError && (
        <div className="portal-alert portal-alert-danger">
          <strong>Action failed.</strong>
          <span>{pageError}</span>
        </div>
      )}
      {/* ======================================================
          SCHEDULE TABLE
      ====================================================== */}
      <section className="panel">
        {rows.length > 0 ? (
          <DataTable minWidth={820}>
            <thead>
              <tr>
                <th>Schedule</th>
                <th>Version</th>
                <th>Stage</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((schedule) => {
                const program = one(schedule.programs)
                const section = one(schedule.sections)
                const semester = one(schedule.semesters)
                const versionsForSchedule = versionCount.get(schedule.id) ?? 0
                const currentVersion = currentVersions.get(schedule.id)
                const isRevision = isRevisionNote(currentVersion?.change_reason)
                const awaitingReview = schedule.status === 'submitted'
                const archived = schedule.status === 'archived'
                const stage = awaitingReview
                  ? {
                      label: 'Waiting for you',
                      tone: 'warning' as const,
                      note: isRevision ? 'Revised after a schedule request' : 'New schedule',
                    }
                  : schedule.status === 'published'
                    ? { label: 'Published', tone: 'success' as const, note: '' }
                    : archived
                      ? { label: 'Archived', tone: 'default' as const, note: '' }
                      : schedule.status === 'approved'
                        ? { label: 'Approved', tone: 'info' as const, note: '' }
                        : {
                            label: 'Draft',
                            tone: 'info' as const,
                            note: 'The Department Scheduler is still working on it',
                          }

                return (
                  <tr key={schedule.id}>
                    <td>
                      <strong>{schedule.title || 'Untitled schedule'}</strong>
                      <small>
                        {program?.code || '—'} · Block {section?.code || '—'} ·{' '}
                        {semester?.name || '—'}
                      </small>
                    </td>
                    <td>
                      {currentVersion ? `Version ${currentVersion.version_number}` : '—'}
                      <small>
                        {versionsForSchedule} version{versionsForSchedule === 1 ? '' : 's'} ·
                        updated{' '}
                        {schedule.updated_at
                          ? new Date(schedule.updated_at).toLocaleDateString('en-PH')
                          : '—'}
                      </small>
                    </td>
                    <td>
                      <Badge tone={stage.tone}>{stage.label}</Badge>
                      {stage.note && <small>{stage.note}</small>}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/admin/schedules/${schedule.id}`}
                          className={
                            awaitingReview ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'
                          }
                        >
                          {awaitingReview ? 'Final Review' : 'View'}
                        </Link>
                        {!archived && (
                          <form action={archiveSchedule}>
                            <input type="hidden" name="schedule_id" value={schedule.id} />
                            <button type="submit" className="btn btn-ghost btn-sm">
                              Archive
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        ) : (
          <Empty
            title="Nothing to review yet"
            text="Schedules appear here once the Department Scheduler generates them."
          />
        )}
      </section>
    </div>
  )
}

import Link from 'next/link'
<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import type { Tables } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { archiveSchedule } from './actions'
import { one } from '@/lib/relations'
import styles from './page.module.css'

type SearchParams = Record<string, string | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireRole(['super_admin'])
  const params = searchParams ? await searchParams : {}
=======

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Empty, Badge } from '@/components/ui'
import { DataTable } from '@/components/data-table'

import { archiveSchedule } from './actions'

type SearchParams = Record<string, string | undefined>

function rel(value: any) {
  return Array.isArray(value)
    ? value[0] ?? null
    : value ?? null
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await requireRole(['super_admin'])

  const params = searchParams
    ? await searchParams
    : {}

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const supabase = await createClient()

  /* ============================================================
     LOAD SCHEDULES
     ============================================================ */

<<<<<<< HEAD
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedules')
    .select(
      `
=======
  const {
    data: scheduleData,
    error: scheduleError,
  } = await supabase
    .from('schedules')
    .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      id,
      title,
      status,
      updated_at,
      current_version_id,
      section_id,
      program_id,
      semester_id,
<<<<<<< HEAD
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
=======

      sections(
        code
      ),

      programs(
        code
      ),

      semesters(
        name
      )
    `)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    .order('updated_at', {
      ascending: false,
    })

<<<<<<< HEAD
  const rows = scheduleData ?? []

  /* ============================================================
     LOAD VERSION RECORDS SEPARATELY
=======
  const rows: any[] =
    scheduleData ?? []

  /* ============================================================
     LOAD VERSION RECORDS SEPARATELY

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
     schedules <-> schedule_versions has multiple relationships,
     therefore versions are intentionally loaded separately.
     ============================================================ */

<<<<<<< HEAD
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
=======
  const scheduleIds =
    rows.map(
      (row: any) => row.id
    )

  let versions: any[] = []

  let versionError:
    | { message: string }
    | null = null

  if (scheduleIds.length > 0) {
    const result =
      await supabase
        .from('schedule_versions')
        .select(`
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
          id,
          schedule_id,
          version_number,
          status,
          change_reason,
          created_at,
          published_at
<<<<<<< HEAD
        `
      )
      .in('schedule_id', scheduleIds)

    versions = result.data ?? []
    versionError = result.error
=======
        `)
        .in(
          'schedule_id',
          scheduleIds
        )

    versions =
      result.data ?? []

    versionError =
      result.error
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }

  /* ============================================================
     VERSION INFORMATION
     ============================================================ */

<<<<<<< HEAD
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
=======
  const versionCount =
    new Map<string, number>()

  const currentVersions =
    new Map<string, any>()

  for (const version of versions) {
    const count =
      versionCount.get(
        version.schedule_id
      ) ?? 0

    versionCount.set(
      version.schedule_id,
      count + 1
    )
  }

  for (const schedule of rows) {
    if (
      !schedule.current_version_id
    ) {
      continue
    }

    const currentVersion =
      versions.find(
        (version) =>
          version.id ===
          schedule.current_version_id
      )

    if (currentVersion) {
      currentVersions.set(
        schedule.id,
        currentVersion
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  /* ============================================================
     PAGE ERROR
     ============================================================ */

  const pageError =
<<<<<<< HEAD
    params.details || scheduleError?.message || versionError?.message || params.error
=======
    params.details ||
    scheduleError?.message ||
    versionError?.message ||
    params.error
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* ============================================================
     STATS
     ============================================================ */

<<<<<<< HEAD
  const draftCount = rows.filter((row) => row.status === 'draft').length
  const submittedCount = rows.filter((row) => row.status === 'submitted').length
  const approvedCount = rows.filter((row) => row.status === 'approved').length
  const publishedCount = rows.filter((row) => row.status === 'published').length
  const archivedCount = rows.filter((row) => row.status === 'archived').length
=======
  const draftCount =
    rows.filter(
      (row: any) =>
        row.status === 'draft'
    ).length

  const submittedCount =
    rows.filter(
      (row: any) =>
        row.status === 'submitted'
    ).length

  const approvedCount =
    rows.filter(
      (row: any) =>
        row.status === 'approved'
    ).length

  const publishedCount =
    rows.filter(
      (row: any) =>
        row.status === 'published'
    ).length

  const archivedCount =
    rows.filter(
      (row: any) =>
        row.status === 'archived'
    ).length
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  /* ============================================================
     PAGE
     ============================================================ */

  return (
<<<<<<< HEAD
    <div className={styles.scope}>
      <PageHead
        eyebrow="FINAL REVIEW • VERSION CONTROL"
        title="Schedules"
        description="Review schedules submitted by Department Schedulers before final publication. Publishing and public read-only Code/QR generation remain controlled Super Admin actions."
      />
      {/* ======================================================
          STATS
      ====================================================== */}
      <div className="stats-grid">
        <Stat label="Schedule Records" value={rows.length} />
        <Stat label="Draft" value={draftCount} />
        <Stat label="Awaiting Review" value={submittedCount} />
        <Stat label="Approved" value={approvedCount} />
        <Stat label="Published" value={publishedCount} />
        <Stat label="Archived" value={archivedCount} />
      </div>
      {/* ======================================================
          WORKFLOW
      ====================================================== */}
      <section className="panel admin-workflow">
        <div>
          <p className="eyebrow">SUPER ADMIN WORKFLOW</p>
          <h2>Final schedule review</h2>
          <p className="muted">
            Department Schedulers submit conflict-free schedules for final review. Open submitted
            schedules to inspect the timetable and validation results before publication. Public
            Code/QR credentials are generated only after successful publication.
          </p>
        </div>
      </section>
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
=======
    <>
      <PageHead
        eyebrow="FINAL REVIEW • VERSION CONTROL"
        title="Schedules"
        description="Review schedules submitted by Department Schedulers before final publication. Publishing and student access Code/QR generation remain controlled Super Admin actions."
      />

      {/* ======================================================
          STATS
      ====================================================== */}

      <div className="stats-grid">
        <Stat
          label="Schedule Records"
          value={rows.length}
        />

        <Stat
          label="Draft"
          value={draftCount}
        />

        <Stat
          label="Awaiting Review"
          value={submittedCount}
        />

        <Stat
          label="Approved"
          value={approvedCount}
        />

        <Stat
          label="Published"
          value={publishedCount}
        />

        <Stat
          label="Archived"
          value={archivedCount}
        />
      </div>

      {/* ======================================================
          WORKFLOW
      ====================================================== */}

      <section className="panel admin-workflow">
        <div>
          <p className="eyebrow">
            SUPER ADMIN WORKFLOW
          </p>

          <h2>
            Final schedule review
          </h2>

          <p className="muted">
            Department Schedulers submit
            conflict-free schedules for
            final review. Open submitted
            schedules to inspect the
            timetable and validation
            results before publication.
            Student Code/QR credentials are
            generated only after successful
            publication.
          </p>
        </div>
      </section>

      {/* ======================================================
          SUCCESS: PUBLISHED
      ====================================================== */}

      {params.success ===
        'published' && (
        <div className="portal-alert portal-alert-success">
          <strong>
            Schedule published.
          </strong>

          <span>
            Student code:{' '}
            <b>
              {params.code ?? '—'}
            </b>

            {' — '}
            distribute this only to the
            correct block.

            {params.qr && (
              <>
                {' '}
                QR token:{' '}
                <b>{params.qr}</b>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              </>
            )}
          </span>
        </div>
      )}
<<<<<<< HEAD
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
=======

      {/* ======================================================
          SUCCESS: ARCHIVED
      ====================================================== */}

      {params.success ===
        'archived' && (
        <div className="portal-alert portal-alert-success">
          <strong>
            Schedule archived.
          </strong>

          <span>
            Its active access codes were
            revoked.
          </span>
        </div>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {pageError && (
        <div className="portal-alert portal-alert-danger">
          <strong>
            Action failed.
          </strong>

          <span>
            {pageError}
          </span>
        </div>
      )}

      {/* ======================================================
          SCHEDULE TABLE
      ====================================================== */}

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <div className="panel">
        {rows.length > 0 ? (
          <div className="table-wrap">
            <DataTable>
              <thead>
                <tr>
                  <th>Schedule</th>
<<<<<<< HEAD
                  <th>Program / Block</th>
                  <th>Term</th>
                  <th>Current Version</th>
                  <th>Versions</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((schedule) => {
                  const program = one(schedule.programs)
                  const section = one(schedule.sections)
                  const semester = one(schedule.semesters)
                  const versionsForSchedule = versionCount.get(schedule.id) ?? 0
                  const currentVersion = currentVersions.get(schedule.id)
                  const isRevision = Boolean(currentVersion?.change_reason)
                  const awaitingReview = schedule.status === 'submitted'
                  const published = schedule.status === 'published'
                  const archived = schedule.status === 'archived'

                  return (
                    <tr key={schedule.id}>
                      {/* ===============================
                            SCHEDULE
                        =============================== */}
                      <td>
                        <strong>{schedule.title || 'Untitled'}</strong>
                        <div className="schedule-meta">
                          Updated{' '}
                          {schedule.updated_at
                            ? new Date(schedule.updated_at).toLocaleDateString('en-PH')
                            : '—'}
                        </div>
                      </td>
                      {/* ===============================
                            PROGRAM / BLOCK
                        =============================== */}
                      <td>
                        {program?.code || '—'} / {section?.code || '—'}
                      </td>
                      {/* ===============================
                            TERM
                        =============================== */}
                      <td>{semester?.name || '—'}</td>
                      {/* ===============================
                            CURRENT VERSION
                        =============================== */}
                      <td>
                        {currentVersion ? (
                          <div className="version-cell">
                            <strong>V{currentVersion.version_number}</strong>
                            <span>{currentVersion.status}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      {/* ===============================
                            VERSION COUNT
                        =============================== */}
                      <td>{versionsForSchedule}</td>
                      {/* ===============================
                            WORKFLOW
                        =============================== */}
                      <td>
                        {awaitingReview ? (
                          <div className="workflow-cell">
                            <Badge>Final Review</Badge>
                            <span>
                              {isRevision
                                ? 'Revised schedule submitted for review'
                                : 'Department schedule submitted for review'}
                            </span>
                          </div>
                        ) : published ? (
                          <div className="workflow-cell">
                            <Badge>Official</Badge>
                            <span>Published schedule</span>
                          </div>
                        ) : archived ? (
                          <div className="workflow-cell">
                            <Badge>Archived</Badge>
                            <span>Historical record</span>
                          </div>
                        ) : schedule.status === 'approved' ? (
                          <div className="workflow-cell">
                            <Badge>Approved</Badge>
                            <span>Approved for controlled publication</span>
                          </div>
                        ) : (
                          <div className="workflow-cell">
                            <Badge>Draft</Badge>
                            <span>Department working draft</span>
                          </div>
                        )}
                      </td>
                      {/* ===============================
                            STATUS
                        =============================== */}
                      <td>
                        <Badge>{schedule.status}</Badge>
                      </td>
                      {/* ===============================
                            ACTIONS
                        =============================== */}
                      <td>
                        <div className="action-row">
                          {/* FINAL REVIEW / VIEW */}
                          <Link
                            href={`/admin/schedules/${schedule.id}`}
                            className={awaitingReview ? 'user-btn user-btn-primary' : 'user-btn'}
                          >
                            {awaitingReview ? 'Final Review' : 'View'}
                          </Link>
                          {/* ARCHIVE */}
                          {!archived && (
                            <form action={archiveSchedule}>
                              <input type="hidden" name="schedule_id" value={schedule.id} />
                              <button type="submit" className="user-btn user-btn-danger-soft">
                                Archive
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
=======

                  <th>
                    Program / Block
                  </th>

                  <th>Term</th>

                  <th>
                    Current Version
                  </th>

                  <th>
                    Versions
                  </th>

                  <th>
                    Workflow
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (schedule: any) => {
                    const program =
                      rel(
                        schedule.programs
                      )

                    const section =
                      rel(
                        schedule.sections
                      )

                    const semester =
                      rel(
                        schedule.semesters
                      )

                    const versionsForSchedule =
                      versionCount.get(
                        schedule.id
                      ) ?? 0

                    const currentVersion =
                      currentVersions.get(
                        schedule.id
                      )

                    const isRevision =
                      Boolean(
                        currentVersion
                          ?.change_reason
                      )

                    const awaitingReview =
                      schedule.status ===
                      'submitted'

                    const published =
                      schedule.status ===
                      'published'

                    const archived =
                      schedule.status ===
                      'archived'

                    return (
                      <tr
                        key={
                          schedule.id
                        }
                      >
                        {/* ===============================
                            SCHEDULE
                        =============================== */}

                        <td>
                          <strong>
                            {schedule.title ||
                              'Untitled'}
                          </strong>

                          <div className="schedule-meta">
                            Updated{' '}
                            {schedule.updated_at
                              ? new Date(
                                  schedule.updated_at
                                ).toLocaleDateString(
                                  'en-PH'
                                )
                              : '—'}
                          </div>
                        </td>

                        {/* ===============================
                            PROGRAM / BLOCK
                        =============================== */}

                        <td>
                          {program?.code ||
                            '—'}{' '}
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
                            VERSION COUNT
                        =============================== */}

                        <td>
                          {
                            versionsForSchedule
                          }
                        </td>

                        {/* ===============================
                            WORKFLOW
                        =============================== */}

                        <td>
                          {awaitingReview ? (
                            <div className="workflow-cell">
                              <Badge>
                                Final Review
                              </Badge>

                              <span>
                                {isRevision
                                  ? 'Revised schedule submitted for review'
                                  : 'Department schedule submitted for review'}
                              </span>
                            </div>
                          ) : published ? (
                            <div className="workflow-cell">
                              <Badge>
                                Official
                              </Badge>

                              <span>
                                Published
                                schedule
                              </span>
                            </div>
                          ) : archived ? (
                            <div className="workflow-cell">
                              <Badge>
                                Archived
                              </Badge>

                              <span>
                                Historical
                                record
                              </span>
                            </div>
                          ) : schedule.status ===
                            'approved' ? (
                            <div className="workflow-cell">
                              <Badge>
                                Approved
                              </Badge>

                              <span>
                                Approved for
                                controlled
                                publication
                              </span>
                            </div>
                          ) : (
                            <div className="workflow-cell">
                              <Badge>
                                Draft
                              </Badge>

                              <span>
                                Department
                                working draft
                              </span>
                            </div>
                          )}
                        </td>

                        {/* ===============================
                            STATUS
                        =============================== */}

                        <td>
                          <Badge>
                            {
                              schedule.status
                            }
                          </Badge>
                        </td>

                        {/* ===============================
                            ACTIONS
                        =============================== */}

                        <td>
                          <div className="action-row">

                            {/* FINAL REVIEW / VIEW */}

                            <Link
                              href={`/admin/schedules/${schedule.id}`}
                              className={
                                awaitingReview
                                  ? 'user-btn user-btn-primary'
                                  : 'user-btn'
                              }
                            >
                              {awaitingReview
                                ? 'Final Review'
                                : 'View'}
                            </Link>

                            {/* ARCHIVE */}

                            {!archived && (
                              <form
                                action={
                                  archiveSchedule
                                }
                              >
                                <input
                                  type="hidden"
                                  name="schedule_id"
                                  value={
                                    schedule.id
                                  }
                                />

                                <button
                                  type="submit"
                                  className="user-btn user-btn-danger-soft"
                                >
                                  Archive
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }
                )}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
              </tbody>
            </DataTable>
          </div>
        ) : (
          <Empty text="No schedules found. Department Schedulers must generate and submit a schedule first." />
        )}
      </div>
<<<<<<< HEAD
    </div>
  )
}
=======

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style>{`
        .admin-workflow {
          margin-bottom: 14px;
        }

        .admin-workflow h2 {
          margin: 3px 0 4px;
          font-size: 17px;
        }

        .admin-workflow p {
          margin: 0;
          max-width: 820px;
          font-size: 12px;
          line-height: 1.5;
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
          max-width: 210px;
        }

        .workflow-cell span {
          font-size: 10px;
          line-height: 1.35;
          color: var(--muted);
        }

        .action-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
        }

        .action-row form {
          margin: 0;
        }

        .action-row .user-btn {
          min-height: 32px;
          padding: 6px 10px;
          font-size: 11px;
          white-space: nowrap;
        }

        @media (max-width: 1050px) {
          .data-table {
            min-width: 980px;
          }
        }
      `}</style>
    </>
  )
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

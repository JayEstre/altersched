import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { Notice, PageHead, Stat } from '@/components/ui'
import { importMasterData } from './actions'
import styles from './page.module.css'

type PageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
    subjects_created?: string
    subjects_updated?: string
    sections_created?: string
    faculty_updated?: string
    qualifications_created?: string
    rooms_created?: string
    rooms_updated?: string
    curriculum_links?: string
    needs_review?: string
    skipped?: string

    // Template workbook import (importMasterData)
    records?: string
    subjects?: string
    curriculum?: string
    blocks?: string
    qualifications?: string
    facultyAvailability?: string
    rooms?: string
    roomAvailability?: string
  }>
}

function numberValue(value?: string) {
  const parsed = Number(value ?? '0')

  return Number.isFinite(parsed) ? parsed : 0
}

function getErrorMessage(error?: string) {
  switch (error) {
    case 'no_file':
      return 'Please select a file before starting the conversion.'

    case 'empty_file':
      return 'The selected file is empty.'

    case 'file_too_large':
      return 'The selected file is too large. Maximum upload size is 10 MB.'

    case 'unsupported_file':
      return 'This file type is not supported.'

    case 'no_readable_data':
      return 'AlterSched could not find readable data in the uploaded file.'

    case 'preview_too_large':
      return 'The converted preview is too large to continue using the current import session.'

    case 'conversion_failed':
      return 'The file could not be converted. Check the file and try again.'

    case 'missing_conversion_data':
    case 'invalid_conversion_data':
      return 'The converted file data is missing or invalid. Please upload the file again.'

    case 'missing_sheet':
      return 'The selected table or sheet could not be found.'

    case 'prepared_data_too_large':
      return 'The prepared import contains too much data for the current import session.'

    case 'prepare_failed':
      return 'AlterSched could not prepare the converted records.'

    case 'missing_import_data':
    case 'invalid_import_data':
      return 'The final import data is missing or invalid.'

    case 'reference_load_failed':
      return 'AlterSched could not load the required master-data references.'

    case 'existing_data_load_failed':
      return 'AlterSched could not check the existing master data.'

    case 'bsit_department_not_found':
      return 'The active BSIT department could not be found.'

    case 'bsit_program_not_found':
      return 'The active BSIT program could not be found.'

    case 'institution_not_found':
      return 'The institution reference required for room import could not be found.'

    case 'database_import_failed':
      return 'The database import failed. No missing information was invented. Check the server log for the exact database error.'

    default:
      return error ? 'The import could not be completed.' : ''
  }
}

export default async function ImportDataPage({ searchParams }: PageProps) {
  await requireRole(['super_admin'])
  const params = await searchParams
  const importComplete = params.success === 'import_complete'
  const errorMessage = getErrorMessage(params.error)

  const stats = {
    subjectsCreated: numberValue(params.subjects_created),
    subjectsUpdated: numberValue(params.subjects_updated),
    sectionsCreated: numberValue(params.sections_created),
    facultyUpdated: numberValue(params.faculty_updated),
    qualificationsCreated: numberValue(params.qualifications_created),
    roomsCreated: numberValue(params.rooms_created),
    roomsUpdated: numberValue(params.rooms_updated),
    curriculumLinks: numberValue(params.curriculum_links),
    needsReview: numberValue(params.needs_review),
    skipped: numberValue(params.skipped),
  }

  const totalChanges =
    stats.subjectsCreated +
    stats.subjectsUpdated +
    stats.sectionsCreated +
    stats.facultyUpdated +
    stats.qualificationsCreated +
    stats.roomsCreated +
    stats.roomsUpdated +
    stats.curriculumLinks

  return (
    <>
      <PageHead
        title="Import Data"
        description="Bring existing subjects, curriculum, blocks, rooms and instructor details into AlterSched instead of typing them."
      />

      {params.success === 'master_import_complete' && (
        <Notice
          tone="success"
          title={`${numberValue(params.records)} records saved from the AlterSched template.`}
        >
          Subjects {numberValue(params.subjects)} · Curriculum {numberValue(params.curriculum)} ·
          Blocks {numberValue(params.blocks)} · Qualifications {numberValue(params.qualifications)}{' '}
          · Instructor availability {numberValue(params.facultyAvailability)} · Rooms{' '}
          {numberValue(params.rooms)} · Room availability {numberValue(params.roomAvailability)}.{' '}
          <Link href="/admin/subjects">Open Subjects</Link>
        </Notice>
      )}

      {importComplete && (
        <section className="panel">
          <h3>Import finished · {totalChanges} changes saved</h3>
          <p className="muted">
            Existing records were reused or updated; information missing from the file was left
            blank, never guessed.
          </p>
          <div className={`stats-grid ${styles.results}`}>
            <Stat label="Subjects created" value={stats.subjectsCreated} />
            <Stat label="Subjects updated" value={stats.subjectsUpdated} />
            <Stat label="Blocks created" value={stats.sectionsCreated} />
            <Stat label="Qualifications" value={stats.qualificationsCreated} />
            <Stat label="Rooms created" value={stats.roomsCreated} />
            <Stat label="Rooms updated" value={stats.roomsUpdated} />
            <Stat label="Curriculum links" value={stats.curriculumLinks} />
            <Stat label="Needs review" value={stats.needsReview} />
            <Stat label="Skipped" value={stats.skipped} />
          </div>
          {(stats.needsReview > 0 || stats.skipped > 0) && (
            <Notice tone="warning" title="Some rows need attention.">
              The file was missing details such as room capacity, year level, block or instructor
              account. Complete them in Subjects, Rooms & Labs or Instructors.
            </Notice>
          )}
          <div className={styles.links}>
            <Link href="/admin/subjects" className="btn btn-outline btn-sm">
              Subjects
            </Link>
            <Link href="/admin/curriculum" className="btn btn-outline btn-sm">
              Curriculum
            </Link>
            <Link href="/admin/faculty" className="btn btn-outline btn-sm">
              Instructors
            </Link>
            <Link href="/admin/rooms" className="btn btn-outline btn-sm">
              Rooms & Labs
            </Link>
          </div>
        </section>
      )}

      {errorMessage && (
        <Notice tone="danger" title="The import could not continue.">
          {errorMessage}
        </Notice>
      )}

      <div className={styles.options}>
        <section className="panel">
          <span className={styles.tag}>Recommended</span>
          <h3>Use the AlterSched template</h3>
          <p className="muted">
            One Excel workbook with a sheet each for subjects, curriculum, blocks, instructor
            qualifications and availability, rooms and room availability. Fill it in, then import it
            in one step.
          </p>
          <ol className={styles.howto}>
            <li>
              {/* Plain <a>: a <Link> made Next.js prefetch this file-download route on every visit. */}
              <a href="/admin/import-export/template" download>
                Download the template
              </a>
            </li>
            <li>Fill in the sheets you need; leave the others empty.</li>
            <li>Upload the completed workbook here.</li>
          </ol>
          <form className={styles.uploadRow} action={importMasterData}>
            <label className="field">
              <span className="field-label">Completed template (.xlsx)</span>
              <input
                type="file"
                name="master_file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Import Template Workbook
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Convert another file</h3>
          <p className="muted">
            Have an existing class program or subject list? Upload it and AlterSched reads its
            tables. You match the columns and review every row before anything is saved.
          </p>
          <form
            action="/admin/import-export/convert"
            method="post"
            encType="multipart/form-data"
            className={styles.uploadRow}
          >
            <label className="field">
              <span className="field-label">Word, PDF, Excel, CSV or text file (max 10 MB)</span>
              <input
                type="file"
                name="reference_file"
                accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                required
              />
            </label>
            <button type="submit" className="btn btn-outline">
              Convert &amp; Preview
            </button>
          </form>
          <p className={styles.note}>
            Missing information stays blank and can be completed later; nothing is invented.
          </p>
        </section>
      </div>
    </>
  )
}

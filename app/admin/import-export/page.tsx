import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
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
    <div className={styles.scope}>
      <div className="page">
        <header className="pageHeader">
          <div>
            <div className="eyebrow">MASTER DATA</div>
            <h1>Import Data</h1>
            <p>
              Upload existing academic files, convert their contents, review the extracted
              information and safely import supported data into AlterSched.
            </p>
          </div>
        </header>
        {params.success === 'master_import_complete' && (
          <section className="card import-complete-card">
            <div className="eyebrow">✓ TEMPLATE IMPORT COMPLETE</div>
            <h2>{numberValue(params.records)} records saved from the AlterSched template</h2>
            <p>
              Subjects {numberValue(params.subjects)} · Curriculum {numberValue(params.curriculum)}{' '}
              · Blocks {numberValue(params.blocks)} · Qualifications{' '}
              {numberValue(params.qualifications)} · Instructor availability{' '}
              {numberValue(params.facultyAvailability)} · Rooms {numberValue(params.rooms)} · Room
              availability {numberValue(params.roomAvailability)}
            </p>
            <p>
              <Link href="/admin/subjects">View Subjects</Link> ·{' '}
              <Link href="/admin/curriculum">View Curriculum</Link> ·{' '}
              <Link href="/admin/faculty">View Instructors</Link> ·{' '}
              <Link href="/admin/rooms">View Rooms</Link>
            </p>
          </section>
        )}
        {importComplete && (
          <section className="result success">
            <div className="resultIcon">✓</div>
            <div className="resultContent">
              <div className="resultTop">
                <div>
                  <div className="eyebrow green">IMPORT COMPLETE</div>
                  <h2>Master data import finished</h2>
                  <p>
                    AlterSched processed the confirmed records. Existing records were reused or
                    updated where supported, while missing information remained blank.
                  </p>
                </div>
                <div className="totalChanges">
                  <strong>{totalChanges}</strong>
                  <span>database changes</span>
                </div>
              </div>
              <div className="resultStats">
                <ResultStat value={stats.subjectsCreated} label="Subjects Created" />
                <ResultStat value={stats.subjectsUpdated} label="Subjects Updated" />
                <ResultStat value={stats.sectionsCreated} label="Blocks Created" />
                <ResultStat value={stats.qualificationsCreated} label="Qualifications" />
                <ResultStat value={stats.roomsCreated} label="Rooms Created" />
                <ResultStat value={stats.roomsUpdated} label="Rooms Updated" />
                <ResultStat value={stats.curriculumLinks} label="Curriculum Links" />
                <ResultStat
                  value={stats.needsReview}
                  label="Needs Review"
                  warning={stats.needsReview > 0}
                />
                <ResultStat value={stats.skipped} label="Skipped" warning={stats.skipped > 0} />
              </div>
              {(stats.needsReview > 0 || stats.skipped > 0) && (
                <div className="reviewNotice">
                  <strong>Some records need attention</strong>
                  <p>
                    This is expected when the uploaded reference file is missing information such as
                    room capacity, year level, block, instructor account or other required master
                    data. AlterSched did not create fake values to fill those gaps.
                  </p>
                </div>
              )}
              <div className="resultActions">
                <Link href="/admin/subjects" className="smallButton">
                  View Subjects
                </Link>
                <Link href="/admin/curriculum" className="smallButton">
                  View Curriculum
                </Link>
                <Link href="/admin/faculty" className="smallButton">
                  View Instructors
                </Link>
                <Link href="/admin/rooms" className="smallButton">
                  View Rooms
                </Link>
              </div>
            </div>
          </section>
        )}
        {errorMessage && (
          <section className="result error">
            <div className="resultIcon">!</div>
            <div>
              <div className="eyebrow red">IMPORT ERROR</div>
              <h2>Import could not continue</h2>
              <p>{errorMessage}</p>
            </div>
          </section>
        )}
        <div className="mainGrid">
          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="eyebrow">FILE IMPORT</div>
                <h2>Upload Reference File</h2>
                <p>
                  Use an existing schedule, class program, study load, subject list or other
                  academic reference file.
                </p>
              </div>
              <span className="badge">Multi-format</span>
            </div>
            <form
              action="/admin/import-export/convert"
              method="post"
              encType="multipart/form-data"
              className="uploadForm"
            >
              <label className="uploadBox">
                <div className="uploadIcon">↑</div>
                <div className="uploadText">
                  <strong>Select a file</strong>
                  <span>Word, PDF, Excel, CSV or TXT</span>
                </div>
                <input
                  type="file"
                  name="reference_file"
                  accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                  required
                />
              </label>
              <div className="formats">
                <FormatBadge extension="DOCX" label="Word" />
                <FormatBadge extension="PDF" label="PDF" />
                <FormatBadge extension="XLSX" label="Excel" />
                <FormatBadge extension="CSV" label="CSV" />
                <FormatBadge extension="TXT" label="Text" />
              </div>
              <div className="infoBox">
                <strong>Missing information is allowed</strong>
                <p>
                  AlterSched preserves only the information available in the uploaded file. Missing
                  values remain blank and can be completed later.
                </p>
              </div>
              <button type="submit" className="primaryButton">
                Convert &amp; Preview
              </button>
            </form>
          </section>
          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="eyebrow">CONVERSION</div>
                <h2>Import Process</h2>
                <p>
                  Nothing is saved until the converted information has been reviewed and confirmed.
                </p>
              </div>
            </div>
            <div className="steps">
              <Step number="01" title="Upload" text="Select an existing academic reference file." />
              <Connector />
              <Step
                number="02"
                title="Extract"
                text="Read the available tables, rows and information."
              />
              <Connector />
              <Step
                number="03"
                title="Convert"
                text="Standardize extracted information into AlterSched fields."
              />
              <Connector />
              <Step
                number="04"
                title="Review"
                text="Map columns and identify incomplete or unclear records."
              />
              <Connector />
              <Step number="05" title="Import" text="Validate and save supported master data." />
            </div>
          </section>
        </div>
        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">CONVERSION RULES</div>
              <h2>Safe Data Conversion</h2>
              <p>
                AlterSched never invents missing academic information during conversion or import.
              </p>
            </div>
          </div>
          <div className="ruleGrid">
            <Rule
              icon="✓"
              title="Preserve Existing Data"
              text="Valid information found in the original file is retained."
            />
            <Rule
              icon="—"
              title="Leave Missing Data Blank"
              text="Unavailable academic information stays blank instead of being guessed."
            />
            <Rule
              icon="!"
              title="Flag Unclear Data"
              text="Incomplete or unresolved records are marked for review."
            />
            <Rule
              icon="✎"
              title="Complete Later"
              text="Missing master data can be completed inside AlterSched."
            />
          </div>
        </section>
        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">STANDARD FORMAT</div>
              <h2>Converted Data Structure</h2>
              <p>
                Imported information is standardized into the master data used by automatic schedule
                generation.
              </p>
            </div>
            {/* Plain <a>: a <Link> made Next.js prefetch this file-download route on every visit. */}
            <a href="/admin/import-export/template" className="templateButton" download>
              Download Excel Template
            </a>
          </div>
          {/* The template has one sheet per data type (Subjects, Curriculum, Blocks,
            Qualifications, Faculty Availability, Rooms, Room Availability).
            It is imported directly here; the converter above is for other files. */}
          <form className="upload-row" action={importMasterData}>
            <label className="upload-field">
              <strong>Import a completed AlterSched template</strong>
              <input
                type="file"
                name="master_file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </label>
            <button type="submit" className="templateButton">
              Import Template Workbook
            </button>
          </form>
          <div className="dataGrid">
            <DataType title="Subjects" text="Codes, descriptions and teaching requirements." />
            <DataType title="Curriculum" text="Subjects mapped to year level and semester." />
            <DataType title="Blocks" text="Year levels, sections and capacities." />
            <DataType
              title="Faculty"
              text="Existing instructor references and available information."
            />
            <DataType
              title="Qualifications"
              text="Subjects existing instructors are qualified to teach."
            />
            <DataType title="Availability" text="Faculty day and time availability." />
            <DataType title="Rooms" text="Rooms, laboratories, capacities and room types." />
            <DataType title="Room Availability" text="Available room days and time ranges." />
          </div>
        </section>
        <section className="flowCard">
          <div>
            <div className="eyebrow">ALTERSched WORKFLOW</div>
            <h2>From Existing File to Generated Schedule</h2>
            <p>
              Reviewed master data becomes the reference used by the automatic schedule generator.
            </p>
          </div>
          <div className="flow">
            <span>File</span>
            <b>→</b>
            <span>Convert</span>
            <b>→</b>
            <span>Preview</span>
            <b>→</b>
            <span>Import</span>
            <b>→</b>
            <span>Complete Data</span>
            <b>→</b>
            <span>Generate</span>
          </div>
        </section>
      </div>
    </div>
  )
}

function FormatBadge({ extension, label }: { extension: string; label: string }) {
  return (
    <div className="formatBadge">
      <strong>{extension}</strong>
      <span>{label}</span>
    </div>
  )
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="step">
      <div className="stepNumber">{number}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

function Connector() {
  return <div className="connector" />
}

function Rule({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rule">
      <div className="ruleIcon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function DataType({ title, text }: { title: string; text: string }) {
  return (
    <div className="dataType">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function ResultStat({
  value,
  label,
  warning = false,
}: {
  value: number
  label: string
  warning?: boolean
}) {
  return (
    <div className={warning ? 'resultStat warning' : 'resultStat'}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'

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
  }>
}

function numberValue(value?: string) {
  const parsed = Number(value ?? '0')

  return Number.isFinite(parsed)
    ? parsed
    : 0
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
      return error
        ? 'The import could not be completed.'
        : ''
  }
}

export default async function ImportDataPage({
  searchParams,
}: PageProps) {
  await requireRole(['super_admin'])

  const params = await searchParams

  const importComplete =
    params.success === 'import_complete'

  const errorMessage =
    getErrorMessage(params.error)

  const stats = {
    subjectsCreated: numberValue(
      params.subjects_created
    ),

    subjectsUpdated: numberValue(
      params.subjects_updated
    ),

    sectionsCreated: numberValue(
      params.sections_created
    ),

    facultyUpdated: numberValue(
      params.faculty_updated
    ),

    qualificationsCreated: numberValue(
      params.qualifications_created
    ),

    roomsCreated: numberValue(
      params.rooms_created
    ),

    roomsUpdated: numberValue(
      params.rooms_updated
    ),

    curriculumLinks: numberValue(
      params.curriculum_links
    ),

    needsReview: numberValue(
      params.needs_review
    ),

    skipped: numberValue(
      params.skipped
    ),
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
    <div className="page">
      <header className="pageHeader">
        <div>
          <div className="eyebrow">
            MASTER DATA
          </div>

          <h1>Import Data</h1>

          <p>
            Upload existing academic files,
            convert their contents, review the
            extracted information and safely
            import supported data into
            AlterSched.
          </p>
        </div>
      </header>

      {importComplete && (
        <section className="result success">
          <div className="resultIcon">
            ✓
          </div>

          <div className="resultContent">
            <div className="resultTop">
              <div>
                <div className="eyebrow green">
                  IMPORT COMPLETE
                </div>

                <h2>
                  Master data import finished
                </h2>

                <p>
                  AlterSched processed the
                  confirmed records. Existing
                  records were reused or updated
                  where supported, while missing
                  information remained blank.
                </p>
              </div>

              <div className="totalChanges">
                <strong>
                  {totalChanges}
                </strong>

                <span>
                  database changes
                </span>
              </div>
            </div>

            <div className="resultStats">
              <ResultStat
                value={
                  stats.subjectsCreated
                }
                label="Subjects Created"
              />

              <ResultStat
                value={
                  stats.subjectsUpdated
                }
                label="Subjects Updated"
              />

              <ResultStat
                value={
                  stats.sectionsCreated
                }
                label="Blocks Created"
              />

              <ResultStat
                value={
                  stats.qualificationsCreated
                }
                label="Qualifications"
              />

              <ResultStat
                value={
                  stats.roomsCreated
                }
                label="Rooms Created"
              />

              <ResultStat
                value={
                  stats.roomsUpdated
                }
                label="Rooms Updated"
              />

              <ResultStat
                value={
                  stats.curriculumLinks
                }
                label="Curriculum Links"
              />

              <ResultStat
                value={
                  stats.needsReview
                }
                label="Needs Review"
                warning={
                  stats.needsReview > 0
                }
              />

              <ResultStat
                value={stats.skipped}
                label="Skipped"
                warning={
                  stats.skipped > 0
                }
              />
            </div>

            {(
              stats.needsReview > 0 ||
              stats.skipped > 0
            ) && (
              <div className="reviewNotice">
                <strong>
                  Some records need attention
                </strong>

                <p>
                  This is expected when the
                  uploaded reference file is
                  missing information such as
                  room capacity, year level,
                  block, instructor account or
                  other required master data.
                  AlterSched did not create fake
                  values to fill those gaps.
                </p>
              </div>
            )}

            <div className="resultActions">
              <Link
                href="/admin/subjects"
                className="smallButton"
              >
                View Subjects
              </Link>

              <Link
                href="/admin/curriculum"
                className="smallButton"
              >
                View Curriculum
              </Link>

              <Link
                href="/admin/faculty"
                className="smallButton"
              >
                View Instructors
              </Link>

              <Link
                href="/admin/rooms"
                className="smallButton"
              >
                View Rooms
              </Link>
            </div>
          </div>
        </section>
      )}

      {errorMessage && (
        <section className="result error">
          <div className="resultIcon">
            !
          </div>

          <div>
            <div className="eyebrow red">
              IMPORT ERROR
            </div>

            <h2>
              Import could not continue
            </h2>

            <p>{errorMessage}</p>
          </div>
        </section>
      )}

      <div className="mainGrid">
        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">
                FILE IMPORT
              </div>

              <h2>
                Upload Reference File
              </h2>

              <p>
                Use an existing schedule,
                class program, study load,
                subject list or other academic
                reference file.
              </p>
            </div>

            <span className="badge">
              Multi-format
            </span>
          </div>

          <form
            action="/admin/import-export/convert"
            method="post"
            encType="multipart/form-data"
            className="uploadForm"
          >
            <label className="uploadBox">
              <div className="uploadIcon">
                ↑
              </div>

              <div className="uploadText">
                <strong>
                  Select a file
                </strong>

                <span>
                  Word, PDF, Excel, CSV or TXT
                </span>
              </div>

              <input
                type="file"
                name="reference_file"
                accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                required
              />
            </label>

            <div className="formats">
              <FormatBadge
                extension="DOCX"
                label="Word"
              />

              <FormatBadge
                extension="PDF"
                label="PDF"
              />

              <FormatBadge
                extension="XLSX"
                label="Excel"
              />

              <FormatBadge
                extension="CSV"
                label="CSV"
              />

              <FormatBadge
                extension="TXT"
                label="Text"
              />
            </div>

            <div className="infoBox">
              <strong>
                Missing information is allowed
              </strong>

              <p>
                AlterSched preserves only the
                information available in the
                uploaded file. Missing values
                remain blank and can be
                completed later.
              </p>
            </div>

            <button
              type="submit"
              className="primaryButton"
            >
              Convert &amp; Preview
            </button>
          </form>
        </section>

        <section className="card">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">
                CONVERSION
              </div>

              <h2>
                Import Process
              </h2>

              <p>
                Nothing is saved until the
                converted information has been
                reviewed and confirmed.
              </p>
            </div>
          </div>

          <div className="steps">
            <Step
              number="01"
              title="Upload"
              text="Select an existing academic reference file."
            />

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

            <Step
              number="05"
              title="Import"
              text="Validate and save supported master data."
            />
          </div>
        </section>
      </div>

      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="eyebrow">
              CONVERSION RULES
            </div>

            <h2>
              Safe Data Conversion
            </h2>

            <p>
              AlterSched never invents missing
              academic information during
              conversion or import.
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
            <div className="eyebrow">
              STANDARD FORMAT
            </div>

            <h2>
              Converted Data Structure
            </h2>

            <p>
              Imported information is
              standardized into the master data
              used by automatic schedule
              generation.
            </p>
          </div>

          <Link
            href="/admin/import-export/template"
            className="templateButton"
          >
            Download Excel Template
          </Link>
        </div>

        <div className="dataGrid">
          <DataType
            title="Subjects"
            text="Codes, descriptions and teaching requirements."
          />

          <DataType
            title="Curriculum"
            text="Subjects mapped to year level and semester."
          />

          <DataType
            title="Blocks"
            text="Year levels, sections and capacities."
          />

          <DataType
            title="Faculty"
            text="Existing instructor references and available information."
          />

          <DataType
            title="Qualifications"
            text="Subjects existing instructors are qualified to teach."
          />

          <DataType
            title="Availability"
            text="Faculty day and time availability."
          />

          <DataType
            title="Rooms"
            text="Rooms, laboratories, capacities and room types."
          />

          <DataType
            title="Room Availability"
            text="Available room days and time ranges."
          />
        </div>
      </section>

      <section className="flowCard">
        <div>
          <div className="eyebrow">
            ALTERSched WORKFLOW
          </div>

          <h2>
            From Existing File to Generated
            Schedule
          </h2>

          <p>
            Reviewed master data becomes the
            reference used by the automatic
            schedule generator.
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

      <style>{`
        .page {
          display: grid;
          gap: 16px;
          padding-bottom: 32px;
        }

        .pageHeader h1 {
          margin: 4px 0 5px;
          color: #0f172a;
          font-size: 27px;
        }

        .pageHeader p,
        .cardHeader p,
        .flowCard p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.55;
        }

        .eyebrow {
          color: #2563eb;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .eyebrow.green {
          color: #15803d;
        }

        .eyebrow.red {
          color: #b91c1c;
        }

        .card,
        .flowCard,
        .result {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(15,23,42,.03),
            0 8px 22px rgba(15,23,42,.025);
        }

        .mainGrid {
          display: grid;
          grid-template-columns:
            minmax(0,1.15fr)
            minmax(300px,.85fr);
          gap: 16px;
        }

        .card {
          padding: 18px;
        }

        .cardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 15px;
        }

        .cardHeader h2,
        .flowCard h2,
        .result h2 {
          margin: 4px 0 5px;
          color: #0f172a;
          font-size: 17px;
        }

        .badge {
          border-radius: 999px;
          padding: 5px 9px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 9px;
          font-weight: 900;
        }

        .uploadForm {
          display: grid;
          gap: 12px;
        }

        .uploadBox {
          position: relative;
          display: flex;
          min-height: 100px;
          align-items: center;
          gap: 12px;
          border: 1.5px dashed #93c5fd;
          border-radius: 12px;
          padding: 18px;
          background: #f8fbff;
          cursor: pointer;
        }

        .uploadBox:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .uploadBox input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .uploadIcon {
          display: grid;
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          place-items: center;
          border-radius: 10px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 20px;
          font-weight: 900;
        }

        .uploadText {
          display: grid;
          gap: 3px;
        }

        .uploadText strong {
          color: #0f172a;
          font-size: 12px;
        }

        .uploadText span {
          color: #64748b;
          font-size: 10px;
        }

        .formats {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .formatBadge {
          display: flex;
          align-items: center;
          gap: 5px;
          border: 1px solid #e2e8f0;
          border-radius: 7px;
          padding: 5px 7px;
        }

        .formatBadge strong {
          color: #2563eb;
          font-size: 8px;
        }

        .formatBadge span {
          color: #64748b;
          font-size: 9px;
        }

        .infoBox {
          border: 1px solid #bfdbfe;
          border-radius: 9px;
          padding: 10px 12px;
          background: #eff6ff;
          color: #1e40af;
        }

        .infoBox strong {
          display: block;
          margin-bottom: 2px;
          font-size: 10px;
        }

        .infoBox p {
          margin: 0;
          font-size: 9px;
          line-height: 1.5;
        }

        .primaryButton {
          min-height: 40px;
          border: 0;
          border-radius: 9px;
          background: #2563eb;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .primaryButton:hover {
          background: #1d4ed8;
        }

        .steps {
          display: grid;
          gap: 6px;
        }

        .step {
          display: grid;
          grid-template-columns: 32px 1fr;
          gap: 9px;
        }

        .stepNumber {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 8px;
          font-weight: 900;
        }

        .step strong {
          display: block;
          color: #0f172a;
          font-size: 10px;
        }

        .step p {
          margin: 2px 0 0;
          color: #64748b;
          font-size: 9px;
          line-height: 1.4;
        }

        .connector {
          width: 1px;
          height: 6px;
          margin-left: 16px;
          background: #dbeafe;
        }

        .ruleGrid,
        .dataGrid {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 9px;
        }

        .rule,
        .dataType {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px;
        }

        .dataType {
          background: #fafafa;
        }

        .ruleIcon {
          display: grid;
          width: 27px;
          height: 27px;
          margin-bottom: 8px;
          place-items: center;
          border-radius: 7px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
        }

        .rule strong,
        .dataType strong {
          display: block;
          margin-bottom: 3px;
          color: #0f172a;
          font-size: 10px;
        }

        .rule p,
        .dataType p {
          margin: 0;
          color: #64748b;
          font-size: 9px;
          line-height: 1.45;
        }

        .templateButton,
        .smallButton {
          border: 1px solid #dbeafe;
          border-radius: 8px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
        }

        .templateButton {
          padding: 8px 10px;
          white-space: nowrap;
        }

        .flowCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 18px;
        }

        .flow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
        }

        .flow span {
          border: 1px solid #dbeafe;
          border-radius: 7px;
          padding: 6px 8px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 8px;
          font-weight: 900;
        }

        .flow b {
          color: #94a3b8;
          font-size: 9px;
        }

        .result {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
        }

        .result.success {
          border-color: #bbf7d0;
          background: #f7fff9;
        }

        .result.error {
          border-color: #fecaca;
          background: #fffafa;
        }

        .resultIcon {
          display: grid;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          place-items: center;
          border-radius: 9px;
          background: #dcfce7;
          color: #15803d;
          font-weight: 900;
        }

        .result.error .resultIcon {
          background: #fee2e2;
          color: #b91c1c;
        }

        .resultContent {
          width: 100%;
          min-width: 0;
        }

        .resultTop {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .result p {
          margin: 0;
          color: #64748b;
          font-size: 9px;
          line-height: 1.5;
        }

        .totalChanges {
          min-width: 100px;
          border: 1px solid #bbf7d0;
          border-radius: 9px;
          padding: 8px 10px;
          background: #fff;
        }

        .totalChanges strong {
          display: block;
          color: #15803d;
          font-size: 18px;
        }

        .totalChanges span {
          color: #64748b;
          font-size: 8px;
        }

        .resultStats {
          display: grid;
          grid-template-columns:
            repeat(5,minmax(0,1fr));
          gap: 6px;
          margin-top: 12px;
        }

        .resultStat {
          border: 1px solid #dcfce7;
          border-radius: 8px;
          padding: 7px 8px;
          background: #fff;
        }

        .resultStat.warning {
          border-color: #fde68a;
          background: #fffbeb;
        }

        .resultStat strong {
          display: block;
          color: #166534;
          font-size: 14px;
        }

        .resultStat.warning strong {
          color: #b45309;
        }

        .resultStat span {
          color: #64748b;
          font-size: 7px;
        }

        .reviewNotice {
          margin-top: 10px;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 9px 10px;
          background: #fffbeb;
        }

        .reviewNotice strong {
          display: block;
          margin-bottom: 2px;
          color: #92400e;
          font-size: 9px;
        }

        .reviewNotice p {
          color: #a16207;
        }

        .resultActions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .smallButton {
          padding: 6px 8px;
        }

        @media (max-width: 1000px) {
          .mainGrid {
            grid-template-columns: 1fr;
          }

          .ruleGrid,
          .dataGrid {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .flowCard,
          .resultTop {
            align-items: flex-start;
            flex-direction: column;
          }

          .resultStats {
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }
        }

        @media (max-width: 600px) {
          .card,
          .flowCard,
          .result {
            border-radius: 11px;
            padding: 14px;
          }

          .cardHeader {
            flex-direction: column;
          }

          .ruleGrid,
          .dataGrid,
          .resultStats {
            grid-template-columns: 1fr;
          }

          .templateButton {
            width: 100%;
            text-align: center;
          }

          .result {
            flex-direction: column;
          }

          .totalChanges {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  )
}

function FormatBadge({
  extension,
  label,
}: {
  extension: string
  label: string
}) {
  return (
    <div className="formatBadge">
      <strong>{extension}</strong>
      <span>{label}</span>
    </div>
  )
}

function Step({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div className="step">
      <div className="stepNumber">
        {number}
      </div>

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

function Rule({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div className="rule">
      <div className="ruleIcon">
        {icon}
      </div>

      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function DataType({
  title,
  text,
}: {
  title: string
  text: string
}) {
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
    <div
      className={
        warning
          ? 'resultStat warning'
          : 'resultStat'
      }
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
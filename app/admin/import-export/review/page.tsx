import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { DataTable } from '@/components/data-table'

type StandardRecord = {
  rowNumber: number

  subject_code: string
  subject_name: string
  units: string
  lecture_hours: string
  lab_hours: string

  year_level: string
  section: string
  semester: string
  weekly_hours: string

  faculty_name: string
  employee_id: string
  employment_type: string
  max_teaching_load: string

  room_code: string
  room_type: string
  room_capacity: string

  day: string
  start_time: string
  end_time: string

  status: 'ready' | 'incomplete'
  missingFields: string[]
}

type PreparedImport = {
  fileName: string
  fileType: string
  sourceSheet: string
  firstRowWasHeader: boolean
  records: StandardRecord[]
  warnings: string[]
  mapping: Record<string, string>
}

type PageProps = {
  searchParams: Promise<{
    data?: string
  }>
}

function decodePreparedData(
  encoded?: string
): PreparedImport | null {
  if (!encoded) {
    return null
  }

  try {
    const json = Buffer.from(
      encoded,
      'base64url'
    ).toString('utf8')

    const parsed = JSON.parse(json)

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.records)
    ) {
      return null
    }

    return parsed as PreparedImport
  } catch {
    return null
  }
}

function displayValue(
  value: string | null | undefined
) {
  const cleaned =
    String(value ?? '').trim()

  if (!cleaned) {
    return (
      <span className="blank">
        Blank
      </span>
    )
  }

  return cleaned
}

export default async function ImportReviewPage({
  searchParams,
}: PageProps) {
  await requireRole(['super_admin'])

  const params =
    await searchParams

  const prepared =
    decodePreparedData(params.data)

  if (!prepared) {
    return (
      <div className="page">
        <section className="emptyCard">
          <div className="emptyIcon">
            !
          </div>

          <h1>
            Import review unavailable
          </h1>

          <p>
            The prepared import data is
            missing or invalid. Please upload
            and prepare the file again.
          </p>

          <Link
            href="/admin/import-export"
            className="primaryButton"
          >
            Back to Import
          </Link>
        </section>

        <PageStyles />
      </div>
    )
  }

  const readyRecords =
    prepared.records.filter(
      (record) =>
        record.status === 'ready'
    )

  const incompleteRecords =
    prepared.records.filter(
      (record) =>
        record.status === 'incomplete'
    )

  return (
    <div className="page">
      {/* HEADER */}
      <header className="pageHeader">
        <div>
          <div className="eyebrow">
            IMPORT DATA
          </div>

          <h1>
            Final Import Review
          </h1>

          <p>
            Review the standardized records
            before confirming the import into
            AlterSched.
          </p>
        </div>

        <Link
          href="/admin/import-export"
          className="secondaryButton"
        >
          Cancel Import
        </Link>
      </header>

      {/* FILE SUMMARY */}
      <section className="summaryCard">
        <div className="fileInfo">
          <div className="fileIcon">
            {prepared.fileType
              .toUpperCase()
              .slice(0, 4)}
          </div>

          <div>
            <strong>
              {prepared.fileName}
            </strong>

            <span>
              Source: {prepared.sourceSheet}
            </span>
          </div>
        </div>

        <div className="stats">
          <Stat
            value={prepared.records.length}
            label="Total Records"
          />

          <Stat
            value={readyRecords.length}
            label="Ready"
            type="ready"
          />

          <Stat
            value={incompleteRecords.length}
            label="Needs Review"
            type={
              incompleteRecords.length > 0
                ? 'warning'
                : 'ready'
            }
          />
        </div>
      </section>

      {/* WARNINGS */}
      {prepared.warnings.length > 0 && (
        <section className="warningCard">
          <div className="warningIcon">
            !
          </div>

          <div>
            <strong>
              Import review notes
            </strong>

            {prepared.warnings.map(
              (warning, index) => (
                <p key={index}>
                  {warning}
                </p>
              )
            )}
          </div>
        </section>
      )}

      {/* SAFETY */}
      <section className="noticeCard">
        <strong>
          No missing information was invented
        </strong>

        <p>
          Blank values remain blank. Records
          marked Needs Review can still be
          identified and completed later.
          AlterSched will validate database
          requirements during the final import.
        </p>
      </section>

      {/* RECORD TABLE */}
      <section className="tableCard">
        <div className="tableHeader">
          <div>
            <div className="eyebrow">
              STANDARDIZED DATA
            </div>

            <h2>
              Records Ready for Import
            </h2>

            <p>
              Data below came from the uploaded
              reference file and your column
              mapping.
            </p>
          </div>

          <div className="legend">
            <span className="readyDot">
              Ready
            </span>

            <span className="reviewDot">
              Needs Review
            </span>
          </div>
        </div>

        <div className="tableWrap">
          <DataTable>
            <thead>
              <tr>
                <th>Row</th>
                <th>Status</th>

                <th>Subject Code</th>
                <th>Subject</th>
                <th>Units</th>

                <th>Year</th>
                <th>Block</th>
                <th>Semester</th>

                <th>Instructor</th>
                <th>Employee ID</th>

                <th>Room</th>
                <th>Room Type</th>

                <th>Day</th>
                <th>Start</th>
                <th>End</th>

                <th>Missing</th>
              </tr>
            </thead>

            <tbody>
              {prepared.records.map(
                (record, index) => (
                  <tr
                    key={`${record.rowNumber}-${index}`}
                  >
                    <td className="rowNumber">
                      {record.rowNumber}
                    </td>

                    <td>
                      {record.status ===
                      'ready' ? (
                        <span className="status ready">
                          Ready
                        </span>
                      ) : (
                        <span className="status review">
                          Needs Review
                        </span>
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.subject_code
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.subject_name
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.units
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.year_level
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.section
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.semester
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.faculty_name
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.employee_id
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.room_code
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.room_type
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.day
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.start_time
                      )}
                    </td>

                    <td>
                      {displayValue(
                        record.end_time
                      )}
                    </td>

                    <td>
                      {record.missingFields
                        .length > 0 ? (
                        <div className="missingList">
                          {record.missingFields.map(
                            (field) => (
                              <span
                                key={field}
                              >
                                {field}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="none">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </DataTable>
        </div>
      </section>

      {/* EXTRA DETAILS */}
      <section className="detailsCard">
        <div>
          <strong>
            Additional mapped fields
          </strong>

          <p>
            Lecture/lab hours, weekly hours,
            employment type, maximum teaching
            load and room capacity are preserved
            even when they are not displayed in
            the main table above.
          </p>
        </div>
      </section>

      {/* FINAL ACTION */}
      <section className="actionCard">
        <div>
          <div className="eyebrow">
            FINAL STEP
          </div>

          <h2>
            Confirm Database Import
          </h2>

          <p>
            After confirmation, AlterSched will
            validate each record against the
            existing BSIT master data before
            saving supported records.
          </p>
        </div>

        <form
          action="/admin/import-export/confirm"
          method="post"
        >
          <input
            type="hidden"
            name="data"
            value={params.data ?? ''}
          />

          <button
            type="submit"
            className="primaryButton"
          >
            Confirm Import
          </button>
        </form>
      </section>

      <PageStyles />
    </div>
  )
}

function Stat({
  value,
  label,
  type = 'normal',
}: {
  value: number
  label: string
  type?: 'normal' | 'ready' | 'warning'
}) {
  return (
    <div className={`stat ${type}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function PageStyles() {
  return (
    <style>{`
      .page {
        display: grid;
        gap: 15px;
        padding-bottom: 35px;
      }

      .pageHeader {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .pageHeader h1 {
        margin: 4px 0 5px;
        color: #0f172a;
        font-size: 27px;
      }

      .pageHeader p {
        margin: 0;
        color: #64748b;
        font-size: 12px;
      }

      .eyebrow {
        color: #2563eb;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .12em;
      }

      .summaryCard,
      .tableCard,
      .detailsCard,
      .actionCard,
      .emptyCard {
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        background: #fff;
        box-shadow:
          0 1px 2px rgba(15,23,42,.03),
          0 8px 22px rgba(15,23,42,.025);
      }

      .summaryCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 16px 18px;
      }

      .fileInfo {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }

      .fileIcon {
        display: grid;
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        place-items: center;
        border-radius: 10px;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: 9px;
        font-weight: 900;
      }

      .fileInfo strong {
        display: block;
        color: #0f172a;
        font-size: 12px;
      }

      .fileInfo span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 9px;
      }

      .stats {
        display: flex;
        gap: 7px;
      }

      .stat {
        min-width: 92px;
        border: 1px solid #e5e7eb;
        border-radius: 9px;
        padding: 8px 11px;
        background: #f8fafc;
      }

      .stat strong {
        display: block;
        color: #0f172a;
        font-size: 17px;
      }

      .stat span {
        color: #64748b;
        font-size: 8px;
      }

      .stat.ready {
        border-color: #bbf7d0;
        background: #f0fdf4;
      }

      .stat.ready strong {
        color: #15803d;
      }

      .stat.warning {
        border-color: #fde68a;
        background: #fffbeb;
      }

      .stat.warning strong {
        color: #b45309;
      }

      .warningCard {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        border: 1px solid #fde68a;
        border-radius: 11px;
        padding: 12px 14px;
        background: #fffbeb;
      }

      .warningIcon {
        display: grid;
        width: 25px;
        height: 25px;
        flex: 0 0 25px;
        place-items: center;
        border-radius: 6px;
        background: #fef3c7;
        color: #b45309;
        font-size: 10px;
        font-weight: 900;
      }

      .warningCard strong {
        display: block;
        margin-bottom: 3px;
        color: #92400e;
        font-size: 10px;
      }

      .warningCard p {
        margin: 2px 0;
        color: #a16207;
        font-size: 9px;
        line-height: 1.45;
      }

      .noticeCard {
        border: 1px solid #bfdbfe;
        border-radius: 11px;
        padding: 12px 14px;
        background: #eff6ff;
      }

      .noticeCard strong {
        display: block;
        margin-bottom: 3px;
        color: #1e40af;
        font-size: 10px;
      }

      .noticeCard p {
        margin: 0;
        color: #1d4ed8;
        font-size: 9px;
        line-height: 1.5;
      }

      .tableCard {
        min-width: 0;
        overflow: hidden;
      }

      .tableHeader {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 15px;
        padding: 16px 18px;
        border-bottom: 1px solid #e5e7eb;
      }

      .tableHeader h2 {
        margin: 4px 0;
        color: #0f172a;
        font-size: 16px;
      }

      .tableHeader p {
        margin: 0;
        color: #64748b;
        font-size: 9px;
      }

      .legend {
        display: flex;
        gap: 6px;
      }

      .readyDot,
      .reviewDot {
        border-radius: 999px;
        padding: 5px 8px;
        font-size: 8px;
        font-weight: 900;
      }

      .readyDot {
        background: #dcfce7;
        color: #166534;
      }

      .reviewDot {
        background: #fef3c7;
        color: #92400e;
      }

      .tableWrap {
        width: 100%;
        overflow-x: auto;
      }

      table {
        width: 100%;
        min-width: 1500px;
        border-collapse: collapse;
      }

      th {
        border-bottom: 1px solid #e5e7eb;
        padding: 9px 10px;
        background: #f8fafc;
        color: #475569;
        font-size: 8px;
        font-weight: 900;
        text-align: left;
        white-space: nowrap;
      }

      td {
        border-bottom: 1px solid #f1f5f9;
        padding: 9px 10px;
        color: #334155;
        font-size: 9px;
        vertical-align: top;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      tbody tr:hover td {
        background: #fafcff;
      }

      .rowNumber {
        color: #94a3b8;
      }

      .status {
        display: inline-block;
        border-radius: 999px;
        padding: 4px 7px;
        font-size: 7px;
        font-weight: 900;
        white-space: nowrap;
      }

      .status.ready {
        background: #dcfce7;
        color: #166534;
      }

      .status.review {
        background: #fef3c7;
        color: #92400e;
      }

      .blank {
        color: #cbd5e1;
        font-size: 8px;
        font-style: italic;
      }

      .none {
        color: #cbd5e1;
      }

      .missingList {
        display: flex;
        max-width: 220px;
        flex-wrap: wrap;
        gap: 3px;
      }

      .missingList span {
        border-radius: 4px;
        padding: 3px 5px;
        background: #fff7ed;
        color: #c2410c;
        font-size: 7px;
        white-space: nowrap;
      }

      .detailsCard {
        padding: 13px 16px;
      }

      .detailsCard strong {
        display: block;
        margin-bottom: 3px;
        color: #0f172a;
        font-size: 10px;
      }

      .detailsCard p {
        margin: 0;
        color: #64748b;
        font-size: 9px;
        line-height: 1.5;
      }

      .actionCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 17px 18px;
      }

      .actionCard h2 {
        margin: 4px 0;
        color: #0f172a;
        font-size: 16px;
      }

      .actionCard p {
        max-width: 650px;
        margin: 0;
        color: #64748b;
        font-size: 9px;
        line-height: 1.5;
      }

      .primaryButton,
      .secondaryButton {
        display: inline-flex;
        min-height: 38px;
        align-items: center;
        justify-content: center;
        border-radius: 9px;
        padding: 0 13px;
        font-size: 10px;
        font-weight: 900;
        text-decoration: none;
      }

      .primaryButton {
        border: 1px solid #2563eb;
        background: #2563eb;
        color: #fff;
        cursor: pointer;
      }

      .primaryButton:hover {
        background: #1d4ed8;
      }

      .secondaryButton {
        border: 1px solid #dbe3ef;
        background: #fff;
        color: #334155;
      }

      .emptyCard {
        max-width: 520px;
        margin: 60px auto;
        padding: 30px;
        text-align: center;
      }

      .emptyIcon {
        display: grid;
        width: 42px;
        height: 42px;
        margin: 0 auto 10px;
        place-items: center;
        border-radius: 10px;
        background: #fee2e2;
        color: #b91c1c;
        font-weight: 900;
      }

      .emptyCard h1 {
        margin: 0 0 6px;
        color: #0f172a;
        font-size: 19px;
      }

      .emptyCard p {
        margin: 0 0 15px;
        color: #64748b;
        font-size: 10px;
      }

      @media (max-width: 850px) {
        .summaryCard,
        .actionCard {
          align-items: flex-start;
          flex-direction: column;
        }

        .stats {
          width: 100%;
        }

        .stat {
          min-width: 0;
          flex: 1;
        }

        .tableHeader {
          flex-direction: column;
        }
      }

      @media (max-width: 550px) {
        .pageHeader {
          flex-direction: column;
        }

        .pageHeader .secondaryButton {
          width: 100%;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr;
        }

        .stat {
          width: auto;
        }

        .actionCard form,
        .actionCard button {
          width: 100%;
        }
      }
    `}</style>
  )
}
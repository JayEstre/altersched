import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'
import { DataTable } from '@/components/data-table'

type ExtractedSheet = {
  name: string
  rows: string[][]
}

type ConversionResult = {
  fileName: string
  fileType: string
  sheets: ExtractedSheet[]
  warnings: string[]
}

type PageProps = {
  searchParams: Promise<{
    data?: string
  }>
}

function decodePreview(
  encoded?: string
): ConversionResult | null {
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
      !Array.isArray(parsed.sheets)
    ) {
      return null
    }

    return parsed as ConversionResult
  } catch {
    return null
  }
}

function getColumnCount(rows: string[][]) {
  return rows.reduce(
    (largest, row) =>
      Math.max(largest, row.length),
    0
  )
}

function getTotalRows(
  sheets: ExtractedSheet[]
) {
  return sheets.reduce(
    (total, sheet) =>
      total + sheet.rows.length,
    0
  )
}

function getBlankCells(
  sheets: ExtractedSheet[]
) {
  let blanks = 0

  for (const sheet of sheets) {
    const columnCount =
      getColumnCount(sheet.rows)

    for (const row of sheet.rows) {
      for (
        let index = 0;
        index < columnCount;
        index++
      ) {
        if (
          !String(row[index] ?? '').trim()
        ) {
          blanks++
        }
      }
    }
  }

  return blanks
}

function getFileLabel(
  extension: string
) {
  switch (
    extension.toLowerCase()
  ) {
    case 'docx':
      return 'Word Document'

    case 'pdf':
      return 'PDF Document'

    case 'xlsx':
    case 'xls':
      return 'Excel Workbook'

    case 'csv':
      return 'CSV File'

    case 'txt':
      return 'Text File'

    default:
      return extension.toUpperCase()
  }
}

export default async function ImportPreviewPage({
  searchParams,
}: PageProps) {
  await requireRole(['super_admin'])

  const params =
    await searchParams

  const conversion =
    decodePreview(params.data)

  if (!conversion) {
    return (
      <div className="page">
        <section className="emptyCard">
          <div className="emptyIcon">
            !
          </div>

          <h1>
            Preview unavailable
          </h1>

          <p>
            The converted file data is missing,
            invalid, or has expired. Upload the
            reference file again.
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

  const totalRows =
    getTotalRows(conversion.sheets)

  const blankCells =
    getBlankCells(conversion.sheets)

  return (
    <div className="page">
      {/* HEADER */}
      <header className="pageHeader">
        <div>
          <div className="eyebrow">
            IMPORT DATA
          </div>

          <h1>
            Converted Data Preview
          </h1>

          <p>
            Review the extracted information
            before anything is saved to
            AlterSched.
          </p>
        </div>

        <Link
          href="/admin/import-export"
          className="secondaryButton"
        >
          Upload Another File
        </Link>
      </header>

      {/* FILE INFORMATION */}
      <section className="summaryCard">
        <div className="fileInfo">
          <div className="fileIcon">
            {conversion.fileType
              .toUpperCase()
              .slice(0, 4)}
          </div>

          <div>
            <div className="fileName">
              {conversion.fileName}
            </div>

            <div className="fileMeta">
              {getFileLabel(
                conversion.fileType
              )}
            </div>
          </div>
        </div>

        <div className="summaryStats">
          <Stat
            value={String(
              conversion.sheets.length
            )}
            label="Detected Tables"
          />

          <Stat
            value={String(totalRows)}
            label="Extracted Rows"
          />

          <Stat
            value={String(blankCells)}
            label="Blank Cells"
          />
        </div>
      </section>

      {/* WARNINGS */}
      {conversion.warnings.length > 0 && (
        <section className="warningCard">
          <div className="warningIcon">
            !
          </div>

          <div>
            <strong>
              Review recommended
            </strong>

            <div className="warningList">
              {conversion.warnings.map(
                (warning, index) => (
                  <p key={index}>
                    {warning}
                  </p>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* IMPORTANT RULE */}
      <section className="noticeCard">
        <strong>
          Missing information stays blank
        </strong>

        <p>
          AlterSched does not invent missing
          subjects, instructors, employee IDs,
          rooms, capacities, qualifications,
          availability, or other academic data.
          Missing information can be completed
          later by an Administrator or
          Department Scheduler.
        </p>
      </section>

      {/* TABLE PREVIEWS */}
      <div className="sheetList">
        {conversion.sheets.map(
          (sheet, sheetIndex) => {
            const columnCount =
              getColumnCount(sheet.rows)

            return (
              <section
                className="sheetCard"
                key={`${sheet.name}-${sheetIndex}`}
              >
                <div className="sheetHeader">
                  <div>
                    <div className="eyebrow">
                      CONVERTED TABLE
                    </div>

                    <h2>
                      {sheet.name}
                    </h2>

                    <p>
                      {sheet.rows.length}{' '}
                      extracted row
                      {sheet.rows.length === 1
                        ? ''
                        : 's'}
                      {' • '}
                      {columnCount}{' '}
                      detected column
                      {columnCount === 1
                        ? ''
                        : 's'}
                    </p>
                  </div>

                  <span className="reviewBadge">
                    Review
                  </span>
                </div>

                <div className="tableWrap">
                  <DataTable>
                    <thead>
                      <tr>
                        <th className="rowNumber">
                          #
                        </th>

                        {Array.from({
                          length:
                            columnCount,
                        }).map(
                          (_, columnIndex) => (
                            <th
                              key={
                                columnIndex
                              }
                            >
                              Column{' '}
                              {columnIndex +
                                1}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {sheet.rows.map(
                        (
                          row,
                          rowIndex
                        ) => (
                          <tr
                            key={
                              rowIndex
                            }
                          >
                            <td className="rowNumber">
                              {rowIndex +
                                1}
                            </td>

                            {Array.from({
                              length:
                                columnCount,
                            }).map(
                              (
                                _,
                                columnIndex
                              ) => {
                                const value =
                                  String(
                                    row[
                                      columnIndex
                                    ] ?? ''
                                  ).trim()

                                return (
                                  <td
                                    key={
                                      columnIndex
                                    }
                                    className={
                                      value
                                        ? ''
                                        : 'blankCell'
                                    }
                                  >
                                    {value ? (
                                      value
                                    ) : (
                                      <span className="blankLabel">
                                        Blank
                                      </span>
                                    )}
                                  </td>
                                )
                              }
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </DataTable>
                </div>
              </section>
            )
          }
        )}
      </div>

      {/* NEXT STEP */}
      <section className="actionCard">
        <div>
          <div className="eyebrow">
            NEXT STEP
          </div>

          <h2>
            Map Converted Data
          </h2>

          <p>
            The file has only been converted.
            Nothing has been inserted into the
            database yet. The next step will map
            these columns to AlterSched fields
            before final import.
          </p>
        </div>

        <div className="actions">
          <Link
            href="/admin/import-export"
            className="secondaryButton"
          >
            Cancel
          </Link>

          <Link
            href={`/admin/import-export/map?data=${encodeURIComponent(
              params.data ?? ''
            )}`}
            className="primaryButton"
          >
            Continue to Mapping
          </Link>
        </div>
      </section>

      <PageStyles />
    </div>
  )
}

function Stat({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="stat">
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
        gap: 16px;
        padding-bottom: 34px;
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
        line-height: 1.2;
      }

      .pageHeader p {
        margin: 0;
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
      }

      .eyebrow {
        color: #2563eb;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .12em;
      }

      .summaryCard,
      .sheetCard,
      .actionCard,
      .emptyCard {
        border: 1px solid #e5e7eb;
        border-radius: 15px;
        background: #ffffff;
        box-shadow:
          0 1px 2px rgba(15,23,42,.04),
          0 8px 22px rgba(15,23,42,.025);
      }

      .summaryCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 17px 19px;
      }

      .fileInfo {
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 11px;
      }

      .fileIcon {
        display: grid;
        width: 48px;
        height: 48px;
        flex: 0 0 48px;
        place-items: center;
        border-radius: 11px;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: 9px;
        font-weight: 900;
      }

      .fileName {
        max-width: 450px;
        overflow: hidden;
        color: #0f172a;
        font-size: 13px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .fileMeta {
        margin-top: 3px;
        color: #64748b;
        font-size: 10px;
      }

      .summaryStats {
        display: flex;
        align-items: stretch;
        gap: 7px;
      }

      .stat {
        min-width: 100px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 9px 12px;
        background: #fafafa;
      }

      .stat strong {
        display: block;
        color: #0f172a;
        font-size: 17px;
      }

      .stat span {
        display: block;
        margin-top: 1px;
        color: #64748b;
        font-size: 9px;
      }

      .warningCard,
      .noticeCard {
        border-radius: 11px;
        padding: 12px 14px;
      }

      .warningCard {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        border: 1px solid #fde68a;
        background: #fffbeb;
      }

      .warningIcon {
        display: grid;
        width: 26px;
        height: 26px;
        flex: 0 0 26px;
        place-items: center;
        border-radius: 7px;
        background: #fef3c7;
        color: #b45309;
        font-size: 11px;
        font-weight: 900;
      }

      .warningCard strong {
        color: #92400e;
        font-size: 11px;
      }

      .warningList {
        margin-top: 3px;
      }

      .warningList p {
        margin: 2px 0;
        color: #a16207;
        font-size: 10px;
        line-height: 1.45;
      }

      .noticeCard {
        border: 1px solid #bfdbfe;
        background: #eff6ff;
      }

      .noticeCard strong {
        display: block;
        margin-bottom: 3px;
        color: #1e40af;
        font-size: 11px;
      }

      .noticeCard p {
        margin: 0;
        color: #1d4ed8;
        font-size: 10px;
        line-height: 1.55;
      }

      .sheetList {
        display: grid;
        gap: 14px;
      }

      .sheetCard {
        min-width: 0;
        overflow: hidden;
      }

      .sheetHeader {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 15px;
        padding: 16px 18px;
        border-bottom: 1px solid #e5e7eb;
      }

      .sheetHeader h2 {
        margin: 4px 0 3px;
        color: #0f172a;
        font-size: 16px;
      }

      .sheetHeader p {
        margin: 0;
        color: #64748b;
        font-size: 10px;
      }

      .reviewBadge {
        border-radius: 999px;
        padding: 5px 9px;
        background: #fef3c7;
        color: #92400e;
        font-size: 9px;
        font-weight: 900;
      }

      .tableWrap {
        width: 100%;
        overflow-x: auto;
      }

      table {
        width: 100%;
        min-width: 680px;
        border-collapse: collapse;
      }

      th {
        border-bottom: 1px solid #e5e7eb;
        background: #f8fafc;
        padding: 9px 11px;
        color: #475569;
        font-size: 9px;
        font-weight: 900;
        text-align: left;
        white-space: nowrap;
      }

      td {
        max-width: 360px;
        border-bottom: 1px solid #f1f5f9;
        padding: 9px 11px;
        color: #334155;
        font-size: 10px;
        line-height: 1.45;
        vertical-align: top;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      tbody tr:hover td {
        background: #fafcff;
      }

      .rowNumber {
        width: 45px;
        color: #94a3b8;
        text-align: center;
      }

      .blankCell {
        background: #fffdf5;
      }

      .blankLabel {
        color: #cbd5e1;
        font-size: 9px;
        font-style: italic;
      }

      .actionCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 22px;
        padding: 18px;
      }

      .actionCard h2 {
        margin: 4px 0 4px;
        color: #0f172a;
        font-size: 17px;
      }

      .actionCard p {
        max-width: 650px;
        margin: 0;
        color: #64748b;
        font-size: 10px;
        line-height: 1.55;
      }

      .actions {
        display: flex;
        flex-shrink: 0;
        gap: 8px;
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
        color: #ffffff;
      }

      .primaryButton:hover {
        background: #1d4ed8;
      }

      .secondaryButton {
        border: 1px solid #dbe3ef;
        background: #ffffff;
        color: #334155;
      }

      .secondaryButton:hover {
        background: #f8fafc;
      }

      .emptyCard {
        max-width: 550px;
        margin: 60px auto;
        padding: 35px;
        text-align: center;
      }

      .emptyIcon {
        display: grid;
        width: 45px;
        height: 45px;
        margin: 0 auto 12px;
        place-items: center;
        border-radius: 12px;
        background: #fee2e2;
        color: #b91c1c;
        font-weight: 900;
      }

      .emptyCard h1 {
        margin: 0 0 7px;
        color: #0f172a;
        font-size: 20px;
      }

      .emptyCard p {
        margin: 0 auto 17px;
        color: #64748b;
        font-size: 11px;
        line-height: 1.6;
      }

      @media (max-width: 850px) {
        .summaryCard,
        .actionCard {
          align-items: flex-start;
          flex-direction: column;
        }

        .summaryStats {
          width: 100%;
        }

        .stat {
          min-width: 0;
          flex: 1;
        }

        .actions {
          width: 100%;
        }

        .actions a {
          flex: 1;
        }
      }

      @media (max-width: 600px) {
        .pageHeader {
          flex-direction: column;
        }

        .pageHeader .secondaryButton {
          width: 100%;
        }

        .summaryStats {
          display: grid;
          grid-template-columns: 1fr;
        }

        .stat {
          width: auto;
        }

        .actions {
          flex-direction: column;
        }

        .sheetHeader {
          padding: 14px;
        }
      }
    `}</style>
  )
}
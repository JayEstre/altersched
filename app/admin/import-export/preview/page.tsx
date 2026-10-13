import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { DataTable } from '@/components/data-table'
import styles from './page.module.css'

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

function decodePreview(encoded?: string): ConversionResult | null {
  if (!encoded) {
    return null
  }

  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8')
    const parsed = JSON.parse(json)

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sheets)) {
      return null
    }

    return parsed as ConversionResult
  } catch {
    return null
  }
}

function getColumnCount(rows: string[][]) {
  return rows.reduce((largest, row) => Math.max(largest, row.length), 0)
}

function getTotalRows(sheets: ExtractedSheet[]) {
  return sheets.reduce((total, sheet) => total + sheet.rows.length, 0)
}

function getBlankCells(sheets: ExtractedSheet[]) {
  let blanks = 0

  for (const sheet of sheets) {
    const columnCount = getColumnCount(sheet.rows)

    for (const row of sheet.rows) {
      for (let index = 0; index < columnCount; index++) {
        if (!String(row[index] ?? '').trim()) {
          blanks++
        }
      }
    }
  }

  return blanks
}

function getFileLabel(extension: string) {
  switch (extension.toLowerCase()) {
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

export default async function ImportPreviewPage({ searchParams }: PageProps) {
  await requireRole(['super_admin'])
  const params = await searchParams
  const conversion = decodePreview(params.data)

  if (!conversion) {
    return (
      <div className={styles.scope}>
        <div className="page">
          <section className="emptyCard">
            <div className="emptyIcon">!</div>
            <h1>Preview unavailable</h1>
            <p>
              The converted file data is missing, invalid, or has expired. Upload the reference file
              again.
            </p>
            <Link href="/admin/import-export" className="primaryButton">
              Back to Import
            </Link>
          </section>
        </div>
      </div>
    )
  }

  const totalRows = getTotalRows(conversion.sheets)
  const blankCells = getBlankCells(conversion.sheets)

  return (
    <div className={styles.scope}>
      <div className="page">
        {/* HEADER */}
        <header className="pageHeader">
          <div>
            <div className="eyebrow">IMPORT DATA</div>
            <h1>Converted Data Preview</h1>
            <p>Review the extracted information before anything is saved to AlterSched.</p>
          </div>
          <Link href="/admin/import-export" className="secondaryButton">
            Upload Another File
          </Link>
        </header>
        {/* FILE INFORMATION */}
        <section className="summaryCard">
          <div className="fileInfo">
            <div className="fileIcon">{conversion.fileType.toUpperCase().slice(0, 4)}</div>
            <div>
              <div className="fileName">{conversion.fileName}</div>
              <div className="fileMeta">{getFileLabel(conversion.fileType)}</div>
            </div>
          </div>
          <div className="summaryStats">
            <Stat value={String(conversion.sheets.length)} label="Detected Tables" />
            <Stat value={String(totalRows)} label="Extracted Rows" />
            <Stat value={String(blankCells)} label="Blank Cells" />
          </div>
        </section>
        {/* WARNINGS */}
        {conversion.warnings.length > 0 && (
          <section className="warningCard">
            <div className="warningIcon">!</div>
            <div>
              <strong>Review recommended</strong>
              <div className="warningList">
                {conversion.warnings.map((warning, index) => (
                  <p key={index}>{warning}</p>
                ))}
              </div>
            </div>
          </section>
        )}
        {/* IMPORTANT RULE */}
        <section className="noticeCard">
          <strong>Missing information stays blank</strong>
          <p>
            AlterSched does not invent missing subjects, instructors, employee IDs, rooms,
            capacities, qualifications, availability, or other academic data. Missing information
            can be completed later by an Administrator or Department Scheduler.
          </p>
        </section>
        {/* TABLE PREVIEWS */}
        <div className="sheetList">
          {conversion.sheets.map((sheet, sheetIndex) => {
            const columnCount = getColumnCount(sheet.rows)

            return (
              <section className="sheetCard" key={`${sheet.name}-${sheetIndex}`}>
                <div className="sheetHeader">
                  <div>
                    <div className="eyebrow">CONVERTED TABLE</div>
                    <h2>{sheet.name}</h2>
                    <p>
                      {sheet.rows.length} extracted row
                      {sheet.rows.length === 1 ? '' : 's'}
                      {' • '}
                      {columnCount} detected column
                      {columnCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="reviewBadge">Review</span>
                </div>
                <div className="tableWrap">
                  <DataTable>
                    <thead>
                      <tr>
                        <th className="rowNumber">#</th>
                        {Array.from({
                          length: columnCount,
                        }).map((_, columnIndex) => (
                          <th key={columnIndex}>Column {columnIndex + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="rowNumber">{rowIndex + 1}</td>
                          {Array.from({
                            length: columnCount,
                          }).map((_, columnIndex) => {
                            const value = String(row[columnIndex] ?? '').trim()

                            return (
                              <td key={columnIndex} className={value ? '' : 'blankCell'}>
                                {value ? value : <span className="blankLabel">Blank</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              </section>
            )
          })}
        </div>
        {/* NEXT STEP */}
        <section className="actionCard">
          <div>
            <div className="eyebrow">NEXT STEP</div>
            <h2>Map Converted Data</h2>
            <p>
              The file has only been converted. Nothing has been inserted into the database yet. The
              next step will map these columns to AlterSched fields before final import.
            </p>
          </div>
          <div className="actions">
            <Link href="/admin/import-export" className="secondaryButton">
              Cancel
            </Link>
            <Link
              href={`/admin/import-export/map?data=${encodeURIComponent(params.data ?? '')}`}
              className="primaryButton"
            >
              Continue to Mapping
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

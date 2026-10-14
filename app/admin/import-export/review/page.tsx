import Link from 'next/link'
import { requireRole } from '@/lib/auth/require-role'
import { DataTable } from '@/components/data-table'
import styles from './page.module.css'

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

function decodePreparedData(encoded?: string): PreparedImport | null {
  if (!encoded) {
    return null
  }

  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8')
    const parsed = JSON.parse(json)

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) {
      return null
    }

    return parsed as PreparedImport
  } catch {
    return null
  }
}

function displayValue(value: string | null | undefined) {
  const cleaned = String(value ?? '').trim()

  if (!cleaned) {
    return <span className="blank">Blank</span>
  }

  return cleaned
}

export default async function ImportReviewPage({ searchParams }: PageProps) {
  await requireRole(['super_admin'])
  const params = await searchParams
  const prepared = decodePreparedData(params.data)

  if (!prepared) {
    return (
      <div className={styles.scope}>
        <div className="page">
          <section className="emptyCard">
            <div className="emptyIcon">!</div>
            <h1>Import review unavailable</h1>
            <p>
              The prepared import data is missing or invalid. Please upload and prepare the file
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

  const readyRecords = prepared.records.filter((record) => record.status === 'ready')
  const incompleteRecords = prepared.records.filter((record) => record.status === 'incomplete')

  return (
    <div className={styles.scope}>
      <div className="page">
        {/* HEADER */}
        <header className="pageHeader">
          <div>
            <h1>Final Import Review</h1>
            <p>Review the standardized records before confirming the import into AlterSched.</p>
          </div>
          <Link href="/admin/import-export" className="secondaryButton">
            Cancel Import
          </Link>
        </header>
        {/* FILE SUMMARY */}
        <section className="summaryCard">
          <div className="fileInfo">
            <div className="fileIcon">{prepared.fileType.toUpperCase().slice(0, 4)}</div>
            <div>
              <strong>{prepared.fileName}</strong>
              <span>Source: {prepared.sourceSheet}</span>
            </div>
          </div>
          <div className="stats">
            <Stat value={prepared.records.length} label="Total Records" />
            <Stat value={readyRecords.length} label="Ready" type="ready" />
            <Stat
              value={incompleteRecords.length}
              label="Needs Review"
              type={incompleteRecords.length > 0 ? 'warning' : 'ready'}
            />
          </div>
        </section>
        {/* WARNINGS */}
        {prepared.warnings.length > 0 && (
          <section className="warningCard">
            <div className="warningIcon">!</div>
            <div>
              <strong>Import review notes</strong>
              {prepared.warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          </section>
        )}
        {/* SAFETY */}
        <section className="noticeCard">
          <strong>No missing information was invented</strong>
          <p>
            Blank values remain blank. Records marked Needs Review can still be identified and
            completed later. AlterSched will validate database requirements during the final import.
          </p>
        </section>
        {/* RECORD TABLE */}
        <section className="tableCard">
          <div className="tableHeader">
            <div>
              <h2>Records Ready for Import</h2>
              <p>Data below came from the uploaded reference file and your column mapping.</p>
            </div>
            <div className="legend">
              <span className="readyDot">Ready</span>
              <span className="reviewDot">Needs Review</span>
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
                {prepared.records.map((record, index) => (
                  <tr key={`${record.rowNumber}-${index}`}>
                    <td className="rowNumber">{record.rowNumber}</td>
                    <td>
                      {record.status === 'ready' ? (
                        <span className="status ready">Ready</span>
                      ) : (
                        <span className="status review">Needs Review</span>
                      )}
                    </td>
                    <td>{displayValue(record.subject_code)}</td>
                    <td>{displayValue(record.subject_name)}</td>
                    <td>{displayValue(record.units)}</td>
                    <td>{displayValue(record.year_level)}</td>
                    <td>{displayValue(record.section)}</td>
                    <td>{displayValue(record.semester)}</td>
                    <td>{displayValue(record.faculty_name)}</td>
                    <td>{displayValue(record.employee_id)}</td>
                    <td>{displayValue(record.room_code)}</td>
                    <td>{displayValue(record.room_type)}</td>
                    <td>{displayValue(record.day)}</td>
                    <td>{displayValue(record.start_time)}</td>
                    <td>{displayValue(record.end_time)}</td>
                    <td>
                      {record.missingFields.length > 0 ? (
                        <div className="missingList">
                          {record.missingFields.map((field) => (
                            <span key={field}>{field}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="none">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </section>
        {/* EXTRA DETAILS */}
        <section className="detailsCard">
          <div>
            <strong>Additional mapped fields</strong>
            <p>
              Lecture/lab hours, weekly hours, employment type, maximum teaching load and room
              capacity are preserved even when they are not displayed in the main table above.
            </p>
          </div>
        </section>
        {/* FINAL ACTION */}
        <section className="actionCard">
          <div>
            <h2>Confirm Database Import</h2>
            <p>
              After confirmation, AlterSched will validate each record against the existing BSIT
              master data before saving supported records.
            </p>
          </div>
          <form action="/admin/import-export/confirm" method="post">
            <input type="hidden" name="data" value={params.data ?? ''} />
            <button type="submit" className="primaryButton">
              Confirm Import
            </button>
          </form>
        </section>
      </div>
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

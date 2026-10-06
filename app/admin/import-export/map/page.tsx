import Link from 'next/link'

import { requireRole } from '@/lib/auth/require-role'

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
    sheet?: string
  }>
}

type MappingOption = {
  value: string
  label: string
  group: string
}

const mappingOptions: MappingOption[] = [
  {
    value: '',
    label: 'Do not import',
    group: 'General',
  },

  {
    value: 'subject_code',
    label: 'Subject Code',
    group: 'Subject',
  },
  {
    value: 'subject_name',
    label: 'Subject Name / Description',
    group: 'Subject',
  },
  {
    value: 'units',
    label: 'Units',
    group: 'Subject',
  },
  {
    value: 'lecture_hours',
    label: 'Lecture Hours',
    group: 'Subject',
  },
  {
    value: 'lab_hours',
    label: 'Laboratory Hours',
    group: 'Subject',
  },

  {
    value: 'year_level',
    label: 'Year Level',
    group: 'Academic',
  },
  {
    value: 'section',
    label: 'Block / Section',
    group: 'Academic',
  },
  {
    value: 'semester',
    label: 'Semester',
    group: 'Academic',
  },
  {
    value: 'weekly_hours',
    label: 'Weekly Hours',
    group: 'Academic',
  },

  {
    value: 'faculty_name',
    label: 'Instructor / Teacher Name',
    group: 'Faculty',
  },
  {
    value: 'employee_id',
    label: 'Employee ID',
    group: 'Faculty',
  },
  {
    value: 'employment_type',
    label: 'Employment Type',
    group: 'Faculty',
  },
  {
    value: 'max_teaching_load',
    label: 'Maximum Teaching Load',
    group: 'Faculty',
  },

  {
    value: 'room_code',
    label: 'Room Code / Name',
    group: 'Room',
  },
  {
    value: 'room_type',
    label: 'Room Type',
    group: 'Room',
  },
  {
    value: 'room_capacity',
    label: 'Room Capacity',
    group: 'Room',
  },

  {
    value: 'day',
    label: 'Day',
    group: 'Schedule Reference',
  },
  {
    value: 'start_time',
    label: 'Start Time',
    group: 'Schedule Reference',
  },
  {
    value: 'end_time',
    label: 'End Time',
    group: 'Schedule Reference',
  },
]

const groups = [
  'General',
  'Subject',
  'Academic',
  'Faculty',
  'Room',
  'Schedule Reference',
]

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

function getCell(
  row: string[] | undefined,
  index: number
) {
  return String(
    row?.[index] ?? ''
  ).trim()
}

function detectMapping(
  header: string
): string {
  const value = header
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

  if (!value) {
    return ''
  }

  if (
    value === 'code' ||
    value.includes('subject code') ||
    value.includes('course code')
  ) {
    return 'subject_code'
  }

  if (
    value === 'description' ||
    value.includes('subject name') ||
    value.includes('subject description') ||
    value.includes('course title') ||
    value.includes('course description')
  ) {
    return 'subject_name'
  }

  if (
    value === 'units' ||
    value === 'unit'
  ) {
    return 'units'
  }

  if (
    value.includes('lecture hour')
  ) {
    return 'lecture_hours'
  }

  if (
    value.includes('lab hour') ||
    value.includes('laboratory hour')
  ) {
    return 'lab_hours'
  }

  if (
    value === 'year' ||
    value.includes('year level')
  ) {
    return 'year_level'
  }

  if (
    value === 'block' ||
    value === 'section' ||
    value.includes('block section') ||
    value.includes('section block')
  ) {
    return 'section'
  }

  if (
    value.includes('semester') ||
    value === 'term'
  ) {
    return 'semester'
  }

  if (
    value.includes('weekly hour') ||
    value.includes('hours per week')
  ) {
    return 'weekly_hours'
  }

  if (
    value === 'teacher' ||
    value === 'instructor' ||
    value === 'faculty' ||
    value.includes('teacher name') ||
    value.includes('instructor name') ||
    value.includes('faculty name')
  ) {
    return 'faculty_name'
  }

  if (
    value.includes('employee id') ||
    value.includes('faculty id')
  ) {
    return 'employee_id'
  }

  if (
    value.includes('employment type')
  ) {
    return 'employment_type'
  }

  if (
    value.includes('max load') ||
    value.includes('maximum load') ||
    value.includes('teaching load')
  ) {
    return 'max_teaching_load'
  }

  if (
    value === 'room' ||
    value.includes('room code') ||
    value.includes('room name')
  ) {
    return 'room_code'
  }

  if (
    value.includes('room type')
  ) {
    return 'room_type'
  }

  if (
    value.includes('capacity')
  ) {
    return 'room_capacity'
  }

  if (
    value === 'day' ||
    value.includes('schedule day')
  ) {
    return 'day'
  }

  if (
    value.includes('start time')
  ) {
    return 'start_time'
  }

  if (
    value.includes('end time')
  ) {
    return 'end_time'
  }

  return ''
}

export default async function ImportMapPage({
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
            Converted data unavailable
          </h1>

          <p>
            Upload and convert the reference
            file again before mapping its data.
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

  const requestedSheet =
    Number(params.sheet ?? '0')

  const sheetIndex =
    Number.isInteger(requestedSheet) &&
    requestedSheet >= 0 &&
    requestedSheet <
      conversion.sheets.length
      ? requestedSheet
      : 0

  const sheet =
    conversion.sheets[sheetIndex]

  if (!sheet) {
    return (
      <div className="page">
        <section className="emptyCard">
          <h1>No table detected</h1>

          <p>
            There is no converted table
            available for mapping.
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

  const columnCount =
    getColumnCount(sheet.rows)

  const firstRow =
    sheet.rows[0] ?? []

  const sampleRows =
    sheet.rows.slice(1, 6)

  return (
    <div className="page">
      {/* HEADER */}
      <header className="pageHeader">
        <div>
          <div className="eyebrow">
            IMPORT DATA
          </div>

          <h1>
            Map Converted Data
          </h1>

          <p>
            Match the detected columns from
            the uploaded file with AlterSched
            fields.
          </p>
        </div>

        <Link
          href={`/admin/import-export/preview?data=${encodeURIComponent(
            params.data ?? ''
          )}`}
          className="secondaryButton"
        >
          Back to Preview
        </Link>
      </header>

      {/* FILE */}
      <section className="fileCard">
        <div>
          <strong>
            {conversion.fileName}
          </strong>

          <span>
            {conversion.fileType.toUpperCase()}
            {' • '}
            {conversion.sheets.length}{' '}
            detected table
            {conversion.sheets.length === 1
              ? ''
              : 's'}
          </span>
        </div>

        <span className="statusBadge">
          Not imported
        </span>
      </section>

      {/* TABLE SELECTOR */}
      {conversion.sheets.length > 1 && (
        <section className="sheetSelector">
          <div>
            <strong>
              Detected Tables
            </strong>

            <span>
              Select which table you want
              to map.
            </span>
          </div>

          <div className="sheetTabs">
            {conversion.sheets.map(
              (
                item,
                index
              ) => (
                <Link
                  key={`${item.name}-${index}`}
                  href={`/admin/import-export/map?data=${encodeURIComponent(
                    params.data ?? ''
                  )}&sheet=${index}`}
                  className={
                    index === sheetIndex
                      ? 'sheetTab active'
                      : 'sheetTab'
                  }
                >
                  {item.name}
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* INFO */}
      <section className="noticeCard">
        <strong>
          Automatic mapping is only a suggestion
        </strong>

        <p>
          AlterSched checks the first row for
          familiar headings such as Code,
          Description, Year, Room and Teacher.
          You can change every mapping before
          import. Unavailable information stays
          blank.
        </p>
      </section>

      {/* FORM */}
      <form
        action="/admin/import-export/process"
        method="post"
        className="mappingForm"
      >
        <input
          type="hidden"
          name="data"
          value={params.data ?? ''}
        />

        <input
          type="hidden"
          name="sheet_index"
          value={sheetIndex}
        />

        <section className="mappingCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">
                COLUMN MAPPING
              </div>

              <h2>{sheet.name}</h2>

              <p>
                First row is currently treated
                as the column header.
              </p>
            </div>

            <div className="headerOption">
              <input
                id="first_row_header"
                type="checkbox"
                name="first_row_header"
                value="true"
                defaultChecked
              />

              <label htmlFor="first_row_header">
                First row contains headers
              </label>
            </div>
          </div>

          <div className="mappingGrid">
            {Array.from({
              length: columnCount,
            }).map(
              (_, columnIndex) => {
                const header =
                  getCell(
                    firstRow,
                    columnIndex
                  )

                const detected =
                  detectMapping(header)

                return (
                  <div
                    className="mappingItem"
                    key={columnIndex}
                  >
                    <div className="columnTop">
                      <div>
                        <span className="columnLabel">
                          SOURCE COLUMN
                        </span>

                        <strong>
                          {header ||
                            `Column ${
                              columnIndex +
                              1
                            }`}
                        </strong>
                      </div>

                      <span className="columnNumber">
                        {columnIndex + 1}
                      </span>
                    </div>

                    <div className="arrow">
                      ↓
                    </div>

                    <label
                      htmlFor={`column_${columnIndex}`}
                    >
                      AlterSched Field
                    </label>

                    <select
                      id={`column_${columnIndex}`}
                      name={`column_${columnIndex}`}
                      defaultValue={detected}
                    >
                      {groups.map(
                        (group) => (
                          <optgroup
                            key={group}
                            label={group}
                          >
                            {mappingOptions
                              .filter(
                                (option) =>
                                  option.group ===
                                  group
                              )
                              .map(
                                (
                                  option
                                ) => (
                                  <option
                                    key={
                                      option.value ||
                                      'none'
                                    }
                                    value={
                                      option.value
                                    }
                                  >
                                    {
                                      option.label
                                    }
                                  </option>
                                )
                              )}
                          </optgroup>
                        )
                      )}
                    </select>

                    <div className="samples">
                      <span>
                        SAMPLE VALUES
                      </span>

                      {sampleRows.length >
                      0 ? (
                        sampleRows
                          .slice(0, 3)
                          .map(
                            (
                              row,
                              rowIndex
                            ) => {
                              const value =
                                getCell(
                                  row,
                                  columnIndex
                                )

                              return (
                                <div
                                  key={
                                    rowIndex
                                  }
                                  className={
                                    value
                                      ? 'sampleValue'
                                      : 'sampleValue blank'
                                  }
                                >
                                  {value ||
                                    'Blank'}
                                </div>
                              )
                            }
                          )
                      ) : (
                        <div className="sampleValue blank">
                          No sample
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </section>

        {/* IMPORT MODE */}
        <section className="optionsCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">
                IMPORT SETTINGS
              </div>

              <h2>
                Conversion Rules
              </h2>

              <p>
                Control how the mapped data
                should be prepared.
              </p>
            </div>
          </div>

          <div className="optionGrid">
            <label className="optionItem">
              <input
                type="checkbox"
                name="keep_blank_values"
                value="true"
                defaultChecked
              />

              <div>
                <strong>
                  Preserve blank values
                </strong>

                <span>
                  Missing information remains
                  empty for later completion.
                </span>
              </div>
            </label>

            <label className="optionItem">
              <input
                type="checkbox"
                name="trim_values"
                value="true"
                defaultChecked
              />

              <div>
                <strong>
                  Clean extra spaces
                </strong>

                <span>
                  Remove unnecessary spaces
                  without changing the actual
                  information.
                </span>
              </div>
            </label>

            <label className="optionItem">
              <input
                type="checkbox"
                name="flag_incomplete"
                value="true"
                defaultChecked
              />

              <div>
                <strong>
                  Flag incomplete records
                </strong>

                <span>
                  Missing or unclear records
                  will be marked for review.
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* FOOTER */}
        <section className="actionCard">
          <div>
            <strong>
              Nothing will be saved yet.
            </strong>

            <p>
              Continue to create the final
              structured import preview.
            </p>
          </div>

          <div className="actions">
            <Link
              href="/admin/import-export"
              className="secondaryButton"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="primaryButton"
            >
              Prepare Import
            </button>
          </div>
        </section>
      </form>

      <PageStyles />
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
        line-height: 1.5;
      }

      .eyebrow {
        color: #2563eb;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .12em;
      }

      .fileCard,
      .sheetSelector,
      .mappingCard,
      .optionsCard,
      .actionCard,
      .emptyCard {
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        background: #ffffff;
        box-shadow:
          0 1px 2px rgba(15,23,42,.03),
          0 8px 22px rgba(15,23,42,.025);
      }

      .fileCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 14px 17px;
      }

      .fileCard strong {
        display: block;
        color: #0f172a;
        font-size: 12px;
      }

      .fileCard span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 9px;
      }

      .statusBadge {
        border-radius: 999px;
        padding: 5px 9px;
        background: #fef3c7;
        color: #92400e !important;
        font-weight: 900;
      }

      .sheetSelector {
        padding: 15px 17px;
      }

      .sheetSelector > div:first-child {
        margin-bottom: 10px;
      }

      .sheetSelector strong {
        display: block;
        color: #0f172a;
        font-size: 11px;
      }

      .sheetSelector span {
        color: #64748b;
        font-size: 9px;
      }

      .sheetTabs {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .sheetTab {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 7px 10px;
        background: #ffffff;
        color: #475569;
        font-size: 9px;
        font-weight: 800;
        text-decoration: none;
      }

      .sheetTab.active {
        border-color: #93c5fd;
        background: #eff6ff;
        color: #1d4ed8;
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
        font-size: 11px;
      }

      .noticeCard p {
        margin: 0;
        color: #1d4ed8;
        font-size: 10px;
        line-height: 1.5;
      }

      .mappingForm {
        display: grid;
        gap: 15px;
      }

      .mappingCard,
      .optionsCard {
        padding: 18px;
      }

      .cardHeader {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 16px;
      }

      .cardHeader h2 {
        margin: 4px 0 4px;
        color: #0f172a;
        font-size: 17px;
      }

      .cardHeader p {
        margin: 0;
        color: #64748b;
        font-size: 10px;
      }

      .headerOption {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #475569;
        font-size: 9px;
        font-weight: 700;
      }

      .headerOption input {
        accent-color: #2563eb;
      }

      .mappingGrid {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 11px;
      }

      .mappingItem {
        min-width: 0;
        border: 1px solid #e5e7eb;
        border-radius: 11px;
        padding: 12px;
        background: #fafafa;
      }

      .columnTop {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .columnLabel {
        display: block;
        margin-bottom: 3px;
        color: #94a3b8;
        font-size: 8px;
        font-weight: 900;
      }

      .columnTop strong {
        display: block;
        overflow: hidden;
        color: #0f172a;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .columnNumber {
        display: grid;
        width: 24px;
        height: 24px;
        flex: 0 0 24px;
        place-items: center;
        border-radius: 6px;
        background: #e2e8f0;
        color: #475569;
        font-size: 8px;
        font-weight: 900;
      }

      .arrow {
        margin: 8px 0;
        color: #94a3b8;
        font-size: 12px;
        text-align: center;
      }

      .mappingItem > label {
        display: block;
        margin-bottom: 4px;
        color: #475569;
        font-size: 8px;
        font-weight: 800;
      }

      select {
        width: 100%;
        min-height: 36px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0 8px;
        background: #ffffff;
        color: #0f172a;
        font-size: 10px;
        outline: none;
      }

      select:focus {
        border-color: #60a5fa;
        box-shadow:
          0 0 0 3px rgba(59,130,246,.10);
      }

      .samples {
        display: grid;
        gap: 4px;
        margin-top: 10px;
      }

      .samples > span {
        color: #94a3b8;
        font-size: 7px;
        font-weight: 900;
      }

      .sampleValue {
        overflow: hidden;
        border-radius: 5px;
        padding: 4px 6px;
        background: #ffffff;
        color: #475569;
        font-size: 8px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sampleValue.blank {
        color: #cbd5e1;
        font-style: italic;
      }

      .optionGrid {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .optionItem {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 11px;
        cursor: pointer;
      }

      .optionItem input {
        margin-top: 2px;
        accent-color: #2563eb;
      }

      .optionItem strong {
        display: block;
        margin-bottom: 3px;
        color: #0f172a;
        font-size: 10px;
      }

      .optionItem span {
        display: block;
        color: #64748b;
        font-size: 8px;
        line-height: 1.45;
      }

      .actionCard {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 15px 17px;
      }

      .actionCard strong {
        color: #0f172a;
        font-size: 11px;
      }

      .actionCard p {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 9px;
      }

      .actions {
        display: flex;
        flex-shrink: 0;
        gap: 7px;
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

      button.primaryButton {
        cursor: pointer;
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

      @media (max-width: 1050px) {
        .mappingGrid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 750px) {
        .pageHeader,
        .cardHeader,
        .actionCard {
          align-items: flex-start;
          flex-direction: column;
        }

        .mappingGrid,
        .optionGrid {
          grid-template-columns: 1fr;
        }

        .actions {
          width: 100%;
        }

        .actions > * {
          flex: 1;
        }
      }

      @media (max-width: 500px) {
        .fileCard {
          align-items: flex-start;
          flex-direction: column;
        }

        .actions {
          flex-direction: column;
        }
      }
    `}</style>
  )
}
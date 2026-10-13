import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
<<<<<<< HEAD
import { requireRole } from '@/lib/auth/require-role'
import { unstable_rethrow } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['docx', 'pdf', 'xlsx', 'xls', 'csv', 'txt']
=======

import { requireRole } from '@/lib/auth/require-role'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_EXTENSIONS = [
  'docx',
  'pdf',
  'xlsx',
  'xls',
  'csv',
  'txt',
]
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

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

function clean(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .trim()
}

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.')

  if (parts.length < 2) {
    return ''
  }

  return parts.pop() ?? ''
}

function normalizeRows(rows: unknown[][]): string[][] {
  return rows
    .map((row) => row.map((cell) => clean(cell)))
    .filter((row) => row.some((cell) => cell !== ''))
}

function encodePreview(data: ConversionResult) {
<<<<<<< HEAD
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url')
=======
  return Buffer.from(
    JSON.stringify(data),
    'utf8'
  ).toString('base64url')
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

/* =========================================================
   EXCEL / XLS / CSV
========================================================= */

<<<<<<< HEAD
function extractSpreadsheet(buffer: Buffer, extension: string): ExtractedSheet[] {
=======
function extractSpreadsheet(
  buffer: Buffer,
  extension: string
): ExtractedSheet[] {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const workbook =
    extension === 'csv'
      ? XLSX.read(buffer.toString('utf8'), {
          type: 'string',
        })
      : XLSX.read(buffer, {
          type: 'buffer',
          cellDates: false,
        })

  const sheets: ExtractedSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]

    if (!worksheet) {
      continue
    }

<<<<<<< HEAD
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    })
=======
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(
      worksheet,
      {
        header: 1,
        defval: '',
        raw: false,
        blankrows: false,
      }
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    const rows = normalizeRows(rawRows)

    if (rows.length === 0) {
      continue
    }

    sheets.push({
      name: clean(sheetName) || 'Sheet',
      rows,
    })
  }

  return sheets
}

/* =========================================================
   WORD DOCX
========================================================= */

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripHtml(value: string) {
<<<<<<< HEAD
  return clean(decodeHtml(value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')))
}

function extractTablesFromHtml(html: string): ExtractedSheet[] {
  const sheets: ExtractedSheet[] = []
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi)
=======
  return clean(
    decodeHtml(
      value
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    )
  )
}

function extractTablesFromHtml(
  html: string
): ExtractedSheet[] {
  const sheets: ExtractedSheet[] = []

  const tableMatches = html.match(
    /<table[\s\S]*?<\/table>/gi
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (!tableMatches) {
    return sheets
  }

  tableMatches.forEach((tableHtml, tableIndex) => {
    const rows: string[][] = []
<<<<<<< HEAD
    const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi)
=======

    const rowMatches = tableHtml.match(
      /<tr[\s\S]*?<\/tr>/gi
    )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    if (!rowMatches) {
      return
    }

    for (const rowHtml of rowMatches) {
      const cells: string[] = []
<<<<<<< HEAD
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi
      let match: RegExpExecArray | null

      while ((match = cellRegex.exec(rowHtml)) !== null) {
        cells.push(stripHtml(match[1] ?? ''))
      }

      if (cells.some((cell) => cell !== '')) {
=======

      const cellRegex =
        /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi

      let match: RegExpExecArray | null

      while (
        (match = cellRegex.exec(rowHtml)) !== null
      ) {
        cells.push(
          stripHtml(match[1] ?? '')
        )
      }

      if (
        cells.some((cell) => cell !== '')
      ) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        rows.push(cells)
      }
    }

    if (rows.length > 0) {
      sheets.push({
        name: `Word Table ${tableIndex + 1}`,
        rows,
      })
    }
  })

  return sheets
}

<<<<<<< HEAD
async function extractWord(buffer: Buffer): Promise<{
=======
async function extractWord(
  buffer: Buffer
): Promise<{
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  sheets: ExtractedSheet[]
  warnings: string[]
}> {
  const warnings: string[] = []

<<<<<<< HEAD
  const htmlResult = await mammoth.convertToHtml({
    buffer,
  })

  const tables = extractTablesFromHtml(htmlResult.value)
=======
  const htmlResult =
    await mammoth.convertToHtml({
      buffer,
    })

  const tables =
    extractTablesFromHtml(htmlResult.value)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  for (const message of htmlResult.messages) {
    if (message.message) {
      warnings.push(message.message)
    }
  }

  if (tables.length > 0) {
    return {
      sheets: tables,
      warnings,
    }
  }

<<<<<<< HEAD
  const textResult = await mammoth.extractRawText({
    buffer,
  })
=======
  const textResult =
    await mammoth.extractRawText({
      buffer,
    })
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  const lines = textResult.value
    .split('\n')
    .map((line) => clean(line))
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      sheets: [],
<<<<<<< HEAD
      warnings: [...warnings, 'No readable Word table or text was found.'],
=======
      warnings: [
        ...warnings,
        'No readable Word table or text was found.',
      ],
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  warnings.push(
    'No Word table was detected. Text was preserved as individual rows for manual review.'
  )

  return {
    sheets: [
      {
        name: 'Word Content',
        rows: lines.map((line) => [line]),
      },
    ],
    warnings,
  }
}

/* =========================================================
   PDF
========================================================= */

<<<<<<< HEAD
async function extractPdf(buffer: Buffer): Promise<{
=======
async function extractPdf(
  buffer: Buffer
): Promise<{
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  sheets: ExtractedSheet[]
  warnings: string[]
}> {
  const warnings: string[] = []
<<<<<<< HEAD
=======

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()

  const lines = result.text
    .split('\n')
    .map((line) => clean(line))
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      sheets: [],
<<<<<<< HEAD
      warnings: ['No readable text was found in the PDF. The file may be scanned or image-based.'],
=======
      warnings: [
        'No readable text was found in the PDF. The file may be scanned or image-based.',
      ],
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  /*
   * PDF files do not reliably contain true table
   * structures.
   *
   * We preserve each extracted line instead of
   * guessing columns that may be incorrect.
   *
   * The next preview/mapping stage can let the
   * administrator arrange these values.
   */

  warnings.push(
    'PDF text was extracted successfully. Because PDF table layouts can vary, extracted lines must be reviewed before import.'
  )

  return {
    sheets: [
      {
        name: 'PDF Content',
        rows: lines.map((line) => [line]),
      },
    ],
    warnings,
  }
}

/* =========================================================
   TXT
========================================================= */

<<<<<<< HEAD
function extractText(buffer: Buffer): {
=======
function extractText(
  buffer: Buffer
): {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  sheets: ExtractedSheet[]
  warnings: string[]
} {
  const text = buffer.toString('utf8')

  const lines = text
    .split(/\r?\n/)
    .map((line) => clean(line))
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      sheets: [],
<<<<<<< HEAD
      warnings: ['The text file does not contain readable data.'],
=======
      warnings: [
        'The text file does not contain readable data.',
      ],
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }
  }

  /*
   * Detect tab-separated content first.
   */

<<<<<<< HEAD
  const hasTabs = lines.some((line) => line.includes('\t'))
=======
  const hasTabs = lines.some((line) =>
    line.includes('\t')
  )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

  if (hasTabs) {
    return {
      sheets: [
        {
          name: 'Text Data',
<<<<<<< HEAD
          rows: lines.map((line) => line.split('\t').map((cell) => clean(cell))),
=======
          rows: lines.map((line) =>
            line
              .split('\t')
              .map((cell) => clean(cell))
          ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        },
      ],
      warnings: [],
    }
  }

  return {
    sheets: [
      {
        name: 'Text Content',
        rows: lines.map((line) => [line]),
      },
    ],
<<<<<<< HEAD
    warnings: ['No structured columns were detected. Text was preserved for manual review.'],
=======
    warnings: [
      'No structured columns were detected. Text was preserved for manual review.',
    ],
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  }
}

/* =========================================================
   ROUTE
========================================================= */

<<<<<<< HEAD
export async function POST(request: NextRequest) {
=======
export async function POST(
  request: NextRequest
) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  try {
    /*
     * Only Super Admin can currently use
     * the master-data importer.
     */
    await requireRole(['super_admin'])
<<<<<<< HEAD
    const formData = await request.formData()
    const uploaded = formData.get('reference_file')

    if (!uploaded || !(uploaded instanceof File)) {
      return NextResponse.redirect(new URL('/admin/import-export?error=no_file', request.url), 303)
=======

    const formData =
      await request.formData()

    const uploaded =
      formData.get('reference_file')

    if (
      !uploaded ||
      !(uploaded instanceof File)
    ) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=no_file',
          request.url
        ),
        303
      )
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    }

    if (uploaded.size <= 0) {
      return NextResponse.redirect(
<<<<<<< HEAD
        new URL('/admin/import-export?error=empty_file', request.url),
=======
        new URL(
          '/admin/import-export?error=empty_file',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

    if (uploaded.size > MAX_FILE_SIZE) {
      return NextResponse.redirect(
<<<<<<< HEAD
        new URL('/admin/import-export?error=file_too_large', request.url),
=======
        new URL(
          '/admin/import-export?error=file_too_large',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const extension = getExtension(uploaded.name)

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.redirect(
        new URL('/admin/import-export?error=unsupported_file', request.url),
=======
    const extension =
      getExtension(uploaded.name)

    if (
      !ALLOWED_EXTENSIONS.includes(extension)
    ) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=unsupported_file',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const arrayBuffer = await uploaded.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
=======
    const arrayBuffer =
      await uploaded.arrayBuffer()

    const buffer =
      Buffer.from(arrayBuffer)

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    let sheets: ExtractedSheet[] = []
    let warnings: string[] = []

    /* ================================
       EXCEL / CSV
    ================================= */

<<<<<<< HEAD
    if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
      sheets = extractSpreadsheet(buffer, extension)
    }
    /* ================================
       WORD
    ================================= */
    else if (extension === 'docx') {
      const result = await extractWord(buffer)
      sheets = result.sheets
      warnings = result.warnings
    }
    /* ================================
       PDF
    ================================= */
    else if (extension === 'pdf') {
      const result = await extractPdf(buffer)
      sheets = result.sheets
      warnings = result.warnings
    }
    /* ================================
       TXT
    ================================= */
    else if (extension === 'txt') {
      const result = extractText(buffer)
=======
    if (
      extension === 'xlsx' ||
      extension === 'xls' ||
      extension === 'csv'
    ) {
      sheets = extractSpreadsheet(
        buffer,
        extension
      )
    }

    /* ================================
       WORD
    ================================= */

    else if (extension === 'docx') {
      const result =
        await extractWord(buffer)

      sheets = result.sheets
      warnings = result.warnings
    }

    /* ================================
       PDF
    ================================= */

    else if (extension === 'pdf') {
      const result =
        await extractPdf(buffer)

      sheets = result.sheets
      warnings = result.warnings
    }

    /* ================================
       TXT
    ================================= */

    else if (extension === 'txt') {
      const result =
        extractText(buffer)

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      sheets = result.sheets
      warnings = result.warnings
    }

    /* ================================
       NOTHING EXTRACTED
    ================================= */

    if (sheets.length === 0) {
      return NextResponse.redirect(
<<<<<<< HEAD
        new URL('/admin/import-export?error=no_readable_data', request.url),
=======
        new URL(
          '/admin/import-export?error=no_readable_data',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const totalRows = sheets.reduce((total, sheet) => total + sheet.rows.length, 0)

    if (totalRows === 0) {
      return NextResponse.redirect(
        new URL('/admin/import-export?error=no_readable_data', request.url),
=======
    const totalRows =
      sheets.reduce(
        (total, sheet) =>
          total + sheet.rows.length,
        0
      )

    if (totalRows === 0) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=no_readable_data',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

    /*
     * IMPORTANT:
     *
     * We do NOT insert anything into Supabase
     * at this stage.
     *
     * Conversion -> Preview -> Confirmation
     * -> Database import.
     *
     * Missing values remain blank.
     */

    const conversion: ConversionResult = {
      fileName: uploaded.name,
      fileType: extension,
      sheets,
      warnings,
    }

<<<<<<< HEAD
    const encoded = encodePreview(conversion)
=======
    const encoded =
      encodePreview(conversion)
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

    /*
     * Prevent giant URLs.
     *
     * Small/medium files can temporarily travel
     * through the preview query parameter.
     *
     * Later we can move conversion sessions into
     * server-side storage if needed.
     */
    if (encoded.length > 500_000) {
      return NextResponse.redirect(
<<<<<<< HEAD
        new URL('/admin/import-export?error=preview_too_large', request.url),
=======
        new URL(
          '/admin/import-export?error=preview_too_large',
          request.url
        ),
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        303
      )
    }

<<<<<<< HEAD
    const previewUrl = new URL('/admin/import-export/preview', request.url)
    previewUrl.searchParams.set('data', encoded)

    return NextResponse.redirect(previewUrl, 303)
  } catch (error) {
    unstable_rethrow(error)
    console.error('AlterSched import conversion failed:', error)

    return NextResponse.redirect(
      new URL('/admin/import-export?error=conversion_failed', request.url),
      303
    )
  }
}
=======
    const previewUrl =
      new URL(
        '/admin/import-export/preview',
        request.url
      )

    previewUrl.searchParams.set(
      'data',
      encoded
    )

    return NextResponse.redirect(
      previewUrl,
      303
    )
  } catch (error) {
    console.error(
      'AlterSched import conversion failed:',
      error
    )

    return NextResponse.redirect(
      new URL(
        '/admin/import-export?error=conversion_failed',
        request.url
      ),
      303
    )
  }
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

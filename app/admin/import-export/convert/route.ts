import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

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
  return Buffer.from(
    JSON.stringify(data),
    'utf8'
  ).toString('base64url')
}

/* =========================================================
   EXCEL / XLS / CSV
========================================================= */

function extractSpreadsheet(
  buffer: Buffer,
  extension: string
): ExtractedSheet[] {
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

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(
      worksheet,
      {
        header: 1,
        defval: '',
        raw: false,
        blankrows: false,
      }
    )

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

  if (!tableMatches) {
    return sheets
  }

  tableMatches.forEach((tableHtml, tableIndex) => {
    const rows: string[][] = []

    const rowMatches = tableHtml.match(
      /<tr[\s\S]*?<\/tr>/gi
    )

    if (!rowMatches) {
      return
    }

    for (const rowHtml of rowMatches) {
      const cells: string[] = []

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

async function extractWord(
  buffer: Buffer
): Promise<{
  sheets: ExtractedSheet[]
  warnings: string[]
}> {
  const warnings: string[] = []

  const htmlResult =
    await mammoth.convertToHtml({
      buffer,
    })

  const tables =
    extractTablesFromHtml(htmlResult.value)

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

  const textResult =
    await mammoth.extractRawText({
      buffer,
    })

  const lines = textResult.value
    .split('\n')
    .map((line) => clean(line))
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      sheets: [],
      warnings: [
        ...warnings,
        'No readable Word table or text was found.',
      ],
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

async function extractPdf(
  buffer: Buffer
): Promise<{
  sheets: ExtractedSheet[]
  warnings: string[]
}> {
  const warnings: string[] = []

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
      warnings: [
        'No readable text was found in the PDF. The file may be scanned or image-based.',
      ],
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

function extractText(
  buffer: Buffer
): {
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
      warnings: [
        'The text file does not contain readable data.',
      ],
    }
  }

  /*
   * Detect tab-separated content first.
   */

  const hasTabs = lines.some((line) =>
    line.includes('\t')
  )

  if (hasTabs) {
    return {
      sheets: [
        {
          name: 'Text Data',
          rows: lines.map((line) =>
            line
              .split('\t')
              .map((cell) => clean(cell))
          ),
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
    warnings: [
      'No structured columns were detected. Text was preserved for manual review.',
    ],
  }
}

/* =========================================================
   ROUTE
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * Only Super Admin can currently use
     * the master-data importer.
     */
    await requireRole(['super_admin'])

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
    }

    if (uploaded.size <= 0) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=empty_file',
          request.url
        ),
        303
      )
    }

    if (uploaded.size > MAX_FILE_SIZE) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=file_too_large',
          request.url
        ),
        303
      )
    }

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
        303
      )
    }

    const arrayBuffer =
      await uploaded.arrayBuffer()

    const buffer =
      Buffer.from(arrayBuffer)

    let sheets: ExtractedSheet[] = []
    let warnings: string[] = []

    /* ================================
       EXCEL / CSV
    ================================= */

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

      sheets = result.sheets
      warnings = result.warnings
    }

    /* ================================
       NOTHING EXTRACTED
    ================================= */

    if (sheets.length === 0) {
      return NextResponse.redirect(
        new URL(
          '/admin/import-export?error=no_readable_data',
          request.url
        ),
        303
      )
    }

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

    const encoded =
      encodePreview(conversion)

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
        new URL(
          '/admin/import-export?error=preview_too_large',
          request.url
        ),
        303
      )
    }

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
import { createClient } from '@/lib/supabase/server'
import { PageHead, Stat, Badge, Empty } from '@/components/ui'
import { DataTable } from '@/components/data-table'
import { importStudyLoad } from './actions'

type SearchParams = Promise<{ success?: string; error?: string; count?: string; rejected?: string }>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const s = await createClient()
  const params = await searchParams
  const [{ data: semesters }, { data: imports }] = await Promise.all([
    s.from('semesters').select('id,name,is_active,academic_years(name)').order('start_date', { ascending: false }),
    s.from('study_load_imports').select('id,file_name,total_rows,imported_rows,rejected_rows,status,created_at,semesters(name)').order('created_at', { ascending: false }).limit(10),
  ])
  const active = (semesters ?? []).find((x: any) => x.is_active)

  return <div className="page-stack">
    <PageHead eyebrow="BSIT SCHEDULING" title="Study Load Import" description="Import the official BSIT study load from Excel. AlterSched validates subject codes, year levels and blocks before preparing class offerings." />

    {params.success === 'imported' && <div className="alert success">Import completed: {params.count ?? '0'} offering(s) prepared, {params.rejected ?? '0'} rejected.</div>}
    {params.error && <div className="alert error">Import failed: {params.error.replaceAll('_', ' ')}.</div>}

    <div className="stats-grid">
      <Stat label="Program" value="BSIT" />
      <Stat label="Active Term" value={active?.name ?? 'Not set'} />
      <Stat label="Recent Imports" value={String(imports?.length ?? 0)} />
    </div>

    <section className="panel">
      <h2>Upload Excel Study Load</h2>
      <p className="muted">Required columns: subject_code, year_level, section. Optional: weekly_hours, expected_students. Accepted files: .xlsx and .xls.</p>
      <form action={importStudyLoad} className="form-grid" encType="multipart/form-data">
        <label>Semester<select name="semester_id" defaultValue={active?.id ?? ''} required><option value="">Select semester</option>{(semesters ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Excel file<input name="file" type="file" accept=".xlsx,.xls" required /></label>
        <div><button className="button primary" type="submit">Validate & Import Study Load</button></div>
      </form>
      <div className="notice"><a href="/BSIT_Study_Load_Template.xlsx" download>Download Excel Template</a><br/><strong>Template header:</strong> subject_code | year_level | section | weekly_hours | expected_students</div>
    </section>

    <section className="panel">
      <h2>Import History</h2>
      {!imports?.length ? <Empty title="No study load imported yet" text="Upload the BSIT study load workbook to begin." /> : <DataTable>
        <thead>
          <tr>
            <th>File</th>
            <th>Status</th>
            <th>Rows</th>
            <th>Imported</th>
            <th>Rejected</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {imports.map((x: any) => (
            <tr key={x.id}>
              <td>{x.file_name}</td>
              <td><Badge tone={x.rejected_rows ? 'warning' : 'success'}>{x.status.replaceAll('_',' ')}</Badge></td>
              <td>{x.total_rows}</td>
              <td>{x.imported_rows}</td>
              <td>{x.rejected_rows}</td>
              <td>{new Date(x.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>}
    </section>
  </div>
}

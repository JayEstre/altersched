'use client'

import { useMemo, useState } from 'react'
import styles from './faculty-directory.module.css'

export type FacultyDirectoryRow = {
  id: string
  name: string
  email: string
  employeeId: string
  departmentId: string
  employmentType: string | null
  maxLoad: number | null
  /** Number of subjects the instructor is qualified to teach. */
  subjects: number
  /** Number of availability records. */
  availability: number
}

type Department = { id: string; code: string | null; name: string }

type Props = {
  rows: FacultyDirectoryRow[]
  departments: Department[]
  updateAction: (formData: FormData) => void | Promise<void>
  /** Department shown first and selected when the page opens (default BSIT). */
  priorityCode?: string
}

type Filter = 'all' | 'setup' | 'ready'

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
}

/** What still blocks this instructor from being scheduled automatically. */
function missing(row: FacultyDirectoryRow) {
  const items: string[] = []
  if (!row.subjects) items.push('subjects')
  if (!row.availability) items.push('availability')
  if (!row.maxLoad) items.push('max load')
  return items
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2)
  return (letters || '?').toUpperCase()
}

/** Searchable, filterable list of instructors; each row opens its own edit form. */
export function FacultyDirectory({
  rows,
  departments,
  updateAction,
  priorityCode = 'BSIT',
}: Props) {
  const departmentById = useMemo(
    () => new Map(departments.map((item) => [item.id, item])),
    [departments]
  )
  const priority = departments.find(
    (item) => (item.code ?? '').toUpperCase() === priorityCode.toUpperCase()
  )

  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState(
    priority && rows.some((row) => row.departmentId === priority.id) ? priority.id : 'all'
  )
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [rows]
  )

  const needle = query.trim().toLowerCase()
  const inDepartment = sorted.filter(
    (row) => department === 'all' || row.departmentId === department
  )
  const needsSetup = inDepartment.filter((row) => missing(row).length > 0)
  const visible = inDepartment.filter((row) => {
    if (filter === 'setup' && !missing(row).length) return false
    if (filter === 'ready' && missing(row).length) return false
    if (!needle) return true
    return `${row.name} ${row.email} ${row.employeeId}`.toLowerCase().includes(needle)
  })

  const departmentCounts = new Map<string, number>()
  for (const row of rows) {
    departmentCounts.set(row.departmentId, (departmentCounts.get(row.departmentId) ?? 0) + 1)
  }

  // Priority department (BSIT) first, then the others alphabetically, then "All".
  const departmentTabs = [
    ...departments
      .filter((item) => departmentCounts.has(item.id))
      .sort((a, b) => {
        if (a.id === priority?.id) return -1
        if (b.id === priority?.id) return 1
        return (a.code || a.name).localeCompare(b.code || b.name)
      })
      .map((item) => ({
        id: item.id,
        label: item.code || item.name,
        title: item.name,
        count: departmentCounts.get(item.id) ?? 0,
      })),
    { id: 'all', label: 'All departments', title: 'Every department', count: rows.length },
  ]

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: inDepartment.length },
    { key: 'setup', label: 'Needs setup', count: needsSetup.length },
    { key: 'ready', label: 'Ready', count: inDepartment.length - needsSetup.length },
  ]

  return (
    <div className={styles.directory}>
      <nav className={styles.deptTabs} aria-label="Department">
        {departmentTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={department === item.id}
            className={department === item.id ? styles.deptTabActive : styles.deptTab}
            onClick={() => setDepartment(item.id)}
            title={item.title}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </nav>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search name, email or employee ID"
          aria-label="Search instructors"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className={styles.filters} role="group" aria-label="Setup status">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              className={filter === item.key ? styles.filterActive : styles.filter}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.head} aria-hidden="true">
        <span>Instructor</span>
        <span>Employee ID</span>
        <span>Department</span>
        <span>Load</span>
        <span>Scheduling setup</span>
        <span />
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <strong>No instructors found</strong>
          <span>Try another search, department or filter.</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {visible.map((row) => {
            const dept = departmentById.get(row.departmentId)
            const gaps = missing(row)
            return (
              <li key={row.id}>
                <details className={styles.row}>
                  <summary className={styles.summary}>
                    <span className={styles.person}>
                      <span className={styles.avatar} aria-hidden="true">
                        {initials(row.name)}
                      </span>
                      <span className={styles.personText}>
                        <strong>{row.name}</strong>
                        <small>{row.email || 'No email'}</small>
                      </span>
                    </span>
                    <span className={styles.employeeId}>
                      <small className={styles.mobileLabel}>ID</small>
                      {row.employeeId}
                    </span>
                    <span>
                      <span className={styles.deptChip} title={dept?.name}>
                        {dept?.code || dept?.name || '—'}
                      </span>
                    </span>
                    <span className={styles.load}>
                      <strong>{row.maxLoad ? `${row.maxLoad} h` : '—'}</strong>
                      <small>
                        {row.employmentType
                          ? (EMPLOYMENT_LABELS[row.employmentType] ?? row.employmentType)
                          : 'Not specified'}
                      </small>
                    </span>
                    <span className={styles.setup}>
                      <span className={row.subjects ? styles.ok : styles.warn}>
                        {row.subjects} {row.subjects === 1 ? 'subject' : 'subjects'}
                      </span>
                      <span className={row.availability ? styles.ok : styles.warn}>
                        {row.availability ? `${row.availability} availability` : 'No availability'}
                      </span>
                    </span>
                    <span className={styles.editHint}>
                      <span className={styles.editText}>Edit</span>
                      <span className={styles.chevron} aria-hidden="true" />
                    </span>
                  </summary>

                  <form action={updateAction} className={styles.form}>
                    <input type="hidden" name="faculty_id" value={row.id} />
                    {gaps.length > 0 && (
                      <p className={styles.gapNote}>
                        Missing for automatic scheduling: <strong>{gaps.join(', ')}</strong>.
                        {gaps.some((gap) => gap !== 'max load') &&
                          ' Add qualified subjects and availability in the sections below.'}
                      </p>
                    )}
                    <label className={styles.field}>
                      <span>Employee ID</span>
                      <input name="employee_id" defaultValue={row.employeeId} required />
                    </label>
                    <label className={styles.field}>
                      <span>Department</span>
                      <select name="department_id" defaultValue={row.departmentId} required>
                        {departments.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.code ? `${item.code} — ${item.name}` : item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Employment</span>
                      <select name="employment_type" defaultValue={row.employmentType ?? ''}>
                        <option value="">Not specified</option>
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Max teaching load (hours / week)</span>
                      <input
                        name="max_teaching_load"
                        type="number"
                        min="1"
                        max="60"
                        step="0.5"
                        defaultValue={row.maxLoad ?? ''}
                        placeholder="e.g. 18"
                      />
                    </label>
                    <div className={styles.formActions}>
                      <button type="submit" className="btn btn-primary btn-sm">
                        Save changes
                      </button>
                    </div>
                  </form>
                </details>
              </li>
            )
          })}
        </ul>
      )}

      <p className={styles.footer}>
        Showing {visible.length} of {rows.length} instructors
        {needsSetup.length > 0 &&
          ` · ${needsSetup.length} need setup before they can be scheduled automatically`}
      </p>
    </div>
  )
}
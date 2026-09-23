'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'student' | 'faculty'

type Department = {
  id: string
  name: string
  code: string | null
}

type Program = {
  id: string
  department_id: string
  name: string
  code: string | null
}

type YearLevel = {
  id: string
  program_id: string
  name: string
  level_number: number
}

type Section = {
  id: string
  year_level_id: string
  name: string
  code: string | null
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [role, setRole] = useState<Role>('student')

  const [departments, setDepartments] = useState<Department[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [yearLevels, setYearLevels] = useState<YearLevel[]>([])
  const [sections, setSections] = useState<Section[]>([])

  const [departmentId, setDepartmentId] = useState('')
  const [programId, setProgramId] = useState('')
  const [yearLevelId, setYearLevelId] = useState('')
  const [sectionId, setSectionId] = useState('')

  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  /*
   * -------------------------------------------------------
   * LOAD REGISTRATION CATALOG
   * -------------------------------------------------------
   */
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true)
      setError('')

      const [
        departmentsResult,
        programsResult,
        yearLevelsResult,
        sectionsResult,
      ] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name, code')
          .eq('is_active', true)
          .order('code'),

        supabase
          .from('programs')
          .select('id, department_id, name, code')
          .eq('is_active', true)
          .order('code'),

        supabase
          .from('year_levels')
          .select('id, program_id, name, level_number')
          .eq('is_active', true)
          .order('level_number'),

        supabase
          .from('sections')
          .select('id, year_level_id, name, code')
          .eq('is_active', true)
          .order('name'),
      ])

      if (departmentsResult.error) {
        setError(
          `Unable to load departments: ${departmentsResult.error.message}`
        )
        setLoadingCatalog(false)
        return
      }

      if (programsResult.error) {
        setError(
          `Unable to load programs: ${programsResult.error.message}`
        )
        setLoadingCatalog(false)
        return
      }

      if (yearLevelsResult.error) {
        setError(
          `Unable to load year levels: ${yearLevelsResult.error.message}`
        )
        setLoadingCatalog(false)
        return
      }

      if (sectionsResult.error) {
        setError(
          `Unable to load sections: ${sectionsResult.error.message}`
        )
        setLoadingCatalog(false)
        return
      }

      setDepartments(
        (departmentsResult.data ?? []) as Department[]
      )

      setPrograms(
        (programsResult.data ?? []) as Program[]
      )

      setYearLevels(
        (yearLevelsResult.data ?? []) as YearLevel[]
      )

      setSections(
        (sectionsResult.data ?? []) as Section[]
      )

      setLoadingCatalog(false)
    }

    loadCatalog()
  }, [supabase])

  /*
   * -------------------------------------------------------
   * FILTERED STUDENT OPTIONS
   * -------------------------------------------------------
   */

  const selectedProgram = programs.find(
    (program) => program.id === programId
  )

  const filteredYearLevels = yearLevels.filter(
    (yearLevel) => yearLevel.program_id === programId
  )

  const filteredSections = sections.filter(
    (section) => section.year_level_id === yearLevelId
  )

  /*
   * -------------------------------------------------------
   * ROLE SWITCH
   * -------------------------------------------------------
   */

  function changeRole(nextRole: Role) {
    setRole(nextRole)

    setDepartmentId('')
    setProgramId('')
    setYearLevelId('')
    setSectionId('')

    setError('')
    setMessage('')
  }

  /*
   * -------------------------------------------------------
   * STUDENT DROPDOWN CHANGES
   * -------------------------------------------------------
   */

  function changeProgram(value: string) {
    setProgramId(value)
    setYearLevelId('')
    setSectionId('')
  }

  function changeYearLevel(value: string) {
    setYearLevelId(value)
    setSectionId('')
  }

  /*
   * -------------------------------------------------------
   * SUBMIT REGISTRATION
   * -------------------------------------------------------
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError('')
    setMessage('')
    setSubmitting(true)

    const form = new FormData(event.currentTarget)

    const fullName = String(
      form.get('full_name') || ''
    ).trim()

    const email = String(
      form.get('email') || ''
    ).trim()

    const password = String(
      form.get('password') || ''
    )

    const idNumber = String(
      form.get('id_number') || ''
    ).trim()

    /*
     * COMMON VALIDATION
     */

    if (
      !fullName ||
      !email ||
      !password ||
      !idNumber
    ) {
      setError('Please complete all required fields.')
      setSubmitting(false)
      return
    }

    if (password.length < 8) {
      setError(
        'Password must contain at least 8 characters.'
      )
      setSubmitting(false)
      return
    }

    /*
     * STUDENT VALIDATION
     */

    if (role === 'student') {
      if (
        !programId ||
        !yearLevelId ||
        !sectionId
      ) {
        setError(
          'Please select your program, year level, and section.'
        )
        setSubmitting(false)
        return
      }

      if (!selectedProgram) {
        setError(
          'The selected program could not be found.'
        )
        setSubmitting(false)
        return
      }
    }

    /*
     * FACULTY VALIDATION
     */

    if (
      role === 'faculty' &&
      !departmentId
    ) {
      setError(
        'Please select your department.'
      )
      setSubmitting(false)
      return
    }

    /*
     * AUTH METADATA
     */

    const metadata =
      role === 'student'
        ? {
            full_name: fullName,
            role: 'student',
            student_id: idNumber,

            /*
             * Automatically derived from program.
             * Student no longer needs to select
             * department manually.
             */
            department_id:
              selectedProgram!.department_id,

            program_id: programId,
            year_level_id: yearLevelId,
            section_id: sectionId,
          }
        : {
            full_name: fullName,
            role: 'faculty',
            employee_id: idNumber,
            department_id: departmentId,
          }

    /*
     * CREATE SUPABASE AUTH USER
     */

    const {
      data,
      error: signUpError,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setSubmitting(false)
      return
    }

    /*
     * USER HAS ACTIVE SESSION
     */

    if (data.session) {
      router.replace('/pending-approval')
      router.refresh()
      return
    }

    /*
     * NO SESSION
     */

    setMessage(
      'Account created successfully. Your account is pending administrator approval.'
    )

    setSubmitting(false)
  }

  /*
   * -------------------------------------------------------
   * PAGE
   * -------------------------------------------------------
   */

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <div className="auth-branding">
          <Image src="/cctc-logo.png" alt="Consolatrix College of Toledo City" width={62} height={62} priority />
          <div className="brand centered">
            <Image className="brand-logo-image auth-logo-image" src="/altersched-logo.png" alt="AlterSched" width={58} height={58} priority />
            <span>AlterSched</span>
          </div>
        </div>

        <p className="eyebrow">
          SECURE REGISTRATION
        </p>

        <h1>Create your account</h1>

        <p className="muted">
          Register for CCTC AlterSched as a student or faculty member.
          Academic credentials are verified before
          dashboard access is granted.
        </p>

        {/* ROLE SWITCH */}

        <div
          className="role-switch"
          aria-label="Account type"
        >
          <button
            type="button"
            className={
              role === 'student'
                ? 'active'
                : ''
            }
            onClick={() =>
              changeRole('student')
            }
          >
            Student
          </button>

          <button
            type="button"
            className={
              role === 'faculty'
                ? 'active'
                : ''
            }
            onClick={() =>
              changeRole('faculty')
            }
          >
            Faculty
          </button>
        </div>

        {/* FORM */}

        <form
          className="form form-grid"
          onSubmit={handleSubmit}
        >
          {/* FULL NAME */}

          <label className="span-2">
            Full name

            <input
              name="full_name"
              type="text"
              placeholder="Full name"
              required
            />
          </label>

          {/* EMAIL */}

          <label>
            Email

            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </label>

          {/* PASSWORD */}

          <label>
            Password

            <input
              name="password"
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </label>

          {/* ID NUMBER */}

          <label
            className={
              role === 'student'
                ? ''
                : ''
            }
          >
            {role === 'student'
              ? 'Student ID'
              : 'Employee ID'}

            <input
              name="id_number"
              type="text"
              placeholder={
                role === 'student'
                  ? 'Student ID'
                  : 'Employee ID'
              }
              required
            />
          </label>

          {/* ========================== */}
          {/* STUDENT FIELDS */}
          {/* ========================== */}

          {role === 'student' && (
            <>
              {/* PROGRAM */}

              <label>
                Program

                <select
                  value={programId}
                  onChange={(e) =>
                    changeProgram(
                      e.target.value
                    )
                  }
                  disabled={loadingCatalog}
                  required
                >
                  <option value="">
                    {loadingCatalog
                      ? 'Loading programs...'
                      : 'Select program'}
                  </option>

                  {programs.map(
                    (program) => (
                      <option
                        key={program.id}
                        value={program.id}
                      >
                        {program.code ||
                          program.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* YEAR LEVEL */}

              <label>
                Year level

                <select
                  value={yearLevelId}
                  onChange={(e) =>
                    changeYearLevel(
                      e.target.value
                    )
                  }
                  disabled={!programId}
                  required
                >
                  <option value="">
                    Select year level
                  </option>

                  {filteredYearLevels.map(
                    (yearLevel) => (
                      <option
                        key={yearLevel.id}
                        value={yearLevel.id}
                      >
                        {yearLevel.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* SECTION */}

              <label>
                Section

                <select
                  value={sectionId}
                  onChange={(e) =>
                    setSectionId(
                      e.target.value
                    )
                  }
                  disabled={!yearLevelId}
                  required
                >
                  <option value="">
                    Select section
                  </option>

                  {filteredSections.map(
                    (section) => (
                      <option
                        key={section.id}
                        value={section.id}
                      >
                        {section.code &&
section.name &&
section.code !== section.name
  ? `${section.code} — ${section.name}`
  : section.code || section.name}
                      </option>
                    )
                  )}
                </select>
              </label>
            </>
          )}

          {/* ========================== */}
          {/* FACULTY FIELDS */}
          {/* ========================== */}

          {role === 'faculty' && (
            <label>
              Department

              <select
                value={departmentId}
                onChange={(e) =>
                  setDepartmentId(
                    e.target.value
                  )
                }
                disabled={loadingCatalog}
                required
              >
                <option value="">
                  {loadingCatalog
                    ? 'Loading departments...'
                    : 'Select department'}
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department.id}
                      value={department.id}
                    >
                      {department.code ||
                        department.name}
                    </option>
                  )
                )}
              </select>
            </label>
          )}

          {/* ERROR */}

          {error && (
            <div className="form-alert error span-2">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div className="form-alert success span-2">
              {message}
            </div>
          )}

          {/* SUBMIT */}

          <button
            className="btn btn-primary span-2"
            type="submit"
            disabled={
              submitting ||
              loadingCatalog
            }
          >
            {submitting
              ? 'Creating account…'
              : 'Create account'}
          </button>
        </form>

        <p className="switch">
          Already registered?{' '}
          <Link href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}
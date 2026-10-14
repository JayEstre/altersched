'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AuthCard, AuthHeading, AuthPage } from '@/components/auth-shell'
import { PasswordField } from '@/components/password-field'
import { createClient } from '@/lib/supabase/client'

type Department = { id: string; code: string; name: string }

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), [])
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    // Visitors are not signed in, and RLS only lets approved users read `departments`.
    // get_registration_catalog() is a SECURITY DEFINER function that exposes only the
    // active department/program list needed by this form.
    supabase.rpc('get_registration_catalog').then(({ data, error }) => {
      if (error) {
        console.error('Registration catalog failed to load:', error)
        setError('Unable to load departments. Please try again later.')
        return
      }
      const list = ((data as { departments?: Department[] } | null)?.departments ?? [])
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code))
      setDepartments(list)
    })
  }, [supabase])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('full_name') || '').trim()
    const email = String(form.get('email') || '').trim()
    const employeeId = String(form.get('employee_id') || '').trim()
    const departmentId = String(form.get('department_id') || '').trim()
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm_password') || '')
    if (!fullName || !email || !employeeId || !departmentId || !password) {
      setError('Complete all required fields.')
      setSubmitting(false)
      return
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      setSubmitting(false)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      setSubmitting(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'faculty',
          employee_id: employeeId,
          department_id: departmentId,
        },
      },
    })
    if (signUpError || !data.user) {
      const raw = signUpError?.message || ''
      // The signup trigger creates the faculty profile; a duplicate Employee ID makes it fail
      // and Supabase only reports a generic database error.
      const message = /database error saving new user/i.test(raw)
        ? 'Registration could not be saved. This Employee ID may already be registered. Check it, or contact the administrator.'
        : /already registered/i.test(raw)
          ? 'An account with this email already exists. Sign in instead, or contact the administrator.'
          : raw || 'Unable to create instructor account.'
      setError(message)
      setSubmitting(false)
      return
    }
    if (data.session) await supabase.auth.signOut()
    setSuccess(true)
    setSubmitting(false)
  }

  if (success) {
    return (
      <AuthPage>
        <AuthCard>
          <AuthHeading title="Account created">
            An Administrator needs to approve your account. Once approved, sign in with the email
            and password you just entered.
          </AuthHeading>
          <Link className="btn btn-primary auth-submit" href="/login">
            Back to sign in
          </Link>
        </AuthCard>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthCard wide>
        <AuthHeading title="Create an instructor account">
          The Administrator approves new accounts before you can sign in. Students do not need an
          account.
        </AuthHeading>
        <form className="form auth-form-grid" onSubmit={submit}>
          <label>
            Full name
            <input name="full_name" autoComplete="name" required placeholder="Complete name" />
          </label>
          <label>
            Employee ID
            <input name="employee_id" autoComplete="off" required placeholder="Employee ID" />
          </label>
          <label>
            Department
            <select name="department_id" autoComplete="organization" required defaultValue="">
              <option value="" disabled>
                Select department
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@school.edu"
            />
          </label>
          <PasswordField
            label="Password"
            name="password"
            showPassword={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
          <PasswordField
            label="Confirm password"
            name="confirm_password"
            showPassword={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((value) => !value)}
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Repeat password"
          />
          {error && <div className="form-alert error span-2">{error}</div>}
          <button
            className="btn btn-primary span-2 auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Creating account…' : 'Submit for approval'}
          </button>
        </form>
        <p className="switch">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </AuthCard>
    </AuthPage>
  )
}

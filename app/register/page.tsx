'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AuthCard, AuthPage } from '@/components/auth-shell'
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
<<<<<<< HEAD
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
=======
    supabase.from('departments').select('id,code,name').eq('is_active', true).order('code')
      .then(({ data }) => setDepartments((data || []) as Department[]))
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
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
<<<<<<< HEAD
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
=======
    if (!fullName || !email || !employeeId || !departmentId || !password) { setError('Complete all required fields.'); setSubmitting(false); return }
    if (password.length < 8) { setError('Password must contain at least 8 characters.'); setSubmitting(false); return }
    if (password !== confirm) { setError('Passwords do not match.'); setSubmitting(false); return }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role: 'faculty', employee_id: employeeId, department_id: departmentId } },
    })
    if (signUpError || !data.user) { setError(signUpError?.message || 'Unable to create instructor account.'); setSubmitting(false); return }
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
    if (data.session) await supabase.auth.signOut()
    setSuccess(true)
    setSubmitting(false)
  }

  if (success) {
    return (
      <AuthPage>
        <AuthCard status className="auth-status-card">
<<<<<<< HEAD
          <div className="auth-brand-lockup">
            <Image src="/altsched-logo.png" alt="AlterSched" width={58} height={58} />
            <strong>AlterSched</strong>
          </div>
          <div className="auth-success-icon">✓</div>
          <p className="eyebrow">REGISTRATION RECEIVED</p>
          <h1>Awaiting administrator approval</h1>
          <p className="muted">
            Your Instructor account was created successfully. You can sign in after an Administrator
            approves the account.
          </p>
          <Link className="btn btn-primary" href="/login">
            Return to sign in
          </Link>
=======
          <div className="auth-brand-lockup"><Image src="/altsched-logo.png" alt="AlterSched" width={58} height={58}/><strong>AlterSched</strong></div>
          <div className="auth-success-icon">✓</div>
          <p className="eyebrow">REGISTRATION RECEIVED</p>
          <h1>Awaiting administrator approval</h1>
          <p className="muted">Your Instructor account was created successfully. You can sign in after an Administrator approves the account.</p>
          <Link className="btn btn-primary" href="/login">Return to sign in</Link>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        </AuthCard>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthCard wide className="auth-card-polished">
        <header className="auth-hero">
          <div className="auth-school-lockup">
<<<<<<< HEAD
            <Image
              src="/cctc-logo.png"
              alt="Consolatrix College of Toledo City"
              width={64}
              height={64}
              priority
            />
            <span>
              <strong>Consolatrix College</strong>
              <small>of Toledo City, Inc.</small>
            </span>
          </div>
          <div className="auth-brand-lockup">
            <Image src="/altsched-logo.png" alt="AlterSched" width={64} height={64} priority />
            <span>
              <strong>AlterSched</strong>
              <small>SMART SCHEDULING, BRIGHTER DAYS</small>
            </span>
          </div>
        </header>
        <div className="auth-copy">
          <p className="eyebrow">INSTRUCTOR REGISTRATION</p>
          <h1>Create your instructor account</h1>
          <p className="muted">
            Register below to request access to AlterSched. Instructor accounts require
            Administrator approval before portal access.
          </p>
        </div>
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
=======
            <Image src="/cctc-logo.png" alt="Consolatrix College of Toledo City" width={64} height={64} priority/>
            <span><strong>Consolatrix College</strong><small>of Toledo City, Inc.</small></span>
          </div>
          <div className="auth-brand-lockup">
            <Image src="/altsched-logo.png" alt="AlterSched" width={64} height={64} priority/>
            <span><strong>AlterSched</strong><small>SMART SCHEDULING, BRIGHTER DAYS</small></span>
          </div>
        </header>

        <div className="auth-copy">
          <p className="eyebrow">INSTRUCTOR REGISTRATION</p>
          <h1>Create your instructor account</h1>
          <p className="muted">Register below to request access to AlterSched. Instructor accounts require Administrator approval before portal access.</p>
        </div>

        <form className="form auth-form-grid" onSubmit={submit}>
          <label>Full name<input name="full_name" autoComplete="name" required placeholder="Complete name"/></label>
          <label>Employee ID<input name="employee_id" autoComplete="off" required placeholder="Employee ID"/></label>
          <label>Department<select name="department_id" autoComplete="organization" required defaultValue=""><option value="" disabled>Select department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}</select></label>
          <label>Email<input name="email" type="email" autoComplete="email" required placeholder="name@school.edu"/></label>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
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
<<<<<<< HEAD
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
=======
          <button className="btn btn-primary span-2 auth-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Submit for approval'}</button>
        </form>
        <p className="switch">Already registered? <Link href="/login">Sign in</Link></p>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      </AuthCard>
    </AuthPage>
  )
}

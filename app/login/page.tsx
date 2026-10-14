'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthCard, AuthHeading, AuthPage } from '@/components/auth-shell'
import { PasswordField } from '@/components/password-field'
import { createClient } from '@/lib/supabase/client'
import { fetchProfileForUser } from '@/lib/auth/profile'
import { destinationFor, type AccountStatus, type AlterSchedRole } from '@/lib/auth/redirect'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') || '').trim(),
      password: String(form.get('password') || ''),
    })
    if (error || !data.user) {
      setError(error?.message || 'Unable to sign in.')
      setLoading(false)
      return
    }

    const profile = await fetchProfileForUser(supabase, data.user.id)
    if (!profile) {
      setError('Your AlterSched profile could not be loaded.')
      setLoading(false)
      return
    }

    router.replace(
      destinationFor(profile.role as AlterSchedRole, profile.account_status as AccountStatus)
    )
    router.refresh()
  }

  return (
    <AuthPage>
      <AuthCard>
        <AuthHeading title="Sign in">
          For Administrators, Department Schedulers and Instructors of CCTC.
        </AuthHeading>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <PasswordField
            label="Password"
            name="password"
            showPassword={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
          {error && <div className="form-alert error">{error}</div>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="switch">
          New instructor? <Link href="/register">Create an account</Link>
        </p>
      </AuthCard>
    </AuthPage>
  )
}

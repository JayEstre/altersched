'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthCard, AuthPage } from '@/components/auth-shell'
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
    setLoading(true); setError('')
    const form = new FormData(event.currentTarget)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') || '').trim(),
      password: String(form.get('password') || ''),
    })
    if (error || !data.user) { setError(error?.message || 'Unable to sign in.'); setLoading(false); return }

    const profile = await fetchProfileForUser(supabase, data.user.id)
    if (!profile) { setError('Your AlterSched profile could not be loaded.'); setLoading(false); return }

    router.replace(destinationFor(profile.role as AlterSchedRole, profile.account_status as AccountStatus))
    router.refresh()
  }

  return (
    <AuthPage>
      <AuthCard className="auth-card-polished auth-login-card">
        <header className="auth-hero auth-hero-login">
          <div className="auth-school-lockup">
            <Image src="/cctc-logo.png" alt="Consolatrix College of Toledo City" width={60} height={60} priority/>
            <span><strong>Consolatrix College</strong><small>of Toledo City, Inc.</small></span>
          </div>
          <div className="auth-brand-lockup">
            <Image src="/altsched-logo.png" alt="AlterSched" width={60} height={60} priority/>
            <span><strong>AlterSched</strong><small>SMART SCHEDULING, BRIGHTER DAYS</small></span>
          </div>
        </header>
        <div className="auth-copy">
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Sign in to AlterSched</h1>
          <p className="muted">One secure sign-in for Administrators, Department Schedulers, and Instructors.</p>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
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
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="switch">Instructor without an account? <Link href="/register">Create one</Link></p>
      </AuthCard>
    </AuthPage>
  )
}

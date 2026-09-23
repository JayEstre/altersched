'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { destinationFor, type AccountStatus, type AlterSchedRole } from '@/lib/auth/redirect'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      setError('Your AlterSched profile could not be loaded.')
      setLoading(false)
      return
    }

    const destination = destinationFor(profile.role as AlterSchedRole, profile.account_status as AccountStatus)
    router.replace(destination)
    router.refresh()
  }

  return <main className="auth-page"><section className="auth-card">
    <div className="auth-branding">
      <Image src="/cctc-logo.png" alt="Consolatrix College of Toledo City" width={62} height={62} priority />
      <div className="brand centered"><Image className="brand-logo-image auth-logo-image" src="/altsched-logo.png" alt="AlterSched" width={58} height={58} priority /><span>AlterSched</span></div>
    </div>
    <p className="eyebrow">WELCOME BACK</p><h1>Sign in to AlterSched</h1>
    <p className="muted">Secure CCTC access for students, faculty, department schedulers, and administrators. Accounts requiring approval must be verified before portal access.</p>
    <form className="form" onSubmit={handleSubmit}>
      <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
      <label>Password<input name="password" type="password" placeholder="••••••••" required /></label>
      {error && <div className="form-alert error">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p className="switch">No account? <Link href="/register">Create one</Link></p>
    <p className="switch compact"><Link href="/admin/login">Administrator / Scheduler access</Link></p>
  </section></main>
}

'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
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

    const { data: profile } = await supabase.from('profiles').select('role, account_status').eq('id', data.user.id).single()
    if (!profile || profile.account_status !== 'approved' || !['super_admin', 'department_scheduler'].includes(profile.role)) {
      await supabase.auth.signOut()
      setError('This portal is restricted to approved administrators and department schedulers.')
      setLoading(false)
      return
    }

    router.replace(profile.role === 'super_admin' ? '/admin/dashboard' : '/scheduler/dashboard')
    router.refresh()
  }

  return <main className="auth-page"><section className="auth-card">
    <div className="brand centered"><span className="brand-mark">A</span><span>AlterSched</span></div>
    <p className="eyebrow">SECURED PORTAL</p><h1>Administrative access</h1>
    <p className="muted">For authorized Registrar, Super Admin, and Department Scheduler accounts only.</p>
    <form className="form" onSubmit={handleSubmit}>
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" required /></label>
      {error && <div className="form-alert error">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Secure sign in'}</button>
    </form>
    <p className="switch"><Link href="/login">Back to user login</Link></p>
  </section></main>
}

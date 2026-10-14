import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandWeek } from './brand-week'
import styles from './auth-shell.module.css'

/** Sign-in, registration and account-status pages: brand panel on the left, the form on the right. */
export function AuthPage({
  children,
}: {
  children: ReactNode
  polished?: boolean
  className?: string
}) {
  return (
    <main className={styles.page}>
      <aside className={styles.brand}>
        <Link href="/" className={styles.lockup}>
          <Image src="/cctc-logo.png" alt="" width={44} height={44} priority />
          <span>
            <strong>Consolatrix College</strong>
            <small>of Toledo City, Inc.</small>
          </span>
        </Link>
        <div className={styles.pitch}>
          <h2>Every class, room and instructor in one schedule.</h2>
          <ul>
            <li>Conflict-checked timetables for every BSIT block</li>
            <li>Instructors see their week and request changes</li>
            <li>Students open the published schedule by QR code</li>
          </ul>
        </div>
        <BrandWeek />
        <p className={styles.product}>
          <Image src="/altsched-logo.png" alt="" width={22} height={22} />
          AlterSched · class scheduling
        </p>
      </aside>
      <section className={styles.main}>{children}</section>
    </main>
  )
}

export function AuthCard({
  children,
  wide = false,
  className = '',
}: {
  children: ReactNode
  wide?: boolean
  status?: boolean
  className?: string
}) {
  return (
    <div className={[styles.card, wide ? styles.wide : '', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

/** Heading block used at the top of each auth card. */
export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className={styles.heading}>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  )
}

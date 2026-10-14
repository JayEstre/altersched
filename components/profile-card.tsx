import type { ReactNode } from 'react'
import styles from './profile-card.module.css'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0]?.slice(0, 2) ?? '')
  return (letters || '?').toUpperCase()
}

/** Account summary: who you are, your role, and the details the school keeps on record. */
export function ProfileCard({
  name,
  email,
  role,
  details,
}: {
  name: string
  email: string | null | undefined
  role: string
  details: { label: string; value: ReactNode }[]
}) {
  return (
    <section className={`panel ${styles.card}`}>
      <header className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(name)}
        </span>
        <div>
          <h3>{name}</h3>
          <p>{email ?? 'No email on record'}</p>
        </div>
        <span className="pill pill-info">{role}</span>
      </header>
      <dl className={styles.details}>
        {details.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        These details are managed by the Administrator. Ask them if something needs to change.
      </p>
    </section>
  )
}

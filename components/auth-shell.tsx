<<<<<<< HEAD
import type { ReactNode } from 'react'
=======
import type { ReactNode } from "react";
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

export function AuthPage({
  children,
  polished = true,
<<<<<<< HEAD
  className = '',
}: {
  children: ReactNode
  polished?: boolean
  className?: string
}) {
  return (
    <main
      className={['auth-page', polished ? 'auth-page-polished' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
=======
  className = "",
}: {
  children: ReactNode;
  polished?: boolean;
  className?: string;
}) {
  return (
    <main className={['auth-page', polished ? 'auth-page-polished' : '', className].filter(Boolean).join(' ')}>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      {polished && (
        <>
          <div className="auth-decor auth-decor-grid" aria-hidden="true" />
          <div className="auth-decor auth-decor-orb auth-decor-orb-one" aria-hidden="true" />
          <div className="auth-decor auth-decor-orb auth-decor-orb-two" aria-hidden="true" />
        </>
      )}
      {children}
    </main>
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

export function AuthCard({
  children,
  wide = false,
  status = false,
<<<<<<< HEAD
  className = '',
}: {
  children: ReactNode
  wide?: boolean
  status?: boolean
  className?: string
=======
  className = "",
}: {
  children: ReactNode;
  wide?: boolean;
  status?: boolean;
  className?: string;
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}) {
  return (
    <section
      className={[
        'auth-card',
        wide ? 'auth-card-wide' : '',
        status ? 'auth-status-card' : '',
        className,
<<<<<<< HEAD
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  )
=======
      ].filter(Boolean).join(' ')}
    >
      {children}
    </section>
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

import type { ReactNode } from "react";

export function AuthPage({
  children,
  polished = true,
  className = "",
}: {
  children: ReactNode;
  polished?: boolean;
  className?: string;
}) {
  return (
    <main className={['auth-page', polished ? 'auth-page-polished' : '', className].filter(Boolean).join(' ')}>
      {polished && (
        <>
          <div className="auth-decor auth-decor-grid" aria-hidden="true" />
          <div className="auth-decor auth-decor-orb auth-decor-orb-one" aria-hidden="true" />
          <div className="auth-decor auth-decor-orb auth-decor-orb-two" aria-hidden="true" />
        </>
      )}
      {children}
    </main>
  );
}

export function AuthCard({
  children,
  wide = false,
  status = false,
  className = "",
}: {
  children: ReactNode;
  wide?: boolean;
  status?: boolean;
  className?: string;
}) {
  return (
    <section
      className={[
        'auth-card',
        wide ? 'auth-card-wide' : '',
        status ? 'auth-status-card' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </section>
  );
}

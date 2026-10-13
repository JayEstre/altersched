<<<<<<< HEAD
import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type PageHeadProps = {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

export function PageHead({ eyebrow, title, description, actions, className = '' }: PageHeadProps) {
=======
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type PageHeadProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHead({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: PageHeadProps) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  return (
    <section className={['page-head', className].filter(Boolean).join(' ')}>
      <div className="page-head-copy">
        <span className="page-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
<<<<<<< HEAD
      {actions && <div className="page-head-actions">{actions}</div>}
    </section>
  )
}

type StatProps = {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
  /** A status badge shown beside the label (e.g. "Stable"). */
  badge?: ReactNode
  className?: string
}

export function Stat({ label, value, hint, icon, badge, className = '' }: StatProps) {
=======

      {actions && <div className="page-head-actions">{actions}</div>}
    </section>
  );
}

type StatProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  className?: string;
};

export function Stat({ label, value, hint, icon, className = "" }: StatProps) {
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  return (
    <article className={['stat-card', className].filter(Boolean).join(' ')}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
<<<<<<< HEAD
        {badge && <span className="stat-badge">{badge}</span>}
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </article>
  )
=======

        {icon && <span className="stat-icon">{icon}</span>}
      </div>

      <strong className="stat-value">{value}</strong>

      {hint && <span className="stat-hint">{hint}</span>}
    </article>
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

export function Empty({
  text,
<<<<<<< HEAD
  title = 'Nothing here yet',
  className = '',
}: {
  text: string
  title?: string
  className?: string
}) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <div className="empty-state-icon">
        <Inbox size={22} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
=======
  title = "Nothing here yet",
  className = "",
}: {
  text: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <div className="empty-state-icon"><Inbox size={22} strokeWidth={1.7} aria-hidden="true" /></div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

export function Badge({
  children,
<<<<<<< HEAD
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}) {
  return (
    <span className={['pill', `pill-${tone}`, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
=======
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  return <span className={['pill', `pill-${tone}`, className].filter(Boolean).join(' ')}>{children}</span>;
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

export function Panel({
  title,
  description,
  children,
  actions,
<<<<<<< HEAD
  className = '',
}: {
  title?: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
=======
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}) {
  return (
    <section className={['panel', className].filter(Boolean).join(' ')}>
      {(title || description || actions) && (
        <div className="panel-header">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
<<<<<<< HEAD
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  )
}

type NoticeTone = 'success' | 'danger' | 'warning' | 'info'

/** Inline status message (success / error / warning / info). */
export function Notice({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: NoticeTone
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={['portal-alert', `portal-alert-${tone}`, className].filter(Boolean).join(' ')}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      {title && <strong>{title}</strong>}
      {children && <span>{children}</span>}
    </div>
  )
}

/**
 * Shows the outcome of a server action that redirected back with ?success=… or ?error=….
 * Unknown codes fall back to a generic message; `details` is shown after the message.
 */
export function ActionResult({
  params,
  successMessages = {},
  errorMessages = {},
}: {
  params: Record<string, string | string[] | undefined>
  successMessages?: Record<string, ReactNode>
  errorMessages?: Record<string, ReactNode>
}) {
  const value = (key: string) => {
    const v = params[key]
    return Array.isArray(v) ? v[0] : v
  }
  const success = value('success')
  const error = value('error')
  const details = value('details')
  if (error) {
    return (
      <Notice tone="danger" title="Action failed">
        {errorMessages[error] ?? error.replaceAll('_', ' ')}
        {details ? ` ${details}` : null}
      </Notice>
    )
  }
  if (success) {
    return (
      <Notice tone="success" title="Saved">
        {successMessages[success] ?? 'Changes saved successfully.'}
      </Notice>
    )
  }
  return null
}
=======

          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}

      <div className="panel-body">{children}</div>
    </section>
  );
}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

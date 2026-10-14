import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { humanize, statusTone } from '@/lib/format'

type PageHeadProps = {
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

export function PageHead({ title, description, actions, className = '' }: PageHeadProps) {
  return (
    <section className={['page-head', className].filter(Boolean).join(' ')}>
      <div className="page-head-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
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
  return (
    <article className={['stat-card', className].filter(Boolean).join(' ')}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {badge && <span className="stat-badge">{badge}</span>}
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </article>
  )
}

export function Empty({
  text,
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
}

export function Badge({
  children,
  tone,
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}) {
  // Raw database values ("pending", "completed_with_errors") read as sentence case.
  const content =
    typeof children === 'string' && /^[a-z][a-z_ -]*$/.test(children)
      ? humanize(children)
      : children
  const resolved =
    tone ??
    (typeof children === 'string' ? statusTone(children.toLowerCase()) : undefined) ??
    'default'
  return (
    <span className={['pill', `pill-${resolved}`, className].filter(Boolean).join(' ')}>
      {content}
    </span>
  )
}

export function Panel({
  title,
  description,
  children,
  actions,
  className = '',
}: {
  title?: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <section className={['panel', className].filter(Boolean).join(' ')}>
      {(title || description || actions) && (
        <div className="panel-header">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
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

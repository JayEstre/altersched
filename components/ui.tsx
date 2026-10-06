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
  return (
    <section className={['page-head', className].filter(Boolean).join(' ')}>
      <div className="page-head-copy">
        <span className="page-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

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
  return (
    <article className={['stat-card', className].filter(Boolean).join(' ')}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>

        {icon && <span className="stat-icon">{icon}</span>}
      </div>

      <strong className="stat-value">{value}</strong>

      {hint && <span className="stat-hint">{hint}</span>}
    </article>
  );
}

export function Empty({
  text,
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
}

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  return <span className={['pill', `pill-${tone}`, className].filter(Boolean).join(' ')}>{children}</span>;
}

export function Panel({
  title,
  description,
  children,
  actions,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
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
  );
}
import type { ReactNode } from "react";

type PageHeadProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: PageHeadProps) {
  return (
    <section className="page-head">
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
};

export function Stat({ label, value, hint, icon }: StatProps) {
  return (
    <article className="stat-card">
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
}: {
  text: string;
  title?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">A</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
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
    <section className={`panel ${className}`.trim()}>
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
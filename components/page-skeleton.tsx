/** Placeholder shown while a portal page is prepared on the server. */
export function PageSkeleton() {
  return (
    <div className="skeleton-page" role="status" aria-label="Loading page">
      <div style={{ display: 'grid', gap: 10 }}>
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-line" style={{ width: 'min(520px, 90%)' }} />
      </div>
      <div className="skeleton-panel">
        <span className="skeleton skeleton-line" style={{ width: 180 }} />
        <span className="skeleton skeleton-row" />
        <span className="skeleton skeleton-row" />
        <span className="skeleton skeleton-row" />
      </div>
      <div className="skeleton-panel">
        <span className="skeleton skeleton-line" style={{ width: 140 }} />
        <span className="skeleton skeleton-row" />
        <span className="skeleton skeleton-row" />
      </div>
    </div>
  )
}

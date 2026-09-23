import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <nav className="nav">
        <div className="institution-brand">
          <Image src="/cctc-logo.png" alt="Consolatrix College of Toledo City" width={50} height={50} priority />
          <div>
            <strong>Consolatrix College of Toledo City, Inc.</strong>
            <span>Academic Scheduling Platform</span>
          </div>
        </div>
        <div className="nav-actions">
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/register" className="btn btn-primary">Create account</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="product-lockup">
            <Image src="/altsched-logo.png" alt="AlterSched" width={68} height={68} priority />
            <div><span>Powered by</span><strong>AlterSched</strong></div>
          </div>
          <p className="eyebrow">CCTC ACADEMIC SCHEDULING</p>
          <h1>One campus.<br /><span>One reliable schedule.</span></h1>
          <p className="hero-text">
            A centralized scheduling environment for CCTC administrators, department schedulers,
            faculty, and students—built to coordinate academic offerings, rooms, teaching assignments,
            publication, and controlled schedule alterations.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn btn-primary btn-large">Open AlterSched</Link>
            <Link href="/register" className="btn btn-outline btn-large">Register</Link>
          </div>
        </div>

        <div className="hero-panel cctc-glass">
          <div className="panel-top">
            <span>Institutional Scheduling</span>
            <span className="status-dot">CCTC</span>
          </div>
          <div className="feature-stack">
            <article><strong>Conflict-aware planning</strong><p>Coordinate faculty, rooms, sections, and class offerings before publication.</p></article>
            <article><strong>Controlled publication</strong><p>Keep draft, approved, published, and archived schedule versions organized.</p></article>
            <article><strong>Traceable alterations</strong><p>Review schedule-change requests while preserving revision history and notifications.</p></article>
          </div>
          <div className="institution-seal">
            <Image src="/cctc-logo.png" alt="" width={82} height={82} />
            <div><strong>Consolatrix College of Toledo City, Inc.</strong><span>Academic schedule management through AlterSched</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}

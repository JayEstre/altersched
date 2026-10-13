<<<<<<< HEAD
import Image from 'next/image'
import Link from 'next/link'
=======
import Image from "next/image";
import Link from "next/link";
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

export default function Home() {
  return (
    <main className="landing">
      <nav className="nav">
        <div className="institution-brand">
<<<<<<< HEAD
          <Image
            src="/cctc-logo.png"
            alt="Consolatrix College of Toledo City"
            width={50}
            height={50}
            priority
          />
=======
          <Image src="/cctc-logo.png" alt="Consolatrix College of Toledo City" width={50} height={50} priority />
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
          <div>
            <strong>Consolatrix College of Toledo City, Inc.</strong>
            <span>Academic Scheduling Platform</span>
          </div>
        </div>
        <div className="nav-actions">
<<<<<<< HEAD
          <Link href="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link href="/register" className="btn btn-primary">
            Create account
          </Link>
        </div>
      </nav>
=======
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/register" className="btn btn-primary">Create account</Link>
        </div>
      </nav>

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
      <section className="hero">
        <div className="hero-copy">
          <div className="product-lockup">
            <Image src="/altsched-logo.png" alt="AlterSched" width={68} height={68} priority />
<<<<<<< HEAD
            <div>
              <span>Powered by</span>
              <strong>AlterSched</strong>
            </div>
          </div>
          <p className="eyebrow">CCTC ACADEMIC SCHEDULING</p>
          <h1>
            One campus.
            <br />
            <span>One reliable schedule.</span>
          </h1>
          <p className="hero-text">
            A centralized scheduling environment for CCTC administrators, department schedulers, and
            faculty—built to coordinate academic offerings, rooms, teaching assignments,
            publication, and controlled schedule alterations.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn btn-primary btn-large">
              Open AlterSched
            </Link>
            <Link href="/register" className="btn btn-outline btn-large">
              Register
            </Link>
          </div>
        </div>
=======
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

>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        <div className="hero-panel cctc-glass">
          <div className="panel-top">
            <span>Institutional Scheduling</span>
            <span className="status-dot">CCTC</span>
          </div>
<<<<<<< HEAD
          <div className="feature-stack">
            <article>
              <strong>Conflict-aware planning</strong>
              <p>Coordinate faculty, rooms, sections, and class offerings before publication.</p>
            </article>
            <article>
              <strong>Controlled publication</strong>
              <p>Keep draft, approved, published, and archived schedule versions organized.</p>
            </article>
            <article>
              <strong>Traceable alterations</strong>
              <p>
                Review schedule-change requests while preserving revision history and notifications.
              </p>
            </article>
          </div>
          <div className="context-strip">
            <div>
              <span>Faculty</span>
              <strong>Load-aware</strong>
            </div>
            <div>
              <span>Rooms</span>
              <strong>Capacity checks</strong>
            </div>
            <div>
              <span>Schedules</span>
              <strong>Versioned</strong>
            </div>
            <div>
              <span>Access</span>
              <strong>Role-based</strong>
            </div>
          </div>
          <div className="institution-seal">
            <Image src="/cctc-logo.png" alt="" width={82} height={82} />
            <div>
              <strong>Consolatrix College of Toledo City, Inc.</strong>
              <span>Academic schedule management through AlterSched</span>
            </div>
=======

          <div className="feature-stack">
            <article><strong>Conflict-aware planning</strong><p>Coordinate faculty, rooms, sections, and class offerings before publication.</p></article>
            <article><strong>Controlled publication</strong><p>Keep draft, approved, published, and archived schedule versions organized.</p></article>
            <article><strong>Traceable alterations</strong><p>Review schedule-change requests while preserving revision history and notifications.</p></article>
          </div>

          <div className="context-strip">
            <div><span>Faculty</span><strong>Load-aware</strong></div>
            <div><span>Rooms</span><strong>Capacity checks</strong></div>
            <div><span>Schedules</span><strong>Versioned</strong></div>
            <div><span>Access</span><strong>Role-based</strong></div>
          </div>

          <div className="institution-seal">
            <Image src="/cctc-logo.png" alt="" width={82} height={82} />
            <div><strong>Consolatrix College of Toledo City, Inc.</strong><span>Academic schedule management through AlterSched</span></div>
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
          </div>
        </div>
      </section>
    </main>
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

import Image from 'next/image'
import Link from 'next/link'
import { BrandWeek } from '@/components/brand-week'
import styles from './page.module.css'

const STEPS = [
  {
    title: 'Prepare',
    text: 'The Administrator keeps the subjects, curriculum, rooms and instructors up to date.',
  },
  {
    title: 'Generate',
    text: 'The Department Scheduler builds a timetable for every block with no block, room or instructor clashes.',
  },
  {
    title: 'Publish',
    text: 'After review, the schedule is published. Instructors are notified and each block gets a QR link.',
  },
]

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.school}>
          <Image src="/cctc-logo.png" alt="" width={44} height={44} priority />
          <span>
            <strong>Consolatrix College of Toledo City</strong>
            <small>College of Computer Studies · AlterSched</small>
          </span>
        </Link>
        <nav className={styles.nav} aria-label="Account">
          <Link href="/register" className="btn btn-ghost">
            Register
          </Link>
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <h1>Class schedules for every BSIT block, built and published in one place.</h1>
          <p>
            AlterSched assigns qualified instructors, places every class without clashes, and
            publishes the timetable to instructors and students. Changes go through a request, so
            the official schedule stays trustworthy.
          </p>
          <div className={styles.actions}>
            <Link href="/login" className="btn btn-primary btn-large">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-outline btn-large">
              Register as an instructor
            </Link>
          </div>
        </div>
        <div className={styles.visual}>
          <BrandWeek caption="Sample week · BSIT 1st Year, Block A" />
        </div>
      </section>

      <section className={styles.steps} aria-label="How a schedule is made">
        {STEPS.map((step, index) => (
          <article key={step.title}>
            <span className={styles.number}>{index + 1}</span>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </article>
        ))}
      </section>

      <section className={styles.students}>
        <h2>Students</h2>
        <p>
          You do not need an account. Scan the QR code your department posts for your block, or open
          the link it shares, to see your class schedule.
        </p>
      </section>

      <footer className={styles.footer}>
        <span>© Consolatrix College of Toledo City, Inc.</span>
        <span>AlterSched · class scheduling</span>
      </footer>
    </main>
  )
}

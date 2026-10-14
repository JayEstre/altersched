import type { Metadata } from 'next'
import '@fontsource-variable/public-sans'
import '@fontsource-variable/source-serif-4'
import './globals.css'
import { NavProgress } from '@/components/nav-progress'

export const metadata: Metadata = {
  title: {
    default: 'AlterSched | Consolatrix College of Toledo City',
    template: '%s | AlterSched CCTC',
  },
  description:
    'Academic scheduling and schedule alteration management for Consolatrix College of Toledo City, Inc.',
  icons: {
    icon: '/altsched-logo.png',
    apple: '/altsched-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavProgress />
        {children}
      </body>
    </html>
  )
}

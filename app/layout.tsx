<<<<<<< HEAD
import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
=======
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AlterSched | Consolatrix College of Toledo City",
    template: "%s | AlterSched CCTC",
  },
  description: "Academic scheduling and schedule alteration management for Consolatrix College of Toledo City, Inc.",
  icons: {
    icon: "/altersched-logo.png",
    apple: "/altersched-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

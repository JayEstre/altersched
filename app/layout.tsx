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
}

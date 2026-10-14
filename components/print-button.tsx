'use client'

import { Printer } from 'lucide-react'

/** Prints the current page (the sidebar and top bar are hidden when printing). */
export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-outline" onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" />
      {label}
    </button>
  )
}

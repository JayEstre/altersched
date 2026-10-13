import { redirect } from 'next/navigation'

// Alteration requests are reviewed (approved/rejected) on /scheduler/alterations.
// This older read-only list is kept as a redirect so existing links still work.
export default function Page() {
  redirect('/scheduler/alterations')
}

import { redirect } from 'next/navigation'

// Instructors submit and track schedule change requests on /faculty/alterations.
// This older duplicate form is kept as a redirect so existing links still work.
export default function Page() {
  redirect('/faculty/alterations')
}

/** Re-mounts on every page change inside this portal, so the content fades in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}

import { Bell } from 'lucide-react'
import { Badge, Empty } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import { markAllNotificationsRead } from '@/lib/actions/notifications'
import styles from './notification-list.module.css'

export type NotificationRow = {
  id: string
  title: string
  message: string
  priority: string | null
  read_at: string | null
  created_at: string
}

/** Newest first; unread items are marked, and "Mark all as read" clears them. */
export function NotificationList({
  rows,
  returnTo,
}: {
  rows: NotificationRow[]
  returnTo: string
}) {
  const unread = rows.filter((row) => !row.read_at).length

  if (!rows.length) {
    return (
      <Empty
        title="You're all caught up"
        text="Schedule publications and replies to your requests will appear here."
      />
    )
  }

  return (
    <section className={`panel ${styles.panel}`}>
      <header className={styles.head}>
        <span>
          {unread ? `${unread} unread of ${rows.length}` : `${rows.length} notifications, all read`}
        </span>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <input type="hidden" name="return_to" value={returnTo} />
            <button type="submit" className="btn btn-outline btn-sm">
              Mark all as read
            </button>
          </form>
        )}
      </header>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li
            key={row.id}
            className={row.read_at ? styles.item : `${styles.item} ${styles.unread}`}
          >
            <span className={styles.icon} aria-hidden="true">
              <Bell size={16} strokeWidth={1.9} />
            </span>
            <div className={styles.copy}>
              <div className={styles.titleRow}>
                <strong>{row.title}</strong>
                {row.priority && row.priority !== 'normal' && (
                  <Badge tone={row.priority === 'low' ? 'default' : 'warning'}>
                    {row.priority}
                  </Badge>
                )}
                {!row.read_at && <span className={styles.dot}>New</span>}
              </div>
              <p>{row.message}</p>
              <time dateTime={row.created_at}>{formatDateTime(row.created_at)}</time>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

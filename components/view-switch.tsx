'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'

type Props = {
  /** Remembers the choice per page (stored in this browser only). */
  storageKey: string
  week: ReactNode
  list: ReactNode
  /** Extra content shown on the right of the switch (e.g. a badge). */
  aside?: ReactNode
}

type View = 'week' | 'list'

function readStored(key: string): View | null {
  try {
    const value = window.localStorage.getItem(key)
    return value === 'week' || value === 'list' ? value : null
  } catch {
    return null
  }
}

const noSubscription = () => () => {}

/** "Week | List" toggle between a calendar and a table of the same classes. */
export function ViewSwitch({ storageKey, week, list, aside }: Props) {
  const key = `altersched:view:${storageKey}`
  const stored = useSyncExternalStore(
    noSubscription,
    () => readStored(key),
    () => null
  )
  const [chosen, setChosen] = useState<View | null>(null)
  const view = chosen ?? stored ?? 'week'

  function choose(next: View) {
    setChosen(next)
    try {
      window.localStorage.setItem(key, next)
    } catch {
      // ignore: the choice just isn't remembered
    }
  }

  return (
    <div className="view-switch">
      <div className="view-switch-bar">
        <div className="view-switch-tabs" role="tablist" aria-label="Schedule view">
          {(['week', 'list'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              className={view === value ? 'view-switch-tab active' : 'view-switch-tab'}
              onClick={() => choose(value)}
            >
              {value === 'week' ? 'Week' : 'List'}
            </button>
          ))}
        </div>
        {aside}
      </div>
      <div role="tabpanel">{view === 'week' ? week : list}</div>
    </div>
  )
}

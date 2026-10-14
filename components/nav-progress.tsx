'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

type State = 'idle' | 'loading' | 'done'

/** Longest a bar may run when nothing visible happens. */
const GIVE_UP_MS = 9_000

function clearBusyButtons() {
  document
    .querySelectorAll('[data-busy]')
    .forEach((element) => element.removeAttribute('data-busy'))
}

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

/** True while the portal still shows its loading placeholder instead of the page. */
function showingSkeleton() {
  return Boolean(document.querySelector('.skeleton-page'))
}

function Progress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const address = `${pathname}?${search.toString()}`
  const [state, setState] = useState<State>('idle')
  const loading = useRef(false)
  const timers = useRef<number[]>([])
  const observer = useRef<MutationObserver | null>(null)

  const stopWatching = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
    observer.current?.disconnect()
    observer.current = null
  }

  /** Finish once the real page content is on screen (not the loading placeholder). */
  const finish = () => {
    if (!loading.current) return
    if (showingSkeleton()) {
      timers.current.push(window.setTimeout(finish, 80))
      return
    }
    loading.current = false
    stopWatching()
    clearBusyButtons()
    setState('done')
    timers.current.push(window.setTimeout(() => setState('idle'), 450))
  }

  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })

  // A new address means the next page is arriving.
  useEffect(() => {
    finishRef.current()
  }, [address])

  useEffect(() => {
    const start = (kind: 'link' | 'form') => {
      stopWatching()
      loading.current = true
      setState('loading')
      timers.current.push(window.setTimeout(() => finishRef.current(), GIVE_UP_MS))

      if (kind === 'form') {
        // A form may answer on the same address (a message, a refreshed table):
        // the first change to the page content after a moment counts as the answer.
        const content = document.querySelector('.portal-content') ?? document.body
        const startedAt = performance.now()
        observer.current = new MutationObserver((records) => {
          if (performance.now() - startedAt < 150) return
          const real = records.some(
            (record) =>
              record.type === 'childList' &&
              !(record.target as Element).closest?.('.skeleton-page, [data-pending]')
          )
          if (real) finishRef.current()
        })
        observer.current.observe(content, { childList: true, subtree: true })
      }
    }

    // Capture phase: runs before Next.js links and React form actions take over the event.
    const onClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return
      const link = (event.target as Element | null)?.closest?.('a')
      if (!link || link.hasAttribute('download')) return
      if (link.target && link.target !== '_self') return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      // Same page (or only a #section): nothing to load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      start('link')
    }

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null
      if (!form || form.hasAttribute('data-no-progress')) return
      if (form.method?.toLowerCase() === 'dialog') return
      const button = event.submitter
      if (button && !button.hasAttribute('data-no-busy')) button.setAttribute('data-busy', '')
      start('form')
    }

    const onShow = () => {
      loading.current = false
      stopWatching()
      clearBusyButtons()
      setState('idle')
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('submit', onSubmit, true)
    window.addEventListener('pageshow', onShow)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('submit', onSubmit, true)
      window.removeEventListener('pageshow', onShow)
      stopWatching()
    }
  }, [])

  return (
    <div className="nav-progress" data-state={state} aria-hidden="true">
      <span />
    </div>
  )
}

/** Thin gold bar at the top while a page or a form submission is loading. */
export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Progress />
    </Suspense>
  )
}

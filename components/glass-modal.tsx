'use client'

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'

type GlassModalProps = {
  title: string
  /** Optional line under the title. */
  description?: ReactNode
  /** Text of the button that opens the dialog. */
  trigger: string
  triggerClassName?: string
  children: ReactNode
  /** Wide dialogs are used for tables and editors. */
  wide?: boolean
  /** Open as soon as the component mounts (e.g. to reopen after a form submit). */
  defaultOpen?: boolean
  /** Called whenever the dialog closes (button, Esc or backdrop). */
  onClose?: () => void
}

/** A button that opens a native modal <dialog> (Esc and backdrop click close it). */
export function GlassModal({
  title,
  description,
  trigger,
  triggerClassName = 'btn btn-primary',
  children,
  wide = false,
  defaultOpen = false,
  onClose,
}: GlassModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (defaultOpen && dialog && !dialog.open) dialog.showModal()
  }, [defaultOpen])

  function openModal() {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }

  function closeModal() {
    dialogRef.current?.close()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) closeModal()
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={openModal}>
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        className={wide ? 'as-glass-dialog as-glass-dialog-wide' : 'as-glass-dialog'}
        aria-labelledby={titleId}
        onClick={handleBackdropClick}
        onClose={onClose}
      >
        <div className="as-glass-dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            type="button"
            className="as-glass-close"
            aria-label="Close window"
            onClick={closeModal}
          >
            ×
          </button>
        </div>
        <div className="as-glass-dialog-body">{children}</div>
      </dialog>
    </>
  )
}

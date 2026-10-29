import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import styles from './Modal.module.css'

type ModalProps = {
  title: string
  children: ReactNode
  onClose: () => void
  disabled?: boolean
}

export function Modal({
  title,
  children,
  onClose,
  disabled = false,
}: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !disabled) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, disabled])

  return createPortal(
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.header}>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {children}
      </div>
    </div>,
    document.body,
  )
}
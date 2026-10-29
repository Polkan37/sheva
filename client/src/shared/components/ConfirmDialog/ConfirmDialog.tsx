import { Modal } from '../Modal/Modal'

import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      disabled={isLoading}
    >
      <div className={styles.content}>
        <p>{message}</p>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={styles.danger}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
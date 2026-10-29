import { useState, type FormEvent } from 'react'

import type { Room, RoomInput } from '../../../shared/api/rooms'
import { Modal } from '../../../shared/components/Modal/Modal'

import styles from './RoomsSettings.module.css'

type RoomFormProps = {
  room: Room | null
  defaultOrder: number
  isSaving: boolean
  error: string | null
  onSave: (data: RoomInput) => Promise<void>
  onClose: () => void
}

export function RoomForm({
  room,
  defaultOrder,
  isSaving,
  error,
  onSave,
  onClose,
}: RoomFormProps) {
  const [form, setForm] = useState<RoomInput>({
    name: room?.name ?? '',
    slug: room?.slug ?? '',
    displayOrder: room?.displayOrder ?? defaultOrder,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSaving) return

    await onSave({
      name: form.name.trim(),
      slug: form.slug.trim(),
      displayOrder: form.displayOrder,
    })
  }

  return (
    <Modal
      title={room ? 'Edit room' : 'Add room'}
      onClose={onClose}
      disabled={isSaving}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Name
          <input
            required
            autoFocus
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
          />
        </label>

        <label>
          Slug
          <input
            required
            value={form.slug}
            onChange={(event) =>
              setForm({ ...form, slug: event.target.value })
            }
          />
        </label>

        <label>
          Display order
          <input
            required
            type="number"
            step="1"
            value={form.displayOrder}
            onChange={(event) =>
              setForm({
                ...form,
                displayOrder: event.target.valueAsNumber,
              })
            }
          />
        </label>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save room'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
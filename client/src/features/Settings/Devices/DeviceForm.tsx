
import { useState, type FormEvent } from 'react'

import type { Device, DeviceInput } from '../../../shared/api/devices'
import type { Room } from '../../../shared/api/rooms'
import { Modal } from '../../../shared/components/Modal/Modal'

import styles from './DevicesSettings.module.css'

type DeviceFormProps = {
    device: Device | null
    rooms: Room[]
    isSaving: boolean
    error: string | null
    onSave: (data: DeviceInput) => Promise<void>
    onClose: () => void
}

export function DeviceForm({
    device,
    rooms,
    isSaving,
    error,
    onSave,
    onClose,
}: DeviceFormProps) {
    const [form, setForm] = useState<DeviceInput>({
        uid: device?.uid ?? '',
        name: device?.name ?? '',
        type: device?.type ?? '',
        description: device?.description ?? null,
        macAddress: device?.macAddress ?? null,
        ipAddress: device?.ipAddress ?? null,
        roomId: device?.room?.id ?? null,
        sampleIntervalSec: device?.sampleIntervalSec ?? 60,
        firmwareVersion: device?.firmwareVersion ?? null,
    })

    function updateField<K extends keyof DeviceInput>(
        field: K,
        value: DeviceInput[K],
    ) {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isSaving) return

        await onSave({
            ...form,
            uid: form.uid.trim(),
            name: form.name.trim(),
            type: form.type.trim(),
            macAddress: form.macAddress?.trim() || null,
            ipAddress: form.ipAddress?.trim() || null,
            description: form.description?.trim() || null,
            firmwareVersion: form.firmwareVersion?.trim() || null,
        })
    }

    return (
        <Modal
            title={device ? 'Edit device' : 'Add device'}
            onClose={onClose}
            disabled={isSaving}
        >
            <form className={styles.form} onSubmit={handleSubmit}>
                <label>
                    Name
                    <input
                        required
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                    />
                </label>

                <label>
                    UID
                    <input
                        required
                        value={form.uid}
                        onChange={(e) => updateField('uid', e.target.value)}
                    />
                </label>

                <label>
                    Type
                    <input
                        required
                        value={form.type}
                        onChange={(e) => updateField('type', e.target.value)}
                    />
                </label>

                <label>
                    Description
                    <textarea
                        rows={3}
                        value={form.description ?? ''}
                        onChange={(e) =>
                            updateField('description', e.target.value || null)
                        }
                    />
                </label>

                <label>
                    Room
                    <select
                        value={form.roomId ?? ''}
                        onChange={(e) =>
                            updateField('roomId', e.target.value || null)
                        }
                    >
                        <option value="">No room</option>
                        {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Sample interval (seconds)
                    <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={form.sampleIntervalSec}
                        onChange={(e) =>
                            updateField('sampleIntervalSec', e.target.valueAsNumber)
                        }
                    />
                </label>

                <label>
                    Firmware version
                    <input
                        value={form.firmwareVersion ?? ''}
                        onChange={(e) =>
                            updateField('firmwareVersion', e.target.value || null)
                        }
                    />
                </label>

                <label>
                    MAC address
                    <input
                        value={form.macAddress ?? ''}
                        placeholder="AA:BB:CC:DD:EE:FF"
                        onChange={(e) =>
                            updateField('macAddress', e.target.value || null)
                        }
                    />
                </label>

                <label>
                    device IP
                    <input
                        value={form.ipAddress ?? ''}
                        placeholder="192.168.3.43"
                        onChange={(e) =>
                            updateField('ipAddress', e.target.value || null)
                        }
                    />
                </label>


                {error && (
                    <p className={styles.error} role="alert">
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
                        {isSaving ? 'Saving...' : 'Save device'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

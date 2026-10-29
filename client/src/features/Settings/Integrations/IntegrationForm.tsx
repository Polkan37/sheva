
import { useState, type FormEvent } from 'react'

import type {
    IntegrationSettings,
    IntegrationInput,
} from '../../../shared/api/integrations'
import { Modal } from '../../../shared/components/Modal/Modal'

import styles from './IntegrationsSettings.module.css'

type IntegrationFormProps = {
    integration: IntegrationSettings | null
    isSaving: boolean
    error: string | null
    onSave: (data: IntegrationInput) => Promise<void>
    onClose: () => void
}

export function IntegrationForm({
    integration,
    isSaving,
    error,
    onSave,
    onClose,
}: IntegrationFormProps) {
    const [form, setForm] = useState<IntegrationInput>({
        uid: integration?.uid ?? '',
        name: integration?.name ?? '',
        type: integration?.type ?? 'power_outages',
        description: integration?.description ?? null,
        enabled: integration?.enabled ?? false,
    })

    function updateField<K extends keyof IntegrationInput>(
        field: K,
        value: IntegrationInput[K],
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
            description: form.description?.trim() || null,
        })
    }

    return (
        <Modal
            title={integration ? 'Edit integration' : 'Add integration'}
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
                    <select
                        value={form.type}
                        onChange={(e) => updateField('type', e.target.value)}
                    >
                        <option value="power_outages">Power outages</option>
                        <option value="weather">Weather</option>
                        {integration &&
                            !['power_outages', 'weather'].includes(form.type) && (
                                <option value={form.type}>{form.type}</option>
                            )}
                    </select>
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

                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(e) =>
                            updateField('enabled', e.target.checked)
                        }
                    />
                    Enabled
                </label>

                {error && (
                    <p role="alert" className={styles.error}>{error}</p>
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
                        {isSaving ? 'Saving...' : 'Save integration'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

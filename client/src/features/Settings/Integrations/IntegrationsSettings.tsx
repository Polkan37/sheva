
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, LoaderCircle } from 'lucide-react'

import {
    getIntegrationSettings,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    type IntegrationSettings,
    type IntegrationInput,
} from '../../../shared/api/integrations'

import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog'
import { IntegrationForm } from './IntegrationForm'

import styles from './IntegrationsSettings.module.css'

export function IntegrationsSettings() {
    const [integrations, setIntegrations] = useState<IntegrationSettings[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingIntegration, setEditingIntegration] =
        useState<IntegrationSettings | null>(null)
    const [integrationToDelete, setIntegrationToDelete] =
        useState<IntegrationSettings | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        getIntegrationSettings(controller.signal)
            .then(({ integrations }) => setIntegrations(integrations))
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load integrations',
                    )
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                }
            })

        return () => controller.abort()
    }, [])

    async function loadIntegrations() {
        const { integrations } = await getIntegrationSettings()
        setIntegrations(integrations)
    }

    function openCreateForm() {
        setEditingIntegration(null)
        setError(null)
        setIsFormOpen(true)
    }

    function openEditForm(integration: IntegrationSettings) {
        setEditingIntegration(integration)
        setError(null)
        setIsFormOpen(true)
    }

    function closeForm() {
        setIsFormOpen(false)
        setEditingIntegration(null)
        setError(null)
    }


    async function handleSave(data: IntegrationInput) {
        if (isSaving) return

        setIsSaving(true)
        setError(null)

        try {
            if (editingIntegration) {
                await updateIntegration(editingIntegration.id, data)
            } else {
                await createIntegration(data)
            }

            closeForm()
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to save integration',
            )
            setIsSaving(false)
            return
        }

        try {
            await loadIntegrations()
        } catch {
            setError('Integration saved, but failed to refresh the list')
        } finally {
            setIsSaving(false)
        }
    }


    async function handleDelete() {
        if (!integrationToDelete || isSaving) return

        setIsSaving(true)
        setError(null)

        try {
            await deleteIntegration(integrationToDelete.id)

            setIntegrations((prev) =>
                prev.filter((item) => item.id !== integrationToDelete.id),
            )

            setIntegrationToDelete(null)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to delete integration',
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className={styles.section}>
            <header className={styles.sectionHeader}>
                <div>
                    <h2>Integrations</h2>
                    <span>{integrations.length} integrations</span>
                </div>

                <button
                    className={styles.primaryButton}
                    onClick={openCreateForm}
                    disabled={isSaving}
                >
                    <Plus size={18} />
                    Add integration
                </button>
            </header>

            {error && !isFormOpen && !integrationToDelete && (
                <p className={styles.error} role="alert">{error}</p>
            )}

            {isLoading ? (
                <div className={styles.loading}>
                    <LoaderCircle className="spinner" size={28} />
                </div>
            ) : integrations.length === 0 ? (
                <p className={styles.empty}>No integrations added yet</p>
            ) : (
                <div className={styles.integrationList}>
                    {integrations.map((integration) => (
                        <div className={styles.integration} key={integration.id}>
                            <div className={styles.integrationInfo}>
                                <h3>{integration.name}</h3>
                                <span>{integration.uid} · {integration.type}</span>

                                {integration.description && (
                                    <span>{integration.description}</span>
                                )}
                            </div>

                            <span
                                className={`${styles.status} ${integration.enabled ? styles.enabled : styles.disabled
                                    }`}
                            >
                                {integration.enabled ? 'Enabled' : 'Disabled'}
                            </span>

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    title="Edit"
                                    aria-label={`Edit ${integration.name}`}
                                    disabled={isSaving}
                                    onClick={() => openEditForm(integration)}
                                >
                                    <Pencil size={17} />
                                </button>

                                <button
                                    type="button"
                                    title="Delete"
                                    aria-label={`Delete ${integration.name}`}
                                    disabled={isSaving}
                                    onClick={() => {
                                        setError(null)
                                        setIntegrationToDelete(integration)
                                    }}
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isFormOpen && (
                <IntegrationForm
                    key={editingIntegration?.id ?? 'new'}
                    integration={editingIntegration}
                    isSaving={isSaving}
                    error={error}
                    onSave={handleSave}
                    onClose={closeForm}
                />
            )}

            {integrationToDelete && (
                <ConfirmDialog
                    title="Delete integration?"
                    message={`Are you sure you want to delete "${integrationToDelete.name}"?`}
                    isLoading={isSaving}
                    error={error}
                    onConfirm={handleDelete}
                    onCancel={() => {
                        setIntegrationToDelete(null)
                        setError(null)
                    }}
                />
            )}
        </section>
    )
}

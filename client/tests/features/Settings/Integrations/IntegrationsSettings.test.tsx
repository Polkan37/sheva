import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/integrations', () => ({
  getIntegrationSettings: vi.fn(),
  createIntegration: vi.fn(),
  updateIntegration: vi.fn(),
  deleteIntegration: vi.fn(),
}))

import {
  createIntegration,
  deleteIntegration,
  getIntegrationSettings,
  updateIntegration,
} from '@/shared/api/integrations'
import { makeIntegrationSettings } from '@tests/factories'
import { IntegrationsSettings } from '@/features/Settings/Integrations/IntegrationsSettings'

describe('IntegrationsSettings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading spinner, then the empty state when there are none', async () => {
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [] })

    render(<IntegrationsSettings />)

    expect(document.querySelector('.spinner')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No integrations added yet')).toBeInTheDocument())
  })

  it('lists integrations with enabled/disabled status and optional description', async () => {
    vi.mocked(getIntegrationSettings).mockResolvedValue({
      integrations: [
        makeIntegrationSettings({ name: 'Yasno', enabled: true, description: 'Power outages' }),
      ],
    })

    render(<IntegrationsSettings />)

    await waitFor(() => expect(screen.getByText('1 integrations')).toBeInTheDocument())
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Power outages')).toBeInTheDocument()
  })

  it('shows "Disabled" for a disabled integration without a description', async () => {
    vi.mocked(getIntegrationSettings).mockResolvedValue({
      integrations: [makeIntegrationSettings({ enabled: false, description: null })],
    })

    render(<IntegrationsSettings />)

    await waitFor(() => expect(screen.getByText('Disabled')).toBeInTheDocument())
  })

  it('shows an error when the initial load fails', async () => {
    vi.mocked(getIntegrationSettings).mockRejectedValue(new Error('boom'))

    render(<IntegrationsSettings />)

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })

  it('falls back to a generic error message when the initial load rejects with a non-Error value', async () => {
    vi.mocked(getIntegrationSettings).mockRejectedValue('nope')

    render(<IntegrationsSettings />)

    await waitFor(() =>
      expect(screen.getByText('Failed to load integrations')).toBeInTheDocument(),
    )
  })

  it('does not update state when the initial load resolves after unmount', async () => {
    let resolveLoad!: (value: { integrations: ReturnType<typeof makeIntegrationSettings>[] }) => void
    vi.mocked(getIntegrationSettings).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )

    const { unmount } = render(<IntegrationsSettings />)
    unmount()

    resolveLoad({ integrations: [makeIntegrationSettings()] })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('does not update state when the initial load rejects after unmount', async () => {
    let rejectLoad!: (reason: unknown) => void
    vi.mocked(getIntegrationSettings).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectLoad = reject
      }),
    )

    const { unmount } = render(<IntegrationsSettings />)
    unmount()

    rejectLoad(new Error('too late'))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('falls back to a generic error message when saving rejects with a non-Error value', async () => {
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [] })
    vi.mocked(createIntegration).mockRejectedValue('nope')

    render(<IntegrationsSettings />)
    await waitFor(() =>
      expect(screen.getByText('No integrations added yet')).toBeInTheDocument(),
    )

    await userEvent.click(screen.getByRole('button', { name: /Add integration/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('UID'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save integration' }))

    expect(await screen.findByText('Failed to save integration')).toBeInTheDocument()
  })

  it('falls back to a generic error message when deleting rejects with a non-Error value', async () => {
    const integration = makeIntegrationSettings({ id: 'i1', name: 'Yasno' })
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [integration] })
    vi.mocked(deleteIntegration).mockRejectedValue('nope')

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('Yasno')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Yasno' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Failed to delete integration')).toBeInTheDocument()
  })

  it('creates an integration and reloads the list', async () => {
    vi.mocked(getIntegrationSettings)
      .mockResolvedValueOnce({ integrations: [] })
      .mockResolvedValueOnce({ integrations: [makeIntegrationSettings({ name: 'New integration' })] })
    vi.mocked(createIntegration).mockResolvedValue(makeIntegrationSettings())

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('No integrations added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add integration/ }))
    expect(screen.getByRole('heading', { name: 'Add integration' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Name'), 'New integration')
    await userEvent.type(screen.getByLabelText('UID'), 'new-integration')
    await userEvent.click(screen.getByRole('button', { name: 'Save integration' }))

    await waitFor(() => expect(screen.getByText('New integration')).toBeInTheDocument())
    expect(createIntegration).toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Add integration' })).not.toBeInTheDocument()
  })

  it('shows an error and keeps the form open when creating fails', async () => {
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [] })
    vi.mocked(createIntegration).mockRejectedValue(new Error('uid taken'))

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('No integrations added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add integration/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('UID'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save integration' }))

    expect(await screen.findByText('uid taken')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add integration' })).toBeInTheDocument()
  })

  it('shows a partial-success message when the save worked but the reload failed', async () => {
    vi.mocked(getIntegrationSettings)
      .mockResolvedValueOnce({ integrations: [] })
      .mockRejectedValueOnce(new Error('reload failed'))
    vi.mocked(createIntegration).mockResolvedValue(makeIntegrationSettings())

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('No integrations added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add integration/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('UID'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save integration' }))

    expect(
      await screen.findByText('Integration saved, but failed to refresh the list'),
    ).toBeInTheDocument()
  })

  it('edits an existing integration via updateIntegration', async () => {
    const integration = makeIntegrationSettings({ id: 'i1', name: 'Yasno' })
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [integration] })
    vi.mocked(updateIntegration).mockResolvedValue(integration)

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('Yasno')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Edit Yasno' }))
    expect(screen.getByRole('heading', { name: 'Edit integration' })).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Yasno 2')
    await userEvent.click(screen.getByRole('button', { name: 'Save integration' }))

    await waitFor(() =>
      expect(updateIntegration).toHaveBeenCalledWith('i1', expect.objectContaining({ name: 'Yasno 2' })),
    )
  })

  it('deletes an integration after confirming, removing it from the list', async () => {
    const integration = makeIntegrationSettings({ id: 'i1', name: 'Yasno' })
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [integration] })
    vi.mocked(deleteIntegration).mockResolvedValue(undefined)

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('Yasno')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Yasno' }))
    expect(screen.getByText('Delete integration?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Yasno')).not.toBeInTheDocument())
    expect(deleteIntegration).toHaveBeenCalledWith('i1')
  })

  it('shows an error and keeps the dialog open when deleting fails', async () => {
    const integration = makeIntegrationSettings({ id: 'i1', name: 'Yasno' })
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [integration] })
    vi.mocked(deleteIntegration).mockRejectedValue(new Error('cannot delete'))

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('Yasno')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Yasno' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('cannot delete')).toBeInTheDocument()
    expect(screen.getByText('Yasno')).toBeInTheDocument()
  })

  it('cancels the delete confirmation without deleting', async () => {
    const integration = makeIntegrationSettings({ id: 'i1', name: 'Yasno' })
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [integration] })

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('Yasno')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Yasno' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Delete integration?')).not.toBeInTheDocument()
    expect(deleteIntegration).not.toHaveBeenCalled()
  })

  it('closes the create form via Cancel without saving', async () => {
    vi.mocked(getIntegrationSettings).mockResolvedValue({ integrations: [] })

    render(<IntegrationsSettings />)
    await waitFor(() => expect(screen.getByText('No integrations added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add integration/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('heading', { name: 'Add integration' })).not.toBeInTheDocument()
    expect(createIntegration).not.toHaveBeenCalled()
  })
})

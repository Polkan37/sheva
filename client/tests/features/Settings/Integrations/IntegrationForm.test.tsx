import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { makeIntegrationSettings } from '@tests/factories'
import { IntegrationForm } from '@/features/Settings/Integrations/IntegrationForm'

describe('IntegrationForm', () => {
  it('shows "Add integration" with power_outages as the default type', () => {
    render(
      <IntegrationForm integration={null} isSaving={false} error={null} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByText('Add integration')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toHaveValue('power_outages')
  })

  it('shows "Edit integration" and pre-fills fields', () => {
    render(
      <IntegrationForm
        integration={makeIntegrationSettings({ name: 'Yasno', uid: 'yasno', enabled: true })}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Edit integration')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Yasno')
    expect(screen.getByLabelText('Enabled')).toBeChecked()
  })

  it('adds an extra option for a custom type not in the known list when editing', () => {
    render(
      <IntegrationForm
        integration={makeIntegrationSettings({ type: 'custom_type' })}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('option', { name: 'custom_type' })).toBeInTheDocument()
  })

  it('does not add a redundant option when the type is already known', () => {
    render(
      <IntegrationForm
        integration={makeIntegrationSettings({ type: 'weather' })}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('option', { name: 'Weather' })).toHaveLength(1)
  })

  it('does not add a custom option for a new (not-yet-created) integration', () => {
    render(
      <IntegrationForm integration={null} isSaving={false} error={null} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('trims text fields and submits the enabled checkbox state', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <IntegrationForm integration={null} isSaving={false} error={null} onSave={onSave} onClose={vi.fn()} />,
    )

    await userEvent.type(screen.getByLabelText('Name'), '  Yasno  ')
    await userEvent.type(screen.getByLabelText('UID'), '  yasno  ')
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'weather')
    await userEvent.type(screen.getByLabelText('Description'), '  Weather feed  ')
    await userEvent.click(screen.getByLabelText('Enabled'))

    await userEvent.click(screen.getByRole('button', { name: 'Save integration' }))

    expect(onSave).toHaveBeenCalledWith({
      uid: 'yasno',
      name: 'Yasno',
      type: 'weather',
      description: 'Weather feed',
      enabled: true,
    })
  })

  it('nulls out the description when cleared back to empty after being filled', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <IntegrationForm integration={null} isSaving={false} error={null} onSave={onSave} onClose={vi.fn()} />,
    )

    await userEvent.type(screen.getByLabelText('Name'), 'Yasno')
    await userEvent.type(screen.getByLabelText('UID'), 'yasno')
    await userEvent.type(screen.getByLabelText('Description'), 'temp')
    await userEvent.clear(screen.getByLabelText('Description'))

    await userEvent.click(screen.getByRole('button', { name: 'Save integration' }))

    expect(onSave.mock.calls[0][0].description).toBeNull()
  })

  it('does not submit while isSaving is true', () => {
    const onSave = vi.fn()
    render(
      <IntegrationForm integration={null} isSaving error={null} onSave={onSave} onClose={vi.fn()} />,
    )

    const form = screen.getByRole('button', { name: 'Saving...' }).closest('form') as HTMLFormElement
    fireEvent.submit(form)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(
      <IntegrationForm integration={null} isSaving={false} error={null} onSave={vi.fn()} onClose={onClose} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the error message when present', () => {
    render(
      <IntegrationForm integration={null} isSaving={false} error="UID taken" onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('UID taken')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/useRooms', () => ({ useRooms: vi.fn() }))
vi.mock('@/shared/hooks/usePowerState', () => ({ usePowerState: vi.fn() }))

import { useRooms } from '@/shared/hooks/useRooms'
import { usePowerState } from '@/shared/hooks/usePowerState'
import { makeRoom } from '@tests/factories'
import { Header } from '@/features/Header/Header'

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )
}

describe('Header', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a nav link for each room', () => {
    vi.mocked(useRooms).mockReturnValue([
      makeRoom({ id: '1', slug: 'kitchen', name: 'Kitchen' }),
      makeRoom({ id: '2', slug: 'bedroom', name: 'Bedroom' }),
    ])
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })

    renderHeader()

    expect(screen.getAllByRole('link', { name: 'Kitchen' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Bedroom' }).length).toBeGreaterThan(0)
  })

  it('queries power state for the hardcoded smart-plug uid', () => {
    vi.mocked(useRooms).mockReturnValue([])
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })

    renderHeader()

    expect(usePowerState).toHaveBeenCalledWith('tuya-plug-01')
  })

  it('falls back to the online/unknown power icon when there is an error', () => {
    vi.mocked(useRooms).mockReturnValue([])
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: false, error: 'boom' })

    renderHeader()

    const indicator = screen.getByLabelText('Power status: unknown')
    expect(indicator.getAttribute('class')).not.toContain('offline')
  })

  it('shows the offline power icon styling when the plug is offline', () => {
    vi.mocked(useRooms).mockReturnValue([])
    vi.mocked(usePowerState).mockReturnValue({
      state: { deviceUid: 'tuya-plug-01', status: 'offline', since: null, lastCheckedAt: null },
      loading: false,
      error: null,
    })

    renderHeader()

    expect(screen.getByLabelText('Power status: offline')).toBeInTheDocument()
  })

  it('opens and closes the mobile menu, toggling aria-expanded and the icon', async () => {
    vi.mocked(useRooms).mockReturnValue([])
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })

    renderHeader()

    const menuButton = screen.getByLabelText('Open navigation menu')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(menuButton)

    const closeButton = screen.getByLabelText('Close navigation menu')
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(closeButton)
    expect(screen.getByLabelText('Open navigation menu')).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the mobile menu when a mobile nav link is clicked', async () => {
    vi.mocked(useRooms).mockReturnValue([makeRoom({ id: '1', slug: 'kitchen', name: 'Kitchen' })])
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })

    renderHeader()

    await userEvent.click(screen.getByLabelText('Open navigation menu'))
    expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument()

    // the mobile nav is only shown via a max-width media query, which jsdom's
    // fixed default viewport never matches — query/click it directly instead
    // of through role/userEvent, which both respect computed CSS visibility
    const mobileNav = document.getElementById('mobile-navigation') as HTMLElement
    const mobileKitchenLink = mobileNav.querySelector('a[href="/kitchen"]') as HTMLElement

    fireEvent.click(mobileKitchenLink)

    expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
  })

  it('includes Devices and Settings entries in the mobile nav', async () => {
    vi.mocked(useRooms).mockReturnValue([])
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })

    renderHeader()
    await userEvent.click(screen.getByLabelText('Open navigation menu'))

    const mobileNav = document.getElementById('mobile-navigation') as HTMLElement
    expect(mobileNav).toHaveTextContent('Devices')
    expect(mobileNav).toHaveTextContent('Settings')
  })
})

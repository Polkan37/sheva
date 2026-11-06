import { afterEach, describe, expect, it, vi } from 'vitest'

describe('main', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('mounts App into #root inside StrictMode + BrowserRouter via createRoot', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)

    const render = vi.fn()
    const createRoot = vi.fn(() => ({ render }))

    vi.doMock('react-dom/client', () => ({ createRoot }))
    vi.doMock('@/App.tsx', () => ({ default: () => null }))

    await import('@/main.tsx')

    expect(createRoot).toHaveBeenCalledWith(root)
    expect(render).toHaveBeenCalledTimes(1)
  })
})

import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGardenScene } from '../garden/scene'
import { DigitalGardenScene } from './DigitalGardenScene'

const destroy = vi.fn()
const setReducedMotion = vi.fn()
const resize = vi.fn()
const setPointer = vi.fn()

vi.mock('../garden/scene', () => ({
  createGardenScene: vi.fn(() => ({
    destroy,
    resize,
    setPointer,
    setReducedMotion,
  })),
}))

afterEach(() => {
  vi.mocked(createGardenScene).mockImplementation(() => ({
    destroy,
    resize,
    setPointer,
    setReducedMotion,
  }))
  destroy.mockClear()
  resize.mockClear()
  setPointer.mockClear()
  setReducedMotion.mockClear()
})

describe('DigitalGardenScene', () => {
  it('passes reduced-motion preference to the scene', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    render(<DigitalGardenScene />)

    expect(setReducedMotion).toHaveBeenCalledWith(true)
  })

  it('destroys the WebGL scene when unmounted', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    const view = render(<DigitalGardenScene />)
    view.unmount()

    expect(destroy).toHaveBeenCalled()
  })

  it('keeps the static fallback when WebGL initialization fails', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    vi.mocked(createGardenScene).mockImplementation(() => {
      throw new Error('WebGL unavailable')
    })

    const { container } = render(<DigitalGardenScene />)

    expect(container.querySelector('.garden-scene')).toHaveAttribute(
      'data-webgl-failed',
      'true',
    )
  })
})

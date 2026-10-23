import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGardenScene } from '../garden/scene'
import { DigitalGardenScene } from './DigitalGardenScene'

const destroy = vi.fn()
const setReducedMotion = vi.fn()
const resize = vi.fn()
const setPointer = vi.fn()
const setFraming = vi.fn()

vi.mock('../garden/scene', () => ({
  createGardenScene: vi.fn(() => ({
    destroy,
    resize,
    setPointer,
    setFraming,
    setReducedMotion,
  })),
}))

afterEach(() => {
  vi.mocked(createGardenScene).mockImplementation(() => ({
    destroy,
    resize,
    setPointer,
    setFraming,
    setReducedMotion,
  }))
  destroy.mockClear()
  resize.mockClear()
  setPointer.mockClear()
  setFraming.mockClear()
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

it('drives matching fallback and WebGL framing from native scroll, resizing and reduced motion, then cleans listeners', () => {
  const callbacks = new Map<number, FrameRequestCallback>(); let next = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++next, callback); return next })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id))
  const flush = () => { const work = [...callbacks.values()]; callbacks.clear(); work.forEach(callback => callback(16)) }
  const motion = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => motion)
  let width = 1280, height = 720
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => height)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const shell = this.closest<HTMLElement>('.site-shell')
    return { top: this.id === 'projects' ? height * 2.8 - (shell?.scrollTop ?? 0) : 0 } as DOMRect
  })
  const view = render(<div className="site-shell"><div className="shared-garden"><div className="reading-garden-plane"><DigitalGardenScene /></div></div><section id="projects" /></div>)
  const shell = view.container.querySelector<HTMLElement>('.site-shell')!
  const backdrop = view.container.querySelector<HTMLElement>('.shared-garden')!
  const sceneElement = view.container.querySelector<HTMLElement>('.garden-scene')!
  const plane = view.container.querySelector<HTMLElement>('.reading-garden-plane')!
  const first = setFraming.mock.calls.at(-1)![0]
  shell.scrollTop = 720; shell.dispatchEvent(new Event('scroll')); flush()
  const middle = setFraming.mock.calls.at(-1)![0]
  expect(middle.x).toBeGreaterThan(first.x)
  expect(backdrop.style.getPropertyValue('--background-defocus')).toBe('0')
  expect(plane.style.transform).toContain('scale(1)')
  const widths = sceneElement.style.backgroundSize.split(',')[1].trim().split(' ')
  expect(parseFloat(widths[0]) * middle.width).toBeCloseTo(width)
  shell.scrollTop = 2088; shell.dispatchEvent(new Event('scroll')); flush()
  expect(backdrop.style.getPropertyValue('--background-defocus')).toBe('1')
  expect(plane.style.transform).toContain('scale(1.24)')
  shell.scrollTop = 720; shell.dispatchEvent(new Event('scroll')); flush()
  expect(setFraming.mock.calls.at(-1)![0]).toEqual(middle)
  width = 390; height = 844; window.dispatchEvent(new Event('resize'))
  const resized = setFraming.mock.calls.at(-1)![0]
  expect(resized.width).toBeLessThan(first.width)
  motion.matches = true; motion.addEventListener.mock.calls[0][1](); flush()
  const staticCrop = setFraming.mock.calls.at(-1)![0]
  shell.scrollTop = 3000; shell.dispatchEvent(new Event('scroll')); flush()
  expect(setFraming.mock.calls.at(-1)![0]).toEqual(staticCrop)
  expect(backdrop.style.getPropertyValue('--background-defocus')).toBe('1')
  expect(plane.style.transform).toContain('scale(1)')
  shell.dispatchEvent(new Event('scroll'))
  view.unmount()
  expect(callbacks.size).toBe(0)
  const count = setFraming.mock.calls.length
  shell.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize')); flush()
  expect(setFraming).toHaveBeenCalledTimes(count)
  vi.restoreAllMocks(); vi.unstubAllGlobals()
})

it('continues the same crop and late blur through the static WebGL-failure fallback', () => {
  vi.mocked(createGardenScene).mockImplementation(() => { throw new Error('WebGL unavailable') })
  // jsdom's CSS parser rejects multi-layer background-position; observe the valid CSS assignment.
  const positionWrites = vi.spyOn(CSSStyleDeclaration.prototype, 'backgroundPosition', 'set')
  const motion = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => motion)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(720)
  const view = render(<div className="site-shell"><div className="shared-garden"><DigitalGardenScene /></div></div>)
  const shell = view.container.querySelector<HTMLElement>('.site-shell')!
  const sceneElement = view.container.querySelector<HTMLElement>('.garden-scene')!
  const firstPosition = positionWrites.mock.calls.at(-1)![0]
  shell.scrollTop = 2400; window.dispatchEvent(new Event('resize'))
  expect(positionWrites.mock.calls.at(-1)![0]).not.toBe(firstPosition)
  expect(sceneElement.dataset.webglFailed).toBe('true')
  expect(view.container.querySelector<HTMLElement>('.shared-garden')!.style.getPropertyValue('--background-defocus')).toBe('1')
  view.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals()
})

it('keeps image pixels proportional to the canvas when its height differs from the reading viewport', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const width = 390, readingHeight = 700
  let canvasHeight = 844
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('site-shell') ? readingHeight : canvasHeight
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const shell = this.closest<HTMLElement>('.site-shell')
    return { top: this.id === 'projects' ? readingHeight * 2.8 - (shell?.scrollTop ?? 0) : 0 } as DOMRect
  })
  const view = render(<div className="site-shell"><div className="shared-garden"><div className="reading-garden-plane"><DigitalGardenScene /></div></div><section id="projects" /></div>)
  try {
    const shell = view.container.querySelector<HTMLElement>('.site-shell')!
    const backdrop = view.container.querySelector<HTMLElement>('.shared-garden')!
    const sceneElement = view.container.querySelector<HTMLElement>('.garden-scene')!
    const plane = view.container.querySelector<HTMLElement>('.reading-garden-plane')!
    const verifyGeometry = () => {
      const crop = setFraming.mock.calls.at(-1)![0]
      expect(crop.width * 2191 / (crop.height * 718)).toBeCloseTo(width / canvasHeight)
      const dimensions = sceneElement.style.backgroundSize.split(',')[1].trim().split(' ').map(parseFloat)
      expect(dimensions[0] * crop.width).toBeCloseTo(width)
      expect(dimensions[1] * crop.height).toBeCloseTo(canvasHeight)
      expect(dimensions[0] / dimensions[1]).toBeCloseTo(2191 / 718)
    }
    verifyGeometry()
    shell.scrollTop = readingHeight * 2.2; window.dispatchEvent(new Event('resize'))
    expect(Number(backdrop.style.getPropertyValue('--background-defocus'))).toBeCloseTo(0)
    shell.scrollTop = readingHeight * 2.9; window.dispatchEvent(new Event('resize'))
    expect(backdrop.style.getPropertyValue('--background-defocus')).toBe('1')
    expect(plane.style.transform).toContain(`translate3d(0, ${-readingHeight * .12}px, 0)`)
    canvasHeight = 900; window.dispatchEvent(new Event('resize'))
    verifyGeometry()
    expect(backdrop.style.getPropertyValue('--background-defocus')).toBe('1')
  } finally {
    view.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals()
  }
})

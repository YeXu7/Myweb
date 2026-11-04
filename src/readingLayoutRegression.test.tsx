import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/DigitalGardenScene', () => ({ DigitalGardenScene: () => <div /> }))
vi.mock('./garden/paperGalleryScene', () => ({ createPaperGalleryScene: () => ({ paint: () => false, resize() {}, destroy() {}, hitTest: () => null }) }))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); sessionStorage.clear() })

// jsdom has no layout engine. This model deliberately includes CSS flow,
// sticky viewport coordinates, animated transforms and fractional rect noise.
// It does not claim to simulate browser default wheel scrolling or paint.
it.each([800, 560])('keeps native Home input reversible and hands off at the actual content edge (%i px)', height => {
  let next = 0, noise = 0, time = 0
  const pending = new Map<number, FrameRequestCallback>()
  const resizeCallbacks: (() => void)[] = []
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { pending.set(++next, fn); return next })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resizeCallbacks.push(callback) } observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1440)
  const contentHeight = 1600, padding = 90
  const aboutHeight = Math.max(height, contentHeight + padding * 2)
  const shellOf = (element: HTMLElement) => element.closest<HTMLElement>('.site-shell')
  const aboutTop = (shell: HTMLElement | null) => height + parseFloat(shell?.style.getPropertyValue('--reading-continuation-height') || String(height))
  const galleryTop = (shell: HTMLElement | null) => aboutTop(shell) + aboutHeight - parseFloat(shell?.querySelector<HTMLElement>('#projects')?.style.getPropertyValue('--about-gallery-overlap') || '0')
  const translate = (element: HTMLElement | null) => Number(element?.style.transform.match(/translate3d\(0, ([-\d.]+)px/)?.[1] || 0)
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) { return this.hasAttribute('data-about-content') ? padding : 0 })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.id === 'about' ? aboutHeight : this.hasAttribute('data-about-content') ? contentHeight : this.id === 'projects' ? height * 4.5 : height
  })
  const rects = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const shell = shellOf(this), scroll = shell?.scrollTop ?? 0
    const track = shell?.querySelector<HTMLElement>('[data-reading-track]') ?? null
    const trackTop = height * .35 + translate(track)
    if (this.id === 'projects') return new DOMRect(0, galleryTop(shell) - scroll + noise, 1440, height * 4.5)
    if (this.id === 'about') return new DOMRect(0, aboutTop(shell) - scroll + noise, 1440, aboutHeight)
    if (this.hasAttribute('data-about-content')) return new DOMRect(115, aboutTop(shell) + padding - scroll + translate(this), 1210, contentHeight)
    if (this.hasAttribute('data-reading-window')) return new DOMRect(130, height * .35 - 30, 560, 490)
    if (this.hasAttribute('data-reading-track')) return new DOMRect(130, trackTop, 560, 1150)
    if (this.hasAttribute('data-reading-continuation')) return new DOMRect(130, trackTop + 480, 560, 180)
    if (this.hasAttribute('data-reading-card')) return new DOMRect(130, trackTop + 850, 560, 180)
    if (this.hasAttribute('data-reading-line')) return new DOMRect(130, trackTop + [...document.querySelectorAll('[data-reading-line]')].indexOf(this) * 60, 560, 60)
    return new DOMRect(0, 0, 1440, height)
  })
  const getStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
    const style = getStyle(element)
    if (element.hasAttribute('data-reading-window')) {
      Object.defineProperty(style, 'height', { value: '400px' })
      Object.defineProperty(style, 'paddingTop', { value: '30px' })
    }
    return style
  })
  const view = render(<App />)
  const shell = view.container.querySelector<HTMLElement>('.site-shell')!
  const card = view.container.querySelector<HTMLElement>('[data-reading-card]')!
  const intro = view.container.querySelector<HTMLElement>('.garden-intro__stage')!
  const gallery = view.container.querySelector<HTMLElement>('.paper-gallery__stage')!
  const about = view.container.querySelector<HTMLElement>('#about')!
  const aboutContent = view.container.querySelector<HTMLElement>('[data-about-content]')!
  const track = view.container.querySelector<HTMLElement>('[data-reading-track]')!
  const flush = () => act(() => { const work = [...pending.values()]; pending.clear(); time += 16; work.forEach(fn => fn(time)) })
  const at = (position: number) => { act(() => { shell.scrollTop = position; fireEvent.scroll(shell) }); flush(); flush() }
  flush(); flush()
  const start = galleryTop(shell), end = aboutTop(shell) - .45 * height
  expect(start).toBeCloseTo(aboutTop(shell) + padding * 2 + contentHeight)
  expect(aboutTop(shell) + aboutHeight - start).toBeCloseTo(0)
  let cardReading = -1
  for (let position = 0; position < end; position += 20) { at(position); if (!card.inert) { cardReading = position; break } }
  expect(cardReading).toBeGreaterThan(0)
  const geometry = vi.fn(); shell.addEventListener('readinggeometrychange', geometry)
  const initialBudget = shell.style.getPropertyValue('--reading-continuation-height')
  const initialTranslation = translate(track)
  rects.mockClear()
  for (let i = 1; i <= 15; i++) {
    noise = i % 2 ? .00001 : -.00001
    const wheel = new WheelEvent('wheel', { deltaY: i % 2 ? 40 : -40, bubbles: true, cancelable: true })
    expect(card.dispatchEvent(wheel)).toBe(true)
    at(cardReading + (i % 2 ? 40 : 0))
  }
  at(cardReading)
  expect(translate(track)).toBe(initialTranslation)
  expect(geometry).not.toHaveBeenCalled()
  expect(rects.mock.calls).toHaveLength(0)
  expect(shell.style.overflow).not.toBe('hidden')
  expect(shell.style.getPropertyValue('--reading-continuation-height')).toBe(initialBudget)
  noise = 0
  at(end - 1); expect(intro.style.visibility).toBe('visible')
  expect(about.getBoundingClientRect().top).toBeGreaterThanOrEqual(.45 * height)
  at(end); expect(intro.style.visibility).toBe('hidden')
  expect(about.style.visibility).toBe(''); expect(aboutContent.style.transform).toBe('')
  // Gallery and About may occupy different normal-flow portions of a viewport.
  // No entire-chapter hide or accelerated translation may cut off the last text.
  at(start - height - 1); expect(gallery).toHaveAttribute('inert')
  at(start - height); expect(gallery).toHaveAttribute('inert')
  expect(shell.dataset.readingComplete).toBe('false')
  expect(Number(gallery.style.opacity)).toBe(0)
  expect(view.container.querySelector('a[href="#about"]')).toHaveClass('hero__nav-item--active')
  expect(about.style.visibility).toBe(''); expect(about.inert).not.toBe(true)
  at(start - 1)
  expect(aboutContent.style.transform).toBe('')
  expect(aboutTop(shell) + padding + contentHeight - shell.scrollTop).toBeLessThan(0)
  at(start)
  expect(view.container.querySelector('a[href="#projects"]')).toHaveClass('hero__nav-item--active')
  at(start - height - 1); expect(gallery).toHaveAttribute('inert')
  const positionBeforeResize = galleryTop(shell)
  act(() => resizeCallbacks.forEach(callback => callback()))
  expect(galleryTop(shell)).toBe(positionBeforeResize)
  at(0); expect(intro.style.visibility).toBe('visible')
  view.unmount(); expect(pending.size).toBe(0)
})

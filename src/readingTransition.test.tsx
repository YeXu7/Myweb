import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/DigitalGardenScene', () => ({ DigitalGardenScene: () => <div /> }))
vi.mock('./garden/paperGalleryScene', () => ({ createPaperGalleryScene: () => ({ paint: () => false, resize() {}, destroy() {}, hitTest: () => null }) }))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); sessionStorage.clear() })

it.each([false, true])('keeps introduction and the whole gallery exclusive after the chapter moves (reduced=%s)', reduced => {
  let start = 2800, aboutTop = 1880, next = 0, time = 0
  const pending = new Map<number, FrameRequestCallback>()
  const observers: Array<{ callback: () => void; elements: Element[] }> = []
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { pending.set(++next, fn); return next })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduced-motion') ? reduced : true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class {
    record: { callback: () => void; elements: Element[] }
    constructor(callback: () => void) { this.record = { callback, elements: [] }; observers.push(this.record) }
    observe(element: Element) { this.record.elements.push(element) }
    disconnect() {}
  })
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.id === 'projects' ? 3600 : 800 })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const scroll = this.closest<HTMLElement>('.site-shell')?.scrollTop ?? 0
    const top = this.id === 'projects' ? start - scroll : this.id === 'about' ? aboutTop - scroll : this.hasAttribute('data-reading-line') ? 60 * [...document.querySelectorAll('[data-reading-line]')].indexOf(this) : 0
    return new DOMRect(0, top, 600, 60)
  })
  const getStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
    const style = getStyle(element)
    if (element.hasAttribute('data-reading-window')) Object.defineProperty(style, 'height', { value: '400px' })
    return style
  })
  const { container, unmount } = render(<App />)
  const shell = container.querySelector<HTMLElement>('.site-shell')!
  const intro = container.querySelector<HTMLElement>('.garden-intro__stage')!
  const gallery = container.querySelector<HTMLElement>('.paper-gallery__stage')!
  const about = container.querySelector<HTMLElement>('#about')!
  const assertExclusive = () => {
    if (intro.style.visibility !== 'hidden') {
      expect(shell).toHaveAttribute('data-reading-complete', 'false')
      expect(gallery).toHaveAttribute('inert')
      expect(gallery).toHaveAttribute('aria-hidden', 'true')
    }
    if (!gallery.hasAttribute('inert')) expect(intro.style.visibility).toBe('hidden')
    expect(about.style.visibility).toBe('')
    expect(about.querySelector<HTMLElement>('[data-about-content]')!.style.transform).toBe('')
  }
  const tick = () => act(() => {
    const callbacks = [...pending.values()]; pending.clear(); time += 16
    for (const callback of callbacks) callback(time)
  })
  const at = (position: number) => {
    act(() => { shell.scrollTop = position; fireEvent.scroll(shell) })
    for (let i = 0; i < 3; i++) { tick(); assertExclusive() }
  }
  tick(); assertExclusive()
  // The gallery's own dimensions did not change: only the reading layer learns
  // about a preceding-layout shift, reproducing the independent-cache failure.
  start = 3600; aboutTop = 2680
  act(() => observers.filter(o => o.elements.some(e => e.hasAttribute('data-reading-track'))).forEach(o => o.callback()))
  at(1800)
  expect(intro.style.visibility).toBe('visible')
  expect(gallery).toHaveAttribute('inert')
  at(2400)
  expect(intro.style.visibility).toBe('hidden')
  expect(gallery).toHaveAttribute('inert')
  at(3600)
  for (let i = 0; i < 55; i++) tick()
  expect(gallery).not.toHaveAttribute('inert')
  at(2799)
  expect(gallery).toHaveAttribute('inert')
  // Changing only About height also refreshes the downstream gallery geometry.
  start = 4000
  act(() => observers.filter(o => o.elements.includes(about)).forEach(o => o.callback()))
  at(3199)
  expect(gallery).toHaveAttribute('inert')
  at(4000)
  for (let i = 0; i < 55; i++) tick()
  expect(gallery).not.toHaveAttribute('inert')
  at(0)
  unmount()
  expect(pending.size).toBe(0)
})

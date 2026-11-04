import { useRef } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useHeroReading } from './useHeroReading'
import { readingJourney } from '../garden/readingJourney'

const READING_END = readingJourney.totalScreens * 800
const READING_CLEAR = READING_END - readingJourney.exitScreens * 800

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function ReadingFixture({ adjacent = false, profile = false }: { adjacent?: boolean; profile?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useHeroReading(ref)
  return <main className="site-shell"><section ref={ref}><div className="garden-intro__stage">
    <div className="garden-intro__stamp"><span>Stamp</span></div>
    {profile && <div data-profile-glass hidden aria-hidden="true" />}
    <div data-reading-window style={{ height: 400 }}><div data-reading-track>
      <span data-reading-line data-top="20">First line</span>
      <div data-reading-continuation data-top="448"><span data-reading-line data-top="448">Second screen</span>{adjacent && <span data-reading-line data-top="508">Nearby line</span>}</div>
      {profile && <section data-reading-card data-top="900" data-height="180"><button>Copy WeChat</button></section>}
      <span data-reading-line data-top={profile ? '1800' : '900'}>Last line</span>
    </div></div>
  </div></section>{profile && <section className="reading-continuation" />}<section id="projects" /></main>
}

function setup(adjacent = false, profile = false) {
  const pending = new Map<number, FrameRequestCallback>(); let next = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending.set(++next, callback); return next })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))
  const motion = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => motion)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const shell = this.closest<HTMLElement>('.site-shell')
    if (profile && this.classList.contains('garden-intro__stage')) return new DOMRect(0, 0, 1280, 800)
    if (profile && this.hasAttribute('data-reading-window')) return new DOMRect(80, -40, 400, 500)
    return { top: this.id === 'projects' ? (profile ? 800 + parseFloat(shell?.style.getPropertyValue('--reading-continuation-height') || '800') : READING_END) - (shell?.scrollTop ?? 0) : Number(this.dataset.top ?? 0), height: Number(this.dataset.height ?? 40), left: 80, width: 400, right: 480, bottom: Number(this.dataset.top ?? 0) + 40 } as DOMRect
  })
  const view = render(<ReadingFixture adjacent={adjacent} profile={profile} />)
  const shell = view.container.querySelector<HTMLElement>('.site-shell')!
  const track = view.container.querySelector<HTMLElement>('[data-reading-track]')!
  let frameTime = 0
  const flush = () => act(() => { const work = [...pending.values()]; pending.clear(); frameTime += 16; work.forEach(callback => callback(frameTime)) })
  const at = (scroll: number) => {
    shell.scrollTop = scroll; shell.dispatchEvent(new Event('scroll')); flush()
    // Anchor assertions concern the settled position; the tail has its own regression below.
    for (let i = 0; pending.size && i < 80; i++) flush()
    return -Number(track.style.transform.match(/, ([\d.-]+)px/)![1])
  }
  flush()
  return { view, shell, track, at, flush, pending, motion }
}

it('moves only a small part of the reading track per input and stops as soon as input stops', () => {
  const { view, shell, track, flush, pending } = setup()
  const position = () => -Number(track.style.transform.match(/, ([\d.-]+)px/)![1])
  try {
    shell.scrollTop = 120; shell.dispatchEvent(new Event('scroll')); flush()
    const stopped = position()
    expect(stopped).toBeGreaterThan(0)
    expect(stopped).toBeLessThan(100)
    expect(pending.size).toBe(0)
    for (let i = 0; i < 60; i++) flush()
    expect(position()).toBe(stopped)
    shell.scrollTop = 80; shell.dispatchEvent(new Event('scroll')); flush()
    expect(position()).toBeLessThan(stopped)
  } finally { view.unmount() }
})

it('keeps reading anchors and continuous velocity across both screen joins without parking the last line', () => {
  const { view, at } = setup()
  try {
    expect(at(0)).toBeCloseTo(0)
    expect(at(800)).toBeCloseTo(400)
    expect(at(READING_CLEAR)).toBeCloseTo(680)
    expect(at(READING_END)).toBeCloseTo(1060)
    expect(at(5000)).toBeCloseTo(1060)
    for (const join of [800, (READING_CLEAR - 40), READING_CLEAR, READING_END]) {
      const before = (at(join) - at(join - 2)) / 2
      const after = (at(join + 2) - at(join)) / 2
      expect(Math.abs(before - after)).toBeLessThan(.05)
    }
    expect(at((READING_CLEAR - 20))).toBeGreaterThan(at((READING_CLEAR - 40)))
    // The last line stays in the original clear reading zone during its final approach.
    for (const scroll of [(READING_CLEAR - 40), (READING_CLEAR - 20), READING_CLEAR]) expect((920 - at(scroll)) / 400).toBeGreaterThanOrEqual(.6)
    for (const scroll of [(READING_CLEAR - 40), (READING_CLEAR - 20), READING_CLEAR]) expect((920 - at(scroll)) / 400).toBeLessThan(.78)
    const forward = Array.from({ length: READING_END / 20 + 1 }, (_, i) => at(i * 20))
    expect(forward.every((value, i) => i === 0 || value >= forward[i - 1])).toBe(true)
    for (let i = forward.length - 1; i >= 0; i--) expect(at(i * 20)).toBe(forward[i])
    expect(view.container.querySelector<HTMLElement>('.garden-intro__stage')!.style.visibility).toBe('visible')
    at(READING_END)
    expect(view.container.querySelector<HTMLElement>('.garden-intro__stage')!.style.visibility).toBe('hidden')
  } finally { view.unmount() }
})

it('does not rewrite identical text filters or SVG parameters and resumes at native scroll after hiding', () => {
  const { view, shell, at, flush, pending, motion } = setup()
  try {
    const attributeWrites = vi.spyOn(Element.prototype, 'setAttribute')
    const filterWrites = vi.spyOn(CSSStyleDeclaration.prototype, 'filter', 'set')
    at(0); at(.00001)
    expect(attributeWrites).not.toHaveBeenCalled()
    expect(filterWrites).not.toHaveBeenCalled()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    shell.scrollTop = READING_CLEAR; shell.dispatchEvent(new Event('scroll'))
    expect(pending.size).toBe(0)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange')); flush()
    expect(at(READING_CLEAR)).toBeCloseTo(680)
    motion.matches = true; motion.addEventListener.mock.calls[0][1](); flush()
    for (const line of view.container.querySelectorAll<HTMLElement>('[data-reading-line]')) expect(line.style.filter).toBe('none')
  } finally { view.unmount() }
  expect(pending.size).toBe(0)
})


it('softens a medium pointer neighborhood across nearby lines and holds still without frame polling', () => {
  let now = 100
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  const { view, at, flush, track, pending } = setup(true)
  try {
    at(730)
    const top = 448 + Number(track.style.transform.match(/, (-?[\d.]+)px/)![1])
    fireEvent(window, new MouseEvent('pointermove', { clientX: 196, clientY: top + 20 }))
    flush(); now += 200; flush()
    const lines = view.container.querySelectorAll<HTMLElement>('[data-reading-line]')
    const fields = view.container.querySelectorAll('[data-pointer-field]')
    expect(lines[1].style.filter).toMatch(/^url/)
    expect(lines[2].style.filter).toMatch(/^url/)
    expect(fields[1].getAttribute('width')).toBe('200')
    expect(fields[1].getAttribute('height')).toBe('120')
    expect(fields[1].getAttribute('x')).toBe('16.00')
    expect(fields[1].getAttribute('y')).toBe('-40.00')
    expect(fields[2].getAttribute('y')).toBe('-100.00')
    expect(view.container.querySelector('feDisplacementMap')).toBeNull()
    expect(view.container.querySelector('[result="localNear"]')).toHaveAttribute('in', 'SourceGraphic')
    expect(view.container.querySelector('[result="localSoft"]')).toHaveAttribute('stdDeviation', '3.4')
    const noise = [...view.container.querySelectorAll('[data-pointer-noise]')].map(n => n.outerHTML)
    expect(pending.size).toBe(0)
    now += 3000; flush()
    expect(lines[1].style.filter).toMatch(/^url/)
    expect([...view.container.querySelectorAll('[data-pointer-noise]')].map(n => n.outerHTML)).toEqual(noise)
    const writes = vi.spyOn(Element.prototype, 'setAttribute')
    fireEvent(window, new MouseEvent('pointermove', { clientX: 196, clientY: top + 20 })); flush()
    expect(writes).not.toHaveBeenCalled()
    expect(pending.size).toBe(0)
    fireEvent(document, new Event('pointerleave')); flush()
    now += 400; flush()
    expect(lines[1].style.filter).toBe('none')
    expect(lines[2].style.filter).toBe('none')
    expect(pending.size).toBe(0)
  } finally { view.unmount() }
})

it('ignores touch, clears pointer softness on scroll/reduced motion and cleans up hidden/unmounted state', () => {
  let now = 100
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  const { view, at, flush, track, motion, pending } = setup()
  try {
    const line = view.container.querySelectorAll<HTMLElement>('[data-reading-line]')[1]
    const move = (pointerType = 'mouse') => {
      const top = 448 + Number(track.style.transform.match(/, (-?[\d.]+)px/)![1])
      const event = new MouseEvent('pointermove', { clientX: 196, clientY: top + 20 })
      Object.defineProperty(event, 'pointerType', { value: pointerType })
      fireEvent(window, event); flush()
    }
    at(730); move('touch'); now += 200; flush()
    expect(line.style.filter).toBe('none')
    move(); now += 200; flush()
    expect(line.style.filter).toMatch(/^url/)
    at(820)
    const mask = view.container.querySelectorAll('[result="pointerMask"]')[1]
    expect(mask.firstElementChild).toHaveAttribute('slope', '0')
    at(730); move(); now += 200; flush()
    motion.matches = true; motion.addEventListener.mock.calls[0][1](); flush()
    expect(line.style.filter).toBe('none')
    motion.matches = false; motion.addEventListener.mock.calls[0][1](); flush(); move()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(pending.size).toBe(0)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange')); flush()
    expect(line.style.filter).toBe('none')
  } finally { view.unmount() }
  expect(pending.size).toBe(0)
})

it('returns to a fading local patch from its current strength without a jump', () => {
  let now = 100
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  const { view, at, flush, track } = setup()
  try {
    at(730)
    const top = 448 + Number(track.style.transform.match(/, (-?[\d.]+)px/)![1])
    const move = (x: number) => { fireEvent(window, new MouseEvent('pointermove', { clientX: x, clientY: top + 20 })); flush() }
    const power = () => Number(view.container.querySelectorAll('[result="pointerMask"]')[1].firstElementChild!.getAttribute('slope'))
    move(196); now += 200; flush(); expect(power()).toBe(1)
    move(800); now += 190; flush()
    const fading = power(); expect(fading).toBeCloseTo(.5)
    move(212); expect(power()).toBe(fading)
    now += 180; flush(); expect(power()).toBe(1)
  } finally { view.unmount() }
})


it('budgets added content once and brings the profile into clear view for keyboard entry', () => {
  const { view, shell, at } = setup(false, true)
  try {
    const continuation = parseFloat(shell.style.getPropertyValue('--reading-continuation-height'))
    expect(continuation).toBeGreaterThan(800)
    const card = view.container.querySelector<HTMLElement>('[data-reading-card]')!
    const glass = view.container.querySelector<HTMLElement>('[data-profile-glass]')!
    expect(glass.hidden).toBe(true)
    expect(card.inert).toBe(true)
    expect(card).toHaveAttribute('aria-hidden', 'true')
    // The lower fading shoulder extends beyond the 400px content area.
    // At top=420 the card is not interactive, but its visible backdrop must remain.
    let low = 0, high = 800 + continuation
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2
      if (at(mid) < 480) low = mid
      else high = mid
    }
    const shoulderScroll = (low + high) / 2
    at(shoulderScroll)
    expect(card.inert).toBe(true)
    expect(glass.hidden).toBe(false)
    const bottomClip = Number(glass.style.clipPath.match(/inset\([^ ]+ 0 ([^p]+)px/)?.[1])
    expect(bottomClip).toBeCloseTo(140, 0)
    act(() => view.container.querySelector('section')!.dispatchEvent(new Event('profilefocusrequest')))
    expect(card.inert).toBe(false)
    expect(card).toHaveAttribute('aria-hidden', 'false')
    expect(card.querySelector('button')).toHaveFocus()
    expect(glass.hidden).toBe(false)
    expect(glass.style.width).toBe('400px')
    expect(glass.style.transform).toContain('translate3d(')
    const contactScroll = shell.scrollTop
    at(800 + continuation)
    expect(glass.hidden).toBe(true)
    expect(card.inert).toBe(true)
    at(contactScroll)
    expect(card.inert).toBe(false)
    at(shoulderScroll)
    expect(glass.hidden).toBe(false)
    at(0)
    expect(glass.hidden).toBe(true)
    expect(parseFloat(shell.style.getPropertyValue('--reading-continuation-height'))).toBe(continuation)
  } finally { view.unmount() }
})

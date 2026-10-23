import { useRef } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useHeroReading } from './useHeroReading'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function ReadingFixture() {
  const ref = useRef<HTMLElement>(null)
  useHeroReading(ref)
  return <main className="site-shell"><section ref={ref}><div className="garden-intro__stage">
    <div className="garden-intro__stamp"><span>Stamp</span></div>
    <div data-reading-window style={{ height: 400 }}><div data-reading-track>
      <span data-reading-line data-top="20">First line</span>
      <div data-reading-continuation data-top="448"><span data-reading-line data-top="448">Second screen</span></div>
      <span data-reading-line data-top="900">Last line</span>
    </div></div>
  </div></section><section id="projects" /></main>
}

function setup() {
  const pending = new Map<number, FrameRequestCallback>(); let next = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending.set(++next, callback); return next })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))
  const motion = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => motion)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const shell = this.closest<HTMLElement>('.site-shell')
    return { top: this.id === 'projects' ? 2240 - (shell?.scrollTop ?? 0) : Number(this.dataset.top ?? 0), height: 40 } as DOMRect
  })
  const view = render(<ReadingFixture />)
  const shell = view.container.querySelector<HTMLElement>('.site-shell')!
  const track = view.container.querySelector<HTMLElement>('[data-reading-track]')!
  const flush = () => act(() => { const work = [...pending.values()]; pending.clear(); work.forEach(callback => callback(16)) })
  const at = (scroll: number) => {
    shell.scrollTop = scroll; shell.dispatchEvent(new Event('scroll')); flush()
    return -Number(track.style.transform.match(/, ([\d.-]+)px/)![1])
  }
  flush()
  return { view, shell, track, at, flush, pending, motion }
}

it('keeps reading anchors and continuous velocity across both screen joins without parking the last line', () => {
  const { view, at } = setup()
  try {
    expect(at(0)).toBeCloseTo(0)
    expect(at(800)).toBeCloseTo(400)
    expect(at(1760)).toBeCloseTo(680)
    expect(at(2240)).toBeCloseTo(1060)
    expect(at(5000)).toBeCloseTo(1060)
    for (const join of [800, 1720, 1760, 2240]) {
      const before = (at(join) - at(join - 2)) / 2
      const after = (at(join + 2) - at(join)) / 2
      expect(Math.abs(before - after)).toBeLessThan(.05)
    }
    expect(at(1740)).toBeGreaterThan(at(1720))
    // The last line stays in the original clear reading zone during its final approach.
    for (const scroll of [1720, 1740, 1760]) expect((920 - at(scroll)) / 400).toBeGreaterThanOrEqual(.6)
    for (const scroll of [1720, 1740, 1760]) expect((920 - at(scroll)) / 400).toBeLessThan(.78)
    const forward = Array.from({ length: 113 }, (_, i) => at(i * 20))
    expect(forward.every((value, i) => i === 0 || value >= forward[i - 1])).toBe(true)
    for (let i = 112; i >= 0; i--) expect(at(i * 20)).toBe(forward[i])
    expect(view.container.querySelector<HTMLElement>('.garden-intro__stage')!.style.visibility).toBe('visible')
    at(2240)
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
    shell.scrollTop = 1760; shell.dispatchEvent(new Event('scroll'))
    expect(pending.size).toBe(0)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange')); flush()
    expect(at(1760)).toBeCloseTo(680)
    motion.matches = true; motion.addEventListener.mock.calls[0][1](); flush()
    for (const line of view.container.querySelectorAll<HTMLElement>('[data-reading-line]')) expect(line.style.filter).toBe('none')
  } finally { view.unmount() }
  expect(pending.size).toBe(0)
})

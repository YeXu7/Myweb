import { useRef } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useAboutDefocus } from './useAboutDefocus'

function Fixture() {
  const ref = useRef<HTMLElement>(null)
  useAboutDefocus(ref)
  return <div className="site-shell"><section ref={ref}><h2>Work Experience</h2><p>Professional and consumer experience</p><h3>Capabilities</h3></section></div>
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('reuses one local field, restores text on leave and never intercepts selection or scroll', () => {
  let time = 0, next = 0
  const frames = new Map<number, FrameRequestCallback>()
  const queries: { matches: boolean; changed?: () => void }[] = []
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++next, fn); return next })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('matchMedia', (q: string) => {
    const record = { matches: !q.includes('reduced-motion'), changed: undefined as (() => void) | undefined }
    queries.push(record)
    return Object.assign(record, { addEventListener: (_: string, fn: () => void) => { record.changed = fn }, removeEventListener() {} })
  })
  vi.stubGlobal('PointerEvent', MouseEvent)
  vi.spyOn(window, 'getSelection').mockReturnValue({ isCollapsed: true } as Selection)
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 80, 400, 48))
  const view = render(<Fixture />)
  const title = view.container.querySelector('h2')!, para = view.container.querySelector('p')!, section = view.container.querySelector('section')!
  const tick = (n: number) => act(() => { for (let i = 0; i < n; i++) { time += 16; const work = [...frames.values()]; frames.clear(); work.forEach(fn => fn(time)) } })
  fireEvent.pointerMove(title, { clientX: 70, clientY: 95 }); tick(14)
  expect(title.style.filter).toMatch(/^url\(#about-/)
  expect(para.style.filter).toBe(''); expect(section.style.filter).toBe('')
  expect(view.container.querySelectorAll('filter')).toHaveLength(1)
  const calls = rect.mock.calls.length; tick(10); expect(rect.mock.calls.length).toBe(calls)
  fireEvent.pointerMove(para, { clientX: 100, clientY: 100 }); tick(14)
  expect(title.style.filter).toBe(''); expect(para.style.filter).toMatch(/^url/)
  fireEvent.pointerMove(document.body); tick(30); expect(para.style.filter).toBe('')
  fireEvent.pointerMove(title, { clientX: 70, clientY: 95 }); tick(14)
  fireEvent.pointerDown(title); expect(title.style.filter).toBe('')
  fireEvent.pointerMove(title, { buttons: 1 }); tick(14); expect(title.style.filter).toBe('')
  fireEvent.pointerMove(title, { clientX: 70, clientY: 95 }); tick(14)
  fireEvent.scroll(view.container.querySelector('.site-shell')!); expect(title.style.filter).toBe('')
  queries[0].matches = true; queries[0].changed?.()
  fireEvent.pointerMove(title); tick(14); expect(title.style.filter).toBe('')
  queries[0].matches = false; queries[1].matches = false
  fireEvent.pointerMove(title); tick(14); expect(title.style.filter).toBe('')
  view.unmount(); expect(frames.size).toBe(0)
})

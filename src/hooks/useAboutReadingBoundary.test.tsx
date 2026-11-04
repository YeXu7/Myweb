import { useRef } from 'react'
import { render, fireEvent, act } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAboutReadingBoundary } from './useAboutReadingBoundary'

it('keeps the fade below navigation on forward/reverse scroll without moving content', () => {
  let aboutTop = 500
  const queue: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { queue.push(cb); return queue.length })
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    const top = this.id === 'about' ? aboutTop - (this.closest<HTMLElement>('.site-shell')?.scrollTop ?? 0) : 0
    return { top, bottom: this.className === 'global-nav' ? 64 : top + 400, left: 0, right: 1000, width: 1000, height: 400, x: 0, y: top, toJSON() {} }
  })
  function Chapter() {
    const ref = useRef<HTMLElement>(null)
    useAboutReadingBoundary(ref)
    return <section ref={ref} id="about" />
  }
  const view = render(<div className="site-shell"><header className="global-nav" /><Chapter /></div>)
  const shell = view.container.firstElementChild as HTMLElement
  const about = view.container.querySelector<HTMLElement>('#about')!
  expect(about.style.getPropertyValue('--about-exit-stop')).toBe('0px')
  shell.scrollTop = 600; fireEvent.scroll(shell)
  act(() => queue.splice(0).forEach(cb => cb(16)))
  expect(about.style.getPropertyValue('--about-exit-stop')).toBe('196px')
  shell.scrollTop = 450; fireEvent.scroll(shell)
  act(() => queue.splice(0).forEach(cb => cb(32)))
  expect(about.style.getPropertyValue('--about-exit-stop')).toBe('46px')
  aboutTop = 520
  fireEvent(shell, new Event('readinggeometrychange'))
  expect(about.style.getPropertyValue('--about-exit-stop')).toBe('26px')
  expect(about.style.transform).toBe('')
  view.unmount(); rect.mockRestore(); vi.restoreAllMocks()
})

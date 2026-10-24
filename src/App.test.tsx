import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { DigitalGardenScene } from './components/DigitalGardenScene'

vi.mock('./components/DigitalGardenScene', () => ({
  DigitalGardenScene: vi.fn(() => <div data-testid="digital-garden-scene" aria-hidden="true" />),
}))

describe('App portfolio flow', () => {
  it('keeps navigation and removes the old About copy for continuous reading', () => {
    render(<App />)

    expect(screen.getByLabelText('Portfolio snap pages')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /projects/i })).toHaveAttribute('href', '#projects')
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '#about')
    expect(screen.queryByLabelText('Yulia home')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /switch to chinese/i })).not.toBeInTheDocument()

    // the old marquee archive has been replaced by the About screen
    expect(screen.queryAllByTestId('projects-marquee-group')).toHaveLength(0)
    expect(screen.queryByRole('region', { name: 'About' })).not.toBeInTheDocument()
    expect(screen.queryByText('02 / 03')).not.toBeInTheDocument()
    expect(screen.queryByText('Craft')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Selected projects introduction' })).toBeInTheDocument()

  })

  it('repeats four real project covers in a bounded pool instead of the vine installation', () => {
    render(<App />)
    const gallery = screen.getByLabelText('Selected project gallery')
    expect(gallery.querySelectorAll('[data-paper]')).toHaveLength(8)
    expect([...new Set(Array.from(gallery.querySelectorAll('img')).map(img => img.alt))]).toEqual([
      '灵机 — IP Asset Platform', '腾讯视频 OTT 端 — Video Experience',
      '如影 — Production Platform', '即行 — Travel App',
    ])
    expect(screen.queryByText('WHAT ARE YOU LOOKING FOR?')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Wet digital vine installation')).not.toBeInTheDocument()
    expect(gallery).toHaveAttribute('id', 'projects')
  })
})

it('updates scroll styles without re-rendering the scene until the active navigation section changes', () => {
  const pending = new Map<number, FrameRequestCallback>(); let next = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending.set(++next, callback); return next })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))
  let projectScreens = 2.8
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const shell = this.closest<HTMLElement>('.site-shell')
    return { top: this.id === 'projects' ? projectScreens * window.innerHeight - (shell?.scrollTop ?? 0) : 0 } as DOMRect
  })
  const flush = () => act(() => { const work = [...pending.values()]; pending.clear(); work.forEach(callback => callback(16)) })
  const view = render(<App />)
  try {
    const shell = screen.getByLabelText('Portfolio snap pages')
    const scrollTo = (progress: number) => { shell.scrollTop = window.innerHeight * progress; shell.dispatchEvent(new Event('scroll')); flush() }
    flush()
    const initialRenders = vi.mocked(DigitalGardenScene).mock.calls.length
    scrollTo(.1); scrollTo(.2); scrollTo(.55)
    expect(vi.mocked(DigitalGardenScene).mock.calls.length).toBe(initialRenders)
    expect(shell.style.getPropertyValue('--page-progress')).toBe('0.55')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('hero__nav-item--active')
    scrollTo(.56)
    expect(screen.getByRole('link', { name: 'About' })).toHaveClass('hero__nav-item--active')
    const aboutRenders = vi.mocked(DigitalGardenScene).mock.calls.length
    scrollTo(1); scrollTo(1.56); scrollTo(2.34)
    expect(vi.mocked(DigitalGardenScene).mock.calls.length).toBe(aboutRenders)
    expect(shell.style.getPropertyValue('--first-screen-progress')).toBe('1')
    scrollTo(2.36)
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveClass('hero__nav-item--active')
    projectScreens = 3.2; window.dispatchEvent(new Event('resize')); flush()
    expect(screen.getByRole('link', { name: 'About' })).toHaveClass('hero__nav-item--active')
    scrollTo(2.76)
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveClass('hero__nav-item--active')
    scrollTo(0)
    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('hero__nav-item--active')
    expect(shell.style.getPropertyValue('--page-progress')).toBe('0')
  } finally { view.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() }
  expect(pending.size).toBe(0)
})

it('lands on the gallery when returning from a detail page with the projects fragment', () => {
  window.history.replaceState(null, '', '/Myweb/#projects')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { top: this.id === 'projects' ? 2150 : 0 } as DOMRect
  })
  try {
    render(<App />)
    expect(screen.getByLabelText('Portfolio snap pages').scrollTop).toBe(2150)
  } finally {
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  }
})

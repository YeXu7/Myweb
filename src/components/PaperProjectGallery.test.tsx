import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaperProjectGallery } from './PaperProjectGallery'

const scene = vi.hoisted(() => ({ paint: vi.fn<(phase: number, flutter: number, scales: readonly number[], selected: number | null) => boolean>(() => true), resize: vi.fn(), destroy: vi.fn(), hitTest: vi.fn<() => number | null>(() => null), bounds: vi.fn(() => ({ left: 500, right: 780, top: 240, bottom: 440 })) }))
vi.mock('../garden/paperGalleryScene', () => ({ createPaperGalleryScene: vi.fn(() => scene) }))
let frames = new Map<number, FrameRequestCallback>(), nextFrame = 0, time = 0
let reduced = false, fine = true
let mediaRecords: Array<{ query: string; matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> }> = []
const originalElementFromPoint = document.elementFromPoint
const tick = (count = 1) => act(() => {
  for (let i = 0; i < count; i++) {
    const callbacks = [...frames.values()]; frames.clear(); time += 16
    callbacks.forEach(callback => callback(time))
  }
})
const setup = () => render(<div className="site-shell"><PaperProjectGallery /></div>)
beforeEach(() => {
  frames = new Map(); nextFrame = 0; time = 0; reduced = false; fine = true; mediaRecords = []
  vi.clearAllMocks(); scene.hitTest.mockReturnValue(null)
  vi.stubGlobal('WebGLRenderingContext', class {})
  vi.stubGlobal('PointerEvent', MouseEvent)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.stubGlobal('matchMedia', (query: string) => {
    const record = { query, matches: query.includes('reduced-motion') ? reduced : fine, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    mediaRecords.push(record); return record
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(720)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.id === 'projects' ? 3240 : 76 })
})
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals()
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint })
})

describe('paper hover gallery', () => {
  it('renders a bounded two-cycle pool with four distinct project identities; captions are hidden by default', () => {
    const { container } = setup(); tick(2)
    expect(container.querySelectorAll('[data-sheet]')).toHaveLength(16)
    expect(container.querySelectorAll('[data-paper]')).toHaveLength(8)
    for (const blank of container.querySelectorAll('[data-decoration]')) {
      expect(blank).toHaveAttribute('aria-hidden', 'true')
      expect(blank).not.toHaveAttribute('tabindex')
    }
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'true')
  })
  it('uses the visible curved project for hover and clears it on stage leave', () => {
    const { container } = setup(); tick(2)
    const stage = container.querySelector('.paper-gallery__stage')!
    scene.hitTest.mockReturnValue(1)
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360, pointerType: 'mouse' }); tick(70)
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'false')
    expect(container.querySelector('.paper-gallery__caption h2')).toHaveTextContent('腾讯视频 OTT 端')
    expect(scene.paint.mock.calls.at(-1)?.[2]).toEqual([1, 1.5, 1, 1, 1, 1, 1, 1])
    fireEvent.pointerLeave(stage); tick(70)
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'true')
    expect(scene.paint.mock.calls.at(-1)?.[2]).toEqual(Array(8).fill(1))
  })
  it('supports keyboard focus and releases focus enlargement on blur', () => {
    const { container } = setup(); tick(2)
    const paper = container.querySelectorAll('[data-paper]')[0]
    fireEvent.focusIn(paper); tick(70)
    expect(container.querySelector('.paper-gallery__caption h2')).toHaveTextContent('灵机')
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'false')
    fireEvent.focusOut(paper); tick(70)
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'true')
  })
  it('lets a mouse hover take over from earlier keyboard focus', () => {
    const { container } = setup(); tick(2)
    fireEvent.focusIn(container.querySelector('[data-paper]')!); tick(3)
    scene.hitTest.mockReturnValue(2)
    fireEvent.pointerMove(container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(70)
    expect(container.querySelector('.paper-gallery__caption h2')).toHaveTextContent('如影')
    expect(scene.paint.mock.calls.at(-1)?.[2]).toEqual([1, 1, 1.5, 1, 1, 1, 1, 1])
  })
  it('re-evaluates the stationary pointer after scrolling, then clears on window blur', () => {
    const { container } = setup(); tick(2)
    const stage = container.querySelector('.paper-gallery__stage')!
    scene.hitTest.mockReturnValue(0)
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360 }); tick(3)
    scene.hitTest.mockReturnValue(null)
    fireEvent.scroll(container.querySelector('.site-shell')!); tick(70)
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'true')
    scene.hitTest.mockReturnValue(0)
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360 }); tick(3)
    fireEvent(window, new Event('blur')); tick(70)
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'true')
  })
  it('keeps project information available on touch and in reduced motion', () => {
    fine = false
    const touch = setup(); tick(2)
    expect(touch.container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'false')
    touch.unmount()
    reduced = true
    const staticView = setup(); tick(2)
    expect(staticView.container.querySelector('#projects')).toHaveAttribute('data-reduced', 'true')
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(staticView.container.querySelectorAll('[data-paper]:not([hidden]) .paper-gallery__static-caption')).toHaveLength(4)
  })
  it('uses transformed DOM hit testing when WebGL is unavailable and never selects decoration', () => {
    vi.stubGlobal('WebGLRenderingContext', undefined)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-paper') ? new DOMRect(500, 240, 280, 200) : new DOMRect(0, 0, 1280, 720)
    })
    const hit = vi.fn<() => Element | null>()
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit })
    const { container } = setup(); tick(2)
    const stage = container.querySelector('.paper-gallery__stage')!
    hit.mockReturnValue(container.querySelectorAll('[data-paper]')[2])
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360 }); tick(70)
    expect(container.querySelector('.paper-gallery__caption h2')).toHaveTextContent('如影')
    expect(container.querySelectorAll<HTMLElement>('[data-paper]')[2].style.transform).toContain('scale(1.5)')
    hit.mockReturnValue(container.querySelector('[data-decoration]'))
    fireEvent.pointerMove(stage, { clientX: 700, clientY: 360 }); tick(70)
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll<HTMLElement>('[data-paper]')[2].style.transform).toContain('scale(1)')
    expect(scene.paint).not.toHaveBeenCalled()
  })
  it('clears hover and releases WebGL resources after context loss', () => {
    const { container } = setup(); tick(2)
    scene.hitTest.mockReturnValue(0)
    fireEvent.pointerMove(container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(4)
    const event = new Event('webglcontextlost', { cancelable: true })
    fireEvent(container.querySelector('.paper-gallery__canvas')!, event); tick(70)
    expect(event.defaultPrevented).toBe(true)
    expect(scene.destroy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('#projects')).toHaveAttribute('data-canvas-ready', 'false')
    expect(container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'true')
  })
  it('clears selection when pointer capability changes and removes media listeners', () => {
    const view = setup(); tick(2)
    scene.hitTest.mockReturnValue(1)
    fireEvent.pointerMove(view.container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(70)
    const hover = mediaRecords.find(record => record.query.includes('pointer: fine'))!
    hover.matches = false
    act(() => hover.addEventListener.mock.calls[0][1]()); tick(70)
    expect(scene.paint.mock.calls.at(-1)?.[2]).toEqual(Array(8).fill(1))
    expect(view.container.querySelector('.paper-gallery__caption')).toHaveAttribute('aria-hidden', 'false')
    view.unmount()
    for (const record of mediaRecords) {
      expect(record.removeEventListener).toHaveBeenCalledWith('change', record.addEventListener.mock.calls[0][1])
    }
  })
  it('disposes its scene and pending frame on unmount', () => {
    const view = setup(); tick(2)
    view.unmount()
    expect(scene.destroy).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
  })
})


describe('project focus', () => {
  it('opens from a fresh touch hit, locks scroll, disables unavailable details and returns with Escape', () => {
    fine = false
    const { container } = setup(); tick(2)
    const shell = container.querySelector<HTMLElement>('.site-shell')!
    scene.hitTest.mockReturnValue(1)
    fireEvent.click(container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(90)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('腾讯视频 OTT 端')
    expect(screen.getByRole('button', { name: '查看' })).toBeDisabled()
    expect(shell.style.overflow).toBe('hidden')
    fireEvent.keyDown(window, { key: 'Escape' }); tick(90)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(shell.style.overflow).toBe('')
  })
  it('supports keyboard open and immediate reduced-motion return', () => {
    reduced = true
    const { container } = setup(); tick(2)
    const paper = container.querySelector('[data-paper]')!
    fireEvent.keyDown(paper, { key: 'Enter' }); tick(2)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('灵机')
    fireEvent.click(screen.getByRole('button', { name: '返回' })); tick(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(paper)
  })
})

describe('focus lifecycle and animation scheduling', () => {
  it('can reverse before opening completes, ignores extra cover clicks, and restores shell/navigation state', () => {
    const view = render(<div className="site-shell" style={{ overflow: 'auto', scrollBehavior: 'smooth' }}><header className="global-nav"><a href="#projects">Projects</a></header><PaperProjectGallery /></div>)
    tick(2)
    const shell = view.container.querySelector<HTMLElement>('.site-shell')!
    const nav = view.container.querySelector<HTMLElement>('.global-nav')!
    const stage = view.container.querySelector('.paper-gallery__stage')!
    shell.scrollTop = 400; fireEvent.scroll(shell); tick(3)
    scene.hitTest.mockReturnValue(2)
    fireEvent.click(stage, { clientX: 640, clientY: 360 }); tick(3)
    expect(nav.inert).toBe(true); expect(nav.style.visibility).toBe('hidden')
    expect(shell.style.scrollBehavior).toBe('auto')
    const progress = (scene.paint.mock.calls.at(-1) as unknown as unknown[])[5] as { progress: number }
    expect(progress.progress).toBeGreaterThan(0); expect(progress.progress).toBeLessThan(1)
    fireEvent.click(screen.getByRole('button', { name: '返回' })); tick(1)
    scene.hitTest.mockReturnValue(0); fireEvent.click(stage, { clientX: 640, clientY: 360 })
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '返回' }))
    tick(90)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(shell.scrollTop).toBe(400); expect(shell.style.overflow).toBe('auto'); expect(shell.style.scrollBehavior).toBe('smooth')
    expect(nav.inert).not.toBe(true); expect(nav.style.visibility).toBe(''); expect(nav).not.toHaveAttribute('aria-hidden')
  })
  it('finishes an in-flight return when reduced motion becomes enabled', () => {
    const { container } = setup(); tick(2)
    scene.hitTest.mockReturnValue(0)
    fireEvent.click(container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(6)
    fireEvent.keyDown(window, { key: 'Escape' }); tick(1)
    const media = mediaRecords.find(record => record.query.includes('reduced-motion'))!
    media.matches = true
    act(() => media.addEventListener.mock.calls[0][1]()); tick(3)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.querySelector<HTMLElement>('.site-shell')!.style.overflow).toBe('')
    expect(frames.size).toBe(0)
  })
  it('keeps an opening focus usable when reduced motion becomes enabled', () => {
    const { container } = setup(); tick(2)
    fireEvent.keyDown(container.querySelector('[data-paper]')!, { key: ' ' }); tick(2)
    const media = mediaRecords.find(record => record.query.includes('reduced-motion'))!
    media.matches = true
    act(() => media.addEventListener.mock.calls[0][1]()); tick(2)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' }); tick(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('pauses hidden and offscreen frames then resumes without accumulating hidden elapsed time', () => {
    let intersect: IntersectionObserverCallback = () => {}
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { intersect = callback }
      observe() {} disconnect() {}
    })
    let hidden = false
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    setup(); tick(3)
    const before = (scene.paint.mock.calls.at(-1) as unknown as unknown[])[4] as number
    hidden = true; fireEvent(document, new Event('visibilitychange'))
    expect(frames.size).toBe(0); tick(200)
    hidden = false; fireEvent(document, new Event('visibilitychange')); tick(1)
    const after = (scene.paint.mock.calls.at(-1) as unknown as unknown[])[4] as number
    expect(after - before).toBeLessThan(.1)
    act(() => intersect([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(frames.size).toBe(0)
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)); tick(1)
    expect(frames.size).toBe(1)
  })
  it('keeps initially offscreen papers out of keyboard navigation and clears them after leaving', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, this.id === 'projects' ? 1440 : 0, 1280, 720)
    })
    const { container } = setup(); tick(2)
    const shell = container.querySelector<HTMLElement>('.site-shell')!
    const papers = Array.from(container.querySelectorAll<HTMLElement>('[data-paper]'))
    expect(papers.every(paper => paper.tabIndex === -1 && paper.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(frames.size).toBe(0)
    shell.scrollTop = 1700; fireEvent.scroll(shell); tick(2)
    expect(papers.some(paper => paper.tabIndex === 0)).toBe(true)
    shell.scrollTop = 0; fireEvent.scroll(shell); tick(2)
    expect(papers.every(paper => paper.tabIndex === -1)).toBe(true)
    expect(frames.size).toBe(0)
  })
  it('uses fresh clicks for black-paper blocking and does not read layout during idle frames', () => {
    const { container } = setup(); tick(2)
    const stage = container.querySelector('.paper-gallery__stage')!
    scene.hitTest.mockReturnValue(0)
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360 }); tick(3)
    scene.hitTest.mockReturnValue(null)
    fireEvent.click(stage, { clientX: 640, clientY: 360 }); tick(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const reads = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    reads.mockClear(); scene.hitTest.mockClear(); tick(40)
    expect(reads).not.toHaveBeenCalled(); expect(scene.hitTest).not.toHaveBeenCalled()
  })
  it('recomputes the focus target on resize and fully unlocks on unmount', () => {
    const view = setup(); tick(2)
    scene.hitTest.mockReturnValue(1)
    fireEvent.click(view.container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(80)
    const shell = view.container.querySelector<HTMLElement>('.site-shell')!
    const dialog = screen.getByRole('dialog'); const previousTop = dialog.style.top
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(844)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(390)
    fireEvent.resize(window); tick(2)
    expect(dialog.style.top).not.toBe(previousTop)
    expect(scene.resize).toHaveBeenCalled()
    view.unmount()
    expect(shell.style.overflow).toBe(''); expect(frames.size).toBe(0)
  })
})


describe('responsive return continuity', () => {
  it('returns to the same chapter progress after a viewport resize', () => {
    const { container } = setup(); tick(2)
    const shell = container.querySelector<HTMLElement>('.site-shell')!
    shell.scrollTop = 1260; fireEvent.scroll(shell); tick(80)
    scene.hitTest.mockReturnValue(1)
    fireEvent.click(container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(5)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, this.id === 'projects' ? -shell.scrollTop : 0, 844, 390)
    })
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(390)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(844)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.id === 'projects' ? 1755 : 76 })
    fireEvent.resize(window); tick(3)
    fireEvent.keyDown(window, { key: 'Escape' }); tick(90)
    expect(shell.scrollTop / (1755 - 390)).toBeCloseTo(.5)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('leaves offscreen reduced-motion cards at their responsive CSS width', () => {
    reduced = true
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, this.id === 'projects' ? 1440 : 0, 1280, 720)
    })
    const { container } = setup(); tick(2)
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-paper]:not([hidden])'))
    expect(cards.every(card => card.style.width === '' && card.tabIndex === 0)).toBe(true)
  })
})

describe('reduced-motion layout restoration', () => {
  it('restores static dimensions before restoring scroll on return and unmount', () => {
    reduced = true
    for (const cleanup of [false, true]) {
      const view = setup(); tick(2)
      const shell = view.container.querySelector<HTMLElement>('.site-shell')!
      const section = view.container.querySelector<HTMLElement>('#projects')!
      const papers = Array.from(view.container.querySelectorAll<HTMLElement>('[data-paper]'))
      let scrollTop = 600
      const restored: Array<{ staticCards: boolean; minHeight: string; overflow: string; behavior: string; focus: string | undefined }> = []
      Object.defineProperty(shell, 'scrollTop', {
        configurable: true, get: () => scrollTop,
        set: (value: number) => {
          restored.push({ staticCards: papers.every(p => p.style.cssText === ''), minHeight: section.style.minHeight, overflow: shell.style.overflow, behavior: shell.style.scrollBehavior, focus: section.dataset.focus })
          scrollTop = value
        },
      })
      fireEvent.keyDown(papers[0], { key: 'Enter' }); tick(2)
      expect(papers[0].style.transform).not.toBe('')
      if (cleanup) view.unmount()
      else { fireEvent.click(screen.getByRole('button', { name: '返回' })); tick(2) }
      expect(restored.at(-1)).toEqual({ staticCards: true, minHeight: '', overflow: '', behavior: 'auto', focus: 'false' })
      expect(scrollTop).toBe(600)
      if (!cleanup) view.unmount()
    }
  })
})


describe('handwritten gallery preview', () => {
  const lastEmphasis = () => (scene.paint.mock.calls.at(-1) as unknown as unknown[])[6] as { dimming: number[]; spacing: number[]; clarity: number[] }
  it('dims all other opaque sheets for mouse and keyboard and returns smoothly', () => {
    const { container } = setup(); tick(2)
    const stage = container.querySelector('.paper-gallery__stage')!
    scene.hitTest.mockReturnValue(1)
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360 }); tick(100)
    expect(lastEmphasis().dimming).toEqual(Array.from({ length: 16 }, (_, i) => i === 3 ? 0 : 1))
    fireEvent.pointerLeave(stage); tick(1)
    expect(lastEmphasis().dimming[0]).toBeGreaterThan(0); expect(lastEmphasis().dimming[0]).toBeLessThan(1)
    tick(100)
    expect(lastEmphasis().dimming).toEqual(Array(16).fill(0))
    fireEvent.keyDown(window, { key: 'Tab' })
    fireEvent.focusIn(container.querySelectorAll('[data-paper]')[2]); tick(100)
    expect(lastEmphasis().dimming).toEqual(Array.from({ length: 16 }, (_, i) => i === 5 ? 0 : 1))
    expect(container.querySelector('#projects')).toHaveAttribute('data-keyboard-preview', 'true')
  })
  it('restores dimming, neighbour spacing and clarity when a drag clears preview', () => {
    const { container } = setup(); tick(2)
    const stage = container.querySelector('.paper-gallery__stage')!
    scene.hitTest.mockReturnValue(0)
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360 }); tick(100)
    expect(lastEmphasis().spacing.some(value => value !== 0)).toBe(true)
    expect(lastEmphasis().clarity[0]).toBe(1)
    fireEvent.pointerDown(stage, { button: 0, buttons: 1, clientY: 400 })
    fireEvent.pointerMove(window, { buttons: 1, clientY: 300 }); tick(100)
    expect(lastEmphasis().dimming).toEqual(Array(16).fill(0))
    expect(lastEmphasis().spacing.every(value => value === 0)).toBe(true)
    expect(lastEmphasis().clarity).toEqual(Array(8).fill(0))
    fireEvent.pointerUp(window, { button: 0, clientY: 300 })
  })
  it('dims only covers in the reduced static layout, preserving caption and card opacity', () => {
    reduced = true
    const { container } = setup(); tick(2)
    const cards = container.querySelectorAll<HTMLElement>('[data-paper]')
    fireEvent.focusIn(cards[0]); tick(2)
    expect(cards[0].style.getPropertyValue('--paper-brightness')).toBe('1')
    expect(Number(cards[1].style.getPropertyValue('--paper-brightness'))).toBeCloseTo(.3)
    expect(cards[1].style.opacity).toBe('')
    expect(cards[1].style.filter).toBe('')
    expect(cards[1].querySelector<HTMLElement>('figcaption')!.style.filter).toBe('')
  })
  it('preserves the current dimming snapshot while focus opens and returns', () => {
    const { container } = setup(); tick(2)
    const stage = container.querySelector('.paper-gallery__stage')!
    scene.hitTest.mockReturnValue(0)
    fireEvent.pointerMove(stage, { clientX: 640, clientY: 360 }); tick(12)
    const captured = structuredClone(lastEmphasis())
    fireEvent.pointerDown(stage, { clientX: 640, clientY: 360 })
    fireEvent.click(stage, { clientX: 640, clientY: 360 }); tick(10)
    expect(lastEmphasis()).toEqual(captured)
    fireEvent.click(screen.getByRole('button', { name: '返回' })); tick(8)
    expect(lastEmphasis()).toEqual(captured)
    tick(100)
    expect(container.querySelector('#projects')).toHaveAttribute('data-keyboard-preview', 'false')
  })
})

it('offers two original double-line capsule controls without a visible unavailable notice', () => {
  const { container } = setup(); tick(2)
  scene.hitTest.mockReturnValue(0)
  fireEvent.click(container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(4)
  const dialog = screen.getByRole('dialog')
  expect(dialog.querySelectorAll('button svg')).toHaveLength(2)
  for (const svg of dialog.querySelectorAll('button svg')) {
    expect(svg.querySelectorAll('path')).toHaveLength(2)
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  }
  expect(screen.getByText('项目详情暂未开放')).not.toBeVisible()
  expect(screen.getByRole('button', { name: '查看' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '查看' })).toHaveAccessibleDescription('项目详情暂未开放')
})


describe('loop continuation and mouse drag', () => {
  const phase = (container: HTMLElement) => Number(container.querySelector<HTMLElement>('#projects')!.dataset.phase)
  const atTail = () => {
    const view = setup(); tick(2)
    const shell = view.container.querySelector<HTMLElement>('.site-shell')!
    shell.scrollTop = 2520; fireEvent.scroll(shell); tick(100)
    return { ...view, shell, stage: view.container.querySelector<HTMLElement>('.paper-gallery__stage')! }
  }
  it('continues multiple cycles at the tail and returns excess reverse input to native scrolling', () => {
    const view = atTail()
    const forward = new WheelEvent('wheel', { deltaY: 2520 * 2, bubbles: true, cancelable: true })
    fireEvent(view.shell, forward); tick(100)
    expect(forward.defaultPrevented).toBe(true); expect(phase(view.container)).toBeGreaterThan(10)
    expect(view.shell.scrollTop).toBe(2520)
    fireEvent.wheel(view.shell, { deltaY: -2520 * 2 - 100 }); tick(100)
    expect(view.shell.scrollTop).toBe(2420)
    expect(phase(view.container)).toBeLessThanOrEqual(3)
  })
  it('does not consume earlier native scrolling, zoom gestures, or reduced-motion scrolling', () => {
    const view = setup(); tick(2)
    const shell = view.container.querySelector<HTMLElement>('.site-shell')!
    const early = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    fireEvent(shell, early); expect(early.defaultPrevented).toBe(false)
    shell.scrollTop = 2520; fireEvent.scroll(shell); tick(2)
    const zoom = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true })
    fireEvent(shell, zoom); expect(zoom.defaultPrevented).toBe(false)
    view.unmount(); reduced = true
    const staticView = setup(); tick(2)
    const native = new WheelEvent('wheel', { deltaY: 10000, cancelable: true })
    fireEvent(staticView.container.querySelector('.site-shell')!, native)
    expect(native.defaultPrevented).toBe(false)
    expect(screen.getAllByRole('img')).toHaveLength(4)
  })
  it('shares drag progress with wheel, suppresses the drag click and retains normal clicks', () => {
    const view = atTail()
    const capture = vi.fn(), release = vi.fn()
    Object.assign(view.stage, { setPointerCapture: capture, hasPointerCapture: () => true, releasePointerCapture: release })
    scene.hitTest.mockReturnValue(4)
    fireEvent.pointerDown(view.stage, { button: 0, buttons: 1, clientY: 400 })
    fireEvent.pointerMove(window, { buttons: 1, clientY: 100 }); tick(100)
    expect(capture).toHaveBeenCalled(); expect(phase(view.container)).toBeGreaterThan(3)
    fireEvent.pointerUp(window, { button: 0, clientY: 100 })
    expect(release).toHaveBeenCalled()
    fireEvent.click(view.stage, { clientX: 640, clientY: 360 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.pointerDown(view.stage, { button: 0, buttons: 1, clientY: 360 })
    fireEvent.pointerMove(window, { buttons: 1, clientY: 357 })
    fireEvent.pointerUp(window, { button: 0, clientY: 357 })
    fireEvent.click(view.stage, { clientX: 640, clientY: 357 }); tick(5)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('灵机')
  })
  it('freezes the exact occurrence and logical cycle through focus and resets on native navigation', () => {
    const view = atTail()
    fireEvent.wheel(view.shell, { deltaY: 2520 * 3 }); tick(100)
    const before = phase(view.container)
    scene.hitTest.mockReturnValue(4)
    fireEvent.click(view.stage, { clientX: 640, clientY: 360 }); tick(20)
    fireEvent.wheel(view.shell, { deltaY: 3000 })
    expect(phase(view.container)).toBeCloseTo(before)
    expect(screen.getByRole('dialog')).toHaveAccessibleName('灵机')
    fireEvent.keyDown(window, { key: 'Escape' }); tick(100)
    expect(phase(view.container)).toBeCloseTo(before)
    view.shell.scrollTop = 100; fireEvent.scroll(view.shell); tick(100)
    expect(phase(view.container)).toBeLessThan(0)
    view.shell.scrollTop = 2520; fireEvent.scroll(view.shell); tick(100)
    expect(phase(view.container)).toBe(3)
  })
  it('releases capture on cancel/blur/unmount and ignores non-primary dragging', () => {
    const view = atTail()
    const release = vi.fn()
    Object.assign(view.stage, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: release })
    fireEvent.pointerDown(view.stage, { button: 2, buttons: 2, clientY: 400 })
    fireEvent.pointerMove(window, { buttons: 2, clientY: 100 }); tick(3)
    expect(phase(view.container)).toBe(3)
    for (const ending of ['pointercancel', 'blur', 'unmount']) {
      fireEvent.pointerDown(view.stage, { button: 0, buttons: 1, clientY: 400 })
      fireEvent.pointerMove(window, { buttons: 1, clientY: 100 })
      if (ending === 'pointercancel') fireEvent.pointerCancel(window)
      else if (ending === 'blur') fireEvent(window, new Event('blur'))
      else view.unmount()
    }
    expect(release).toHaveBeenCalledTimes(3)
    expect(frames.size).toBe(0)
  })
})

it('keeps a repeated occurrence visible when focus switches to reduced motion and returns to its original static card', () => {
  const { container } = setup(); tick(2)
  const shell = container.querySelector<HTMLElement>('.site-shell')!
  shell.scrollTop = 2520; fireEvent.scroll(shell); tick(80)
  fireEvent.wheel(shell, { deltaY: 400 }); tick(80)
  scene.hitTest.mockReturnValue(4)
  fireEvent.click(container.querySelector('.paper-gallery__stage')!, { clientX: 640, clientY: 360 }); tick(3)
  const media = mediaRecords.find(record => record.query.includes('reduced-motion'))!
  media.matches = true; act(() => media.addEventListener.mock.calls[0][1]()); tick(2)
  const cards = container.querySelectorAll<HTMLElement>('[data-paper]')
  expect(cards[4].hidden).toBe(false)
  fireEvent.keyDown(window, { key: 'Escape' }); tick(2)
  expect(cards[4].hidden).toBe(true)
  expect(document.activeElement).toBe(cards[0])
  expect(screen.getAllByRole('img')).toHaveLength(4)
})

it('ends an active drag when the page hides, motion mode changes, or keyboard focus opens', () => {
  for (const reason of ['hidden', 'reduced', 'focus']) {
    let hidden = false
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    const view = setup(); tick(2)
    const shell = view.container.querySelector<HTMLElement>('.site-shell')!
    const stage = view.container.querySelector<HTMLElement>('.paper-gallery__stage')!
    shell.scrollTop = 2520; fireEvent.scroll(shell); tick(80)
    const release = vi.fn()
    Object.assign(stage, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: release })
    fireEvent.pointerDown(stage, { button: 0, buttons: 1, clientY: 400 })
    fireEvent.pointerMove(window, { buttons: 1, clientY: 300 }); tick(2)
    if (reason === 'hidden') { hidden = true; fireEvent(document, new Event('visibilitychange')) }
    else if (reason === 'reduced') {
      const media = mediaRecords.filter(record => record.query.includes('reduced-motion')).at(-1)!
      media.matches = true; act(() => media.addEventListener.mock.calls[0][1]())
    } else fireEvent.keyDown(view.container.querySelector('[data-paper]')!, { key: 'Enter' })
    expect(release).toHaveBeenCalledTimes(1)
    expect(view.container.querySelector('#projects')).toHaveAttribute('data-dragging', 'false')
    view.unmount(); hidden = false
  }
})

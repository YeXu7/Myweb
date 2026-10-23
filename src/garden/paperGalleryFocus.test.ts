import { describe, expect, it } from 'vitest'
import { advanceFocus, focusLayout, paperPresentation, advancePaperEmphasis, paperEmphasisTargets } from './paperGalleryFocus'
import { paperPool, resolvePaperEntry } from './paperGalleryLoop'
import { paperSequence, paperRenderOrder } from './paperGalleryInteraction'

describe('shared paper focus poses', () => {
  it('fits the original aspect in a centered 65vw cover with room for controls', () => {
    for (const [w, h] of [[1440, 900], [1280, 720], [390, 844], [844, 390]]) {
      for (const aspect of [1920 / 1080, 1672 / 941]) {
        const target = focusLayout(w, h, aspect)
        expect(target.width).toBeLessThanOrEqual(w * (w < 700 ? .88 : .65))
        expect(target.height).toBeCloseTo(target.width / aspect)
        expect(target.top).toBeGreaterThanOrEqual(24)
        expect(target.top + target.height + 136).toBeLessThanOrEqual(h)
      }
    }
  })
  it('starts at the exact current hover/idle pose and reverses continuously', () => {
    const snapshot = { phase: 1.2, scales: [1, 1.37, 1, 1], flutter: 4, idleTime: 2.3 }
    const normal = paperPresentation(paperSequence[3], 1280, 720, 1672 / 941, snapshot)
    expect(paperPresentation(paperSequence[3], 1280, 720, 1672 / 941, snapshot, { index: 1, progress: 0 })).toEqual(normal)
    const progress = advanceFocus(.35, false, 16)
    expect(progress).toBeLessThan(.35)
    expect(progress).toBeGreaterThan(0)
    const target = paperPresentation(paperSequence[3], 1280, 720, 1672 / 941, snapshot, { index: 1, progress: 1 })
    expect(target.rotateX).toBeCloseTo(0); expect(target.rotateY).toBeCloseTo(0); expect(target.rotateZ).toBeCloseTo(0)
    expect(target.bend).toBe(0); expect(target.flutter).toBeCloseTo(0)
    expect(target.width * target.scale).toBeCloseTo(832)
    expect(paperPresentation(paperSequence[0], 1280, 720, 16 / 9, snapshot, { index: 1, progress: 1 }).opacity).toBe(0)
  })
  it('floats slowly out of phase without changing the queue scale', () => {
    const state = { phase: 0, scales: [1.5, 1, 1, 1], flutter: 0, idleTime: 1 }
    const a = paperPresentation(paperSequence[1], 1280, 720, 16 / 9, state)
    const b = paperPresentation(paperSequence[1], 1280, 720, 16 / 9, { ...state, idleTime: 2 })
    expect(a.scale).toBe(1.5); expect(b.scale).toBe(1.5)
    expect(a.y).not.toBe(b.y)
    expect(Math.abs(a.y - b.y)).toBeLessThan(6)
  })
})


describe('handwritten gallery emphasis', () => {
  it('smoothly approaches and reverses opaque emphasis without jumps', () => {
    let amount = advancePaperEmphasis(0, 1, 16)
    expect(amount).toBeGreaterThan(0); expect(amount).toBeLessThan(1)
    expect(advancePaperEmphasis(amount, 0, 16)).toBeLessThan(amount)
    for (let frame = 0; frame < 100; frame++) amount = advancePaperEmphasis(amount, 1, 16)
    expect(amount).toBe(1)
  })
  it('keeps dimmed covers opaque and freezes brightness, separation and clarity through focus', () => {
    const state = { phase: 1.5, scales: [1, 1.5, 1, 1], flutter: 0, idleTime: 2,
      emphasis: { dimming: [1, 1, 1, 0, 1, 1, 1, 1, 1], spacing: [.0, .0, .12, 0, -.12, 0, 0, 0, 0], clarity: [0, 1, 0, 0] } }
    paperSequence.forEach((entry, i) => {
      const normal = paperPresentation(entry, 1280, 720, 16 / 9, state)
      expect(normal.opacity).toBe(1)
      expect(normal.brightness).toBeCloseTo(i === 3 ? 1 : .3)
      expect(normal.rimBrightness).toBeCloseTo(i === 3 ? 1 : .18)
      expect(paperPresentation(entry, 1280, 720, 16 / 9, state, { index: 1, progress: 0 })).toEqual(normal)
      const end = paperPresentation(entry, 1280, 720, 16 / 9, state, { index: 1, progress: 1 })
      expect(end.opacity).toBe(entry.projectIndex === 1 ? 1 : 0)
      if (entry.projectIndex === 1) { expect(end.brightness).toBe(1); expect(end.clarity).toBe(1) }
    })
    const baseline = { ...state, emphasis: undefined }
    const selected = paperPresentation(paperSequence[3], 1280, 720, 16 / 9, state)
    const original = paperPresentation(paperSequence[3], 1280, 720, 16 / 9, baseline)
    expect(selected.x).toBe(original.x); expect(selected.y).toBe(original.y)
    const front = paperPresentation(paperSequence[2], 1280, 720, 16 / 9, state)
    const frontOrigin = paperPresentation(paperSequence[2], 1280, 720, 16 / 9, baseline)
    expect(front.x).toBeLessThan(frontOrigin.x); expect(front.y).toBeGreaterThan(frontOrigin.y)
    expect(Math.hypot(front.x - frontOrigin.x, front.y - frontOrigin.y)).toBeCloseTo(front.width * .12)
  })
  it('has a visible but slow breeze with bounded translation, lean and paper edge amplitude', () => {
    const state = { phase: 0, scales: [1, 1, 1, 1], flutter: 0, idleTime: 0 }
    const poses = Array.from({ length: 200 }, (_, i) => paperPresentation(paperSequence[1], 1280, 720, 16 / 9, { ...state, idleTime: i * .1 }))
    const range = (key: 'x' | 'y' | 'rotateY' | 'flutter') => Math.max(...poses.map(p => p[key])) - Math.min(...poses.map(p => p[key]))
    expect(range('x')).toBeGreaterThan(10); expect(range('x')).toBeLessThan(15)
    expect(range('y')).toBeGreaterThan(16); expect(range('y')).toBeLessThan(20)
    expect(range('rotateY')).toBeGreaterThan(.04); expect(range('rotateY')).toBeLessThan(.06)
    expect(range('flutter')).toBeGreaterThan(7)
  })
})

it('separates only actual neighbouring occurrences across loop seams without changing natural order', () => {
  for (const phase of [3.9, 4.1, 7.9, 8.1, 19.5]) {
    for (let selected = 0; selected < 8; selected++) {
      const emphasis = paperEmphasisTargets(phase, selected)
      const slot = resolvePaperEntry(paperPool[selected * 2 + 1], phase).slot
      expect(emphasis.spacing[selected * 2 + 1]).toBe(0)
      expect(emphasis.clarity.filter(Boolean)).toHaveLength(1)
      paperPool.forEach((base, i) => {
        const entry = resolvePaperEntry(base, phase)
        const distance = slot - entry.slot
        expect(Math.abs(emphasis.spacing[i])).toBeLessThanOrEqual(.12)
        if (Math.abs(distance) >= 1.5) expect(Math.abs(emphasis.spacing[i])).toBe(0)
        else if (distance) expect(Math.sign(emphasis.spacing[i])).toBe(Math.sign(distance))
        const state = { phase, scales: Array(8).fill(1), flutter: 0, idleTime: 3 }
        const original = paperPresentation(entry, 1280, 720, 16 / 9, state)
        const shifted = paperPresentation(entry, 1280, 720, 16 / 9, { ...state, emphasis })
        expect(shifted.z).toBe(original.z)
        expect(shifted.opacity).toBe(original.opacity)
        expect(paperRenderOrder(entry, phase, selected, 1.5)).toBe(paperRenderOrder(entry, phase))
      })
    }
  }
})

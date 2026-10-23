import { describe, expect, it } from 'vitest'
import { galleryPhase, paperPose } from './paperGalleryMotion'
import { loopGalleryPhase, paperPool, resolvePaperEntry, wheelPixels, applyGalleryDelta } from './paperGalleryLoop'

describe('bounded repeating paper queue', () => {
  it('preserves every first-cycle hold and extends the tail continuously in both directions', () => {
    for (let i = 0; i <= 100; i++) expect(loopGalleryPhase(i / 100)).toBe(galleryPhase(i / 100))
    expect(loopGalleryPhase(1.12)).toBeCloseTo(4)
    expect(loopGalleryPhase(1.36)).toBeCloseTo(5)
    expect(loopGalleryPhase(1 + .24 * 40)).toBeCloseTo(43)
    expect(loopGalleryPhase(1 + 1e-8) - loopGalleryPhase(1)).toBeLessThan(.001)
    expect(loopGalleryPhase(-1)).toBe(-1)
  })
  it('keeps two occurrences per project, never invents a previous cycle and recycles only invisible sheets', () => {
    expect(paperPool).toHaveLength(16)
    expect(paperPool.filter(p => p.projectIndex === 0)).toHaveLength(2)
    expect(paperPool.map(p => resolvePaperEntry(p, -1).slot)).toEqual(paperPool.map(p => p.slot))
    for (let phase = -1; phase < 50; phase += .01) {
      const slots = paperPool.map(p => resolvePaperEntry(p, phase).slot)
      expect(new Set(slots).size).toBe(16)
      for (const entry of paperPool) {
        const a = resolvePaperEntry(entry, phase), b = resolvePaperEntry(entry, phase + .01)
        if (a.slot !== b.slot) {
          expect(paperPose(phase - a.slot, 1280, 720).opacity).toBe(0)
          expect(paperPose(phase + .01 - b.slot, 1280, 720).opacity).toBe(0)
        }
      }
    }
  })
  it('normalizes wheel modes and shares native/overflow input including reverse remainder', () => {
    expect(wheelPixels(3, 1, 720)).toBe(48)
    expect(wheelPixels(1, 2, 720)).toBe(720)
    expect(wheelPixels(72, 0, 720)).toBe(72)
    expect(applyGalleryDelta(2500, 0, 100, 2520)).toEqual({ native: 2520, overflow: 80 })
    expect(applyGalleryDelta(2520, 80, -130, 2520)).toEqual({ native: 2470, overflow: 0 })
    expect(applyGalleryDelta(10, 0, -100, 2520)).toEqual({ native: 0, overflow: 0 })
  })
})

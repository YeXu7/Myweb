import { describe, expect, it } from 'vitest'
import { paperSequence, advancePaperScale, paperRenderOrder, captionPlacement } from './paperGalleryInteraction'

describe('paper gallery interaction', () => {
  it('interleaves five decorative sheets without changing the four project positions', () => {
    expect(paperSequence.map(p => p.projectIndex)).toEqual([null, 0, null, 1, null, 2, null, 3, null])
    expect(paperSequence.map(p => p.slot)).toEqual([-.5, 0, .5, 1, 1.5, 2, 2.5, 3, 3.5])
    expect(paperSequence.filter(p => p.projectIndex !== null).map(p => p.slot)).toEqual([0, 1, 2, 3])
  })
  it('smoothly reaches exactly 1.5x and returns to exactly its original size', () => {
    let scale = 1
    scale = advancePaperScale(scale, true, 16)
    expect(scale).toBeGreaterThan(1)
    expect(scale).toBeLessThan(1.5)
    for (let i = 0; i < 100; i++) scale = advancePaperScale(scale, true, 16)
    expect(scale).toBe(1.5)
    expect(advancePaperScale(scale, false, 16)).toBeLessThan(scale)
    for (let i = 0; i < 100; i++) scale = advancePaperScale(scale, false, 16)
    expect(scale).toBe(1)
  })
  it('stacks all nine sheets in sequence in both scroll directions regardless of type', () => {
    const phases = [-1, 0, .5, 1, 2, 3]
    for (const phase of [...phases, ...phases.reverse()]) {
      const orders = paperSequence.map(p => paperRenderOrder(p, phase, null))
      expect(orders.every((order, i) => i === 0 || orders[i - 1] > order)).toBe(true)
      expect(paperSequence.map(p => paperRenderOrder(p, phase, 1, 1.5))).toEqual(orders)
    }
  })
  it('keeps hovered and shrinking projects in their natural slots', () => {
    for (const scale of [1, 1.1, 1.3, 1.5]) {
      const orders = paperSequence.map(p => paperRenderOrder(p, 1, 1, scale))
      expect(orders.every((order, i) => i === 0 || orders[i - 1] > order)).toBe(true)
      expect(orders).toEqual(paperSequence.map(p => paperRenderOrder(p, 1, null)))
    }
  })
  it('places information below the expanded paper with a clear gap', () => {
    const paper = { left: 425, right: 855, top: 200, bottom: 510 }
    const caption = captionPlacement(1280, 720, 320, 76, paper)
    expect(caption.top).toBeGreaterThanOrEqual(paper.bottom + 24)
    expect(caption.top + 76).toBeLessThanOrEqual(700)
  })
  it('uses free side space on a short screen instead of cropping information', () => {
    const paper = { left: 430, right: 850, top: 70, bottom: 330 }
    const caption = captionPlacement(1280, 400, 240, 56, paper)
    expect(caption.top + 56).toBeLessThanOrEqual(380)
    expect(caption.left + 120 <= paper.left - 24 || caption.left - 120 >= paper.right + 24).toBe(true)
  })
  it('does not move centered information when the enlarged side paper does not overlap it', () => {
    const paper = { left: 1000, right: 1380, top: 400, bottom: 700 }
    expect(captionPlacement(1280, 720, 320, 76, paper)).toEqual(captionPlacement(1280, 720, 320, 76, null))
  })
})

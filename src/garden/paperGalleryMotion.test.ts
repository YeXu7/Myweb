import { describe, expect, it } from 'vitest'
import { galleryPhase, paperPose, paperWidth, advancePaperPhase, advancePaperFlex } from './paperGalleryMotion'

describe('native-scroll paper gallery', () => {
  it('holds each project still across a real scroll interval', () => {
    for (let i = 0; i < 4; i++) {
      const start = 0.12 + i * 0.24
      expect(galleryPhase(start + 0.015)).toBe(i)
      expect(galleryPhase(start + 0.09)).toBe(i)
    }
  })
  it('moves in order without wrapping and retraces exactly when scrolling back', () => {
    const inputs = Array.from({ length: 101 }, (_, i) => i / 100)
    const forward = inputs.map(galleryPhase)
    expect([...inputs].reverse().map(galleryPhase).reverse()).toEqual(forward)
    expect(forward.every((p, i) => i === 0 || p >= forward[i - 1])).toBe(true)
    expect(galleryPhase(-1)).toBe(-1)
    expect(galleryPhase(2)).toBe(3)
  })
  it('keeps transition boundaries continuous', () => {
    for (const p of [0.12, 0.24, 0.36, 0.48, 0.60, 0.72, 0.84]) {
      expect(Math.abs(galleryPhase(p + 0.00001) - galleryPhase(p - 0.00001))).toBeLessThan(0.001)
    }
  })
  it('brings papers from lower right, then sends them toward upper left', () => {
    const before = paperPose(-1, 1280, 720)
    const focus = paperPose(0, 1280, 720)
    const after = paperPose(1, 1280, 720)
    expect(before.x).toBeGreaterThan(focus.x)
    expect(before.y).toBeLessThan(focus.y) // Three.js y points up
    expect(after.x).toBeLessThan(focus.x)
    expect(after.y).toBeGreaterThan(focus.y)
    expect(before.z).toBeLessThan(focus.z)
    expect(after.z).toBeGreaterThan(focus.z)
    expect(Math.abs(focus.rotateY)).toBeGreaterThan(0.2)
    expect(focus.opacity).toBe(1)
    expect(paperPose(4, 1280, 720).opacity).toBe(0)
  })
  it('keeps desktop paper compact and legible on small screens', () => {
    expect(paperWidth(1440, 900)).toBeLessThan(1440 * 0.25)
    expect(paperWidth(390, 700)).toBeGreaterThan(240)
    expect(paperWidth(1280, 400) * 9 / 16).toBeLessThan(400 * 0.4)
  })
  it('settles without overshoot at each hold and reverses without a jump', () => {
    const next = advancePaperPhase(0, 1, 16)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(1)
    expect(advancePaperPhase(next, 0, 16)).toBeLessThan(next)
    let phase = 0
    for (let i = 0; i < 100; i++) phase = advancePaperPhase(phase, 1, 16)
    expect(phase).toBe(1)
  })
  it('responds to scroll strength even while the project remains in its focus hold', () => {
    expect(galleryPhase(0.14)).toBe(galleryPhase(0.16))
    const rest = { bend: 0, velocity: 0 }
    const gentle = advancePaperFlex(rest, 0.25, 16)
    const firm = advancePaperFlex(rest, 1, 16)
    const reverse = advancePaperFlex(rest, -1, 16)
    expect(gentle.bend).toBeGreaterThan(0)
    expect(firm.bend).toBeGreaterThan(gentle.bend)
    expect(reverse.bend).toBeCloseTo(-firm.bend)
  })
  it('gives the paper a small recoil and comes fully to rest after scrolling stops', () => {
    let flex = { bend: 0, velocity: 0 }
    for (let i = 0; i < 18; i++) flex = advancePaperFlex(flex, 1, 16)
    expect(flex.bend).toBeGreaterThan(4)
    const resting = []
    for (let i = 0; i < 120; i++) {
      flex = advancePaperFlex(flex, 0, 16)
      resting.push(flex.bend)
    }
    expect(Math.min(...resting)).toBeLessThan(0)
    expect(Math.max(...resting)).toBeLessThan(16)
    expect(flex).toEqual({ bend: 0, velocity: 0 })
  })
  it('keeps paper flex consistent across frame rates and bounded for fast scrolls', () => {
    const simulate = (dt: number) => {
      let flex = { bend: 0, velocity: 0 }
      for (let time = 0; time < 480; time += dt) flex = advancePaperFlex(flex, 20, dt)
      return flex.bend
    }
    expect(simulate(16)).toBeCloseTo(simulate(8), 1)
    expect(simulate(16)).toBeLessThan(16)
  })
})

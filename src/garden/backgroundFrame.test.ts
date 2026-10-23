import { describe, expect, it } from 'vitest'
import { backgroundFrame } from './backgroundFrame'

describe('panorama background framing', () => {
  it('calibrates the original artwork region without stretching, including its asymmetric vertical origin', () => {
    const originalAspect = 1672 / 941
    const referenceWidth = originalAspect * 640
    for (const [w, h] of [[1440, 900], [1280, 720], [390, 844], [844, 390], [3840, 1080]]) {
      const first = backgroundFrame(w, h, 0, h * 2.8, false)
      const visibleWidth = referenceWidth * Math.min(1, w / h / originalAspect)
      const visibleHeight = 640 * Math.min(1, originalAspect / (w / h))
      expect(first.crop.x * 2191).toBeCloseTo(6 + (referenceWidth - visibleWidth) / 2)
      expect(first.crop.width * 2191).toBeCloseTo(visibleWidth)
      expect(first.crop.height * 718).toBeCloseTo(visibleHeight)
      expect((1 - first.crop.y - first.crop.height) * 718).toBeCloseTo((640 - visibleHeight) / 2)
      for (let i = 0; i <= 40; i++) {
        const frame = backgroundFrame(w, h, h * i / 10, h * 2.8, false)
        expect(frame.crop.x).toBeGreaterThanOrEqual(0)
        expect(frame.crop.x + frame.crop.width).toBeLessThanOrEqual(1.00000001)
        expect(frame.crop.y).toBeGreaterThanOrEqual(0)
        expect(frame.crop.y + frame.crop.height).toBeLessThanOrEqual(1.00000001)
        expect(frame.crop.width * 2191 / (frame.crop.height * 718)).toBeCloseTo(w / h)
        expect(frame.imageWidth / frame.imageHeight).toBeCloseTo(2191 / 718)
        expect(-frame.imageX / frame.imageWidth).toBeCloseTo(frame.crop.x)
        expect(-frame.imageY / frame.imageHeight).toBeCloseTo(1 - frame.crop.y - frame.crop.height)
      }
      const last = backgroundFrame(w, h, h * 2.9, h * 2.8, false)
      const screenTravel = (last.crop.x - first.crop.x) / first.crop.width
      expect(screenTravel).toBeGreaterThanOrEqual(.35 - 1e-9)
      expect(screenTravel).toBeLessThanOrEqual(.7 + 1e-9)
      if (w >= 1280) expect(screenTravel).toBeCloseTo(.7)
      if (w <= 390) expect(screenTravel).toBeCloseTo(.35)
    }
    const portrait = backgroundFrame(390, 844, 0, 844 * 2.8, false)
    expect(portrait.imageY).toBeCloseTo(0)
    expect(portrait.crop.y).toBeGreaterThan(0)
  })
  it('keeps the longer reading journey clear, overlaps the final pan with late zoom and blur, and reverses exactly', () => {
    const at = (progress: number) => backgroundFrame(1280, 720, progress * 720, 720 * 2.8, false)
    for (const p of [0, .5, 1, 1.75, 2, 2.2]) { expect(at(p).defocus).toBeCloseTo(0); expect(at(p).innerScale).toBeCloseTo(1) }
    expect(at(2.5).defocus).toBeGreaterThan(0); expect(at(2.5).defocus).toBeLessThan(1)
    expect(at(2.5).crop.x).toBeGreaterThan(at(2.2).crop.x)
    expect(at(2.9).crop.x).toBeGreaterThan(at(2.5).crop.x)
    expect(at(2.9).defocus).toBeCloseTo(1); expect(at(2.9).innerScale).toBeCloseTo(1.24)
    expect(at(2.9).innerY).toBeCloseTo(-720 * .12); expect(at(2.9).outerScale).toBeCloseTo(1.014)
    expect(at(20).crop).toEqual(at(2.9).crop)
    const middle = at(1.6); at(2.9); expect(at(1.6)).toEqual(middle)
  })
  it('uses measured chapter boundaries and suppresses reduced-motion pan and zoom', () => {
    const first = backgroundFrame(390, 844, 0, 2500, true)
    const last = backgroundFrame(390, 844, 4000, 2500, true)
    expect(last.crop).toEqual(first.crop); expect(last.innerScale).toBe(1); expect(last.innerY).toBeCloseTo(0); expect(last.outerScale).toBe(1)
    expect(last.defocus).toBe(1)
    expect(backgroundFrame(390, 844, 2500 - .6 * 844, 2500, false).defocus).toBe(0)
  })
  it('protects text only while exploring and removes that protection before Projects', () => {
    const at = (progress: number, reduced = false) => backgroundFrame(1280, 720, progress * 720, 720 * 2.8, reduced)
    expect(at(0).readingShade).toBe(0)
    expect(at(1.6).readingShade).toBeGreaterThan(.7)
    expect(at(2.2).readingShade).toBeCloseTo(1)
    expect(at(2.5).readingShade).toBeGreaterThan(0)
    expect(at(2.5).readingShade).toBeLessThan(1)
    expect(at(2.8).readingShade).toBeCloseTo(0)
    expect(at(10).readingShade).toBe(0)
    expect(at(1.6, true).readingShade).toBe(0)
  })
})

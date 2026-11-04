import { describe, expect, it } from 'vitest'
import { backgroundFrame } from './backgroundFrame'
import { readingJourney } from './readingJourney'
const end = readingJourney.totalScreens
const clear = end - readingJourney.exitScreens
const settled = end + readingJourney.revealTailScreens
const exiting = (clear + end) / 2

describe('panorama background framing', () => {
  it('calibrates the original artwork region without stretching, including its asymmetric vertical origin', () => {
    const originalAspect = 1672 / 941
    const referenceWidth = originalAspect * 640
    for (const [w, h] of [[1440, 900], [1280, 720], [390, 844], [844, 390], [3840, 1080]]) {
      const first = backgroundFrame(w, h, 0, h * end, false)
      const visibleWidth = referenceWidth * Math.min(1, w / h / originalAspect)
      const visibleHeight = 640 * Math.min(1, originalAspect / (w / h))
      expect(first.crop.x * 2191).toBeCloseTo(6 + (referenceWidth - visibleWidth) / 2)
      expect(first.crop.width * 2191).toBeCloseTo(visibleWidth)
      expect(first.crop.height * 718).toBeCloseTo(visibleHeight)
      expect((1 - first.crop.y - first.crop.height) * 718).toBeCloseTo((640 - visibleHeight) / 2)
      for (let i = 0; i <= 40; i++) {
        const frame = backgroundFrame(w, h, h * i / 10, h * end, false)
        expect(frame.crop.x).toBeGreaterThanOrEqual(0)
        expect(frame.crop.x + frame.crop.width).toBeLessThanOrEqual(1.00000001)
        expect(frame.crop.y).toBeGreaterThanOrEqual(0)
        expect(frame.crop.y + frame.crop.height).toBeLessThanOrEqual(1.00000001)
        expect(frame.crop.width * 2191 / (frame.crop.height * 718)).toBeCloseTo(w / h)
        expect(frame.imageWidth / frame.imageHeight).toBeCloseTo(2191 / 718)
        expect(-frame.imageX / frame.imageWidth).toBeCloseTo(frame.crop.x)
        expect(-frame.imageY / frame.imageHeight).toBeCloseTo(1 - frame.crop.y - frame.crop.height)
      }
      const last = backgroundFrame(w, h, h * settled, h * end, false)
      const screenTravel = (last.crop.x - first.crop.x) / first.crop.width
      expect(screenTravel).toBeGreaterThanOrEqual(.35 - 1e-9)
      expect(screenTravel).toBeLessThanOrEqual(.7 + 1e-9)
      if (w >= 1280) expect(screenTravel).toBeCloseTo(.7)
      if (w <= 390) expect(screenTravel).toBeCloseTo(.35)
    }
    const portrait = backgroundFrame(390, 844, 0, 844 * end, false)
    expect(portrait.imageY).toBeCloseTo(0)
    expect(portrait.crop.y).toBeGreaterThan(0)
  })
  it('keeps the approved reading interval clear, overlaps the final pan with late zoom and blur, and reverses exactly', () => {
    const at = (progress: number) => backgroundFrame(1280, 720, progress * 720, 720 * end, false)
    for (const p of [0, .5, 1, 1.5, clear]) { expect(at(p).defocus).toBeCloseTo(0); expect(at(p).innerScale).toBeCloseTo(1) }
    expect(at(exiting).defocus).toBeGreaterThan(0); expect(at(exiting).defocus).toBeLessThan(1)
    expect(at(exiting).crop.x).toBeGreaterThan(at(clear).crop.x)
    expect(at(settled).crop.x).toBeGreaterThan(at(exiting).crop.x)
    expect(at(settled).defocus).toBeCloseTo(1); expect(at(settled).innerScale).toBeCloseTo(1.24)
    expect(at(settled).innerY).toBeCloseTo(-720 * .12); expect(at(settled).outerScale).toBeCloseTo(1.014)
    expect(at(20).crop).toEqual(at(settled).crop)
    const middle = at(1.6); at(settled); expect(at(1.6)).toEqual(middle)
  })
  it('uses measured chapter boundaries and suppresses reduced-motion pan and zoom', () => {
    const first = backgroundFrame(390, 844, 0, 2500, true)
    const last = backgroundFrame(390, 844, 4000, 2500, true)
    expect(last.crop).toEqual(first.crop); expect(last.innerScale).toBe(1); expect(last.innerY).toBeCloseTo(0); expect(last.outerScale).toBe(1)
    expect(last.defocus).toBe(1)
    expect(backgroundFrame(390, 844, 2500 - readingJourney.exitScreens * 844, 2500, false).defocus).toBe(0)
  })
  it('protects text only while exploring and removes that protection before Projects', () => {
    const at = (progress: number, reduced = false) => backgroundFrame(1280, 720, progress * 720, 720 * end, reduced)
    expect(at(0).readingShade).toBe(0)
    expect(at(1.6).readingShade).toBeGreaterThan(.7)
    expect(at(clear).readingShade).toBeCloseTo(1)
    expect(at(exiting).readingShade).toBeGreaterThan(0)
    expect(at(exiting).readingShade).toBeLessThan(1)
    expect(at(end).readingShade).toBeCloseTo(0)
    expect(at(10).readingShade).toBe(0)
    expect(at(1.6, true).readingShade).toBe(0)
  })
})


it('keeps the full natural-flow About clear while continuing pan, then blurs only in Projects', () => {
  for (const projectTop of [4200, 6800]) {
    const at = (scroll: number) => backgroundFrame(1440, 800, scroll, projectTop, false, 800, true)
    expect(at(2800).crop.x).toBeGreaterThan(at(2000).crop.x)
    for (const scroll of [0, 2000, 2800, projectTop - 1, projectTop]) {
      expect(at(scroll).defocus).toBe(0); expect(at(scroll).innerScale).toBe(1)
    }
    expect(at(projectTop + 280).defocus).toBeGreaterThan(0)
    expect(at(projectTop + 800).defocus).toBe(1)
    const back = at(2800); at(projectTop + 800); expect(at(2800)).toEqual(back)
  }
})

it('softens only after Capabilities reaches the upper third and settles before the timed gallery reveal', () => {
  const height = 900, bottom = 4800, projectTop = 4900, start = bottom - height / 3
  const at = (scroll: number) => backgroundFrame(1440, height, scroll, projectTop, false, height, true, start)
  expect(at(start - 1).defocus).toBe(0)
  expect(at(start + 100).defocus).toBeGreaterThan(0)
  expect(at(projectTop).defocus).toBe(1)
  expect(at(start - 1).defocus).toBe(0)
})

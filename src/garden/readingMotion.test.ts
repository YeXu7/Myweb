import { describe, expect, it } from 'vitest'
import { createReadingMotion } from './readingMotion'

describe('continuous native reading travel', () => {
  it.each([0, .001, 100, 400, 679.999, 680])('never reverses or overshoots with a first-paragraph travel of %s', firstTravel => {
    const at = createReadingMotion(800, 2240, 400, firstTravel, 680)
    expect(at(-100)).toBe(0)
    expect(at(800)).toBeCloseTo(firstTravel)
    expect(at(1760)).toBeCloseTo(680)
    expect(at(2240)).toBe(1060)
    expect(at(5000)).toBe(1060)
    let previous = 0
    for (let scroll = 0; scroll <= 2240; scroll += 2) {
      const value = at(scroll)
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9)
      expect(value).toBeLessThanOrEqual(1060)
      previous = value
    }
    for (const join of [0, 800, 1760, 2240]) {
      const step = .001
      const left = (at(join) - at(join - step)) / step
      const right = (at(join + step) - at(join)) / step
      expect(Math.abs(left - right)).toBeLessThan(.001)
    }
  })
})

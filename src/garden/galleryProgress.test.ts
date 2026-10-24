import { describe, expect, it } from 'vitest'
import { galleryProgress } from './galleryProgress'

describe('four equal project quarters', () => {
  it('fills exactly one quarter per held project, including repeated cycles', () => {
    for (const [scroll, project, fill] of [[0, 0, .25], [.18, 0, .25], [.42, 1, .5], [.66, 2, .75], [.9, 3, 1], [1.18, 0, .25], [1.42, 1, .5], [1.66, 2, .75], [1.9, 3, 1]]) {
      expect(galleryProgress(scroll)).toEqual({ project, fill })
    }
  })
  it('advances uniformly for equal scroll increments within every non-wrapping transition', () => {
    for (const start of [.24, .48, .72, 1.24, 1.48, 1.72]) {
      const values = [0, .03, .06, .09, .12].map(offset => galleryProgress(start + offset).fill)
      for (let i = 1; i < values.length; i++) expect(values[i] - values[i - 1]).toBeCloseTo(.0625)
    }
  })
  it('reverses exactly and resets the full track alongside the ordinal at the loop boundary', () => {
    const inputs = [.12, .27, .36, .55, .84, 1.059, 1.061, 1.18, 1.35, 1.97, 2.019, 2.021]
    const forward = inputs.map(galleryProgress)
    expect([...inputs].reverse().map(galleryProgress).reverse()).toEqual(forward)
    expect(galleryProgress(1.059)).toEqual({ project: 3, fill: 1 })
    expect(galleryProgress(1.061)).toEqual({ project: 0, fill: .25 })
    expect(galleryProgress(2.019)).toEqual({ project: 3, fill: 1 })
    expect(galleryProgress(2.021)).toEqual({ project: 0, fill: .25 })
  })
})

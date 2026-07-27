import { describe, expect, it } from 'vitest'
import {
  calculatePointerVelocity,
  magneticFalloff,
  normalizePointer,
  textSafeAttenuation,
} from './interaction'

describe('digital garden interaction math', () => {
  it('normalizes pointer coordinates into WebGL space', () => {
    expect(normalizePointer(0, 0, 1000, 500)).toEqual({ x: -1, y: 1 })
    expect(normalizePointer(500, 250, 1000, 500)).toEqual({ x: 0, y: 0 })
    expect(normalizePointer(1000, 500, 1000, 500)).toEqual({ x: 1, y: -1 })
  })

  it('clamps pointer velocity to a stable interaction range', () => {
    expect(calculatePointerVelocity(0, 0, 8, 6, 16)).toBeCloseTo(0.625)
    expect(calculatePointerVelocity(0, 0, 200, 0, 16)).toBe(1)
  })

  it('fades magnetic influence smoothly across the field radius', () => {
    expect(magneticFalloff(0, 240)).toBe(1)
    expect(magneticFalloff(120, 240)).toBeCloseTo(0.5)
    expect(magneticFalloff(240, 240)).toBe(0)
  })

  it('reduces distortion inside the left-center text safe zone', () => {
    expect(textSafeAttenuation({ x: 0.2, y: 0.5 })).toBeLessThan(0.3)
    expect(textSafeAttenuation({ x: 0.85, y: 0.5 })).toBeGreaterThan(0.9)
  })
})

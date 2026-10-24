import { expect, it } from 'vitest'
import { createPointerTrail } from './pointerTrail'

const energy = (data: ArrayLike<number>) => Array.from(data).reduce((sum, value, i) => sum + (i % 4 < 2 ? Math.abs(value - 128) : 0), 0)
const patchEnergy = (trail: ReturnType<typeof createPointerTrail>, time: number, x: number, y: number) => {
  const data = trail.sample(time)
  const offset = (Math.floor(y * trail.height) * trail.width + Math.floor(x * trail.width)) * 4
  return Math.hypot(data[offset] - 128, data[offset + 1] - 128)
}

it('retains an obvious continuous wake for 1.4 seconds and fully expires by two seconds', () => {
  const trail = createPointerTrail()
  trail.move(.55, .5, 0); trail.move(.9, .5, 40)
  const initial = energy(trail.sample(40))
  expect(initial).toBeGreaterThan(1000)
  expect(patchEnergy(trail, 40, .65, .52)).toBeGreaterThan(20)
  expect(patchEnergy(trail, 1440, .65, .52)).toBeGreaterThan(8)
  trail.move(.9, .5, 1500)
  expect(energy(trail.sample(1600))).toBeLessThan(initial)
  expect(energy(trail.sample(2040))).toBe(0)
})

it('keeps early path points through many later events without unbounded storage or force', () => {
  const trail = createPointerTrail()
  for (let i = 0; i <= 70; i++) trail.move(.5 + i * .006, .5, i * 16)
  expect(patchEnergy(trail, 1120, .55, .52)).toBeGreaterThan(8)
  const data = trail.sample(1120)
  expect(data.length).toBe(trail.width * trail.height * 4)
  expect(data.length).toBeLessThanOrEqual(128 * 80 * 4)
  for (let i = 0; i < 60; i++) trail.move(.65 + (i % 2) * .15, .5, 1136 + i * 16)
  const crossed = trail.sample(2100)
  for (let i = 0; i < crossed.length; i += 4) expect(Math.hypot(crossed[i] - 128, crossed[i + 1] - 128)).toBeLessThanOrEqual(128)
})

it('breaks continuity across quiet zones, leave and idle, and clears every trace', () => {
  const trail = createPointerTrail()
  trail.move(.5, .3, 0); trail.move(.7, .3, 40)
  trail.breakPath(); trail.move(.9, .8, 80)
  expect(patchEnergy(trail, 80, .8, .55)).toBe(0)
  trail.move(.5, .8, 400)
  expect(patchEnergy(trail, 400, .7, .8)).toBe(0)
  trail.clear()
  expect(energy(trail.sample(400))).toBe(0)
  trail.move(.6, .5, 420)
  expect(energy(trail.sample(420))).toBe(0)
})

it('reuses the upload buffer, skips unchanged uploads and resets on viewport aspect changes', () => {
  const trail = createPointerTrail()
  const empty = trail.sample(0), version = trail.version
  expect(trail.sample(100)).toBe(empty)
  expect(trail.version).toBe(version)
  trail.move(.6, .5, 100); trail.move(.8, .5, 140)
  expect(energy(trail.sample(140))).toBeGreaterThan(0)
  const changed = trail.version
  expect(changed).toBeGreaterThan(version)
  expect(trail.sample(140)).toBe(empty)
  expect(trail.version).toBe(changed)
  trail.setAspect(1.8)
  expect(energy(trail.sample(140))).toBe(0)
  expect(trail.sample(140)).toBe(empty)
})

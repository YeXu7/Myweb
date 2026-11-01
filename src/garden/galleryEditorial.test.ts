import { expect, it } from 'vitest'
import { galleryEditorialMotion, galleryIndexMotion } from './galleryEditorial'

it('reveals title then date with scroll, reverses exactly and holds through later loops', () => {
  const start = galleryEditorialMotion(-100, 800, false)
  const middle = galleryEditorialMotion(80, 800, false)
  const end = galleryEditorialMotion(300, 800, false)
  expect(start.titleY).toBe(115)
  expect(middle.titleY).toBeGreaterThan(0)
  expect(middle.titleY).toBeLessThan(middle.dateY)
  expect(end).toMatchObject({ titleY: 0, dateY: 0, groupY: 0 })
  expect(galleryEditorialMotion(50000, 800, false)).toEqual(end)
  expect(galleryEditorialMotion(80, 800, false)).toEqual(middle)
  expect(galleryEditorialMotion(-100, 800, true)).toEqual(end)
})


it('moves the entire index upward only after chapter entry, follows scroll and reverses', () => {
  expect(galleryIndexMotion(-80, 800, false)).toEqual({ y: 96, opacity: 0 })
  expect(galleryIndexMotion(0, 800, false)).toEqual({ y: 96, opacity: 0 })
  const middle = galleryIndexMotion(80, 800, false)
  expect(middle.y).toBeGreaterThan(0)
  expect(middle.y).toBeLessThan(96)
  expect(middle.opacity).toBeGreaterThan(0)
  expect(middle.opacity).toBeLessThan(1)
  expect(galleryIndexMotion(288, 800, false)).toEqual({ y: 0, opacity: 1 })
  expect(galleryIndexMotion(8000, 800, false)).toEqual({ y: 0, opacity: 1 })
  expect(galleryIndexMotion(80, 800, false)).toEqual(middle)
  expect(galleryIndexMotion(0, 800, true)).toEqual({ y: 0, opacity: 1 })
})


it('makes the index readable while most of its upward travel still remains', () => {
  const early = galleryIndexMotion(80, 800, false)
  expect(early.opacity).toBeGreaterThan(.75)
  expect(early.y).toBeGreaterThan(64)
  const later = galleryIndexMotion(160, 800, false)
  expect(later.opacity).toBe(1)
  expect(later.y).toBeGreaterThan(0)
  expect(later.y).toBeLessThan(early.y)
})

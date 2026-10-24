import { expect, it } from 'vitest'
import { galleryEditorialMotion } from './galleryEditorial'

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

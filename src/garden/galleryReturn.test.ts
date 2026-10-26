import { afterEach, expect, it, vi } from 'vitest'
import { clearGalleryReturn, readGalleryReturn, saveGalleryReturn } from './galleryReturn'
import { paperEmphasisTargets } from './paperGalleryFocus'

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear() })
const record = { reduced: false, index: 4, scrollProgress: 1, loopProgress: .16, flexVelocity: .1, snapshot: { phase: 4, scales: Array(8).fill(1), flutter: .05, idleTime: 20, emphasis: paperEmphasisTargets(4, null) } }
it('retains a complete gallery snapshot and clears it when the expanded cover is closed', () => {
  saveGalleryReturn(record)
  expect(readGalleryReturn()).toEqual(record)
  clearGalleryReturn()
  expect(readGalleryReturn()).toBeNull()
})
it('rejects malformed or incomplete snapshots instead of breaking the return page', () => {
  saveGalleryReturn({ ...record, snapshot: { ...record.snapshot, scales: [1] } })
  expect(readGalleryReturn()).toBeNull()
  sessionStorage.setItem('portfolio:lingji-return:v1', '{bad json')
  expect(readGalleryReturn()).toBeNull()
})
it('falls back safely when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied') })
  expect(() => saveGalleryReturn(record)).not.toThrow()
  expect(readGalleryReturn()).toBeNull()
  expect(() => clearGalleryReturn()).not.toThrow()
})


it('isolates return snapshots between different project details', () => {
  saveGalleryReturn(record)
  saveGalleryReturn({ ...record, index: 7, scrollProgress: .8 })
  expect(readGalleryReturn(0)?.index).toBe(4)
  expect(readGalleryReturn(3)?.index).toBe(7)
  expect(readGalleryReturn(1)).toBeNull()
  clearGalleryReturn(3)
  expect(readGalleryReturn(3)).toBeNull()
  expect(readGalleryReturn(0)?.index).toBe(4)
})

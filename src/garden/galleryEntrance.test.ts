import { expect, it } from 'vitest'
import { advanceGalleryEntrance, galleryEntranceProgress, galleryEntranceMs } from './galleryEntrance'
it('finishes in1100ms independent of scrolling and frame cadence; reverse resets immediately', () => {
  for (const dt of [8, 16, 40]) {
    let elapsed = 0
    for (let t = 0; t < galleryEntranceMs; t += dt) elapsed = advanceGalleryEntrance(elapsed, true, dt, false)
    expect(galleryEntranceProgress(elapsed)).toBe(1)
    expect(advanceGalleryEntrance(elapsed, false, dt, false)).toBe(0)
  }
  expect(advanceGalleryEntrance(0, true, 0, true)).toBe(galleryEntranceMs)
})

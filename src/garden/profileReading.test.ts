import { expect, it } from 'vitest'
import { profileReadingContinuation, profileReadingState } from './profileReading'
it('adds reading distance for real content without shortening the existing first screen', () => {
  expect(profileReadingContinuation(800, 300, 500)).toBe(800)
  expect(profileReadingContinuation(800, 300, 1000)).toBeGreaterThan(1200)
})
it('does not allow interaction with partially clipped or exited cards', () => {
  expect(profileReadingState(80, 220, 400, false)).toEqual({ present: true, interactive: true })
  expect(profileReadingState(-40, 220, 400, false).interactive).toBe(false)
  expect(profileReadingState(300, 220, 400, false).interactive).toBe(false)
  expect(profileReadingState(80, 220, 400, true)).toEqual({ present: false, interactive: false })
})

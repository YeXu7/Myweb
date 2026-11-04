import { expect, it } from 'vitest'
import { chapterAt, homeExitPosition } from './aboutJourney'
it('keeps Home active until its last content clears and reserves About independently of Projects', () => {
  const end = homeExitPosition(2000, 800)
  expect(end).toBe(1640)
  expect(chapterAt(end - 1, end, 3200)).toBe('home')
  expect(chapterAt(end, end, 3200)).toBe('about')
  expect(chapterAt(3199, end, 3200)).toBe('about')
  expect(chapterAt(3200, end, 3200)).toBe('projects')
})
it('preserves Home reading distance when the natural-flow entrance spacer replaces the old gated lead', () => {
  const height = 800, previousBudget = 1200
  const oldEnd = height + previousBudget + .35 * height - .35 * height
  const naturalAboutTop = height + previousBudget + .45 * height
  expect(homeExitPosition(naturalAboutTop, height)).toBe(oldEnd)
})

it('fully clears a final profile through the upper mask shoulder on a short viewport', async () => {
  const { createReadingMotion } = await import('./readingMotion')
  const cardTop = 900, cardHeight = 180, windowHeight = 210, paddingTop = 24
  const centredTravel = cardTop + cardHeight / 2 - windowHeight / 2
  const travel = createReadingMotion(400, 800, windowHeight, 300, centredTravel, cardTop + cardHeight + paddingTop + 1)
  expect(cardTop + cardHeight - travel(800)).toBeLessThan(-paddingTop)
  expect(travel(799)).toBeLessThan(travel(800))
})

it('starts blur when the last capability keyword edge reaches one third of the viewport', async () => {
  const { capabilitiesBlurStart } = await import('./aboutJourney')
  for (const height of [560, 800]) {
    const bottom = 4200, start = capabilitiesBlurStart(bottom, height)
    expect(bottom - start).toBeCloseTo(height / 3)
  }
})

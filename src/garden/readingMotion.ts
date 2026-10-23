import { readingJourney } from './readingJourney'

/** Native scroll positions stay anchored; shared monotone slopes remove speed
 * jumps without overshooting the reading window or adding a settling timer. */
export function createReadingMotion(height: number, end: number, windowHeight: number, firstTravel: number, totalTravel: number) {
  end = Math.max(1, end)
  height = Math.min(Math.max(1, height), end / 2)
  totalTravel = Math.max(0, totalTravel)
  firstTravel = Math.min(totalTravel, Math.max(0, firstTravel))
  const positions = [0, height, end - height * readingJourney.exitScreens, end]
  const distances = [0, firstTravel, totalTravel, totalTravel + Math.max(0, windowHeight) * .95]
  const spans = positions.slice(1).map((position, i) => position - positions[i])
  const secants = spans.map((span, i) => (distances[i + 1] - distances[i]) / span)
  // Weighted harmonic means preserve monotonicity even for very short paragraphs.
  const sharedSlope = (i: number) => {
    const before = secants[i - 1], after = secants[i]
    if (before === 0 || after === 0) return 0
    const a = 2 * spans[i] + spans[i - 1], b = spans[i] + 2 * spans[i - 1]
    return (a + b) / (a / before + b / after)
  }
  const slopes = [0, sharedSlope(1), sharedSlope(2), 0]
  return (scroll: number) => {
    if (scroll <= 0) return 0
    if (scroll >= end) return distances[3]
    const i = scroll < positions[1] ? 0 : scroll < positions[2] ? 1 : 2
    const t = (scroll - positions[i]) / spans[i], t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * distances[i]
      + (t3 - 2 * t2 + t) * spans[i] * slopes[i]
      + (-2 * t3 + 3 * t2) * distances[i + 1]
      + (t3 - t2) * spans[i] * slopes[i + 1]
  }
}

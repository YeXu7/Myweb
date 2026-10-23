import { readingJourney } from './readingJourney'

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const imageWidth = 2191, imageHeight = 718
const originalAspect = 1672 / 941
// Approximate original-artwork region measured within the supplied bg3 panorama.
const reference = { left: 6, top: 0, width: originalAspect * 640, height: 640 }
export type BackgroundCrop = { x: number; y: number; width: number; height: number }

/** Stateless native-scroll framing, shared by texture sampling and the CSS fallback. */
export function backgroundFrame(width: number, height: number, scroll: number, projectStart: number, reduced: boolean, timelineHeight = height) {
  width = Math.max(1, width); height = Math.max(1, height)
  timelineHeight = Math.max(1, timelineHeight)
  const aspect = width / height
  const cropWidth = reference.width / imageWidth * Math.min(1, aspect / originalAspect)
  const cropHeight = reference.height / imageHeight * Math.min(1, originalAspect / aspect)
  const startX = reference.left / imageWidth + (reference.width / imageWidth - cropWidth) / 2
  const top = reference.top / imageHeight + (reference.height / imageHeight - cropHeight) / 2
  // The fixed canvas can be taller than the 100svh reading viewport on mobile.
  const leavingStart = projectStart - timelineHeight * readingJourney.exitScreens
  const travelScreens = .35 + .35 * smooth((width - 390) / (1024 - 390))
  const panDistance = Math.min(1 - cropWidth - startX, cropWidth * travelScreens)
  const pan = reduced ? 0 : smooth(scroll / Math.max(1, projectStart + timelineHeight * readingJourney.revealTailScreens))
  const defocus = smooth((scroll - leavingStart) / (timelineHeight * (readingJourney.exitScreens + readingJourney.revealTailScreens)))
  const readingShade = reduced ? 0 : smooth(scroll / Math.max(1, leavingStart))
    * (1 - smooth((scroll - leavingStart) / (timelineHeight * readingJourney.exitScreens)))
  const crop: BackgroundCrop = {
    x: startX + panDistance * pan,
    y: 1 - top - cropHeight,
    width: cropWidth, height: cropHeight,
  }
  const zoom = reduced ? 0 : defocus
  return {
    crop, defocus, readingShade,
    innerScale: 1 + .24 * zoom, innerY: -timelineHeight * .12 * zoom, outerScale: 1 + .014 * zoom,
    imageWidth: width / cropWidth, imageHeight: height / cropHeight,
    imageX: -crop.x * width / cropWidth,
    // CSS uses the calibrated top origin; the texture crop above uses bottom-origin UVs.
    imageY: -top * height / cropHeight,
  }
}

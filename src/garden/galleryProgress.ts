import { clamp01 } from './paperGalleryMotion'

/** Scroll-linear progress follows the existing holds, independently of paper easing. */
export function galleryProgress(scroll: number) {
  let phase = 0
  if (scroll <= 1) {
    for (let i = 0; i < 3; i++) phase += clamp01((scroll - (.24 + i * .24)) / .12)
  } else {
    const elapsed = (scroll - 1) / .24
    const transition = Math.floor(elapsed)
    phase = 3 + transition + clamp01((elapsed - transition) * 2)
  }
  const lower = Math.floor(phase)
  const fraction = phase - lower
  const project = Math.floor(phase + .5) % 4
  // A new cycle resets the full track with its ordinal; never animate 100% backwards to 25%.
  const fill = lower % 4 === 3 ? (fraction < .5 ? 1 : .25) : ((lower % 4) + 1 + fraction) / 4
  return { project, fill }
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const settle = (value: number) => { const t = clamp(value); return 1 - (1 - t) ** 3 }

/** Native scroll drives a masked two-line reveal; no clock, no added scroll distance. */
export function galleryEditorialMotion(offset: number, height: number, reduced: boolean) {
  const screen = Math.max(height, 1)
  const title = reduced ? 1 : settle((offset / screen + .04) / .32)
  const date = reduced ? 1 : settle((offset / screen - .02) / .30)
  return { titleY: (1 - title) * 115, dateY: (1 - date) * 115, groupY: (1 - title) * 64 }
}

/** Whole directory enters inside the existing gallery travel, after intro exit. */
export function galleryIndexMotion(offset: number, height: number, reduced: boolean) {
  const progress = reduced ? 1 : clamp(offset / (Math.max(height, 1) * .36))
  const travel = progress * progress * (3 - 2 * progress)
  // Finish fading early so the remaining upward movement is actually visible.
  return { y: (1 - travel) * 96, opacity: clamp(progress / .35) }
}

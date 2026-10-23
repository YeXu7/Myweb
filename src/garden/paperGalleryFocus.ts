import { paperPose, paperWidth } from './paperGalleryMotion'
import { paperCardIndex, paperPool, resolvePaperEntry } from './paperGalleryLoop'
import type { PaperEntry } from './paperGalleryInteraction'

export type PaperEmphasis = { dimming: readonly number[]; spacing: readonly number[]; clarity: readonly number[] }
export type PaperSnapshot = { phase: number; scales: readonly number[]; flutter: number; idleTime: number; emphasis?: PaperEmphasis }
export type PaperFocus = { index: number; progress: number }
export const projectAspects = [1920 / 1080, 1672 / 941, 1672 / 941, 1920 / 1080] as const

/** World units equal CSS pixels at z=0 with the gallery's calibrated camera. */
export function focusLayout(width: number, height: number, aspect: number) {
  const coverWidth = Math.min(width * (width < 700 ? .88 : .65), Math.max(40, height - 184) * aspect)
  const coverHeight = coverWidth / aspect
  const top = (height - coverHeight - 112) / 2
  return { width: coverWidth, height: coverHeight, top, y: height / 2 - top - coverHeight / 2, controlsTop: top + coverHeight + 24 }
}

export function advanceFocus(current: number, opening: boolean, dt: number) {
  const target = opening ? 1 : 0
  const next = current + (target - current) * (1 - Math.exp(-Math.min(dt, 50) / 155))
  return Math.abs(target - next) < .0005 ? target : next
}

export function advancePaperEmphasis(current: number, target: number, dt: number) {
  if (Math.abs(target - current) < .0003) return target
  return current + (target - current) * (1 - Math.exp(-Math.min(dt, 50) / 120))
}

export function paperEmphasisTargets(phase: number, selected: number | null): PaperEmphasis {
  const selectedSlot = selected === null ? null : resolvePaperEntry(paperPool[selected * 2 + 1], phase).slot
  return {
    dimming: paperPool.map(entry => selected !== null && paperCardIndex(entry) !== selected ? 1 : 0),
    clarity: Array.from({ length: 8 }, (_, i) => i === selected ? 1 : 0),
    spacing: paperPool.map(entry => {
      if (selectedSlot === null) return 0
      const distance = selectedSlot - resolvePaperEntry(entry, phase).slot
      // Only the two immediate neighbours on each side yield, never changing z or order.
      return Math.sign(distance) * .12 * Math.max(0, 1.5 - Math.abs(distance))
    }),
  }
}

/** One semantic pose is consumed by WebGL, DOM transforms and CPU hit geometry. */
export function paperPresentation(entry: PaperEntry, width: number, height: number, aspect: number, state: PaperSnapshot, focus?: PaperFocus | null) {
  const pose = paperPose(state.phase - entry.slot, width, height)
  const seed = ((entry.poolIndex === undefined ? entry.slot : (entry.poolIndex - 1) / 2) + 1) * 1.73
  const cardIndex = paperCardIndex(entry)
  const t = state.idleTime
  const size = paperWidth(width, height)
  const poolIndex = entry.poolIndex ?? entry.slot * 2 + 1
  const dimming = state.emphasis?.dimming[poolIndex] ?? 0
  const clarity = cardIndex === null ? 0 : state.emphasis?.clarity[cardIndex] ?? 0
  const spacing = (state.emphasis?.spacing[poolIndex] ?? 0) * size
  const distance = state.phase - entry.slot
  const tx = -.28 * Math.cos(distance * .28) / Math.sin(.28) * width * (width < 700 ? .60 : .19)
  const ty = height * ((width < 700 ? .18 : .125) + .018 * distance)
  const tangentLength = Math.hypot(tx, ty)
  const result = {
    ...pose,
    x: pose.x + spacing * tx / tangentLength + Math.sin(t * .47 + seed) * 5.88,
    y: pose.y + spacing * ty / tangentLength + Math.sin(t * .61 + seed * 1.3) * 8.96,
    rotateX: pose.rotateX + Math.sin(t * .43 + seed) * .0224,
    rotateY: pose.rotateY + Math.cos(t * .37 + seed) * .0252,
    rotateZ: pose.rotateZ + Math.sin(t * .41 + seed * .8) * .0196,
    opacity: pose.opacity,
    brightness: 1 - .7 * dimming, rimBrightness: 1 - .82 * dimming, clarity,
    scale: cardIndex === null ? 1 : state.scales[cardIndex],
    width: size, height: size / aspect,
    bend: (pose.bend + Math.sin(t * .53 + seed) * 1.96) * size / 300,
    flutter: (state.flutter + Math.sin(t * .73 + seed) * 4.2) * size / 300,
  }
  if (!focus) return result
  const p = focus.progress
  if (cardIndex !== focus.index) return { ...result, opacity: result.opacity * (1 - p) }
  const target = focusLayout(width, height, aspect)
  return {
    ...result, x: result.x * (1 - p), y: result.y + (target.y - result.y) * p,
    z: result.z * (1 - p), rotateX: result.rotateX * (1 - p), rotateY: result.rotateY * (1 - p), rotateZ: result.rotateZ * (1 - p),
    scale: result.scale + (target.width / size - result.scale) * p,
    opacity: result.opacity + (1 - result.opacity) * p,
    brightness: result.brightness + (1 - result.brightness) * p,
    rimBrightness: result.rimBrightness + (1 - result.rimBrightness) * p,
    clarity: result.clarity + (1 - result.clarity) * p,
    bend: result.bend * (1 - p), flutter: result.flutter * (1 - p),
  }
}

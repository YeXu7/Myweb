import { galleryPhase } from './paperGalleryMotion'
import type { PaperEntry } from './paperGalleryInteraction'

/** Eight project occurrences span twice the content cycle; ±4 recycling is fully transparent. */
export const paperPool: readonly PaperEntry[] = Array.from({ length: 16 }, (_, poolIndex) => ({
  slot: (poolIndex - 1) / 2, poolIndex,
  projectIndex: poolIndex % 2 ? Math.floor(poolIndex / 2) % 4 : null,
  cardIndex: poolIndex % 2 ? Math.floor(poolIndex / 2) : null,
}))
export const paperCardIndex = (entry: PaperEntry) => entry.cardIndex ?? entry.projectIndex
export const projectIdentity = (cardIndex: number) => ((cardIndex % 4) + 4) % 4

export function resolvePaperEntry(entry: PaperEntry, phase: number): PaperEntry {
  return { ...entry, slot: entry.slot + Math.max(0, Math.floor((phase - entry.slot + 4) / 8)) * 8 }
}

/** The original 450svh mapping is untouched; subsequent cycles keep its .12 holds/transitions. */
export function loopGalleryPhase(progress: number) {
  if (progress <= 1) return galleryPhase(progress)
  const elapsed = (progress - 1) / .24
  const cycle = Math.floor(elapsed), t = Math.min(1, (elapsed - cycle) * 2)
  return 3 + cycle + t * t * (3 - 2 * t)
}
export function wheelPixels(deltaY: number, deltaMode: number, height: number) {
  return deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? height : 1)
}
export function applyGalleryDelta(native: number, overflow: number, delta: number, end: number) {
  const next = Math.max(0, native + overflow + delta)
  return { native: Math.min(end, next), overflow: Math.max(0, next - end) }
}

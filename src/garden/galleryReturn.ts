import type { PaperSnapshot } from './paperGalleryFocus'

export const galleryReturnHash = '#project-01'
const storageKey = 'portfolio:lingji-return:v1'
export type GalleryReturn = {
  reduced: boolean
  index: number
  scrollProgress: number
  loopProgress: number
  flexVelocity: number
  snapshot: PaperSnapshot
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const array = (value: unknown, length: number) => Array.isArray(value) && value.length === length && value.every(finite)

export function readGalleryReturn(): GalleryReturn | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as GalleryReturn | null
    if (!value || typeof value.reduced !== 'boolean' || ![0, 4].includes(value.index) || !finite(value.scrollProgress) || value.scrollProgress < -1 || value.scrollProgress > 1 ||
      !finite(value.loopProgress) || value.loopProgress < 0 || !finite(value.flexVelocity)) return null
    const snapshot = value.snapshot
    if (!snapshot || !finite(snapshot.phase) || !finite(snapshot.flutter) || !finite(snapshot.idleTime) || !array(snapshot.scales, 8) ||
      !snapshot.emphasis || !array(snapshot.emphasis.dimming, 16) || !array(snapshot.emphasis.spacing, 16) || !array(snapshot.emphasis.clarity, 8)) return null
    return value
  } catch { return null }
}

export function saveGalleryReturn(value: GalleryReturn) {
  try { sessionStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* Direct-return fallback remains available. */ }
}

export function clearGalleryReturn() {
  try { sessionStorage.removeItem(storageKey) } catch { /* Storage can be disabled. */ }
}

import type { PaperSnapshot } from './paperGalleryFocus'

const identity = (index: number) => ((index % 4) + 4) % 4
export const galleryReturnHash = (index = 0) => `#project-0${identity(index) + 1}`
export function projectFromReturnHash(hash: string): number | null {
  const match = /^#project-0([1-4])$/.exec(hash)
  return match ? Number(match[1]) - 1 : null
}
// Keep project1's existing storage key for visitors with a saved detail session.
const storageKey = (index: number) => identity(index) === 0 ? 'portfolio:lingji-return:v1' : `portfolio:project-${identity(index) + 1}-return:v1`
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

export function readGalleryReturn(projectIndex = 0): GalleryReturn | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(projectIndex)) ?? 'null') as GalleryReturn | null
    if (!value || typeof value.reduced !== 'boolean' || ![identity(projectIndex), identity(projectIndex) + 4].includes(value.index) || !finite(value.scrollProgress) || value.scrollProgress < -1 || value.scrollProgress > 1 ||
      !finite(value.loopProgress) || value.loopProgress < 0 || !finite(value.flexVelocity)) return null
    const snapshot = value.snapshot
    if (!snapshot || !finite(snapshot.phase) || !finite(snapshot.flutter) || !finite(snapshot.idleTime) || !array(snapshot.scales, 8) ||
      !snapshot.emphasis || !array(snapshot.emphasis.dimming, 16) || !array(snapshot.emphasis.spacing, 16) || !array(snapshot.emphasis.clarity, 8)) return null
    return value
  } catch { return null }
}

export function saveGalleryReturn(value: GalleryReturn) {
  try { sessionStorage.setItem(storageKey(value.index), JSON.stringify(value)) } catch { /* Direct-return fallback remains available. */ }
}

export function clearGalleryReturn(projectIndex = 0) {
  try { sessionStorage.removeItem(storageKey(projectIndex)) } catch { /* Storage can be disabled. */ }
}

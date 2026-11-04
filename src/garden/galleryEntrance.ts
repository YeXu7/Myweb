export const galleryEntranceMs = 800

/** Time owns only the entrance. Native scroll remains free in either direction. */
export function advanceGalleryEntrance(elapsed: number, eligible: boolean, dt: number, reduced: boolean) {
  if (!eligible) return 0
  return reduced ? galleryEntranceMs : Math.min(galleryEntranceMs, elapsed + Math.max(0, dt))
}
export function galleryEntranceProgress(elapsed: number) {
  const t = Math.max(0, Math.min(1, elapsed / galleryEntranceMs))
  return 1 - (1 - t) ** 3
}

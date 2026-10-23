export type PaperEntry = { slot: number; projectIndex: number | null; cardIndex?: number | null; poolIndex?: number }
export type PaperBounds = { left: number; right: number; top: number; bottom: number }

// Decoration occupies half-steps; the four real projects retain their original scroll positions.
export const paperSequence: readonly PaperEntry[] = Array.from({ length: 9 }, (_, i) => ({
  slot: (i - 1) / 2,
  projectIndex: i % 2 === 1 ? (i - 1) / 2 : null,
}))

export function advancePaperScale(current: number, enlarged: boolean, dt: number) {
  const target = enlarged ? 1.5 : 1
  if (Math.abs(target - current) < .0003) return target
  return current + (target - current) * (1 - Math.exp(-Math.min(dt, 50) / 95))
}

export function paperRenderOrder(entry: PaperEntry, phase: number, _selected: number | null = null, _scale = 1) {
  return 400 + Math.round((phase - entry.slot) * 20)
}

/** Keep the lower information group clear of a visible enlarged sheet, including short screens. */
export function captionPlacement(width: number, height: number, captionWidth: number, captionHeight: number, paper: PaperBounds | null) {
  const margin = 20, gap = 24
  const maxTop = Math.max(margin, height - captionHeight - margin)
  const top = Math.min(height * .81, maxTop)
  const center = width / 2
  if (!paper) return { left: center, top }
  const overlapX = center + captionWidth / 2 > paper.left - gap && center - captionWidth / 2 < paper.right + gap
  const overlapY = top + captionHeight > paper.top - gap && top < paper.bottom + gap
  if (!overlapX || !overlapY) return { left: center, top }
  if (paper.bottom + gap <= maxTop) return { left: center, top: Math.max(top, paper.bottom + gap) }
  const candidates = [paper.left - gap - captionWidth / 2, paper.right + gap + captionWidth / 2]
    .filter(left => left - captionWidth / 2 >= margin && left + captionWidth / 2 <= width - margin)
    .sort((a, b) => Math.abs(a - center) - Math.abs(b - center))
  if (candidates.length) return { left: candidates[0], top }
  // Extremely narrow/short layouts can have no lower side lane; keep the information in view.
  return { left: center, top: Math.max(margin, Math.min(maxTop, paper.top - gap - captionHeight)) }
}

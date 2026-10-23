export const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t) }

/** Four focus holds, separated by three transitions; every value depends on scroll alone. */
export function galleryPhase(progress: number) {
  const p = clamp01(progress)
  if (p < 0.12) return -1 + smooth(p / 0.12)
  for (let i = 0; i < 3; i++) {
    const start = 0.24 + i * 0.24
    if (p < start) return i
    if (p < start + 0.12) return i + smooth((p - start) / 0.12)
  }
  return 3
}

export function paperPose(distance: number, width: number, height: number) {
  const d = Math.max(-4, Math.min(4, distance))
  const depth = Math.abs(d)
  const narrow = width < 700
  return {
    x: -Math.sin(d * 0.28) / Math.sin(0.28) * width * (narrow ? 0.60 : 0.19),
    y: height * (0.025 + d * (narrow ? 0.18 : 0.125) + 0.009 * d * d),
    z: d * 95,
    rotateX: -0.13 + d * 0.018,
    rotateY: -0.38 - d * 0.025,
    rotateZ: 0.065 + d * 0.012,
    scale: 1,
    opacity: 1 - smooth((depth - 2.9) / 0.8),
    bend: 15 + Math.min(depth, 2.5) * 4,
  }
}

export function paperWidth(width: number, height: number) {
  return Math.min(width * (width < 700 ? 0.76 : 0.23), 440, height * 0.38 * 16 / 9)
}

/** Short, frame-rate independent inertia; settled holds still have an exact phase. */
export function advancePaperPhase(current: number, target: number, dt: number) {
  if (Math.abs(target - current) < 0.0003) return target
  return current + (target - current) * (1 - Math.exp(-Math.min(dt, 50) / 85))
}

/** Scroll speed is in viewport heights/second, separate from the held gallery phase. */
export function advancePaperFlex(state: { bend: number; velocity: number }, scrollSpeed: number, dt: number) {
  const target = Math.max(-13, Math.min(13, scrollSpeed * 7))
  const seconds = Math.max(0, Math.min(dt, 50)) / 1000
  // Exact damped spring integration keeps the soft recoil equal at 60 and 120 Hz.
  const damping = 10, stiffness = 180, frequency = Math.sqrt(stiffness - damping * damping)
  const decay = Math.exp(-damping * seconds)
  const sine = Math.sin(frequency * seconds), cosine = Math.cos(frequency * seconds)
  const offset = state.bend - target
  const bend = target + decay * (offset * cosine + (state.velocity + damping * offset) / frequency * sine)
  const velocity = decay * (state.velocity * cosine - (damping * state.velocity + stiffness * offset) / frequency * sine)
  if (target === 0 && Math.abs(bend) < 0.005 && Math.abs(velocity) < 0.03) return { bend: 0, velocity: 0 }
  return { bend, velocity }
}

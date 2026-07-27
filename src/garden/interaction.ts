export type Point = { x: number; y: number }

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

const smoothstep = (value: number) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

export function normalizePointer(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): Point {
  return {
    x: (clientX / Math.max(width, 1)) * 2 - 1,
    y: 1 - (clientY / Math.max(height, 1)) * 2,
  }
}

export function calculatePointerVelocity(
  previousX: number,
  previousY: number,
  nextX: number,
  nextY: number,
  deltaMs: number,
) {
  const distance = Math.hypot(nextX - previousX, nextY - previousY)
  return clamp(distance / Math.max(deltaMs, 1))
}

export function magneticFalloff(distance: number, radius: number) {
  return smoothstep(1 - distance / Math.max(radius, 1))
}

export function textSafeAttenuation(uv: Point) {
  const safeCenter = { x: 0.24, y: 0.52 }
  const dx = (uv.x - safeCenter.x) / 0.33
  const dy = (uv.y - safeCenter.y) / 0.25
  const ellipseDistance = Math.hypot(dx, dy)
  return 0.14 + 0.86 * smoothstep(ellipseDistance)
}

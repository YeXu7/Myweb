/** A bounded, persistent displacement field. It never changes image opacity or color. */
const width = 128
const height = 80
const lifetime = 1900
const radius = .10
export const POINTER_TRAIL_DISPLACEMENT = .038
const fade = (age: number) => Math.max(0, 1 - Math.max(0, age) / lifetime) ** .8

export function createPointerTrail() {
  const data = new Uint8Array(width * height * 4)
  const dx = new Float32Array(width * height)
  const dy = new Float32Array(width * height)
  const born = new Float64Array(width * height).fill(-Infinity)
  let previous: { x: number; y: number; time: number } | null = null
  let aspect = 1
  let activeUntil = -Infinity
  let version = 0
  const clear = () => {
    previous = null
    activeUntil = -Infinity
    dx.fill(0); dy.fill(0); born.fill(-Infinity)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128; data[i + 1] = 128; data[i + 2] = 0; data[i + 3] = 255
    }
    version++
  }
  clear()
  return {
    width, height, data,
    get version() { return version },
    setAspect(next: number) {
      const value = Math.max(.25, Math.min(4, next))
      if (value !== aspect) { aspect = value; clear() }
    },
    move(x: number, y: number, time: number) {
      if (!previous || time - previous.time > 180) { previous = { x, y, time }; return }
      if (time - previous.time < 16 || Math.hypot((x - previous.x) * aspect, y - previous.y) < .001) return
      const startX = previous.x * aspect, startY = previous.y
      const pathX = x * aspect - startX, pathY = y - startY
      const lengthSquared = pathX * pathX + pathY * pathY
      const length = Math.sqrt(lengthSquared)
      // Rasterize only the swept capsule, bounded by this fixed 10,240-cell field.
      const minX = Math.max(0, Math.floor((Math.min(x, previous.x) - radius / aspect) * width))
      const maxX = Math.min(width - 1, Math.ceil((Math.max(x, previous.x) + radius / aspect) * width))
      const minY = Math.max(0, Math.floor((Math.min(y, previous.y) - radius) * height))
      const maxY = Math.min(height - 1, Math.ceil((Math.max(y, previous.y) + radius) * height))
      for (let row = minY; row <= maxY; row++) for (let column = minX; column <= maxX; column++) {
        const px = (column + .5) / width * aspect - startX, py = (row + .5) / height - startY
        const along = Math.max(0, Math.min(1, (px * pathX + py * pathY) / lengthSquared))
        const offsetX = px - pathX * along, offsetY = py - pathY * along
        const distance = Math.hypot(offsetX, offsetY)
        if (distance >= radius) continue
        const t = distance / radius
        const weight = 1 - t * t * (3 - 2 * t)
        // Inward displacement with a small directional drag; no accumulating force.
        const vx = -offsetX / Math.max(distance, .006) * .82 + pathX / length * .30
        const vy = -offsetY / Math.max(distance, .006) * .82 + pathY / length * .30
        const cap = Math.max(1, Math.hypot(vx, vy))
        const nextX = vx / cap * weight, nextY = vy / cap * weight
        const index = row * width + column
        const currentStrength = Math.hypot(dx[index], dy[index]) * fade(time - born[index])
        if (Math.hypot(nextX, nextY) >= currentStrength) {
          dx[index] = nextX; dy[index] = nextY; born[index] = time
        }
      }
      activeUntil = time + lifetime
      previous = { x, y, time }
    },
    sample(time: number) {
      if (activeUntil === -Infinity) return data
      let changed = false
      for (let index = 0; index < born.length; index++) {
        const strength = fade(time - born[index])
        const red = 128 + Math.round(dx[index] * strength * 127)
        const green = 128 + Math.round(dy[index] * strength * 127)
        const offset = index * 4
        if (data[offset] !== red || data[offset + 1] !== green) {
          data[offset] = red; data[offset + 1] = green; changed = true
        }
      }
      if (changed) version++
      if (time >= activeUntil) activeUntil = -Infinity
      return data
    },
    breakPath() { previous = null },
    clear,
  }
}

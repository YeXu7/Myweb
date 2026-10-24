const svgNamespace = 'http://www.w3.org/2000/svg'

export const readingPointer = { radiusX: 100, radiusY: 60, attackMs: 180, settleMs: 380 } as const

/** Preserve scroll-edge defocus and blend local noise-weighted glyph softness.
 * Glyph positions, layout and the garden behind them stay untouched.
 */
export function createReadingDefocus(prefix: string, count: number) {
  const node = (name: string, attributes: Record<string, string> = {}) => {
    const element = document.createElementNS(svgNamespace, name)
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
    return element
  }
  const svg = node('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' })
  svg.style.position = 'absolute'
  svg.style.pointerEvents = 'none'
  const defs = node('defs')
  svg.append(defs)

  const filters = Array.from({ length: count }, (_, index) => {
    const id = `${prefix}-defocus-${index}`
    const filter = node('filter', {
      id, x: '-12%', y: '-80%', width: '124%', height: '260%',
      'color-interpolation-filters': 'sRGB',
    })
    const near = node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0', result: 'near' })
    const blur = node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0', result: 'soft' })
    const noise = node('feTurbulence', {
      type: 'fractalNoise', baseFrequency: '0.018 0.045', numOctaves: '2',
      seed: String(17 + index * 7), result: 'grain',
    })
    const alpha = node('feColorMatrix', {
      in: 'grain', type: 'matrix', result: 'grainAlpha',
      values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0',
    })
    const weight = node('feComponentTransfer', { in: 'grainAlpha', result: 'weight' })
    const curve = node('feFuncA', { type: 'linear', slope: '0', intercept: '0' })
    weight.append(curve)
    filter.append(
      near, blur, noise, alpha, weight,
      node('feComposite', { in: 'soft', in2: 'weight', operator: 'in', result: 'softPart' }),
      node('feComposite', { in: 'near', in2: 'weight', operator: 'out', result: 'sharpPart' }),
      node('feComposite', {
        in: 'softPart', in2: 'sharpPart', operator: 'arithmetic', k2: '1', k3: '1', result: 'reading',
      }),
    )
    const maskSvg = `<svg xmlns="${svgNamespace}" width="200" height="120"><defs><radialGradient id="soft"><stop offset="0" stop-color="white"/><stop offset=".35" stop-color="white" stop-opacity=".95"/><stop offset=".7" stop-color="white" stop-opacity=".45"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="200" height="120" fill="url(#soft)"/></svg>`
    const field = node('feImage', {
      href: `data:image/svg+xml,${encodeURIComponent(maskSvg)}`,
      x: '0', y: '0', width: '200', height: '120', preserveAspectRatio: 'none',
      result: 'pointerField', 'data-pointer-field': '',
    })
    const maskPower = node('feComponentTransfer', { in: 'pointerField', result: 'pointerMask' })
    const strength = node('feFuncA', { type: 'linear', slope: '0', intercept: '0' })
    maskPower.append(strength)
    const localNoise = node('feTurbulence', {
      type: 'fractalNoise', baseFrequency: '.014 .03', numOctaves: '2',
      seed: String(29 + index * 7), result: 'localNoise', 'data-pointer-noise': '',
    })
    const localAlpha = node('feColorMatrix', {
      in: 'localNoise', type: 'matrix', result: 'localAlpha',
      values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0',
    })
    const variation = node('feComponentTransfer', { in: 'localAlpha', result: 'localVariation' })
    variation.append(node('feFuncA', { type: 'linear', slope: '2', intercept: '-.5' }))
    const opacity = node('feComponentTransfer', { in: 'localAlpha', result: 'localOpacity' })
    opacity.append(node('feFuncA', { type: 'linear', slope: '.12', intercept: '.88' }))
    // Two softness levels blend through a stable spatial noise field, avoiding
    // a uniform Gaussian patch or frame-by-frame random flicker.
    filter.append(
      field, maskPower, localNoise, localAlpha, variation, opacity,
      node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '1.4', result: 'localNear' }),
      node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3.4', result: 'localSoft' }),
      node('feComposite', { in: 'localSoft', in2: 'localVariation', operator: 'in', result: 'localSoftPart' }),
      node('feComposite', { in: 'localNear', in2: 'localVariation', operator: 'out', result: 'localNearPart' }),
      node('feComposite', { in: 'localSoftPart', in2: 'localNearPart', operator: 'arithmetic', k2: '1', k3: '1', result: 'localBlend' }),
      node('feComposite', { in: 'localBlend', in2: 'localOpacity', operator: 'in', result: 'localFaded' }),
      node('feComposite', { in: 'localFaded', in2: 'pointerMask', operator: 'in', result: 'pointerPart' }),
      node('feComposite', { in: 'reading', in2: 'pointerMask', operator: 'out', result: 'readingPart' }),
      node('feComposite', { in: 'pointerPart', in2: 'readingPart', operator: 'arithmetic', k2: '1', k3: '1' }),
    )
    defs.append(filter)
    let previous: string[] = []
    let previousPointer = ['0', '0', '0']
    return {
      id,
      update(softness: number, pointer?: { x: number; y: number; strength: number }) {
        // Variation disappears at either endpoint, keeping fully readable type crisp.
        const variation = 12 * softness * (1 - softness)
        const values = [(softness * 1.2).toFixed(3), (1 + softness * 4).toFixed(3), variation.toFixed(3), (softness - variation * .5).toFixed(3)]
        if (values[0] !== previous[0]) near.setAttribute('stdDeviation', values[0])
        if (values[1] !== previous[1]) blur.setAttribute('stdDeviation', values[1])
        if (values[2] !== previous[2]) curve.setAttribute('slope', values[2])
        if (values[3] !== previous[3]) curve.setAttribute('intercept', values[3])
        previous = values
        const next = pointer
          ? [(pointer.x - readingPointer.radiusX).toFixed(2), (pointer.y - readingPointer.radiusY).toFixed(2), pointer.strength.toFixed(3)]
          : ['0', '0', '0']
        if (next[0] !== previousPointer[0]) field.setAttribute('x', next[0])
        if (next[1] !== previousPointer[1]) field.setAttribute('y', next[1])
        if (next[2] !== previousPointer[2]) strength.setAttribute('slope', next[2])
        previousPointer = next
      },
    }
  })
  return { svg, filters }
}

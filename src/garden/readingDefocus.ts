const svgNamespace = 'http://www.w3.org/2000/svg'

/** Blend sharp and defocused glyphs through a stationary, low-frequency texture.
 * Only the text is filtered; its layout and the garden behind it are untouched.
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
        in: 'softPart', in2: 'sharpPart', operator: 'arithmetic', k2: '1', k3: '1',
      }),
    )
    defs.append(filter)
    let previous: string[] = []
    return {
      id,
      update(softness: number) {
        // Variation disappears at either endpoint, keeping fully readable type crisp.
        const variation = 12 * softness * (1 - softness)
        const values = [(softness * 1.2).toFixed(3), (1 + softness * 4).toFixed(3), variation.toFixed(3), (softness - variation * .5).toFixed(3)]
        if (values[0] !== previous[0]) near.setAttribute('stdDeviation', values[0])
        if (values[1] !== previous[1]) blur.setAttribute('stdDeviation', values[1])
        if (values[2] !== previous[2]) curve.setAttribute('slope', values[2])
        if (values[3] !== previous[3]) curve.setAttribute('intercept', values[3])
        previous = values
      },
    }
  })
  return { svg, filters }
}

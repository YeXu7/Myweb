import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('keeps interactive Home content inside the native shell containing-block chain for its full budget', () => {
  const css = readFileSync('src/styles/hero-reading.css', 'utf8')
  // A short sticky child would release after one screen; the direct child sticks
  // in the full shell and the spacer, not its own box, owns the reading distance.
  expect(css).toMatch(/\.site-shell\.reading-shell > \.garden-intro \{[^}]*position: sticky;[^}]*margin-bottom: -100svh;/)
  expect(css).toMatch(/\.garden-intro \.garden-intro__stage \{ position: absolute;/)
  expect(css).toContain('height: calc(100svh + var(--reading-continuation-height))')
  expect(css).toContain('overflow: visible;')
})

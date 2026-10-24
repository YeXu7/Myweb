import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'

const styles = readFileSync('src/styles/paper-gallery.css', 'utf8')
const nodes = []
afterEach(() => { nodes.splice(0).forEach(node => node.remove()) })

describe('paper occlusion in the DOM fallback', () => {
  it('lets a decorative sheet intercept picking without becoming a focus target', () => {
    const style = document.createElement('style')
    style.textContent = styles
    document.head.appendChild(style); nodes.push(style)
    const section = document.createElement('section')
    section.className = 'paper-gallery'
    section.innerHTML = '<div class="paper-gallery__papers"><div class="paper-gallery__paper paper-gallery__paper--blank" data-sheet data-decoration aria-hidden="true"></div></div>'
    document.body.appendChild(section); nodes.push(section)
    const decoration = section.querySelector('[data-decoration]')
    // JSDOM omits inherited pointer-events; verify the authored override on the sheet itself.
    const pointerRules = Array.from(style.sheet.cssRules)
      .filter(rule => rule.selectorText && decoration.matches(rule.selectorText))
      .map(rule => rule.style.getPropertyValue('pointer-events')).filter(Boolean)
    expect(pointerRules.at(-1)).toBe('auto')
    expect(decoration.tabIndex).toBe(-1)
    section.dataset.canvasReady = 'true'
    expect(getComputedStyle(decoration).pointerEvents).toBe('none')
  })
})


it('limits the planar focus outline to DOM rendering and supplies a visible canvas keyboard cue', () => {
  const style = document.createElement('style'); style.textContent = styles
  document.head.appendChild(style); nodes.push(style)
  const outlineRules = Array.from(style.sheet.cssRules).filter(rule => rule.selectorText?.includes('.paper-gallery__paper:focus-visible'))
  expect(outlineRules).toHaveLength(1)
  expect(outlineRules[0].selectorText).toContain(":not([data-canvas-ready='true'])")
  expect(styles).toContain("[data-keyboard-preview='true'] .paper-gallery__index-entry[data-active='true'] .paper-gallery__index-name")
  expect(styles).toContain('text-decoration-line: underline')
})

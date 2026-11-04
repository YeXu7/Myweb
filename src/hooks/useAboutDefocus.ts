import { useEffect, useId, type RefObject } from 'react'
import { createReadingDefocus, readingPointer } from '../garden/readingDefocus'

/** Reuse Home's local field on one text block; never filter a whole section. */
export function useAboutDefocus(ref: RefObject<HTMLElement | null>) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  useEffect(() => {
    const root = ref.current
    if (!root || !window.matchMedia) return
    const shell = root.closest('.site-shell')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const defocus = createReadingDefocus(`about-${id}`, 1)
    root.append(defocus.svg)
    let active: HTMLElement | null = null
    let point = { x: 0, y: 0 }, power = 0, target = 0, last = 0, frame = 0
    const clear = () => {
      cancelAnimationFrame(frame); frame = 0; last = 0
      active?.style.removeProperty('filter'); active = null; power = 0; target = 0
    }
    const paint = (time: number) => {
      frame = 0
      if (!active || reduced.matches || !fine.matches || document.hidden) { clear(); return }
      const dt = last ? Math.min(50, time - last) : 16; last = time
      const duration = target ? readingPointer.attackMs : readingPointer.settleMs
      power += Math.sign(target - power) * Math.min(Math.abs(target - power), dt / duration)
      if (!target && power === 0) { clear(); return }
      defocus.filters[0].update(0, { ...point, strength: power * power * (3 - 2 * power) })
      active.style.filter = `url(#${defocus.filters[0].id})`
      if (power !== target) frame = requestAnimationFrame(paint)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const release = () => { target = 0; if (active) schedule() }
    const move = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches || document.hidden || event.pointerType === 'touch' || event.buttons || !window.getSelection()?.isCollapsed) { clear(); return }
      const text = event.target instanceof Element ? event.target.closest<HTMLElement>('h2, h3, h4, p, .about-experience__tags') : null
      if (!text || !root.contains(text)) { release(); return }
      // An event-only read; scrolling clears the field instead of measuring every frame.
      const rect = text.getBoundingClientRect()
      if (active !== text) { clear(); active = text }
      point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      target = 1; schedule()
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', clear, { passive: true })
    window.addEventListener('blur', clear)
    document.addEventListener('pointerleave', release)
    document.addEventListener('selectionchange', clear)
    document.addEventListener('visibilitychange', clear)
    shell?.addEventListener('scroll', clear, { passive: true })
    reduced.addEventListener('change', clear); fine.addEventListener('change', clear)
    return () => {
      clear(); defocus.svg.remove()
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', clear)
      window.removeEventListener('blur', clear); document.removeEventListener('pointerleave', release)
      document.removeEventListener('selectionchange', clear); document.removeEventListener('visibilitychange', clear)
      shell?.removeEventListener('scroll', clear)
      reduced.removeEventListener('change', clear); fine.removeEventListener('change', clear)
    }
  }, [ref, id])
}

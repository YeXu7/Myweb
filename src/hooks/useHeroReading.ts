import { useEffect, useId, type RefObject } from 'react'
import { createReadingDefocus, readingPointer } from '../garden/readingDefocus'
import { createReadingMotion } from '../garden/readingMotion'
import { readingJourney } from '../garden/readingJourney'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** One native scroll drives the two-screen reading track and the garden's slower travel. */
export function useHeroReading(heroRef: RefObject<HTMLElement | null>) {
  const filterPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  useEffect(() => {
    const hero = heroRef.current
    const shell = hero?.closest<HTMLElement>('.site-shell')
    if (!hero || !shell) return
    const stage = hero.querySelector<HTMLElement>('.garden-intro__stage')!
    // Fade the inner stamp so the existing outer entrance animation can stay unchanged.
    const stamp = stage.querySelector<HTMLElement>('.garden-intro__stamp > span')
    const windowEl = hero.querySelector<HTMLElement>('[data-reading-window]')!
    const track = hero.querySelector<HTMLElement>('[data-reading-track]')!
    const projects = shell.querySelector<HTMLElement>('#projects')
    const continuation = track.querySelector<HTMLElement>('[data-reading-continuation]')
    const lines = Array.from(track.querySelectorAll<HTMLElement>('[data-reading-line]'))
    const defocus = createReadingDefocus(filterPrefix, lines.length)
    hero.append(defocus.svg)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let frame = 0
    let disposed = false
    let height = 1
    let end = readingJourney.totalScreens
    let windowHeight = 1
    let firstTravel = 0
    let totalTravel = 0
    let centers: number[] = []
    let travelAt = createReadingMotion(height, end, windowHeight, firstTravel, totalTravel)
    let lineBounds: { left: number; top: number; width: number; height: number }[] = []
    let trackOrigin = 0, lastTranslation = 0
    let pointer: { x: number; y: number; envelopeAt: number; from: number; releasing: boolean } | null = null
    const filterStyles: (string | undefined)[] = []

    const envelopePower = (now: number) => {
      if (!pointer) return 0
      const duration = pointer.releasing ? readingPointer.settleMs : readingPointer.attackMs
      const t = clamp((now - pointer.envelopeAt) / duration)
      const eased = t * t * (3 - 2 * t)
      return pointer.from + ((pointer.releasing ? 0 : 1) - pointer.from) * eased
    }
    const releasePointer = (now: number) => {
      if (!pointer || pointer.releasing) return
      pointer.from = envelopePower(now)
      pointer.envelopeAt = now
      pointer.releasing = true
    }
    const samplePointer = (now: number) => {
      if (!pointer) return 0
      if (reducedMotion?.matches) { pointer = null; return 0 }
      const power = envelopePower(now)
      if (pointer.releasing && now - pointer.envelopeAt >= readingPointer.settleMs) pointer = null
      return power
    }

    const paint = () => {
      frame = 0
      const scroll = Math.max(0, shell.scrollTop)
      // Read the last line in the clear centre, then let it pass through the top gutter.
      const leaving = clamp((scroll - (end - height * readingJourney.exitScreens)) / (height * readingJourney.exitScreens))
      const translation = -travelAt(scroll)
      lastTranslation = translation
      const now = performance.now()
      const pointerPower = samplePointer(now)
      const transform = `translate3d(0, ${translation.toFixed(2)}px, 0)`
      if (track.style.transform !== transform) track.style.transform = transform
      const exit = clamp((scroll - (end - height * 0.04)) / (height * 0.04))
      if (stage.style.opacity !== '1') stage.style.opacity = '1'
      if (stamp && stamp.style.opacity !== String(1 - leaving)) stamp.style.opacity = String(1 - leaving)
      const visibility = exit === 1 ? 'hidden' : 'visible'
      if (stage.style.visibility !== visibility) stage.style.visibility = visibility
      if (exit === 1) return
      lines.forEach((line, index) => {
        const position = (centers[index] + translation) / windowHeight
        // Let the type soften into the outer gutter before the spatial mask fades it.
        // Smoothstep keeps the clear/soft boundary free of a sudden change in slope.
        const edge = clamp(Math.max((0.18 - position) / 0.275, (position - 0.78) / 0.36))
        const softness = edge * edge * (3 - 2 * edge)
        const bounds = lineBounds[index]
        const localX = pointer && bounds ? pointer.x - bounds.left : 0
        const localY = pointer && bounds ? pointer.y - (trackOrigin + bounds.top + translation) : 0
        const dx = bounds ? Math.max(0, -localX, localX - bounds.width) : Infinity
        const dy = bounds ? Math.max(0, -localY, localY - bounds.height) : Infinity
        // A shared screen-space ellipse can soften multiple nearby clear lines.
        const localPointer = softness === 0 && pointer && bounds
          && (dx / readingPointer.radiusX) ** 2 + (dy / readingPointer.radiusY) ** 2 < 1
          ? { x: localX, y: localY, strength: pointerPower } : undefined
        let filter: string
        if (((softness > 0 && softness < 1) || localPointer) && !reducedMotion?.matches) {
          defocus.filters[index].update(softness, localPointer)
          filter = `url(#${defocus.filters[index].id})`
        } else {
          // Skip texture sampling for clear text and fully defocused outer lines.
          filter = softness === 1 && !reducedMotion?.matches ? 'blur(5px)' : 'none'
        }
        if (filterStyles[index] !== filter) { line.style.filter = filter; filterStyles[index] = filter }
      })
      if (pointer && (pointer.releasing || now < pointer.envelopeAt + readingPointer.attackMs)) schedule()

    }
    const schedule = () => { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(paint) }
    const handleVisibility = () => {
      if (document.hidden) { pointer = null; cancelAnimationFrame(frame); frame = 0 }
      else schedule()
    }
    const measure = () => {
      if (disposed) return
      height = Math.max(shell.clientHeight, 1)
      end = projects ? projects.getBoundingClientRect().top - shell.getBoundingClientRect().top + shell.scrollTop : height * readingJourney.totalScreens
      const trackTop = track.getBoundingClientRect().top
      trackOrigin = trackTop - lastTranslation
      lineBounds = lines.map(line => {
        const rect = line.getBoundingClientRect()
        return { left: rect.left, top: rect.top - trackTop, width: rect.width, height: rect.height }
      })
      centers = lineBounds.map(rect => rect.top + rect.height / 2)
      // The blur gutters are visual overflow, not extra reading or scroll distance.
      windowHeight = Math.max(Math.round(parseFloat(window.getComputedStyle(windowEl).height)), 1)
      totalTravel = Math.max(0, (centers.at(-1) ?? 0) - windowHeight * 0.6)
      const continuationTop = continuation ? continuation.getBoundingClientRect().top - trackTop : totalTravel
      firstTravel = Math.min(totalTravel, Math.max(0, continuationTop - windowHeight * 0.12))
      travelAt = createReadingMotion(height, end, windowHeight, firstTravel, totalTravel)
      schedule()
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(windowEl)
    observer?.observe(track)
    const handlePointer = (event: PointerEvent) => {
      if (disposed || document.hidden || reducedMotion?.matches || event.pointerType === 'touch' || event.buttons) return
      const next = { x: event.clientX, y: event.clientY }
      const nearClearText = lineBounds.some((bounds, index) => {
        const top = trackOrigin + bounds.top + lastTranslation
        const position = (centers[index] + lastTranslation) / windowHeight
        const dx = Math.max(0, bounds.left - next.x, next.x - bounds.left - bounds.width)
        const dy = Math.max(0, top - next.y, next.y - top - bounds.height)
        return (dx / readingPointer.radiusX) ** 2 + (dy / readingPointer.radiusY) ** 2 < 1
          && position >= .18 && position <= .78
      })
      const now = performance.now()
      if (nearClearText) {
        const power = samplePointer(now)
        if (pointer) {
          if (pointer.releasing) { pointer.from = power; pointer.envelopeAt = now; pointer.releasing = false }
          pointer.x = next.x; pointer.y = next.y
        } else pointer = { ...next, envelopeAt: now, from: 0, releasing: false }
      } else releasePointer(now)
      schedule()
    }

    const leavePointer = () => { releasePointer(performance.now()); schedule() }
    const handleScroll = () => { pointer = null; schedule() }
    shell.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('pointermove', handlePointer, { passive: true })
    document.addEventListener('pointerleave', leavePointer)
    window.addEventListener('blur', leavePointer)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('resize', measure)
    reducedMotion?.addEventListener('change', schedule)
    document.fonts?.ready.then(measure)
    measure()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      shell.removeEventListener('scroll', handleScroll)
      window.removeEventListener('pointermove', handlePointer)
      document.removeEventListener('pointerleave', leavePointer)
      window.removeEventListener('blur', leavePointer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('resize', measure)
      reducedMotion?.removeEventListener('change', schedule)
      defocus.svg.remove()
      lines.forEach(line => line.style.removeProperty('filter'))
    }
  }, [heroRef, filterPrefix])
}

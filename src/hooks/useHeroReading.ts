import { useEffect, useId, type RefObject } from 'react'
import { createReadingDefocus } from '../garden/readingDefocus'
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
    const filterStyles: (string | undefined)[] = []

    const paint = () => {
      frame = 0
      const scroll = Math.max(0, shell.scrollTop)
      // Read the last line in the clear centre, then let it pass through the top gutter.
      const leaving = clamp((scroll - (end - height * readingJourney.exitScreens)) / (height * readingJourney.exitScreens))
      const translation = -travelAt(scroll)
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
        let filter: string
        if (softness > 0 && softness < 1 && !reducedMotion?.matches) {
          defocus.filters[index].update(softness)
          filter = `url(#${defocus.filters[index].id})`
        } else {
          // Skip texture sampling for clear text and fully defocused outer lines.
          filter = softness === 1 && !reducedMotion?.matches ? 'blur(5px)' : 'none'
        }
        if (filterStyles[index] !== filter) { line.style.filter = filter; filterStyles[index] = filter }
      })

    }
    const schedule = () => { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(paint) }
    const handleVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0 }
      else schedule()
    }
    const measure = () => {
      if (disposed) return
      height = Math.max(shell.clientHeight, 1)
      end = projects ? projects.getBoundingClientRect().top - shell.getBoundingClientRect().top + shell.scrollTop : height * readingJourney.totalScreens
      const trackTop = track.getBoundingClientRect().top
      centers = lines.map(line => {
        const rect = line.getBoundingClientRect()
        return rect.top - trackTop + rect.height / 2
      })
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
    shell.addEventListener('scroll', schedule, { passive: true })
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('resize', measure)
    reducedMotion?.addEventListener('change', schedule)
    document.fonts?.ready.then(measure)
    measure()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      shell.removeEventListener('scroll', schedule)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('resize', measure)
      reducedMotion?.removeEventListener('change', schedule)
      defocus.svg.remove()
      lines.forEach(line => line.style.removeProperty('filter'))
    }
  }, [heroRef, filterPrefix])
}

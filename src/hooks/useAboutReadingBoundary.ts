import { useEffect, type RefObject } from 'react'

/** Keep the reading exit fixed below navigation while the chapter scrolls freely. */
export function useAboutReadingBoundary(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    const shell = root?.closest<HTMLElement>('.site-shell')
    if (!root || !shell) return
    const nav = shell.querySelector<HTMLElement>('.global-nav')
    let frame = 0
    let rootTop = 0, boundary = 96
    const paint = () => {
      frame = 0
      const stop = Math.max(0, shell.scrollTop - rootTop + boundary)
      root.style.setProperty('--about-exit-stop', `${stop}px`)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const measure = () => {
      const shellTop = shell.getBoundingClientRect().top
      rootTop = root.getBoundingClientRect().top - shellTop + shell.scrollTop
      boundary = (nav?.getBoundingClientRect().bottom ?? shellTop + 64) - shellTop + 32
      paint()
    }
    measure()
    shell.addEventListener('scroll', schedule, { passive: true })
    shell.addEventListener('readinggeometrychange', measure)
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(shell); observer?.observe(root)
    if (nav) observer?.observe(nav)
    const home = shell.querySelector<HTMLElement>('#top')
    if (home) observer?.observe(home)
    return () => {
      cancelAnimationFrame(frame)
      shell.removeEventListener('scroll', schedule)
      shell.removeEventListener('readinggeometrychange', measure)
      window.removeEventListener('resize', measure)
      observer?.disconnect()
      root.style.removeProperty('--about-exit-stop')
    }
  }, [ref])
}

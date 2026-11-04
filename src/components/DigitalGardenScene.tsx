import { useLayoutEffect, useRef } from 'react'
import { backgroundFrame } from '../garden/backgroundFrame'
import { createGardenScene } from '../garden/scene'
import { capabilitiesBlurStart } from '../garden/aboutJourney'
import { readingJourney } from '../garden/readingJourney'

export function DigitalGardenScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  // Establish the original-region crop before the fallback can paint its first frame.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    let controller: ReturnType<typeof createGardenScene> | undefined

    try {
      controller = createGardenScene(container)
    } catch {
      container.dataset.webglFailed = 'true'
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const shell = container.closest<HTMLElement>('.site-shell')
    const plane = container.closest<HTMLElement>('.reading-garden-plane')
    const backdrop = container.closest<HTMLElement>('.shared-garden')
    const projects = shell?.querySelector<HTMLElement>('#projects')
    const about = shell?.querySelector<HTMLElement>('#about[data-about-chapter]')
    let frame = 0, disposed = false
    let width = 1, height = 1, timelineHeight = 1, projectStart = readingJourney.totalScreens, blurStart = projectStart
    const paintFraming = () => {
      frame = 0
      if (disposed) return
      const framing = backgroundFrame(width, height, shell?.scrollTop ?? 0, projectStart, motionQuery.matches, timelineHeight, !!about, blurStart)
      container.style.backgroundSize = `100% 100%, ${framing.imageWidth}px ${framing.imageHeight}px`
      container.style.backgroundPosition = `0 0, ${framing.imageX}px ${framing.imageY}px`
      backdrop?.style.setProperty('--background-defocus', String(framing.defocus))
      backdrop?.style.setProperty('--background-scale', String(framing.outerScale))
      backdrop?.style.setProperty('--reading-shade', String(framing.readingShade))
      if (plane) plane.style.transform = `translate3d(0, ${framing.innerY}px, 0) scale(${framing.innerScale})`
      controller?.setFraming(framing.crop)
    }
    const scheduleFraming = () => {
      if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(paintFraming)
    }
    const measure = () => {
      cancelAnimationFrame(frame); frame = 0
      const nextWidth = Math.max(container.clientWidth || window.innerWidth, 1)
      const nextHeight = Math.max(container.clientHeight || window.innerHeight, 1)
      const sizeChanged = width !== nextWidth || height !== nextHeight
      width = nextWidth
      height = nextHeight
      timelineHeight = Math.max(shell?.clientHeight || height, 1)
      const handoff = projects
      const handoffTop = handoff && shell ? handoff.getBoundingClientRect().top - shell.getBoundingClientRect().top + shell.scrollTop : timelineHeight * readingJourney.totalScreens
      projectStart = handoffTop
      const capabilities = about?.querySelector<HTMLElement>('.about-experience__capabilities')
      const contentBottom = capabilities && shell ? capabilities.getBoundingClientRect().bottom - shell.getBoundingClientRect().top + shell.scrollTop : projectStart
      blurStart = capabilitiesBlurStart(contentBottom, timelineHeight)
      if (sizeChanged) controller?.resize()
      paintFraming()
    }
    const syncMotion = () => { controller?.setReducedMotion(motionQuery.matches); scheduleFraming() }
    const handleVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0 }
      else scheduleFraming()
    }
    const handlePointerMove = (event: PointerEvent) =>
      controller?.setPointer(event.clientX, event.clientY, true)
    const handlePointerLeave = () =>
      controller?.setPointer(window.innerWidth * 0.72, window.innerHeight * 0.45, false)
    const handleResize = () => measure()

    syncMotion()
    measure()
    shell?.addEventListener('scroll', scheduleFraming, { passive: true })
    document.addEventListener('visibilitychange', handleVisibility)
    motionQuery.addEventListener('change', syncMotion)
    // 在 window 上监听：移动到 DOM 文字上方时仍持续追踪，让 quiet mode 平滑消退而非冻结
    window.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerleave', handlePointerLeave)
    window.addEventListener('resize', handleResize)
    shell?.addEventListener('readinggeometrychange', measure)

    return () => {
      disposed = true; cancelAnimationFrame(frame)
      shell?.removeEventListener('scroll', scheduleFraming)
      document.removeEventListener('visibilitychange', handleVisibility)
      motionQuery.removeEventListener('change', syncMotion)
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('resize', handleResize)
      shell?.removeEventListener('readinggeometrychange', measure)
      controller?.destroy()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="garden-scene"
      aria-hidden="true"
    />
  )
}

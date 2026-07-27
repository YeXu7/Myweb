import { useEffect, useRef } from 'react'
import { createGardenScene } from '../garden/scene'

export function DigitalGardenScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let controller: ReturnType<typeof createGardenScene> | undefined

    try {
      controller = createGardenScene(container)
    } catch {
      container.dataset.webglFailed = 'true'
      return
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => controller?.setReducedMotion(motionQuery.matches)
    const handlePointerMove = (event: PointerEvent) =>
      controller?.setPointer(event.clientX, event.clientY, true)
    const handlePointerLeave = () =>
      controller?.setPointer(window.innerWidth * 0.72, window.innerHeight * 0.45, false)
    const handleResize = () => controller?.resize()

    syncMotion()
    motionQuery.addEventListener('change', syncMotion)
    // 在 window 上监听：移动到 DOM 文字上方时仍持续追踪，让 quiet mode 平滑消退而非冻结
    window.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerleave', handlePointerLeave)
    window.addEventListener('resize', handleResize)

    return () => {
      motionQuery.removeEventListener('change', syncMotion)
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('resize', handleResize)
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

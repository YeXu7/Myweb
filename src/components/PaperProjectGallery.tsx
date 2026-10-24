import { useEffect, useRef, useState } from 'react'
import { projects } from '../garden/projects'
import { clamp01, paperWidth, advancePaperPhase, advancePaperFlex } from '../garden/paperGalleryMotion'
import { advancePaperScale, paperRenderOrder } from '../garden/paperGalleryInteraction'
import { createPaperGalleryScene } from '../garden/paperGalleryScene'
import { advanceFocus, advancePaperEmphasis, paperEmphasisTargets, focusLayout, paperPresentation, projectAspects, type PaperFocus, type PaperSnapshot } from '../garden/paperGalleryFocus'
import { createPaperSurfaceTracker } from '../garden/paperGallerySurface'
import { paperPool, paperCardIndex, projectIdentity, resolvePaperEntry, loopGalleryPhase, wheelPixels, applyGalleryDelta } from '../garden/paperGalleryLoop'
import { galleryEditorialMotion } from '../garden/galleryEditorial'
import { galleryProgress } from '../garden/galleryProgress'
import '../styles/paper-gallery.css'

function PaperButtonOutline() {
  return (
    <svg className="paper-gallery__button-outline" viewBox="0 0 140 50" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M27 3.5 C58 2 88 4.8 113 3.7 C127 3.2 136 12.2 136.5 24 C137 37.4 127.2 46.3 113 46 C82 45.1 56 47.8 27 46.2 C12.7 45.4 3.7 37.6 3.4 25.4 C3 13.2 12 4.6 27 3.5 Z" vectorEffect="non-scaling-stroke" />
      <path d="M25.5 5.8 C53 4.4 85 2.1 113.7 5.5 C128 6.8 138 14.8 135.2 27 C133.1 39.7 124.4 44.3 110.8 44.1 C82 44.4 53 46.5 26.4 44.5 C13.5 44.2 1.6 35.6 5.1 23 C7.6 11.2 13.1 6.6 25.5 5.8 Z" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function PaperProjectGallery() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [caption, setCaption] = useState({ index: 0, visible: false })
  const [centralProject, setCentralProject] = useState(0)
  const [reducedMode, setReducedMode] = useState(false)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const closeRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (focusIndex !== null) sectionRef.current?.querySelector<HTMLButtonElement>('[data-return]')?.focus({ preventScroll: true })
  }, [focusIndex])
  useEffect(() => {
    const section = sectionRef.current!
    const shell = section.closest<HTMLElement>('.site-shell')!
    const host = canvasRef.current!
    const sheets = Array.from(section.querySelectorAll<HTMLElement>('[data-sheet]'))
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-paper]'))
    const stage = section.querySelector<HTMLElement>('.paper-gallery__stage')!
    const chapter = section.querySelector<HTMLElement>('.paper-gallery__chapter')!
    const progressFill = section.querySelector<HTMLElement>('.paper-gallery__progress-fill')!
    const titleLine = chapter.querySelector<HTMLElement>('[data-chapter-title]')!
    const dateLine = chapter.querySelector<HTMLElement>('[data-chapter-date]')!
    const writeTransform = (element: HTMLElement, value: string) => { if (element.style.transform !== value) element.style.transform = value }
    const paintEditorial = (reduced: boolean) => {
      const entrance = galleryEditorialMotion(shell.scrollTop - start, height, reduced)
      writeTransform(titleLine, `translate3d(0, ${entrance.titleY.toFixed(2)}%, 0)`)
      writeTransform(dateLine, `translate3d(0, ${entrance.dateY.toFixed(2)}%, 0)`)
      writeTransform(chapter, `translate3d(0, ${entrance.groupY.toFixed(2)}px, 0)`)
    }
    const dialog = section.querySelector<HTMLElement>('.paper-gallery__focus')!
    const returnButton = dialog.querySelector<HTMLButtonElement>('[data-return]')!
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const hoverMedia = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    const fallback = createPaperSurfaceTracker(paperPool)
    let scene: ReturnType<typeof createPaperGalleryScene> | undefined
    let frame = 0, start = 0, travel = 1, disposed = false, ready = false
    let width = 1280, height = 720, intersecting = true
    let displayedPhase: number | null = null, lastTime = 0, previousScroll = shell.scrollTop, idleTime = 0
    let flex = { bend: 0, velocity: 0 }, scales = Array(8).fill(1) as number[], emphasis = paperEmphasisTargets(0, null)
    let pointer: { x: number; y: number; clientX: number; clientY: number } | null = null
    let hitPending = false, overflow = 0
    let drag: { pointerId: number; startY: number; lastY: number; active: boolean } | null = null
    let suppressClick = false
    let hovered: number | null = null, focused: number | null = null, keyboard = true
    let captionIndex = -1, captionVisible = false, progressIndex = 0
    let focus: (PaperFocus & { opening: boolean; snapshot: PaperSnapshot; scrollTop: number; trigger: HTMLElement; flexVelocity: number; scrollProgress: number; chapterHeight: number; originalMinHeight: string; loopProgress: number }) | null = null
    let restoreIsolation: (() => void) | null = null
    const isVisible = () => intersecting && shell.scrollTop + height > start && shell.scrollTop < start + travel + height
    const schedule = () => {
      if (!frame && !disposed && !document.hidden && (isVisible() || focus)) frame = requestAnimationFrame(paint)
    }
    const publishCaption = (index: number, visible: boolean) => {
      if (captionIndex !== index || captionVisible !== visible) {
        captionIndex = index; captionVisible = visible; setCaption({ index, visible })
      }
    }
    const isolate = () => {
      const previousOverflow = shell.style.overflow
      const previousScrollBehavior = shell.style.scrollBehavior
      const previousGutter = shell.style.scrollbarGutter
      const previousMinHeight = section.style.minHeight
      if (motion?.matches) section.style.minHeight = `${section.offsetHeight}px`
      const saved: Array<{ element: HTMLElement; inert: boolean; aria: string | null; visibility: string }> = []
      let branch: HTMLElement = section
      while (branch.parentElement) {
        for (const sibling of Array.from(branch.parentElement.children)) {
          if (sibling === branch || !(sibling instanceof HTMLElement)) continue
          saved.push({ element: sibling, inert: sibling.inert, aria: sibling.getAttribute('aria-hidden'), visibility: sibling.style.visibility })
          sibling.inert = true; sibling.setAttribute('aria-hidden', 'true')
          if (sibling.matches('.global-nav') || sibling.querySelector('.global-nav')) sibling.style.visibility = 'hidden'
        }
        branch = branch.parentElement
        if (branch === document.body) break
      }
      shell.style.scrollBehavior = 'auto'; shell.style.scrollbarGutter = 'stable'; shell.style.overflow = 'hidden'
      restoreIsolation = () => {
        // Restore document geometry before writing scrollTop; a temporarily short static
        // gallery would clamp the saved position before its full-size covers return.
        if (motion?.matches) {
          stage.style.opacity = '1'; sheets.forEach((sheet, i) => { sheet.style.cssText = ''; sheet.hidden = i > 8 })
        }
        section.style.minHeight = previousMinHeight
        shell.style.overflow = previousOverflow; shell.style.scrollbarGutter = previousGutter
        if (focus) shell.scrollTop = focus.scrollTop
        shell.style.scrollBehavior = previousScrollBehavior
        saved.forEach(({ element, inert, aria, visibility }) => {
          element.inert = inert; element.style.visibility = visibility
          if (aria === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', aria)
        })
      }
    }
    const finishReturn = () => {
      if (!focus) return
      const returning = focus
      displayedPhase = returning.snapshot.phase; scales = [...returning.snapshot.scales]; emphasis = returning.snapshot.emphasis!
      flex = { bend: returning.snapshot.flutter, velocity: returning.flexVelocity }; idleTime = returning.snapshot.idleTime
      section.dataset.focus = 'false'
      restoreIsolation?.(); restoreIsolation = null
      overflow = motion?.matches ? 0 : returning.loopProgress * travel
      previousScroll = returning.scrollTop + overflow
      focus = null; setFocusIndex(null)
      hovered = null; pointer = null; focused = null
      cards.forEach(card => { card.tabIndex = card.hidden ? -1 : 0; card.setAttribute('aria-hidden', String(card.hidden)) })
      const returnTarget = motion?.matches ? cards[projectIdentity(returning.index)] : returning.trigger
      returnTarget.focus({ preventScroll: true })
      schedule()
    }
    const openFocus = (index: number, trigger = cards[index]) => {
      if (focus) return
      finishDrag()
      focus = {
        index, progress: motion?.matches ? 1 : 0, opening: true, scrollTop: shell.scrollTop, trigger, flexVelocity: flex.velocity, scrollProgress: (shell.scrollTop - start) / travel, chapterHeight: section.offsetHeight, originalMinHeight: section.style.minHeight, loopProgress: overflow / travel,
        snapshot: { phase: displayedPhase ?? loopGalleryPhase((shell.scrollTop - start + overflow) / travel), scales: [...scales], flutter: flex.bend, idleTime, emphasis: { dimming: [...emphasis.dimming], spacing: [...emphasis.spacing], clarity: [...emphasis.clarity] } },
      }
      isolate(); section.dataset.focus = 'true'; setFocusIndex(projectIdentity(index))
      dialog.style.opacity = motion?.matches ? '1' : '0'
      dialog.style.top = `${focusLayout(width, height, projectAspects[projectIdentity(index)]).controlsTop}px`
      sheets.forEach(sheet => { sheet.style.width = `${paperWidth(width, height)}px` })
      publishCaption(projectIdentity(index), false); schedule()
    }
    const closeFocus = () => {
      if (!focus) return
      focus.opening = false
      if (motion?.matches) finishReturn()
      schedule()
    }
    closeRef.current = closeFocus
    const domHit = (clientX: number, clientY: number) => {
      const element = document.elementFromPoint?.(clientX, clientY)?.closest<HTMLElement>('[data-sheet]')
      return element?.hasAttribute('data-paper') && section.contains(element) && element.getAttribute('aria-hidden') !== 'true' ? Number(element.dataset.cardIndex) : null
    }
    const hitAt = (clientX: number, clientY: number) => {
      const rect = stage.getBoundingClientRect() // Event-only read; never in the idle frame loop.
      const x = clientX - rect.left, y = clientY - rect.top
      if (x < 0 || y < 0 || x > width || y > height) return null
      return ready && scene ? scene.hitTest(x, y) : domHit(clientX, clientY)
    }
    const applyTone = (sheet: HTMLElement, brightness: number, rim: number) => {
      sheet.style.setProperty('--paper-brightness', String(brightness))
      // The cover's brightness filter also affects its border, so compensate the
      // border colour separately. Text captions are outside this filter.
      const ratio = rim / brightness
      sheet.style.setProperty('--paper-border', `rgb(${241 * ratio} ${239 * ratio} ${229 * ratio} / 80%)`)
    }
    const paint = (time: number) => {
      frame = 0
      if (disposed || document.hidden || (!focus && !isVisible())) { lastTime = 0; return }
      const reduced = motion?.matches ?? false
      section.dataset.reduced = String(reduced)
      paintEditorial(reduced)
      section.dataset.keyboardPreview = String(keyboard && focused !== null && !focus)
      if (reduced && !focus) {
        stage.style.opacity = '1'
        const selected = focused ?? hovered
        emphasis = paperEmphasisTargets(0, selected)
        sheets.forEach((card, i) => { card.style.cssText = ''; applyTone(card, 1 - .7 * emphasis.dimming[i], 1 - .82 * emphasis.dimming[i]) })
        cards.forEach(card => { card.setAttribute('aria-hidden', String(card.hidden)); card.tabIndex = card.hidden ? -1 : 0 })
        publishCaption(selected === null ? 0 : projectIdentity(selected), selected !== null)
        return
      }
      const dt = lastTime ? Math.max(1, Math.min(time - lastTime, 50)) : 16
      lastTime = time
      const target = loopGalleryPhase((shell.scrollTop - start + overflow) / travel)
      if (focus) {
        focus.progress = reduced ? (focus.opening ? 1 : 0) : advanceFocus(focus.progress, focus.opening, dt)
        if (!focus.opening && focus.progress === 0) { finishReturn(); return }
      } else {
        displayedPhase = advancePaperPhase(displayedPhase ?? target, target, dt)
        if (displayedPhase !== target) hitPending = true
        const scrollSpeed = (shell.scrollTop + overflow - previousScroll) / Math.max(1, height) / dt * 1000
        flex = advancePaperFlex(flex, scrollSpeed, dt); previousScroll = shell.scrollTop + overflow
        idleTime += dt / 1000
        const selected = focused ?? hovered
        scales = scales.map((scale, i) => advancePaperScale(scale, i === selected, dt))
        const targets = paperEmphasisTargets(displayedPhase, selected)
        emphasis = {
          dimming: emphasis.dimming.map((value, i) => advancePaperEmphasis(value, targets.dimming[i], dt)),
          clarity: emphasis.clarity.map((value, i) => advancePaperEmphasis(value, targets.clarity[i], dt)),
          spacing: emphasis.spacing.map((value, i) => advancePaperEmphasis(value, targets.spacing[i], dt)),
        }
      }
      const snapshot: PaperSnapshot = focus?.snapshot ?? { phase: displayedPhase ?? target, scales, flutter: flex.bend, idleTime, emphasis }
      const { phase } = snapshot
      const reveal = focus ? 1 : clamp01((shell.scrollTop - start + height * .12) / (height * .22))
      const selected = focused ?? hovered
      stage.style.opacity = String(reveal); section.dataset.phase = phase.toFixed(4)
      ready = reveal > 0 && !reduced && (scene?.paint(phase, snapshot.flutter, snapshot.scales, selected, snapshot.idleTime, focus, snapshot.emphasis) ?? false)
      section.dataset.canvasReady = String(ready)
      sheets.forEach((sheet, i) => {
        const entry = resolvePaperEntry(paperPool[i], phase)
        const pose = paperPresentation(entry, width, height, entry.projectIndex === null ? 16 / 9 : projectAspects[entry.projectIndex], snapshot, focus)
        const order = paperRenderOrder(entry, phase)
        sheet.style.transform = `translate3d(calc(-50% + ${pose.x}px), calc(-50% - ${pose.y}px), ${pose.z}px) rotateX(${-pose.rotateX}rad) rotateY(${pose.rotateY}rad) rotateZ(${-pose.rotateZ}rad) scale(${pose.scale})`
        sheet.style.opacity = String(pose.opacity); sheet.style.zIndex = String(order)
        sheet.style.filter = `blur(${(Math.min(1, Math.abs(phase - entry.slot) / 2.5) ** 2 * 3 * (1 - pose.clarity) * (1 - (focus?.progress ?? 0))).toFixed(2)}px)${entry.projectIndex === null ? ` brightness(${pose.brightness})` : ''}`
        applyTone(sheet, pose.brightness, pose.rimBrightness)
        if (!ready) fallback.update(i, { ...pose, bend: 0, flutter: 0 }, order)
      })
      cards.forEach((card, i) => {
        const bounds = ready ? scene?.bounds(i) : fallback.bounds(i)
        const visible = !focus && reveal > 0 && !!bounds && bounds.right > 0 && bounds.left < width && bounds.bottom > 0 && bounds.top < height
        card.setAttribute('aria-hidden', String(!visible)); card.tabIndex = visible ? 0 : -1
        if (!visible && hovered === i && !focus) hovered = null
        if (!visible && focused === i && !focus) {
          focused = null
          if (document.activeElement === card) stage.focus({ preventScroll: true })
        }
      })
      if (focus) {
        const layout = focusLayout(width, height, projectAspects[projectIdentity(focus.index)])
        dialog.style.top = `${layout.controlsTop}px`
        dialog.style.opacity = String(Math.min(1, focus.progress * 2))
        if (focus.progress !== (focus.opening ? 1 : 0)) schedule()
        return
      }
      if (pointer && hoverMedia?.matches && hitPending) {
        // Local coordinates are cached by the pointer event and remain valid in the sticky viewport.
        if (ready && scene) hovered = scene.hitTest(pointer.x, pointer.y)
        else hovered = domHit(pointer.clientX, pointer.clientY)
        hitPending = false
      }
      const active = focused ?? hovered
      const browsing = galleryProgress((shell.scrollTop - start + overflow) / travel)
      writeTransform(progressFill, `scaleX(${browsing.fill.toFixed(5)})`)
      if (browsing.project !== progressIndex) { progressIndex = browsing.project; setCentralProject(browsing.project) }
      const current = projectIdentity(Math.max(0, Math.round(phase)))
      publishCaption(active === null ? current : projectIdentity(active), reveal > 0 && (active !== null || !hoverMedia?.matches))
      if (reveal > 0) schedule()
    }
    const clearInteraction = () => { pointer = null; hovered = null; focused = null; section.dataset.keyboardPreview = 'false'; schedule() }
    const writeScroll = (value: number) => {
      const behavior = shell.style.scrollBehavior
      shell.style.scrollBehavior = 'auto'; shell.scrollTop = value; shell.style.scrollBehavior = behavior
    }
    const browse = (delta: number) => {
      const next = applyGalleryDelta(shell.scrollTop, overflow, delta, start + travel)
      overflow = next.overflow; writeScroll(next.native)
      hitPending = true; syncOffscreen(); schedule()
    }
    const finishDrag = () => {
      if (!drag) return
      const ended = drag; drag = null
      section.dataset.dragging = 'false'
      if (ended.active) suppressClick = true
      if (stage.hasPointerCapture?.(ended.pointerId)) stage.releasePointerCapture(ended.pointerId)
    }
    const dragMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      if (focus || motion?.matches || document.hidden || !isVisible()) { finishDrag(); return }
      if (event.buttons === 0) { finishDrag(); return }
      const displacement = drag.startY - event.clientY
      if (!drag.active && Math.abs(displacement) < 6) return
      if (!drag.active) {
        drag.active = true; stage.setPointerCapture?.(event.pointerId)
        section.dataset.dragging = 'true'; clearInteraction()
      }
      event.preventDefault()
      browse(drag.lastY - event.clientY); drag.lastY = event.clientY
    }
    const pointerMove = (event: PointerEvent) => {
      if (drag?.active || focus || event.pointerType === 'touch' || !hoverMedia?.matches) return
      keyboard = false; focused = null
      if ((event.target as Element).closest('.paper-gallery__index')) { pointerLeave(); return }
      if (motion?.matches) hovered = domHit(event.clientX, event.clientY)
      const rect = stage.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, clientX: event.clientX, clientY: event.clientY }; hitPending = true; schedule()
    }
    const pointerLeave = () => { pointer = null; hovered = null; schedule() }
    const pointerDown = (event: PointerEvent) => {
      if (focus) return
      keyboard = false; focused = null; suppressClick = false; schedule()
      if (motion?.matches || event.button !== 0 || (event.pointerType && event.pointerType !== 'mouse') || !isVisible()) return
      if ((event.target as HTMLElement).closest('button, a, .paper-gallery__focus, .paper-gallery__index')) return
      drag = { pointerId: event.pointerId, startY: event.clientY, lastY: event.clientY, active: false }
    }
    const pointerEnd = (event: PointerEvent) => { if (drag && drag.pointerId === event.pointerId) finishDrag() }
    const wheel = (event: WheelEvent) => {
      if (motion?.matches || focus || event.ctrlKey || !isVisible() || shell.scrollTop < start) return
      const delta = wheelPixels(event.deltaY, event.deltaMode, height)
      if (!Number.isFinite(delta) || delta === 0 || (overflow === 0 && shell.scrollTop + delta <= start + travel)) return
      event.preventDefault(); browse(delta)
    }
    const windowBlur = () => { finishDrag(); clearInteraction() }
    const preventNativeDrag = (event: DragEvent) => { if (!motion?.matches && !focus) event.preventDefault() }
    const click = (event: MouseEvent) => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); return }
      if (focus || (event.target as HTMLElement).closest('.paper-gallery__focus, .paper-gallery__index')) return
      let index: number | null
      if (motion?.matches) {
        const card = (event.target as HTMLElement).closest<HTMLElement>('[data-paper]')
        index = card ? Number(card.dataset.cardIndex) : null
      } else index = hitAt(event.clientX, event.clientY)
      if (index !== null) openFocus(index)
    }
    const keyDown = (event: KeyboardEvent) => {
      if (focus) {
        if (event.key === 'Escape') { event.preventDefault(); closeFocus() }
        if (event.key === 'Tab') {
          event.preventDefault()
          const actions = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'))
          const current = actions.indexOf(document.activeElement as HTMLElement)
          const next = current < 0 ? 0 : (current + (event.shiftKey ? -1 : 1) + actions.length) % actions.length
          actions[next]?.focus({ preventScroll: true })
        }
        return
      }
      if (event.key === 'Tab') keyboard = true
      if (event.key === 'Enter' || event.key === ' ') {
        const card = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-paper]') : null
        if (card && section.contains(card) && card.getAttribute('aria-hidden') !== 'true') {
          event.preventDefault(); openFocus(Number(card.dataset.cardIndex), card)
        }
      }
    }
    const focusIn = (event: FocusEvent) => {
      if (focus) {
        if (!dialog.contains(event.target as Node)) returnButton.focus({ preventScroll: true })
        return
      }
      const card = (event.target as HTMLElement).closest<HTMLElement>('[data-paper]')
      if (keyboard && card && card.getAttribute('aria-hidden') !== 'true') { focused = Number(card.dataset.cardIndex); schedule() }
    }
    const focusOut = () => { if (!focus) { focused = null; schedule() } }
    const syncOffscreen = () => {
      if (focus) return
      if (motion?.matches) {
        cards.forEach(card => { card.tabIndex = card.hidden ? -1 : 0; card.setAttribute('aria-hidden', String(card.hidden)) })
      } else if (!isVisible()) {
        finishDrag()
        pointer = null; hovered = null; focused = null
        cards.forEach(card => {
          card.tabIndex = -1; card.setAttribute('aria-hidden', 'true')
          if (document.activeElement === card) card.blur()
        })
        publishCaption(Math.max(0, captionIndex), false)
      }
    }
    const measure = () => {
      const previousWidth = width, previousHeight = height, previousTravel = travel
      hitPending = true
      start = section.getBoundingClientRect().top - shell.getBoundingClientRect().top + shell.scrollTop
      width = host.clientWidth || shell.clientWidth || 1280; height = shell.clientHeight || 720
      travel = Math.max(1, section.offsetHeight - height)
      const resized = width !== previousWidth || height !== previousHeight || travel !== previousTravel
      if (resized) {
        overflow = overflow / previousTravel * travel
        if (!focus && overflow > 0) writeScroll(start + travel)
        previousScroll = shell.scrollTop + overflow
      }
      if (focus && (width !== previousWidth || height !== previousHeight)) {
        focus.scrollTop = start + focus.scrollProgress * travel
        shell.scrollTop = focus.scrollTop; previousScroll = focus.scrollTop
      }
      if (focus && !motion?.matches) focus.chapterHeight = section.offsetHeight
      syncOffscreen()
      paintEditorial(motion?.matches ?? false)
      if (motion?.matches && !focus) {
        stage.style.opacity = '1'; sheets.forEach(sheet => { sheet.style.cssText = '' })
      } else sheets.forEach(sheet => { sheet.style.width = `${paperWidth(width, height)}px` })
      fallback.resize(width, height); scene?.resize(); schedule()
    }
    const configure = () => {
      setReducedMode(motion?.matches ?? false)
      finishDrag()
      sheets.forEach((sheet, i) => { sheet.hidden = !!motion?.matches && i > 8 && paperCardIndex(paperPool[i]) !== focus?.index })
      if (motion?.matches) overflow = 0
      if (focus) section.style.minHeight = motion?.matches ? `${focus.chapterHeight}px` : focus.originalMinHeight
      scene?.destroy(); scene = undefined; ready = false
      clearInteraction(); lastTime = 0; previousScroll = shell.scrollTop + overflow
      delete host.dataset.failed; section.dataset.canvasReady = 'false'
      section.dataset.reduced = String(motion?.matches ?? false)
      if (!motion?.matches && typeof WebGLRenderingContext !== 'undefined') {
        try { scene = createPaperGalleryScene(host, projects.map(p => p.image), schedule) }
        catch { host.replaceChildren(); section.dataset.canvasReady = 'false' }
      }
      measure()
    }
    const contextLost = (event: Event) => {
      event.preventDefault(); scene?.destroy(); scene = undefined; ready = false
      section.dataset.canvasReady = 'false'; clearInteraction()
    }
    const scroll = () => {
      if (!focus && overflow > 0 && shell.scrollTop < start + travel - 1) { overflow = 0; displayedPhase = null; clearInteraction() }
      hitPending = true
      syncOffscreen()
      if (focus && shell.scrollTop !== focus.scrollTop) shell.scrollTop = focus.scrollTop
      if (!isVisible() && !focus) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; previousScroll = shell.scrollTop + overflow }
      else schedule()
    }
    const visibility = () => {
      if (document.hidden) finishDrag()
      cancelAnimationFrame(frame); frame = 0; lastTime = 0; previousScroll = shell.scrollTop + overflow
      if (!document.hidden) schedule()
    }
    host.addEventListener('webglcontextlost', contextLost, true)
    stage.addEventListener('pointermove', pointerMove); stage.addEventListener('pointerleave', pointerLeave)
    stage.addEventListener('pointerdown', pointerDown); stage.addEventListener('click', click)
    document.addEventListener('focusin', focusIn); stage.addEventListener('focusout', focusOut)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('keydown', keyDown); window.addEventListener('blur', windowBlur)
    window.addEventListener('pointermove', dragMove, { passive: false })
    window.addEventListener('pointerup', pointerEnd); window.addEventListener('pointercancel', pointerEnd)
    stage.addEventListener('lostpointercapture', pointerEnd); stage.addEventListener('dragstart', preventNativeDrag)
    shell.addEventListener('wheel', wheel, { passive: false })
    configure()
    shell.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('resize', measure)
    motion?.addEventListener('change', configure); hoverMedia?.addEventListener('change', clearInteraction)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(section)
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      intersecting = entries[0]?.isIntersecting ?? true
      syncOffscreen()
      if (!intersecting && !focus) { cancelAnimationFrame(frame); frame = 0; lastTime = 0 }
      else schedule()
    }, { root: shell })
    intersection?.observe(section)
    return () => {
      disposed = true; finishDrag(); cancelAnimationFrame(frame); observer?.disconnect(); intersection?.disconnect(); scene?.destroy(); fallback.destroy()
      section.dataset.focus = 'false'; restoreIsolation?.()
      closeRef.current = () => {}
      shell.removeEventListener('scroll', scroll); window.removeEventListener('resize', measure)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('blur', windowBlur)
      window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', pointerEnd); window.removeEventListener('pointercancel', pointerEnd)
      stage.removeEventListener('lostpointercapture', pointerEnd); stage.removeEventListener('dragstart', preventNativeDrag)
      shell.removeEventListener('wheel', wheel)
      document.removeEventListener('focusin', focusIn); document.removeEventListener('visibilitychange', visibility)
      motion?.removeEventListener('change', configure); hoverMedia?.removeEventListener('change', clearInteraction)
      host.removeEventListener('webglcontextlost', contextLost, true)
      stage.removeEventListener('pointermove', pointerMove); stage.removeEventListener('pointerleave', pointerLeave)
      stage.removeEventListener('pointerdown', pointerDown); stage.removeEventListener('click', click); stage.removeEventListener('focusout', focusOut)
    }
  }, [])

  return (
    <section id="projects" ref={sectionRef} className="paper-gallery" aria-label="Selected project gallery">
      <div className="paper-gallery__stage" tabIndex={-1}>
        <div className="paper-gallery__chapter" aria-hidden={focusIndex !== null}>
          <h2><span data-chapter-title>Selected works</span></h2>
          <p><span data-chapter-date>from 2023-2026</span></p>
        </div>
        <aside className="paper-gallery__index" data-preview={caption.visible} aria-label="Project index" aria-hidden={focusIndex !== null}>
          <h3>TAKE A CLOSER LOOK</h3>
          <ol>
            {projects.map((project, index) => {
              const selected = caption.visible && caption.index === index
              return (
                <li className="paper-gallery__index-entry" data-active={selected} data-position={!caption.visible ? 'rest' : selected ? 'selected' : index < caption.index ? 'before' : 'after'} aria-current={selected ? 'true' : undefined} key={project.id}>
                  <span className="paper-gallery__index-symbol" aria-hidden="true">{selected ? '-' : ''}</span>
                  <span className="paper-gallery__index-number">{project.id}<span aria-hidden="true"> / </span></span>
                  <span className="paper-gallery__index-label">
                    <span className="paper-gallery__index-name">{project.title}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </aside>
        <div className="paper-gallery__canvas" ref={canvasRef} />
        <div className="paper-gallery__papers">
          {paperPool.map(entry => entry.projectIndex === null ? (
            <div className="paper-gallery__paper paper-gallery__paper--blank" data-sheet data-decoration aria-hidden="true" key={`blank-${entry.slot}`} />
          ) : (
            <figure className="paper-gallery__paper" data-sheet data-paper data-project-index={entry.projectIndex} data-card-index={entry.cardIndex} tabIndex={0} role="button" aria-haspopup="dialog" aria-label={`${projects[entry.projectIndex].title} — ${projects[entry.projectIndex].type}`} key={`project-${entry.cardIndex}`}>
              <img src={projects[entry.projectIndex].image} alt={`${projects[entry.projectIndex].title} — ${projects[entry.projectIndex].type}`} width={entry.projectIndex === 1 || entry.projectIndex === 2 ? 1672 : 1920} height={entry.projectIndex === 1 || entry.projectIndex === 2 ? 941 : 1080} />
              <figcaption className="paper-gallery__static-caption"><strong>{projects[entry.projectIndex].title}</strong><span><span className="paper-gallery__static-type">{projects[entry.projectIndex].type}</span> · {projects[entry.projectIndex].id} / 04</span></figcaption>
            </figure>
          ))}
        </div>
        <div className="paper-gallery__focus" role="dialog" aria-modal="true" aria-labelledby="paper-focus-title" hidden={focusIndex === null}>
          <h2 id="paper-focus-title">{projects[focusIndex ?? 0].title}</h2>
          <div className="paper-gallery__actions">
            <button type="button" data-return onClick={() => closeRef.current()}><PaperButtonOutline /><span>返回</span></button>
            {focusIndex === 0 ? (
              <a className="paper-gallery__view" href={`${import.meta.env.BASE_URL}projects/lingji/`}><PaperButtonOutline /><span>查看</span></a>
            ) : (
              <button type="button" className="paper-gallery__view" disabled aria-describedby="paper-focus-unavailable"><PaperButtonOutline /><span>查看</span></button>
            )}
          </div>
          <span id="paper-focus-unavailable" hidden>项目详情暂未开放</span>
        </div>
        <div className="paper-gallery__progress" role="img" aria-label={`Project ${centralProject + 1} of ${projects.length}`} aria-hidden={focusIndex !== null || reducedMode}>
          <span className="paper-gallery__progress-track" aria-hidden="true">
            <span className="paper-gallery__progress-fill" />
          </span>
          <span aria-hidden="true">{projects[centralProject].id} / 04</span>
        </div>
      </div>
    </section>
  )
}

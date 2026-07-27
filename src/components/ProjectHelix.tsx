import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import vineColumn from '../assets/vine-column.png'
import { projects } from '../garden/projects'

const N = projects.length
const STEP = (Math.PI * 2) / N

// --- Unified helix geometry (single source of truth) ---
const RADIUS = 400 // horizontal orbit radius around the vine axis
const Y_AMP = 160 // vertical rise/fall amplitude -> upper-left / lower-right offset
const CAM_Z = 1200 // camera distance
const FOV = 40
const CARD_SCALE = 0.48 // base shrink of every card (keeps internal layout intact)
const FRONT_SCALE = CARD_SCALE * 1.265 // front card enlarged further (~15% then +10%)
const SIDE_SCALE = CARD_SCALE * 1.21 // side cards enlarged further (+10% then +10%)

// motion tuning
const FRICTION = 0.85 // inertia decay per frame (higher friction than before -> settles sooner)
const WHEEL_GAIN = 0.0003 // wheel delta -> angular velocity
const DRAG_GAIN = 0.004 // pointer drag px -> angular velocity
const MAX_VEL = 0.42 // clamp so a hard flick travels ~2-3 cards, never several turns
const SNAP_EASE = 0.1 // ease toward nearest card when idle
const CHASE_EASE = 0.12 // ease toward menu target
const VELOCITY_EPS = 0.0004

function clampVel(v: number) {
  return Math.max(-MAX_VEL, Math.min(MAX_VEL, v))
}

function wrapPhase(value: number) {
  const full = Math.PI * 2
  return ((value % full) + full) % full
}

export function ProjectHelix() {
  const [activeIndex, setActiveIndex] = useState(0)

  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const vineRef = useRef<HTMLDivElement>(null)

  // continuous motion state (kept in refs so the rAF loop stays stable)
  const phaseRef = useRef(0)
  const velocityRef = useRef(0)
  const targetRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef(0)
  const activeIndexRef = useRef(0)

  const goToIndex = useCallback((index: number) => {
    // choose the shortest continuous path toward that card's front phase
    const current = phaseRef.current
    const raw = index * STEP
    const full = Math.PI * 2
    let delta = ((raw - current) % full + full) % full
    if (delta > Math.PI) delta -= full
    targetRef.current = current + delta
    velocityRef.current = 0
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const cards = cardRefs.current.filter(Boolean) as HTMLElement[]
    const vineEl = vineRef.current
    if (cards.length !== N || !vineEl) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 5000)
    camera.position.set(0, 0, CAM_Z)
    camera.lookAt(0, 0, 0)

    const renderer = new CSS3DRenderer()
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.pointerEvents = 'none'
    stage.appendChild(renderer.domElement)

    // central vine plane lives in the same 3D scene so cards orbiting behind it
    // get occluded by real depth ordering (painter's algorithm on transformed DOM)
    const vineObject = new CSS3DObject(vineEl)
    vineObject.position.set(0, 0, 0)
    vineEl.style.pointerEvents = 'none'
    scene.add(vineObject)

    const cardObjects = cards.map((el) => {
      const obj = new CSS3DObject(el)
      scene.add(obj)
      return obj
    })

    const resize = () => {
      const w = stage.clientWidth
      const h = stage.clientHeight
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    resize()

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const layout = (phase: number) => {
      for (let i = 0; i < cardObjects.length; i += 1) {
        const theta = i * STEP - phase
        const sin = Math.sin(theta)
        const cos = Math.cos(theta)
        const obj = cardObjects[i]
        obj.position.x = RADIUS * sin
        obj.position.z = RADIUS * cos
        obj.position.y = -Y_AMP * sin
        obj.rotation.y = theta // card faces outward along the orbit tangent

        // derived visual attributes, all mapped from the same facing value
        const facing = (cos + 1) / 2 // 1 = dead-front, 0 = directly behind
        // front card ~15% larger, side cards ~10% larger; interpolate by facing
        const scale = SIDE_SCALE + (FRONT_SCALE - SIDE_SCALE) * (facing * facing)
        obj.scale.setScalar(scale)
        const el = cards[i]
        const opacity = 0.14 + facing * facing * 0.86
        const blur = (1 - facing) * 5
        const brightness = 0.5 + facing * 0.5
        el.style.opacity = opacity.toFixed(3)
        el.style.filter = `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)})`
        el.style.pointerEvents = facing > 0.72 ? 'auto' : 'none'
        el.dataset.facing = facing.toFixed(2)
        el.dataset.helixSlot =
          facing > 0.72 ? 'front' : cos >= 0 ? 'side' : 'back'
      }

      const idx = ((Math.round(phase / STEP) % N) + N) % N
      if (idx !== activeIndexRef.current) {
        activeIndexRef.current = idx
        setActiveIndex(idx)
      }
    }

    let raf = 0
    const tick = () => {
      if (targetRef.current !== null) {
        // menu-driven chase: continuous glide toward a specific card
        const diff = targetRef.current - phaseRef.current
        phaseRef.current += diff * CHASE_EASE
        if (Math.abs(diff) < 0.001) {
          phaseRef.current = targetRef.current
          targetRef.current = null
        }
      } else {
        phaseRef.current += velocityRef.current
        velocityRef.current *= FRICTION
        if (!draggingRef.current && Math.abs(velocityRef.current) < VELOCITY_EPS) {
          // idle -> snap to nearest card angle
          const nearest = Math.round(phaseRef.current / STEP) * STEP
          phaseRef.current += (nearest - phaseRef.current) * SNAP_EASE
          velocityRef.current = 0
        }
      }

      layout(phaseRef.current)
      renderer.render(scene, camera)
      raf = window.requestAnimationFrame(tick)
    }

    if (prefersReduced) {
      layout(0)
      renderer.render(scene, camera)
    } else {
      raf = window.requestAnimationFrame(tick)
    }

    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      renderer.domElement.remove()
    }
  }, [])

  const onWheel = useCallback((event: React.WheelEvent) => {
    if (Math.abs(event.deltaY) < 2) return
    event.preventDefault()
    targetRef.current = null
    velocityRef.current = clampVel(velocityRef.current + event.deltaY * WHEEL_GAIN)
  }, [])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    draggingRef.current = true
    lastPointerRef.current = event.clientX
    targetRef.current = null
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!draggingRef.current) return
    const dx = event.clientX - lastPointerRef.current
    lastPointerRef.current = event.clientX
    velocityRef.current = clampVel(-dx * DRAG_GAIN)
    phaseRef.current += -dx * DRAG_GAIN
  }, [])

  const endDrag = useCallback(() => {
    draggingRef.current = false
  }, [])

  const orderedProjects = useMemo(() => projects, [])

  return (
    <section
      className="project-installation snap-section"
      id="projects"
      aria-label="Immersive vine project installation"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div className="project-installation__ambient" aria-hidden="true" />

      <div className="project-installation__left-panel">
        <p className="project-installation__label">WHAT ARE YOU LOOKING FOR?</p>
        <ul className="project-installation__menu" aria-label="Project index">
          {orderedProjects.map((project, index) => (
            <li key={project.id}>
              <button
                type="button"
                className="project-installation__menu-item"
                data-active={index === activeIndex}
                onClick={() => goToIndex(index)}
              >
                -&gt; {project.id} / {project.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="project-installation__stage" ref={stageRef} aria-live="polite">
        {/* 3D layers below are handed over to CSS3DRenderer on mount */}
        <div
          className="project-installation__vine"
          ref={vineRef}
          role="img"
          aria-label="Wet digital vine installation"
        >
          <img src={vineColumn} alt="" />
        </div>

        {orderedProjects.map((project, index) => {
          const isActive = index === activeIndex
          return (
            <article
              className="installation-card"
              data-helix-slot={index === 0 ? 'front' : 'side'}
              data-active={isActive}
              key={project.id}
              ref={(node) => {
                cardRefs.current[index] = node
              }}
              onClick={() => goToIndex(index)}
              aria-label={`${project.id} ${project.title} installation project card`}
            >
              <div className="installation-card__curve" aria-hidden="true" />
              <header className="installation-card__head">
                <p className="installation-card__number" data-active={isActive}>
                  {project.id} {project.title}
                </p>
                <p className="installation-card__tags">
                  {project.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </p>
              </header>
              <figure className="installation-card__media">
                <img src={project.image} alt={`${project.title} project cover`} />
              </figure>
            </article>
          )
        })}
      </div>

      <p className="project-installation__index">03 / 03</p>
    </section>
  )
}

import * as THREE from 'three'
import gardenTextureUrl from '../assets/digital-garden-hero.png'
import { calculatePointerVelocity, normalizePointer } from './interaction'
import { fragmentShader, vertexShader } from './shaders'

export type GardenSceneController = {
  destroy: () => void
  resize: () => void
  setPointer: (clientX: number, clientY: number, active?: boolean) => void
  setReducedMotion: (reduced: boolean) => void
}

export function createGardenScene(container: HTMLElement): GardenSceneController {
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: false,
    powerPreference: isCoarsePointer ? 'low-power' : 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.25 : 2))
  renderer.setClearColor(0x051916, 1)
  renderer.domElement.className = 'garden-canvas'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const texture = new THREE.TextureLoader().load(gardenTextureUrl, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace
    uniforms.uImageResolution.value.set(
      loaded.image.naturalWidth || loaded.image.width,
      loaded.image.naturalHeight || loaded.image.height,
    )
  })
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const uniforms = {
    uTexture: { value: texture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uImageResolution: { value: new THREE.Vector2(2048, 1152) },
    uPointer: { value: new THREE.Vector2(0.72, 0.45) },
    uPointerTarget: { value: new THREE.Vector2(0.72, 0.45) },
    uTime: { value: 0 },
    uPointerPower: { value: 0 },
    uVelocity: { value: 0 },
    uReducedMotion: { value: 0 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  scene.add(mesh)

  let frame = 0
  let destroyed = false
  let pointerActive = false
  let reducedMotion = false
  const startedAt = performance.now()
  let previousPointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }
  let previousTime = performance.now()

  const resize = () => {
    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)
    renderer.setSize(width, height, false)
    uniforms.uResolution.value.set(width, height)
  }

  const renderFrame = () => {
    if (destroyed) return

    const damping = reducedMotion ? 0.03 : 0.2
    uniforms.uPointer.value.lerp(uniforms.uPointerTarget.value, damping)
    // 进入即时（快速上升），离开缓慢消退
    const targetPower = pointerActive && !reducedMotion ? 1 : 0
    const powerEase = targetPower > uniforms.uPointerPower.value ? 0.34 : 0.06
    uniforms.uPointerPower.value +=
      (targetPower - uniforms.uPointerPower.value) * powerEase
    uniforms.uVelocity.value *= 0.93
    uniforms.uTime.value = reducedMotion
      ? 0
      : (performance.now() - startedAt) / 1000
    renderer.render(scene, camera)
  }

  const startLoop = () => {
    if (destroyed || document.hidden || reducedMotion || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      renderFrame()
      startLoop()
    })
  }

  const renderStaticFrame = () => {
    if (frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
    renderFrame()
  }

  const setPointer = (clientX: number, clientY: number, active = true) => {
    const rect = container.getBoundingClientRect()
    const normalized = normalizePointer(
      clientX - rect.left,
      clientY - rect.top,
      rect.width,
      rect.height,
    )
    const uvX = normalized.x * 0.5 + 0.5
    const uvY = normalized.y * 0.5 + 0.5
    uniforms.uPointerTarget.value.set(uvX, uvY)

    // 左侧文字 / 导航 / 底部信息区进入 quiet mode：不触发强磁场扭曲
    const inQuietZone = uvX < 0.46 && uvY > 0.16 && uvY < 0.84

    const now = performance.now()
    uniforms.uVelocity.value = calculatePointerVelocity(
      previousPointer.x,
      previousPointer.y,
      clientX,
      clientY,
      now - previousTime,
    )
    previousPointer = { x: clientX, y: clientY }
    previousTime = now
    pointerActive = active && !inQuietZone
    if (reducedMotion) renderStaticFrame()
  }

  const setReducedMotion = (reduced: boolean) => {
    reducedMotion = reduced
    uniforms.uReducedMotion.value = reduced ? 1 : 0
    if (reduced) {
      pointerActive = false
      uniforms.uPointerPower.value = 0
      renderStaticFrame()
    } else {
      startLoop()
    }
  }

  const handleVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
    } else if (reducedMotion) {
      renderStaticFrame()
    } else {
      startLoop()
    }
  }

  const destroy = () => {
    destroyed = true
    cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', handleVisibility)
    texture.dispose()
    material.dispose()
    mesh.geometry.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  document.addEventListener('visibilitychange', handleVisibility)
  resize()
  renderFrame()
  startLoop()

  return { destroy, resize, setPointer, setReducedMotion }
}

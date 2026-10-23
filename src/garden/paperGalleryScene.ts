import * as THREE from 'three'
import { paperPresentation, projectAspects, type PaperEmphasis, type PaperFocus } from './paperGalleryFocus'
import { paperPool, resolvePaperEntry, paperCardIndex } from './paperGalleryLoop'
import { paperRenderOrder, type PaperBounds } from './paperGalleryInteraction'
import { updatePaperHitGeometry, projectedPaperBounds, pickPaperSurface } from './paperGallerySurface'
import { paperVertex, paperFragment, screenVertex, focusFragment } from './paperGalleryShaders'

/** Paper-only render targets keep selective focus independent of the existing garden. */
export function createPaperGalleryScene(host: HTMLElement, images: readonly string[], requestPaint: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000)
  camera.position.z = 1200
  let width = 1, height = 1, disposed = false, dirty = true, renderable = true
  let lastPhase = Number.NaN, lastFlutter = Number.NaN, lastSelected: number | null = null
  let lastScales: readonly number[] = [], lastEmphasis = ''
  let lastIdle = NaN, lastFocus = ''
  const boundsCache = new Map<number, PaperBounds | null>()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hitMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const textures: THREE.Texture[] = []
  // Preserve dark-cover gradients through the linear-colour blur passes.
  // Float colour is optional; no multisample assumption on mobile GPUs.
  const targetType = renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: targetType, depthBuffer: true })
  const blurTarget = new THREE.WebGLRenderTarget(1, 1, { type: targetType, depthBuffer: false })
  const clarityTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
  const focusScene = new THREE.Scene()
  const focusCamera = new THREE.Camera()
  const focusMaterial = new THREE.ShaderMaterial({
    vertexShader: screenVertex, fragmentShader: focusFragment,
    depthTest: false, depthWrite: false,
    uniforms: {
      uScene: { value: sceneTarget.texture }, uClarityMask: { value: clarityTarget.texture }, uHasClarity: { value: 0 }, uResolution: { value: new THREE.Vector2() },
      uDirection: { value: new THREE.Vector2(1, 0) }, uDpr: { value: dpr }, uFinalPass: { value: 0 }, uFocus: { value: 0 },
    },
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), focusMaterial)
  quad.frustumCulled = false
  focusScene.add(quad)

  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = 512; shadowCanvas.height = 320
  const ctx = shadowCanvas.getContext('2d')!
  ctx.shadowColor = 'rgba(0, 9, 7, .4)'
  ctx.shadowBlur = 30; ctx.shadowOffsetY = 10
  ctx.fillStyle = 'rgba(0, 9, 7, .22)'
  ctx.fillRect(40, 32, 432, 243)
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas)

  const blackTexture = new THREE.DataTexture(new Uint8Array([4, 5, 5, 255]), 1, 1)
  blackTexture.colorSpace = THREE.SRGBColorSpace
  blackTexture.needsUpdate = true
  textures.push(blackTexture)
  // Occurrences share the four uploaded covers; recycling never creates textures.
  const covers = images.map((image, index) => {
    const cover = { loaded: false, aspect: projectAspects[index] as number, texture: null as THREE.Texture | null }
    const texture = new THREE.TextureLoader().load(image, () => {
      if (disposed) { texture.dispose(); return }
      cover.aspect = texture.image.width / texture.image.height
      cover.loaded = true; dirty = true; requestPaint()
    }, undefined, () => {
      if (!disposed) { host.dataset.failed = 'true'; requestPaint() }
    })
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    cover.texture = texture; textures.push(texture)
    return cover
  })
  const papers = paperPool.map(entry => {
    const index = entry.projectIndex
    const seed = index === null ? (entry.slot + 5) * 3.71 + 1 : index * 3.71 + 1
    const group = new THREE.Group()
    const geometry = new THREE.PlaneGeometry(1, 1, 48, 20)
    const material = new THREE.ShaderMaterial({
      vertexShader: paperVertex, fragmentShader: paperFragment,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: {
        uMap: { value: null }, uSize: { value: new THREE.Vector2() },
        uOpacity: { value: 0 }, uBrightness: { value: 1 }, uRimBrightness: { value: 1 }, uClarity: { value: 0 }, uMaskPass: { value: 0 }, uBend: { value: 15 }, uFlutter: { value: 0 }, uSeed: { value: seed },
      },
    })
    const mesh = new THREE.Mesh(geometry, material)
    // Vertex shader supplies physical paper dimensions, beyond the unit geometry bounds.
    mesh.frustumCulled = false
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0, depthWrite: false })
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial)
    shadow.position.set(4, -12, -22)
    group.add(shadow, mesh); scene.add(group)
    const hitMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 20), hitMaterial)
    hitMesh.matrixAutoUpdate = false
    const cover = index === null ? null : covers[index]
    material.uniforms.uMap.value = cover?.texture ?? blackTexture
    return { entry, seed, group, mesh, hitMesh, hitShape: [] as number[], shadow, geometry, material, shadowMaterial, ready: () => cover?.loaded ?? true, aspect: () => cover?.aspect ?? 16 / 9 }
  })

  const resize = () => {
    dirty = true
    width = host.clientWidth || 1280; height = host.clientHeight || 720
    renderer.setSize(width, height)
    sceneTarget.setSize(Math.round(width * dpr), Math.round(height * dpr))
    clarityTarget.setSize(Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2)))
    blurTarget.setSize(Math.round(width * dpr), Math.round(height * dpr))
    focusMaterial.uniforms.uResolution.value.set(Math.round(width * dpr), Math.round(height * dpr))
    camera.aspect = width / height
    camera.fov = 2 * Math.atan(height / 2400) * 180 / Math.PI
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    const gl = renderer.getContext()
    renderer.setRenderTarget(sceneTarget)
    const sceneReady = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    renderer.setRenderTarget(blurTarget)
    renderable = sceneReady && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    renderer.setRenderTarget(clarityTarget)
    renderable = renderable && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    renderer.setRenderTarget(null)
  }
  resize()

  return {
    resize,
    paint(phase: number, flutter = 0, scales: readonly number[] = Array(8).fill(1), selected: number | null = null, idleTime = 0, focus?: PaperFocus | null, emphasis?: PaperEmphasis) {
      if (disposed || !renderable) return false
      const ready = papers.every(p => p.ready()) && host.dataset.failed !== 'true'
      const focusKey = focus ? `${focus.index}:${focus.progress}` : ''
      const emphasisKey = emphasis ? [...emphasis.dimming, ...emphasis.spacing, ...emphasis.clarity].join(',') : ''
      if (!dirty && emphasisKey === lastEmphasis && idleTime === lastIdle && focusKey === lastFocus && phase === lastPhase && flutter === lastFlutter && selected === lastSelected && scales.every((scale, i) => scale === lastScales[i])) return ready
      lastIdle = idleTime; lastFocus = focusKey; lastEmphasis = emphasisKey
      focusMaterial.uniforms.uFocus.value = focus?.progress ?? 0
      dirty = false; lastPhase = phase; lastFlutter = flutter; lastSelected = selected; lastScales = [...scales]
      boundsCache.clear()
      papers.forEach(paper => {
        const entry = resolvePaperEntry(paperPool[paper.entry.poolIndex!], phase)
        paper.entry = entry
        const pose = paperPresentation(entry, width, height, paper.aspect(), { phase, flutter, scales, idleTime, emphasis }, focus)
        const cardWidth = pose.width
        const { group, mesh, shadow, material, shadowMaterial } = paper
        group.position.set(pose.x, pose.y, pose.z)
        group.rotation.set(pose.rotateX, pose.rotateY, pose.rotateZ)
        group.scale.setScalar(pose.scale)
        group.visible = pose.opacity > 0.001 && paper.ready()
        material.uniforms.uOpacity.value = pose.opacity
        material.uniforms.uBrightness.value = pose.brightness
        material.uniforms.uRimBrightness.value = pose.rimBrightness
        material.uniforms.uClarity.value = pose.clarity
        material.uniforms.uSize.value.set(cardWidth, cardWidth / paper.aspect())
        material.uniforms.uBend.value = pose.bend
        material.uniforms.uFlutter.value = pose.flutter
        shadowMaterial.opacity = pose.opacity * 0.32
        mesh.renderOrder = paperRenderOrder(paper.entry, phase, selected, group.scale.x)
        shadow.renderOrder = mesh.renderOrder - 1
        shadow.scale.set(cardWidth * 1.18, cardWidth / paper.aspect() * 1.24, 1)
        if (paper.hitMesh) {
          const shape = [cardWidth, cardWidth / paper.aspect(), material.uniforms.uBend.value, material.uniforms.uFlutter.value]
          if (shape.some((value, i) => value !== paper.hitShape[i])) {
            updatePaperHitGeometry(paper.hitMesh.geometry, shape[0], shape[1], shape[2], shape[3], paper.seed)
            paper.hitShape = shape
          }
          group.updateMatrixWorld(true)
          paper.hitMesh.matrixWorld.copy(group.matrixWorld)
          paper.hitMesh.visible = group.visible && pose.opacity > .01
          paper.hitMesh.renderOrder = mesh.renderOrder
        }
      })
      const hasClarity = papers.some(p => p.group.visible && p.material.uniforms.uClarity.value > 0)
      focusMaterial.uniforms.uHasClarity.value = Number(hasClarity)
      if (hasClarity) {
        papers.forEach(p => { p.material.uniforms.uMaskPass.value = 1; p.shadow.visible = false })
        renderer.setRenderTarget(clarityTarget); renderer.clear(); renderer.render(scene, camera)
        papers.forEach(p => { p.material.uniforms.uMaskPass.value = 0; p.shadow.visible = true })
      }
      renderer.setRenderTarget(sceneTarget); renderer.clear(); renderer.render(scene, camera)
      focusMaterial.uniforms.uScene.value = sceneTarget.texture
      focusMaterial.uniforms.uDirection.value.set(1, 0)
      focusMaterial.uniforms.uFinalPass.value = 0
      renderer.setRenderTarget(blurTarget); renderer.clear(); renderer.render(focusScene, focusCamera)
      focusMaterial.uniforms.uScene.value = blurTarget.texture
      focusMaterial.uniforms.uDirection.value.set(0, 1)
      focusMaterial.uniforms.uFinalPass.value = 1
      renderer.setRenderTarget(null); renderer.clear(); renderer.render(focusScene, focusCamera)
      return ready
    },
    hitTest(x: number, y: number): number | null {
      if (disposed || !renderable || x < 0 || y < 0 || x > width || y > height) return null
      pointer.set(x / width * 2 - 1, 1 - y / height * 2)
      raycaster.setFromCamera(pointer, camera)
      return pickPaperSurface(papers, raycaster)
    },
    bounds(projectIndex: number) {
      if (boundsCache.has(projectIndex)) return boundsCache.get(projectIndex)!
      const paper = papers.find(p => paperCardIndex(p.entry) === projectIndex)
      const bounds = paper?.hitMesh?.visible ? projectedPaperBounds(paper.hitMesh, camera, width, height) : null
      boundsCache.set(projectIndex, bounds)
      return bounds
    },
    destroy() {
      disposed = true
      papers.forEach(p => {
        p.geometry.dispose(); p.material.dispose(); p.shadow.geometry.dispose(); p.shadowMaterial.dispose(); p.hitMesh?.geometry.dispose()
      })
      textures.forEach(t => t.dispose()); shadowTexture.dispose(); hitMaterial.dispose()
      sceneTarget.dispose(); blurTarget.dispose(); clarityTarget.dispose(); quad.geometry.dispose(); focusMaterial.dispose()
      renderer.dispose(); renderer.domElement.remove()
    },
  }
}

import * as THREE from 'three'
import { afterEach, expect, it, vi } from 'vitest'
import { createGardenScene } from './scene'

const gpu = vi.hoisted(() => ({ render: vi.fn(), setSize: vi.fn(), dispose: vi.fn() }))
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>()
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement('canvas')
      setPixelRatio() {} setClearColor() {}
      setSize = gpu.setSize
      render = gpu.render
      dispose = gpu.dispose
    },
  }
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks() })

it('keeps the fallback until the texture loads and renders its shared crop even with reduced motion', () => {
  const texture = new THREE.Texture(document.createElement('img'))
  let load: ((value: THREE.Texture<HTMLImageElement>) => void) | undefined
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => { load = onLoad; return texture })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  const host = document.createElement('div')
  Object.defineProperties(host, { clientWidth: { value: 1280 }, clientHeight: { value: 720 } })
  const controller = createGardenScene(host)
  expect(host.dataset.webglReady).toBe('false')
  expect(gpu.setSize).toHaveBeenCalledWith(1280, 720, false)
  controller.setReducedMotion(true)
  controller.setFraming({ x: .1, y: .2, width: .7, height: .6 })
  const renderedScene = gpu.render.mock.calls.at(-1)![0] as THREE.Scene
  const material = (renderedScene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial
  expect(material.uniforms.uCrop.value.toArray()).toEqual([.1, .2, .7, .6])
  const count = gpu.render.mock.calls.length
  load!(texture)
  expect(host.dataset.webglReady).toBe('true')
  expect(gpu.render).toHaveBeenCalledTimes(count + 1)
  controller.destroy()
  expect(host.querySelector('canvas')).toBeNull()
  expect(gpu.dispose).toHaveBeenCalledOnce()
  const endCount = gpu.render.mock.calls.length
  load!(texture)
  expect(gpu.render).toHaveBeenCalledTimes(endCount)
  const recreated = createGardenScene(host)
  expect(host.dataset.webglReady).toBe('false')
  recreated.destroy()
})

it('keeps CSS fallback visible when texture loading fails', () => {
  let fail: (() => void) | undefined
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, _load, _progress, onError) => { fail = () => onError?.(new Error('image failed')); return new THREE.Texture(document.createElement('img')) })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  const host = document.createElement('div')
  const controller = createGardenScene(host)
  fail!()
  expect(host.dataset.webglReady).toBe('false')
  expect(host.dataset.webglFailed).toBe('true')
  controller.destroy()
})

it('uploads a persistent displacement texture, breaks quiet-zone jumps and disposes its resources', () => {
  let time = 0, callback: FrameRequestCallback | undefined
  vi.spyOn(performance, 'now').mockImplementation(() => time)
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockReturnValue(new THREE.Texture(document.createElement('img')))
  vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => { callback = next; return 1 })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  const host = document.createElement('div')
  Object.defineProperties(host, { clientWidth: { value: 1000 }, clientHeight: { value: 800 } })
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 800 } as DOMRect)
  const controller = createGardenScene(host)
  const renderedScene = gpu.render.mock.calls.at(-1)![0] as THREE.Scene
  const material = (renderedScene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial
  const uniforms = material.uniforms
  expect(uniforms.uTrailField?.value).toBeInstanceOf(THREE.DataTexture)
  const field = uniforms.uTrailField.value as THREE.DataTexture
  const dispose = vi.spyOn(field, 'dispose')
  const energy = () => Array.from(field.image.data as Uint8Array).reduce((sum, value, i) => sum + (i % 4 < 2 ? Math.abs(value - 128) : 0), 0)
  controller.setPointer(600, 400)
  time = 40; controller.setPointer(800, 400); callback!(time)
  const initial = energy()
  expect(initial).toBeGreaterThan(1000)
  time = 80; controller.setPointer(200, 400); callback!(time)
  time = 120; controller.setPointer(900, 400); callback!(time)
  expect(energy()).toBeLessThan(initial)
  time = 1440; callback!(time)
  expect(energy()).toBeGreaterThan(initial * .2)
  expect(material.fragmentShader).not.toContain('for (int i = 0; i < 16; i++)')
  controller.setReducedMotion(true)
  expect(energy()).toBe(0)
  controller.setReducedMotion(false)
  time = 1500; controller.setPointer(600, 400)
  time = 1540; controller.setPointer(800, 400); callback!(time)
  expect(energy()).toBeGreaterThan(0)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(energy()).toBe(0)
  expect(cancelAnimationFrame).toHaveBeenCalled()
  controller.destroy()
  expect(dispose).toHaveBeenCalledOnce()
})

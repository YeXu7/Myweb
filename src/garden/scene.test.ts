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

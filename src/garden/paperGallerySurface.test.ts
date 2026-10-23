import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { updatePaperHitGeometry, projectedPaperBounds, pickPaperSurface } from './paperGallerySurface'
import { paperSequence, paperRenderOrder } from './paperGalleryInteraction'

describe('curved paper hit surface', () => {
  it('stops at an occluding black sheet, allows exposed projects, and preserves occlusion throughout hover and return', () => {
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    const sheets = paperSequence.slice(0, 2).map(entry => {
      const hitMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 20), material)
      updatePaperHitGeometry(hitMesh.geometry, 300, 168.75, 15, 4, 1)
      hitMesh.rotation.y = -.38
      hitMesh.renderOrder = paperRenderOrder(entry, 0, null)
      hitMesh.updateMatrixWorld(true)
      return { entry, hitMesh }
    })
    const camera = new THREE.PerspectiveCamera(40, 1280 / 720, 1, 5000)
    camera.position.z = 1200
    camera.updateMatrixWorld(true)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(0, 0), camera)
    expect(ray.intersectObject(sheets[0].hitMesh).length).toBeGreaterThan(0)
    expect(ray.intersectObject(sheets[1].hitMesh).length).toBeGreaterThan(0)
    expect(pickPaperSurface(sheets, ray)).toBeNull()
    sheets[0].hitMesh.position.x = 500; sheets[0].hitMesh.updateMatrixWorld(true)
    expect(pickPaperSurface(sheets, ray)).toBe(0)
    sheets[0].hitMesh.position.x = 0; sheets[0].hitMesh.updateMatrixWorld(true)
    sheets[1].hitMesh.renderOrder = paperRenderOrder(sheets[1].entry, 0, 0, 1.5)
    expect(pickPaperSurface(sheets, ray)).toBeNull()
    sheets[1].hitMesh.renderOrder = paperRenderOrder(sheets[1].entry, 0, null, 1)
    expect(pickPaperSurface(sheets, ray)).toBeNull()
    sheets.forEach(sheet => sheet.hitMesh.geometry.dispose()); material.dispose()
  })
  it('uses the same physical width and bending as the rendered sheet, not a unit rectangle', () => {
    const geometry = new THREE.PlaneGeometry(1, 1, 48, 20)
    updatePaperHitGeometry(geometry, 300, 168.75, 15, 0, 1)
    const p = geometry.getAttribute('position')
    const middle = 10 * 49 + 24
    expect(p.getX(middle)).toBeCloseTo(0)
    expect(p.getZ(middle)).toBeCloseTo(0)
    expect(p.getY(middle)).toBeCloseTo(15 * .18 * Math.sin(.2))
    expect(p.getX(0)).toBeCloseTo(-148)
    expect(p.getX(48)).toBeCloseTo(148)
    expect(p.getZ(0)).not.toBe(0)
    geometry.dispose()
  })
  it('raycasts the enlarged perspective surface and rejects empty space outside it', () => {
    const geometry = new THREE.PlaneGeometry(1, 1, 48, 20)
    updatePaperHitGeometry(geometry, 300, 168.75, 15, 7, 1)
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.y = -.38
    mesh.scale.setScalar(1.5)
    mesh.updateMatrixWorld(true)
    const camera = new THREE.PerspectiveCamera(40, 1280 / 720, 1, 5000)
    camera.position.z = 1200
    camera.fov = 2 * Math.atan(720 / 2400) * 180 / Math.PI
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(0, 0), camera)
    expect(ray.intersectObject(mesh)).not.toHaveLength(0)
    ray.setFromCamera(new THREE.Vector2(.8, .8), camera)
    expect(ray.intersectObject(mesh)).toHaveLength(0)
    const bounds = projectedPaperBounds(mesh, camera, 1280, 720)
    expect(bounds.right - bounds.left).toBeGreaterThan(400)
    expect(bounds.bottom - bounds.top).toBeGreaterThan(240)
    geometry.dispose(); material.dispose()
  })
})

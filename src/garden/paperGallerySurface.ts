import * as THREE from 'three'
import { paperCardIndex } from './paperGalleryLoop'
import type { PaperBounds, PaperEntry } from './paperGalleryInteraction'

/** Picking follows the drawn stack: a decorative front sheet blocks projects behind it. */
export function pickPaperSurface(sheets: readonly { entry: PaperEntry; hitMesh: THREE.Mesh }[], raycaster: THREE.Raycaster): number | null {
  const visible = sheets.filter(sheet => sheet.hitMesh.visible).sort((a, b) => b.hitMesh.renderOrder - a.hitMesh.renderOrder)
  for (const sheet of visible) {
    if (raycaster.intersectObject(sheet.hitMesh, false).length) return paperCardIndex(sheet.entry)
  }
  return null
}

/** CPU picking counterpart of paperVertex; keep its deformation equations in sync. */
export function updatePaperHitGeometry(geometry: THREE.PlaneGeometry, width: number, height: number, bend: number, flutter: number, seed: number, inset = 2) {
  const uv = geometry.getAttribute('uv')
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    // The fragment shader trims two physical pixels from the plane to form its fine deckle.
    const x = (uv.getX(i) - .5) * (1 - 2 * inset / width)
    const y = (uv.getY(i) - .5) * (1 - 2 * inset / height)
    const curl = x * x * 3 + x * y * 1.4
    const wave = Math.sin(x * 5 + seed) * Math.cos(y * 3)
    const py = y * height + bend * (x * x * .16 + x * y * .16)
      + bend * (.18 * Math.sin(x * 5.3 + seed * .2) + .10 * Math.sin(x * 10 + seed) * Math.abs(y) * 1.6)
    positions.setXYZ(i, x * width, py, bend * curl + flutter * wave)
  }
  positions.needsUpdate = true
  geometry.computeBoundingSphere()
}

export function projectedPaperBounds(mesh: THREE.Mesh, camera: THREE.Camera, width: number, height: number): PaperBounds {
  const positions = mesh.geometry.getAttribute('position')
  const point = new THREE.Vector3()
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera)
    const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2
    bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x)
    bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y)
  }
  return bounds
}

/** DOM fallback bounds share the camera/pose; its flat CSS sheet has no shader deformation. */
export function createPaperSurfaceTracker(entries: readonly PaperEntry[]) {
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000)
  camera.position.z = 1200
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const sheets = entries.map(entry => ({ entry, hitMesh: new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 20), material) }))
  const ray = new THREE.Raycaster()
  let width = 1, height = 1
  return {
    resize(w: number, h: number) {
      width = w; height = h; camera.aspect = w / h
      camera.fov = 2 * Math.atan(h / 2400) * 180 / Math.PI
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
    },
    update(index: number, pose: { x: number; y: number; z: number; rotateX: number; rotateY: number; rotateZ: number; scale: number; width: number; height: number; bend: number; flutter: number; opacity: number }, order: number) {
      const { hitMesh, entry } = sheets[index]
      const seed = entry.projectIndex === null ? (entry.slot + 5) * 3.71 + 1 : entry.projectIndex * 3.71 + 1
      updatePaperHitGeometry(hitMesh.geometry, pose.width, pose.height, pose.bend, pose.flutter, seed, 0)
      hitMesh.position.set(pose.x, pose.y, pose.z); hitMesh.rotation.set(pose.rotateX, pose.rotateY, pose.rotateZ)
      hitMesh.scale.setScalar(pose.scale); hitMesh.visible = pose.opacity > .01; hitMesh.renderOrder = order
      hitMesh.updateMatrixWorld(true)
    },
    bounds(index: number) {
      const sheet = sheets.find(sheet => paperCardIndex(sheet.entry) === index)!
      return sheet.hitMesh.visible ? projectedPaperBounds(sheet.hitMesh, camera, width, height) : null
    },
    hitTest(x: number, y: number) {
      ray.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), camera)
      return pickPaperSurface(sheets, ray)
    },
    destroy() { sheets.forEach(sheet => sheet.hitMesh.geometry.dispose()); material.dispose() },
  }
}

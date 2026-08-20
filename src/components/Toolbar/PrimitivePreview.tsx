import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { MeshData } from '../../core/MeshData'
import { meshDataToBufferGeometry } from '../../viewport/MeshRenderer'
import styles from './PrimitivePreview.module.css'

interface Props {
  meshData: MeshData
}

function readMeshColor(fallback: number): number {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue('--viewport-mesh-color').trim()
  if (!val) return fallback
  try { return new THREE.Color(val).getHex() } catch { return fallback }
}

export function PrimitivePreview({ meshData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    mesh: THREE.Mesh
    wire: THREE.Mesh
    animId: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const w = canvas.offsetWidth || 300
    const h = canvas.offsetHeight || 300

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(w, h, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.001, 500)

    const ambient = new THREE.AmbientLight(0xffffff, 1.0)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xffffff, 3)
    sun.position.set(3, 5, 4)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x998899, 0.8)
    fill.position.set(-3, 1, -2)
    scene.add(fill)

    const mat = new THREE.MeshStandardMaterial({
      color: readMeshColor(0xc7c7cc),
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x555555,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    })

    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat)
    const wire = new THREE.Mesh(new THREE.BufferGeometry(), wireMat)
    scene.add(mesh)
    scene.add(wire)

    const themeObserver = new MutationObserver(() => {
      mat.color.setHex(readMeshColor(0xc7c7cc))
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const w2 = entry.contentRect.width
      const h2 = entry.contentRect.height
      if (w2 > 0 && h2 > 0) {
        renderer.setSize(w2, h2, false)
        camera.aspect = w2 / h2
        camera.updateProjectionMatrix()
      }
    })
    ro.observe(canvas)

    let animId = 0
    const tick = () => {
      animId = requestAnimationFrame(tick)
      mesh.rotation.y += 0.008
      wire.rotation.copy(mesh.rotation)
      renderer.render(scene, camera)
    }
    tick()

    threeRef.current = { renderer, scene, camera, mesh, wire, animId }

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      themeObserver.disconnect()
      mat.dispose()
      wireMat.dispose()
      renderer.dispose()
      threeRef.current = null
    }
  }, [])

  useEffect(() => {
    const t = threeRef.current
    if (!t) return

    const oldGeo = t.mesh.geometry
    const geo = meshDataToBufferGeometry(meshData)
    t.mesh.geometry = geo
    t.wire.geometry = geo
    oldGeo.dispose()

    t.mesh.rotation.set(0, 0, 0)
    t.wire.rotation.set(0, 0, 0)

    geo.computeBoundingBox()
    geo.computeBoundingSphere()

    const box = geo.boundingBox!
    const sphere = geo.boundingSphere!
    const center = new THREE.Vector3()
    box.getCenter(center)
    t.mesh.position.copy(center).negate()
    t.wire.position.copy(center).negate()

    const size = new THREE.Vector3()
    box.getSize(size)
    const isFlat = size.y < 0.01 * Math.max(size.x, size.z)

    const r = sphere.radius || 1
    const fovRad = t.camera.fov * (Math.PI / 180)
    const dist = (r / Math.sin(fovRad / 2)) * 1.5

    if (isFlat) {
      t.camera.position.set(dist * 0.15, dist * 1.1, dist * 0.5)
    } else {
      t.camera.position.set(dist * 0.9, dist * 0.6, dist * 0.9)
    }
    t.camera.lookAt(0, 0, 0)
    t.camera.updateProjectionMatrix()
  }, [meshData])

  return <canvas ref={canvasRef} className={styles.canvas} />
}

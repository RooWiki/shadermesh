import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { MeshObject } from '../core/MeshObject'
import type { MeshData } from '../core/MeshData'
import type { EditorMode, WireframeMode } from '../state/sceneStore'
import { meshDataToBufferGeometry } from './MeshRenderer'

type SelectCallback = (id: string | null) => void
type SelectVertexCallback = (index: number | null) => void

const VERTEX_COLOR_DEFAULT = [0.35, 0.55, 0.95] as const
const VERTEX_COLOR_SELECTED = [1.0, 0.85, 0.1] as const

export class SceneManager {
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private orbitControls: OrbitControls
  private gridHelper: THREE.GridHelper

  private meshMap = new Map<string, THREE.Mesh>()
  private wireframeMap = new Map<string, THREE.LineSegments>()
  private meshDataRefMap = new Map<string, MeshData>()

  private selectedId: string | null = null
  private onSelect: SelectCallback
  private onSelectVertex: SelectVertexCallback
  private wireframeMode: WireframeMode = 'tri'
  private currentMode: EditorMode = 'object'
  private currentObjects: MeshObject[] = []

  // Vertex overlay (only for selected object in vertex mode)
  private vertexPoints: THREE.Points | null = null
  private selectedVertexIndex: number | null = null

  private animFrameId = 0
  private container: HTMLDivElement

  private defaultMat: THREE.MeshLambertMaterial
  private selectedMat: THREE.MeshLambertMaterial
  private wireframeMat: THREE.LineBasicMaterial
  private selectedWireframeMat: THREE.LineBasicMaterial

  constructor(
    container: HTMLDivElement,
    onSelect: SelectCallback,
    onSelectVertex: SelectVertexCallback,
  ) {
    this.container = container
    this.onSelect = onSelect
    this.onSelectVertex = onSelectVertex

    const { clientWidth: w, clientHeight: h } = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1e1e24)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 10000)
    this.camera.position.set(3, 2.5, 4)
    this.camera.lookAt(0, 0, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(5, 8, 5)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(1024, 1024)
    this.scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
    fillLight.position.set(-5, -2, -5)
    this.scene.add(fillLight)

    this.gridHelper = new THREE.GridHelper(20, 20, 0x444455, 0x2a2a36)
    this.scene.add(this.gridHelper)
    this.scene.add(new THREE.AxesHelper(0.5))

    this.defaultMat = new THREE.MeshLambertMaterial({ color: 0x5a7cba })
    this.selectedMat = new THREE.MeshLambertMaterial({ color: 0x7aace0, emissive: 0x112233, emissiveIntensity: 0.3 })
    this.wireframeMat = new THREE.LineBasicMaterial({ color: 0x2244aa, transparent: true, opacity: 0.4 })
    this.selectedWireframeMat = new THREE.LineBasicMaterial({ color: 0xf0a050, transparent: true, opacity: 0.8 })

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.1
    this.orbitControls.screenSpacePanning = true
    this.orbitControls.minDistance = 0.1
    this.orbitControls.maxDistance = 500

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)

    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(container)

    this.animate()
  }

  private resizeObserver: ResizeObserver

  private onResize = () => {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private pointerMoved = false
  private pointerDownPos = { x: 0, y: 0 }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    this.pointerMoved = false
    this.pointerDownPos = { x: e.clientX, y: e.clientY }
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove, { once: true })
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp, { once: true })
  }

  private onPointerMove = (e: PointerEvent) => {
    const dx = e.clientX - this.pointerDownPos.x
    const dy = e.clientY - this.pointerDownPos.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.pointerMoved = true
  }

  private onPointerUp = (e: PointerEvent) => {
    if (this.pointerMoved) return
    if (e.button !== 0) return
    if (this.currentMode === 'vertex') {
      this.pickVertex(e)
    } else {
      this.pickObject(e)
    }
  }

  private getNDC(e: PointerEvent): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect()
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  private pickObject(e: PointerEvent) {
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(this.getNDC(e), this.camera)
    const meshes = Array.from(this.meshMap.values())
    const hits = raycaster.intersectObjects(meshes, false)
    if (hits.length > 0) {
      const id = this.findIdByMesh(hits[0].object as THREE.Mesh)
      if (id) { this.onSelect(id); return }
    }
    this.onSelect(null)
  }

  private pickVertex(e: PointerEvent) {
    // In vertex mode: try vertex pick on selected object first.
    // If miss (or no object selected), fall back to object pick.
    if (this.vertexPoints && this.selectedId) {
      const raycaster = new THREE.Raycaster()
      raycaster.params.Points = { threshold: 0.08 }
      raycaster.setFromCamera(this.getNDC(e), this.camera)
      const hits = raycaster.intersectObject(this.vertexPoints, false)
      if (hits.length > 0) {
        this.onSelectVertex(hits[0].index ?? null)
        return
      }
      // Click in empty space: deselect vertex only (keep object selected)
      this.onSelectVertex(null)
      return
    }
    // No selected object: pick a mesh to select it
    this.pickObject(e)
  }

  private findIdByMesh(mesh: THREE.Mesh): string | null {
    for (const [id, m] of this.meshMap) {
      if (m === mesh) return id
    }
    return null
  }

  // ── Public API ────────────────────────────────────────────────

  syncObjects(objects: MeshObject[], selectedId: string | null) {
    this.currentObjects = objects
    const incoming = new Set(objects.map(o => o.id))

    for (const [id] of this.meshMap) {
      if (!incoming.has(id)) this.removeMeshFromScene(id)
    }

    for (const obj of objects) {
      if (!this.meshMap.has(obj.id)) {
        this.addMeshToScene(obj)
      } else {
        this.updateMeshGeometryIfChanged(obj)
        this.updateMeshTransform(obj)
      }
    }

    if (selectedId !== this.selectedId) {
      this.setSelection(selectedId)
    }
  }

  setEditorMode(mode: EditorMode) {
    this.currentMode = mode
    if (mode === 'vertex' && this.selectedId) {
      const obj = this.currentObjects.find(o => o.id === this.selectedId)
      if (obj) this.buildVertexOverlay(obj.meshData)
    } else {
      this.clearVertexOverlay()
    }
  }

  selectVertex(index: number | null) {
    this.selectedVertexIndex = index
    this.updateVertexHighlight()
  }

  setWireframeMode(mode: WireframeMode) {
    this.wireframeMode = mode
    for (const [id, mesh] of this.meshMap) {
      const old = this.wireframeMap.get(id)
      if (old) { mesh.remove(old); old.geometry.dispose() }
      const wf = this.buildWireframe(mesh.geometry as THREE.BufferGeometry)
      const mat = id === this.selectedId ? this.selectedWireframeMat : this.wireframeMat
      ;(wf.material as THREE.LineBasicMaterial).copy(mat)
      mesh.add(wf)
      this.wireframeMap.set(id, wf)
    }
  }

  setGridVisible(visible: boolean) {
    this.gridHelper.visible = visible
  }

  frameSelected() {
    if (!this.selectedId) return
    const mesh = this.meshMap.get(this.selectedId)
    if (!mesh) return
    const box = new THREE.Box3().setFromObject(mesh)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const radius = Math.max(size.x, size.y, size.z) * 1.5
    this.orbitControls.target.copy(center)
    this.camera.position.copy(center).addScaledVector(
      this.camera.position.clone().sub(center).normalize(),
      Math.max(radius, 0.5),
    )
    this.orbitControls.update()
  }

  // ── Private scene management ─────────────────────────────────

  private addMeshToScene(obj: MeshObject) {
    const geometry = meshDataToBufferGeometry(obj.meshData)
    const mesh = new THREE.Mesh(geometry, this.defaultMat.clone())
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.applyTransform(mesh, obj)
    this.scene.add(mesh)
    this.meshMap.set(obj.id, mesh)
    this.meshDataRefMap.set(obj.id, obj.meshData)

    const wf = this.buildWireframe(geometry)
    mesh.add(wf)
    this.wireframeMap.set(obj.id, wf)
  }

  private updateMeshGeometryIfChanged(obj: MeshObject) {
    if (this.meshDataRefMap.get(obj.id) === obj.meshData) return
    const mesh = this.meshMap.get(obj.id)
    if (!mesh) return

    mesh.geometry.dispose()
    mesh.geometry = meshDataToBufferGeometry(obj.meshData)

    const oldWf = this.wireframeMap.get(obj.id)
    if (oldWf) { mesh.remove(oldWf); oldWf.geometry.dispose() }
    const wf = this.buildWireframe(mesh.geometry)
    const mat = obj.id === this.selectedId ? this.selectedWireframeMat : this.wireframeMat
    ;(wf.material as THREE.LineBasicMaterial).copy(mat)
    mesh.add(wf)
    this.wireframeMap.set(obj.id, wf)

    // Rebuild vertex overlay if this is the selected object in vertex mode
    if (this.currentMode === 'vertex' && obj.id === this.selectedId) {
      this.buildVertexOverlay(obj.meshData)
      if (this.selectedVertexIndex !== null) this.updateVertexHighlight()
    }

    this.meshDataRefMap.set(obj.id, obj.meshData)
  }

  private updateMeshTransform(obj: MeshObject) {
    const mesh = this.meshMap.get(obj.id)
    if (!mesh) return
    this.applyTransform(mesh, obj)
  }

  private applyTransform(mesh: THREE.Mesh, obj: MeshObject) {
    const { position, rotation, scale } = obj.transform
    mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    mesh.scale.set(...scale)
  }

  private setSelection(id: string | null) {
    if (this.selectedId) {
      const prev = this.meshMap.get(this.selectedId)
      if (prev) {
        ;(prev.material as THREE.MeshLambertMaterial).copy(this.defaultMat)
        const wf = this.wireframeMap.get(this.selectedId)
        if (wf) (wf.material as THREE.LineBasicMaterial).copy(this.wireframeMat)
      }
    }

    this.selectedId = id
    this.clearVertexOverlay()

    if (id) {
      const mesh = this.meshMap.get(id)
      if (mesh) {
        ;(mesh.material as THREE.MeshLambertMaterial).copy(this.selectedMat)
        const wf = this.wireframeMap.get(id)
        if (wf) (wf.material as THREE.LineBasicMaterial).copy(this.selectedWireframeMat)
      }
      if (this.currentMode === 'vertex') {
        const obj = this.currentObjects.find(o => o.id === id)
        if (obj) this.buildVertexOverlay(obj.meshData)
      }
    }
  }

  private removeMeshFromScene(id: string) {
    if (this.selectedId === id) this.clearVertexOverlay()
    const mesh = this.meshMap.get(id)
    if (mesh) { mesh.geometry.dispose(); this.scene.remove(mesh); this.meshMap.delete(id) }
    const wf = this.wireframeMap.get(id)
    if (wf) { wf.geometry.dispose(); this.wireframeMap.delete(id) }
    this.meshDataRefMap.delete(id)
    if (this.selectedId === id) this.selectedId = null
  }

  private buildWireframe(geometry: THREE.BufferGeometry): THREE.LineSegments {
    const wfGeo = this.wireframeMode === 'quad'
      ? new THREE.EdgesGeometry(geometry, 5)
      : new THREE.WireframeGeometry(geometry)
    return new THREE.LineSegments(wfGeo, this.wireframeMat.clone())
  }

  // ── Vertex overlay ───────────────────────────────────────────

  private buildVertexOverlay(meshData: MeshData) {
    this.clearVertexOverlay()
    const mesh = this.meshMap.get(this.selectedId!)
    if (!mesh) return

    const positions = meshData.positions
    const count = positions.length / 3
    const colors = new Float32Array(count * 3)
    const [dr, dg, db] = VERTEX_COLOR_DEFAULT
    for (let i = 0; i < count; i++) {
      colors[i * 3] = dr; colors[i * 3 + 1] = dg; colors[i * 3 + 2] = db
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 7,
      sizeAttenuation: false,
      vertexColors: true,
      depthTest: false,
    })

    this.vertexPoints = new THREE.Points(geo, mat)
    // Add as child of mesh so it inherits object transform automatically
    mesh.add(this.vertexPoints)
  }

  private clearVertexOverlay() {
    if (!this.vertexPoints) return
    this.vertexPoints.parent?.remove(this.vertexPoints)
    this.vertexPoints.geometry.dispose()
    ;(this.vertexPoints.material as THREE.PointsMaterial).dispose()
    this.vertexPoints = null
    this.selectedVertexIndex = null
  }

  private updateVertexHighlight() {
    if (!this.vertexPoints) return
    const colors = this.vertexPoints.geometry.attributes.color as THREE.BufferAttribute
    const count = colors.count
    const [dr, dg, db] = VERTEX_COLOR_DEFAULT
    const [sr, sg, sb] = VERTEX_COLOR_SELECTED

    for (let i = 0; i < count; i++) {
      if (i === this.selectedVertexIndex) {
        colors.setXYZ(i, sr, sg, sb)
      } else {
        colors.setXYZ(i, dr, dg, db)
      }
    }
    colors.needsUpdate = true
  }

  // ── Animation & gizmo ────────────────────────────────────────

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate)
    this.orbitControls.update()
    this.renderer.render(this.scene, this.camera)
    this.renderGizmo()
  }

  private gizmoScene = new THREE.Scene()
  private gizmoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
  private gizmoInitialized = false

  private initGizmo() {
    this.gizmoCamera.position.set(0, 0, 5)
    const axes = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff4444, neg: false },
      { dir: new THREE.Vector3(-1, 0, 0), color: 0x883333, neg: true },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x44ff66, neg: false },
      { dir: new THREE.Vector3(0, -1, 0), color: 0x336644, neg: true },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x4488ff, neg: false },
      { dir: new THREE.Vector3(0, 0, -1), color: 0x334488, neg: true },
    ]
    for (const ax of axes) {
      const tip = ax.dir.clone().multiplyScalar(0.75)
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), tip])
      this.gizmoScene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: ax.color })))
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(ax.neg ? 0.05 : 0.09, 8, 6),
        new THREE.MeshBasicMaterial({ color: ax.color }),
      )
      s.position.copy(tip)
      this.gizmoScene.add(s)
    }
    this.gizmoScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xaaaaaa }),
    ))
    this.gizmoInitialized = true
  }

  private renderGizmo() {
    if (!this.gizmoInitialized) this.initGizmo()
    const { clientWidth: w, clientHeight: h } = this.container
    const size = 90
    const gx = w - size - 12
    const gy = 12

    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    this.gizmoCamera.position.copy(dir.negate().multiplyScalar(5))
    this.gizmoCamera.lookAt(0, 0, 0)

    this.renderer.setViewport(gx, gy, size, size)
    this.renderer.setScissor(gx, gy, size, size)
    this.renderer.setScissorTest(true)

    const savedColor = new THREE.Color()
    const savedAlpha = this.renderer.getClearAlpha()
    this.renderer.getClearColor(savedColor)
    this.renderer.setClearColor(0x1e1e2e, 1)
    this.renderer.clear(true, true, false)
    this.renderer.render(this.gizmoScene, this.gizmoCamera)
    this.renderer.setClearColor(savedColor, savedAlpha)
    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, w, h)
  }

  dispose() {
    cancelAnimationFrame(this.animFrameId)
    this.resizeObserver.disconnect()
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.clearVertexOverlay()
    for (const [id] of this.meshMap) this.removeMeshFromScene(id)
    this.orbitControls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
